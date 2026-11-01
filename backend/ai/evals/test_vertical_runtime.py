"""Multi-vertical runtime (DOCS/31): department routing with hours and fallback, real transfer outcomes, lead capture, room
conflicts, per-vertical tools and wording, and the tenant-scoped APIs."""

import asyncio
import unittest
from datetime import datetime
from unittest.mock import patch

from backend.ai.evals.fixtures import FIXED_NOW, make_db_factory

ALL_HOURS = {d: [{"start": "00:00", "end": "23:59"}] for d in ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")}
NO_HOURS_TODAY = {d: [] for d in ALL_HOURS}  # configured, closed every day


def run(coro):
    return asyncio.run(coro)


def tenant(vertical: str, subtype: str):
    """The fixture tenant turned into a business of `vertical` / `subtype`."""
    from backend.server.database.models.business import Business

    factory, biz = make_db_factory()
    with factory() as db:
        b = db.get(Business, biz)
        b.vertical, b.business_subtype, b.name = vertical, subtype, f"Demo {vertical}"
        b.working_hours = ALL_HOURS
        db.commit()
    return factory, biz


def department(factory, biz, key, name, phone=None, intents=(), match=None, fallback=None, priority=50, hours=None):
    from backend.server.database.models.vertical import Department

    with factory() as db:
        db.add(Department(business_id=biz, key=key, name=name, transfer_phone=phone, intents=list(intents), match=match or {},
                          fallback_key=fallback, priority=priority, hours=hours, timeout_seconds=20, may_answer=True, required_slots=[], active=True))
        db.commit()


def engine(factory, biz, call_id="CA-100", caller="+919876543210"):
    from backend.ai.engine.agent.agent_loop import AgentEngine
    from backend.ai.engine.agent.facts import load_facts
    from backend.ai.verticals.registry import registry

    with factory() as db:
        facts = load_facts(db, biz)
    return AgentEngine(biz, caller, call_id, facts, registry.get_vertical(facts.vertical, "en"), object(), factory,
                       agent_name="Maya", now_fn=lambda: FIXED_NOW)


class DepartmentRouting(unittest.TestCase):
    def setUp(self):
        self.factory, self.biz = tenant("education", "university")
        department(self.factory, self.biz, "general_enquiries", "General enquiries", "+15550100000", ["general_enquiry", "human_request"], priority=10)
        department(self.factory, self.biz, "ug_admissions", "Undergraduate admissions", "+15550100001", ["admissions"], {"study_level": "undergraduate"}, "general_enquiries", 50)
        department(self.factory, self.biz, "international_admissions", "International admissions", "+15550100002", ["admissions"], {"applicant_type": "international"}, "general_enquiries", 60)
        department(self.factory, self.biz, "finance", "Finance", None, ["fees"], None, "general_enquiries", 40)  # no number
        department(self.factory, self.biz, "complaints", "Complaints", "+15550100003", ["complaint"], None, "general_enquiries", 90, hours=NO_HOURS_TODAY)

    def choose(self, requested, **context):
        from backend.server.services.department_routing import choose

        with self.factory() as db:
            d = choose(db, self.biz, requested, context, now=datetime(2026, 9, 28, 10, 0))
            return (d.department.key if d.department else None), d.code, d.tried

    def test_exact_department_key(self):
        self.assertEqual(self.choose("ug_admissions")[0], "ug_admissions")

    def test_intent_and_caller_context_pick_the_department(self):
        self.assertEqual(self.choose("admissions", applicant_type="international")[0], "international_admissions")
        self.assertEqual(self.choose("admissions", study_level="undergraduate", applicant_type="domestic")[0], "ug_admissions")
        self.assertEqual(self.choose("route", topic="admissions", study_level="undergraduate")[0], "ug_admissions")

    def test_unknown_request_goes_to_the_general_desk_never_an_invented_one(self):
        self.assertEqual(self.choose("dean_of_magic")[0], "general_enquiries")

    def test_no_destination_and_closed_fall_back_along_the_chain(self):
        key, code, tried = self.choose("finance")
        self.assertEqual((key, tried), ("general_enquiries", [("finance", "no_destination")]))
        key, code, tried = self.choose("complaints")
        self.assertEqual((key, tried), ("general_enquiries", [("complaints", "closed")]))

    def test_nobody_available_is_reported_not_guessed(self):
        from backend.server.database.models.vertical import Department

        with self.factory() as db:
            db.query(Department).filter_by(business_id=self.biz, key="general_enquiries").update({"hours": NO_HOURS_TODAY})
            db.commit()
        key, code, tried = self.choose("complaints")
        self.assertEqual((key, code), (None, "department_closed"))
        self.assertEqual([k for k, _ in tried], ["complaints", "general_enquiries"])

    def test_a_fallback_loop_ends(self):
        from backend.server.database.models.vertical import Department

        with self.factory() as db:  # written around the API (which refuses loops): routing must still terminate
            db.query(Department).filter_by(business_id=self.biz, key="general_enquiries").update({"fallback_key": "finance", "transfer_phone": None})
            db.commit()
        key, code, tried = self.choose("finance")
        self.assertIsNone(key)
        self.assertEqual(len(tried), 2)


class TransfersThroughTheDirectory(unittest.TestCase):
    def setUp(self):
        self.factory, self.biz = tenant("education", "university")
        department(self.factory, self.biz, "general_enquiries", "General enquiries", "+15550100000", ["general_enquiry", "human_request"], priority=10)
        department(self.factory, self.biz, "pg_admissions", "Postgraduate admissions", "+15550100009", ["admissions"], {"study_level": "postgraduate"}, "general_enquiries", 50)
        self.eng = engine(self.factory, self.biz)
        self.eng.toolbox.last_utterance = "I want to talk to a human in postgraduate admissions"

    def attempts(self):
        from backend.server.database.models.vertical import TransferAttempt

        with self.factory() as db:
            return [(a.department_key, a.status, a.destination_tail) for a in db.query(TransferAttempt).order_by(TransferAttempt.created_at).all()]

    def test_dials_the_departments_own_number_and_records_an_initiated_attempt(self):
        r = run(self.eng.toolbox.execute("transfer_to_human", {"department": "pg_admissions", "confirmed_by_caller": True}))
        self.assertEqual(r["code"], "transferring")
        self.assertIn("+15550100009", self.eng.toolbox.pending["twiml"])
        self.assertIn("attempt_id=", self.eng.toolbox.pending["twiml"])
        self.assertEqual(self.attempts(), [("pg_admissions", "initiated", "0009")])  # dialled, not "succeeded"

    def test_closed_department_offers_a_callback_and_is_recorded(self):
        from backend.server.database.models.vertical import Department

        with self.factory() as db:
            db.query(Department).filter_by(business_id=self.biz).update({"hours": NO_HOURS_TODAY})
            db.commit()
        r = run(self.eng.toolbox.execute("transfer_to_human", {"department": "pg_admissions", "confirmed_by_caller": True}))
        self.assertEqual(r["code"], "department_closed")
        self.assertIn("capture_enquiry", r["message"])
        self.assertIsNone(self.eng.toolbox.pending)
        self.assertEqual([s for _, s, _ in self.attempts()], ["closed"])

    def test_no_answer_tries_one_fallback_then_creates_a_callback(self):
        from backend.server.database.models.vertical import Enquiry
        from backend.server.services.department_routing import dial_result

        run(self.eng.toolbox.execute("transfer_to_human", {"department": "pg_admissions", "confirmed_by_caller": True}))
        attempt_id = self.eng.toolbox.pending["data"]["attempt_id"]
        with self.factory() as db:
            first = dial_result(db, attempt_id, "no-answer", "+919876543210")
            self.assertEqual(first.fallback.key, "general_enquiries")
            second = dial_result(db, first.fallback_attempt.id, "busy", "+919876543210")
            self.assertIsNone(second.fallback)
            self.assertEqual(second.callback.kind, "callback")
            again = dial_result(db, first.fallback_attempt.id, "busy", "+919876543210")  # provider retry: no second callback
            self.assertIsNone(again.callback)
            self.assertEqual(db.query(Enquiry).count(), 1)
        self.assertEqual([s for _, s, _ in self.attempts()], ["no_answer", "busy"])

    def test_answered_is_the_only_completed(self):
        from backend.server.services.department_routing import dial_result

        run(self.eng.toolbox.execute("transfer_to_human", {"department": "pg_admissions", "confirmed_by_caller": True}))
        with self.factory() as db:
            dial_result(db, self.eng.toolbox.pending["data"]["attempt_id"], "completed", "+919876543210")
        self.assertEqual(self.attempts()[0][1], "completed")

    def test_a_clinic_without_a_directory_transfers_exactly_as_before(self):
        factory, biz = make_db_factory()
        eng = engine(factory, biz)
        eng.toolbox.last_utterance = "I want to talk to a human"
        r = run(eng.toolbox.execute("transfer_to_human", {"department": "front_desk"}))
        self.assertEqual(r["code"], "transferring")
        self.assertIn("+912000000000", eng.toolbox.pending["twiml"])  # the business line, no attempt_id
        self.assertNotIn("attempt_id", eng.toolbox.pending["twiml"])


class TwilioCallbackFallback(unittest.TestCase):
    def test_transfer_status_dials_the_fallback_then_records_a_callback(self):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient

        from backend.server.api.routes import voice
        from backend.server.auth import webhook_signatures as ws
        from backend.server.database.models.vertical import Department, Enquiry
        from backend.server.database.session import get_db
        from backend.server.services.department_routing import start_attempt

        factory, biz = tenant("education", "school")
        department(factory, biz, "administration", "Administration", "+15550100000", ["general_enquiry"])
        department(factory, biz, "admissions", "Admissions", "+15550100001", ["admissions"], fallback="administration")
        with factory() as db:
            attempt = start_attempt(db, biz, "CA-7", db.query(Department).filter_by(key="admissions").one(), "admissions", "test")
        app = FastAPI()
        app.include_router(voice.router)

        def override():
            with factory() as db:
                yield db

        app.dependency_overrides[get_db] = override
        app.dependency_overrides[ws.verify_twilio] = lambda: None
        c = TestClient(app)
        form = {"DialCallStatus": "no-answer", "From": "+919876543210", "CallSid": "CA-7"}
        r = c.post(f"/api/voice/transfer-status?attempt_id={attempt.id}&staff_name=Admissions&department=admissions", data=form)
        self.assertIn("+15550100000", r.text)  # the fallback department is dialled
        self.assertIn("attempt_id=", r.text)
        nxt = r.text.split("attempt_id=")[1].split("&")[0].split('"')[0]
        r2 = c.post(f"/api/voice/transfer-status?attempt_id={nxt}&staff_name=Administration&department=administration", data=form)
        self.assertIn("call you back", r2.text)
        with factory() as db:
            self.assertEqual(db.query(Enquiry).filter_by(business_id=biz, kind="callback").count(), 1)


class LeadCapture(unittest.TestCase):
    def setUp(self):
        self.factory, self.biz = tenant("education", "coaching")
        self.eng = engine(self.factory, self.biz)
        self.tb = self.eng.toolbox
        self.tb.said = ["i want to join the jee course", "my name is ravi kumar", "9876500011"]

    def capture(self, **extra):
        args = {"name": "Ravi Kumar", "phone_number": "9876500011", "kind": "admission", "subject": "JEE course", **extra}
        return run(self.tb.execute("capture_enquiry", args))

    def rows(self):
        from backend.server.database.models.vertical import Enquiry

        with self.factory() as db:
            return [(e.kind, e.contact_phone_key, e.subject, e.business_id) for e in db.query(Enquiry).all()]

    def test_read_back_first_then_saved_once(self):
        self.assertEqual(self.capture(confirmed_by_caller=False)["code"], "needs_confirmation")
        self.tb.gate.turn += 1  # the caller's "yes" is a later turn
        self.assertEqual(self.capture(confirmed_by_caller=True)["code"], "saved")
        self.assertEqual(self.capture(confirmed_by_caller=True)["code"], "duplicate")
        self.assertEqual(self.rows(), [("admission", "9876500011", "JEE course", self.biz)])

    def test_a_second_request_on_the_same_call_updates_the_first(self):
        # A live call: "add the campus visit to my enquiry" made a second lead for the same caller.
        self.tb.gate.turn += 1
        self.assertEqual(self.capture(confirmed_by_caller=False)["code"], "needs_confirmation")
        self.tb.gate.turn += 1
        self.assertEqual(self.capture(confirmed_by_caller=True)["code"], "saved")
        more = {"kind": "demo_request", "subject": "JEE course and a campus visit", "notes": "Wants to see the labs"}
        self.tb.gate.turn += 1
        self.assertEqual(self.capture(confirmed_by_caller=False, **more)["code"], "needs_confirmation")
        self.tb.gate.turn += 1
        self.assertEqual(self.capture(confirmed_by_caller=True, **more)["code"], "updated")
        self.assertEqual(self.rows(), [("demo_request", "9876500011", "JEE course and a campus visit", self.biz)])

    def test_a_number_the_caller_never_gave_is_refused(self):
        r = run(self.tb.execute("capture_enquiry", {"name": "Ravi Kumar", "phone_number": "9999999999", "confirmed_by_caller": True}))
        self.assertEqual(r["code"], "bad_phone")
        self.assertEqual(self.rows(), [])

    def test_a_tool_outside_the_workflows_is_refused_in_code(self):
        factory, biz = tenant("salon", "barbershop")
        r = run(engine(factory, biz).toolbox.execute("capture_enquiry", {"name": "A", "phone_number": "9876500011"}))
        self.assertEqual(r["code"], "not_allowed")


class RoomsForWellness(unittest.TestCase):
    def setUp(self):
        from backend.server.database.models.service import Service
        from backend.server.database.models.vertical import Resource

        self.factory, self.biz = tenant("wellness", "day_spa")
        with self.factory() as db:
            db.add(Service(business_id=self.biz, title="Hot Stone Massage", duration_minutes=60, kind="service", resource_kind="room"))
            db.add(Resource(business_id=self.biz, name="Room 1", kind="room", capacity=1, active=True))
            db.commit()

    def book(self, name, phone, when="10 AM", day="2026-09-29"):
        eng = engine(self.factory, self.biz, call_id=None, caller="+91" + phone)
        tb = eng.toolbox
        tb.said = [f"hot stone massage on {day} at {when}", f"my name is {name}", phone]
        args = {"patient_name": name, "phone_number": phone, "preferred_date": day, "preferred_time": when,
                "service_name": "Hot Stone Massage", "confirmed_by_caller": False}
        first = run(tb.execute("book_appointment", args))
        if first.get("code") != "needs_confirmation":
            return first
        tb.gate.turn += 1
        return run(tb.execute("book_appointment", {**args, "confirmed_by_caller": True}))

    def test_a_second_session_in_the_only_room_at_the_same_time_is_refused(self):
        self.assertEqual(self.book("Asha Rao", "9876500021")["code"], "booked")
        self.assertEqual(self.book("Meera Shah", "9876500022")["code"], "no_room")
        self.assertEqual(self.book("Meera Shah", "9876500022", when="2 PM")["code"], "booked")

    def test_a_moved_session_needs_a_free_room_too(self):
        from backend.server.database.models.transaction import Transaction

        self.assertEqual(self.book("Asha Rao", "9876500021", when="10 AM")["code"], "booked")
        self.assertEqual(self.book("Meera Shah", "9876500022", when="2 PM")["code"], "booked")
        eng = engine(self.factory, self.biz, call_id=None, caller="+919876500022")
        tb = eng.toolbox
        tb.said = ["9876500022", "move it to 2026-09-29 at 10 AM"]
        found = run(tb.execute("lookup_appointment", {"phone_number": "9876500022"}))
        ref = found["appointments"][0]["ref"]
        r = run(tb.execute("reschedule_appointment", {"ref": ref, "new_date": "2026-09-29", "new_time": "10 AM", "confirmed_by_caller": False}))
        self.assertEqual(r["code"], "no_room")  # Room 1 is Asha's at 10 AM
        tb.said.append("then 4 PM please")
        r = run(tb.execute("reschedule_appointment", {"ref": ref, "new_date": "2026-09-29", "new_time": "4 PM", "confirmed_by_caller": False}))
        self.assertEqual(r["code"], "needs_confirmation")
        tb.gate.turn += 1
        r = run(tb.execute("reschedule_appointment", {"ref": ref, "new_date": "2026-09-29", "new_time": "4 PM", "confirmed_by_caller": True}))
        self.assertEqual(r["code"], "rescheduled")
        with self.factory() as db:
            moved = [t.details for t in db.query(Transaction).filter_by(type="appointment").all() if t.details.get("customer_name") == "Meera Shah"][0]
        self.assertEqual((moved["preferred_time"], moved["resource_name"]), ("04:00 PM", "Room 1"))

    def test_the_booked_session_holds_the_room(self):
        from backend.server.database.models.transaction import Transaction

        self.book("Asha Rao", "9876500021")
        with self.factory() as db:
            details = db.query(Transaction).filter_by(type="appointment").one().details
        self.assertEqual(details["resource_name"], "Room 1")
        self.assertEqual(details["doctor_name"], "Any available")  # never the clinic's "Duty Doctor"


class VerticalWordingAndTools(unittest.TestCase):
    def test_no_clinic_words_reach_a_non_healthcare_model(self):
        import re

        for vertical, subtype in (("salon", "hair_salon"), ("wellness", "massage_spa"), ("education", "university"), ("education", "edtech")):
            with self.subTest(vertical=vertical, subtype=subtype):
                factory, biz = tenant(vertical, subtype)
                eng = engine(factory, biz)
                text = eng._system + " ".join(t["function"]["description"] for t in eng.tools)
                self.assertEqual(re.findall(r"(?i)\b(?:clinic|patient|doctor)s?\b", text), [])

    def test_returning_caller_note_uses_the_verticals_words(self):
        from backend.ai.capabilities.rules.patient_privacy import known_patient_block

        history = [{"customer_name": "Asha Rao", "service_name": "Haircut", "preferred_date": "2026-09-01", "preferred_time": "10:00 AM", "status": "confirmed"}]
        self.assertIn("RETURNING CLIENT", known_patient_block(history, vertical="salon"))
        self.assertIn("RETURNING PATIENT", known_patient_block(history, vertical="clinic"))
        self.assertEqual(known_patient_block(history), known_patient_block(history, vertical="clinic"))

    def test_each_subtype_gets_only_its_workflows_tools(self):
        names = lambda v, s: sorted(t["function"]["name"] for t in engine(*tenant(v, s)).tools)
        self.assertEqual(names("education", "edtech"), ["capture_enquiry", "end_call", "search_knowledge", "transfer_to_human"])
        self.assertIn("capture_enquiry", names("education", "school"))
        self.assertNotIn("capture_enquiry", names("salon", "nail_salon"))

    def test_workflow_note_tracks_real_tool_results(self):
        factory, biz = tenant("education", "university")
        eng = engine(factory, biz, call_id=None)
        eng.toolbox.calls.append({"tool": "transfer_to_human", "args": {"department": "complaints"}, "result_code": "department_closed"})
        eng.workflow.sync(eng.toolbox.calls, {})
        self.assertIn("University enquiry", eng.workflow.note())


class Apis(unittest.TestCase):
    def setUp(self):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient

        from backend.server.api.routes import businesses, verticals
        from backend.server.auth.security import create_access_token, hash_password
        from backend.server.database.models.agent import Agent
        from backend.server.database.models.business import Business
        from backend.server.database.models.user import User
        from backend.server.database.session import get_db

        self.factory, self.biz = tenant("education", "university")
        app = FastAPI()
        app.include_router(verticals.catalog_router)
        app.include_router(verticals.router)
        app.include_router(businesses.router)

        def override():
            with self.factory() as db:
                yield db

        app.dependency_overrides[get_db] = override
        self.c = TestClient(app)
        with self.factory() as db:
            db.add(Business(id="other-biz", name="Other", vertical="salon", business_subtype="barbershop", timezone="UTC"))
            users = {
                "owner": User(email="o@x.example", hashed_password=hash_password("x" * 10), name="O", scope="business", role="owner", business_id=self.biz),
                "receptionist": User(email="r@x.example", hashed_password=hash_password("x" * 10), name="R", scope="business", role="receptionist", business_id=self.biz),
                "stranger": User(email="s@x.example", hashed_password=hash_password("x" * 10), name="S", scope="business", role="owner", business_id="other-biz"),
            }
            db.add_all(users.values())
            db.commit()
            self.h = {k: {"Authorization": f"Bearer {create_access_token(u.id)}"} for k, u in users.items()}
        self.base = f"/api/businesses/{self.biz}"

    def test_catalogue_needs_a_login_and_lists_every_vertical(self):
        self.assertEqual(self.c.get("/api/verticals").status_code, 401)
        items = self.c.get("/api/verticals", headers=self.h["receptionist"]).json()["items"]
        self.assertEqual(sorted(i["key"] for i in items), ["clinic", "education", "salon", "wellness"])
        self.assertEqual(self.c.get("/api/verticals/restaurant", headers=self.h["owner"]).status_code, 404)
        detail = self.c.get("/api/verticals/education", headers=self.h["owner"]).json()
        self.assertIn("education.university_enquiry", [w["id"] for w in detail["workflows"]])

    def test_vertical_config_roles_validation_and_isolation(self):
        url = f"{self.base}/vertical-config"
        self.assertEqual(self.c.get(url, headers=self.h["receptionist"]).json()["subtype"], "university")
        self.assertEqual(self.c.get(url, headers=self.h["stranger"]).status_code, 403)
        self.assertEqual(self.c.put(url, json={"subtype": "school"}, headers=self.h["receptionist"]).status_code, 403)
        self.assertEqual(self.c.put(url, json={"subtype": "spaceport"}, headers=self.h["owner"]).status_code, 422)
        self.assertEqual(self.c.put(url, json={"vertical": "restaurant", "subtype": "x"}, headers=self.h["owner"]).status_code, 422)
        r = self.c.put(url, json={"subtype": "school"}, headers=self.h["owner"])
        self.assertEqual((r.status_code, r.json()["subtype"], r.json()["terminology"]["customer"]), (200, "school", "Enquirer"))

    def test_activation_needs_readiness_then_locks_the_vertical(self):
        from backend.server.database.models.agent import Agent

        r = self.c.post(f"{self.base}/vertical-config/activate", headers=self.h["owner"])
        self.assertEqual(r.status_code, 200)  # the fixture has an agent, hours and bookable services
        warnings = {p["code"] for p in r.json()["problems"]}
        self.assertIn("no_departments", warnings)
        self.assertEqual(self.c.put(f"{self.base}/vertical-config", json={"vertical": "salon", "subtype": "barbershop"}, headers=self.h["owner"]).status_code, 409)
        with self.factory() as db:
            db.query(Agent).filter_by(business_id=self.biz).delete()
            db.commit()
        v = self.c.post(f"{self.base}/vertical-config/validate", headers=self.h["owner"]).json()
        self.assertFalse(v["ready"])
        self.assertIn("no_agent", {p["code"] for p in v["problems"]})

    def test_departments_crud_validates_numbers_and_loops(self):
        url = f"{self.base}/departments"
        self.assertEqual(self.c.post(url, json={"name": "Finance", "transfer_phone": "12345"}, headers=self.h["owner"]).status_code, 422)
        self.assertEqual(self.c.post(url, json={"name": "Finance"}, headers=self.h["receptionist"]).status_code, 403)
        fin = self.c.post(url, json={"name": "Finance", "transfer_phone": "+1 (555) 010-0001", "intents": ["Fees", "refund"]}, headers=self.h["owner"]).json()
        self.assertEqual((fin["key"], fin["transfer_phone"], fin["intents"]), ("finance", "+15550100001", ["fees", "refund"]))
        gen = self.c.post(url, json={"name": "General", "fallback_key": "finance"}, headers=self.h["owner"]).json()
        loop = self.c.patch(f"{url}/{fin['id']}", json={"fallback_key": "general"}, headers=self.h["owner"])
        self.assertEqual(loop.status_code, 422)
        self.assertEqual(self.c.delete(f"{url}/{fin['id']}", headers=self.h["owner"]).status_code, 409)  # General falls back to it
        self.assertEqual(self.c.delete(f"/api/businesses/other-biz/departments/{gen['id']}", headers=self.h["stranger"]).status_code, 404)
        seeded = self.c.post(f"{url}/from-template", headers=self.h["owner"]).json()["created"]
        self.assertIn("international_admissions", [d["key"] for d in seeded])
        self.assertTrue(all(d["transfer_phone"] is None for d in seeded))  # templates never invent a number

    def test_enquiries_are_member_visible_deduplicated_and_isolated(self):
        url = f"{self.base}/enquiries"
        body = {"kind": "admission", "contact_name": "Asha", "contact_phone": "+91 98765 00031", "subject": "MBA", "idempotency_key": "form-1"}
        first = self.c.post(url, json=body, headers=self.h["receptionist"])
        again = self.c.post(url, json=body, headers=self.h["receptionist"])
        self.assertEqual((first.status_code, again.status_code, again.json()["id"]), (201, 200, first.json()["id"]))
        self.assertEqual(len(self.c.get(url, headers=self.h["owner"]).json()["items"]), 1)
        eid = first.json()["id"]
        self.assertEqual(self.c.patch(f"{url}/{eid}", json={"status": "contacted"}, headers=self.h["receptionist"]).json()["status"], "contacted")
        self.assertEqual(self.c.get(f"/api/businesses/other-biz/enquiries/{eid}", headers=self.h["stranger"]).status_code, 404)
        self.assertEqual(self.c.get(url, headers=self.h["stranger"]).status_code, 403)

    def test_resources_only_of_the_verticals_kinds(self):
        url = f"{self.base}/resources"
        self.assertEqual(self.c.post(url, json={"name": "Jacuzzi", "kind": "spaceship"}, headers=self.h["owner"]).status_code, 422)
        self.assertEqual(self.c.post(url, json={"name": "Main campus", "kind": "campus"}, headers=self.h["owner"]).status_code, 201)

    def test_business_creation_accepts_only_supported_verticals_and_subtypes(self):
        url = "/api/onboarding/businesses"
        self.assertEqual(self.c.post(url, json={"name": "Pizza", "vertical": "restaurant"}, headers=self.h["owner"]).status_code, 422)
        self.assertEqual(self.c.post(url, json={"name": "X", "vertical": "salon", "business_subtype": "spaceport"}, headers=self.h["owner"]).status_code, 422)
        r = self.c.post(url, json={"name": "City Hospital", "vertical": "hospital"}, headers=self.h["owner"]).json()
        self.assertEqual((r["vertical"], r["business_subtype"]), ("clinic", "hospital"))
        r = self.c.post(url, json={"name": "Glow", "vertical": "salon", "business_subtype": "Nail salon"}, headers=self.h["receptionist"]).json()
        self.assertEqual((r["vertical"], r["business_subtype"], r["business_type"]), ("salon", "nail_salon", "beauty_personal_care"))



class AdminVerticalVisibility(unittest.TestCase):
    def test_platform_admin_sees_definitions_business_users_do_not(self):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient

        from backend.scripts.create_platform_admin import create_platform_admin
        from backend.server.api.routes import admin_verticals
        from backend.server.auth.security import create_access_token, hash_password
        from backend.server.database.models.user import User
        from backend.server.database.session import get_db

        factory, biz = tenant("education", "university")
        app = FastAPI()
        app.include_router(admin_verticals.router)

        def override():
            with factory() as db:
                yield db

        app.dependency_overrides[get_db] = override
        c = TestClient(app)
        with factory() as db:
            admin = create_platform_admin(db, "root@amsh.ai", "Root", "a-long-enough-pass")
            owner = User(email="o@x.example", hashed_password=hash_password("x" * 10), name="O", scope="business", role="owner", business_id=biz)
            db.add(owner)
            db.commit()
            ah, oh = ({"Authorization": f"Bearer {create_access_token(u.id)}"} for u in (admin, owner))
        self.assertEqual(c.get("/api/admin/verticals", headers=oh).status_code, 403)
        items = {i["name"]: i for i in c.get("/api/admin/verticals", headers=ah).json()["items"]}
        edu = items["education"]["definition"]
        self.assertEqual(edu["validation"], "ok")
        self.assertEqual(next(s for s in edu["subtypes"] if s["key"] == "university")["businesses"], 1)
        self.assertIn("education.university_enquiry", [w["id"] for w in edu["workflows"]])
        self.assertFalse(items["clinic"]["definition"]["workflow_runtime"])


if __name__ == "__main__":
    unittest.main()
