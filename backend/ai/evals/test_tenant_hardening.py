"""Audit P0 fixes: the appointments API touches only appointments (F1), a clinic cannot change its own plan or status (F2), calls
and WhatsApp messages reach a clinic only through a number that is unambiguously theirs (F3, F4), and trials and paid periods end (F5)."""

import unittest

from backend.ai.evals.fixtures import make_db_factory


class _Api(unittest.TestCase):
    ROUTERS = ()

    def setUp(self):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient

        from backend.server.auth.security import create_access_token, hash_password
        from backend.server.database.models.business import Business
        from backend.server.database.models.user import User
        from backend.server.database.session import get_db

        self.factory, self.biz = make_db_factory()
        app = FastAPI()
        for r in self.ROUTERS:
            app.include_router(r)

        def override():
            with self.factory() as db:
                yield db

        app.dependency_overrides[get_db] = override
        self.client = TestClient(app)
        self.Business = Business
        with self.factory() as db:
            db.add(Business(id="other-biz", name="Other Clinic"))
            users = {
                "owner": User(email="o@x.example", hashed_password=hash_password("x" * 10), name="O", scope="business", role="owner", business_id=self.biz),
                "receptionist": User(email="r@x.example", hashed_password=hash_password("x" * 10), name="R", scope="business", role="receptionist", business_id=self.biz),
                "stranger": User(email="s@x.example", hashed_password=hash_password("x" * 10), name="S", scope="business", role="owner", business_id="other-biz"),
            }
            db.add_all(users.values())
            db.commit()
            self.h = {k: {"Authorization": f"Bearer {create_access_token(u.id)}"} for k, u in users.items()}


class AppointmentsApiTouchesOnlyAppointments(_Api):
    """F1: payments and the free-trial marker live in the same table as appointments."""

    @property
    def ROUTERS(self):
        from backend.server.api.routes import appointments, billing

        return (appointments.router, billing.router)

    def _payment_id(self):
        from backend.server.database.models.transaction import Transaction

        with self.factory() as db:
            return db.query(Transaction).filter(Transaction.type == "payment").one().id

    def test_a_payment_cannot_be_read_changed_or_deleted_through_appointments(self):
        from unittest.mock import patch

        from backend.server.api.routes import billing

        with patch.object(billing, "_require_policies", lambda *a, **k: None):
            self.assertEqual(self.client.post(f"/api/billing/businesses/{self.biz}/start-trial", json={}, headers=self.h["owner"]).status_code, 200)
            pid = self._payment_id()
            base = f"/api/businesses/{self.biz}/appointments/{pid}"
            self.assertEqual(self.client.get(base, headers=self.h["owner"]).status_code, 404)
            self.assertEqual(self.client.patch(base, json={"status": "cancelled"}, headers=self.h["owner"]).status_code, 404)
            self.assertEqual(self.client.delete(base, headers=self.h["owner"]).status_code, 404)
            self.assertEqual(self._payment_id(), pid)  # still there
            # so the free trial still cannot be started twice
            self.assertEqual(self.client.post(f"/api/billing/businesses/{self.biz}/start-trial", json={}, headers=self.h["owner"]).status_code, 400)

    def test_only_an_owner_or_admin_deletes_an_appointment_staff_cancel_instead(self):
        body = {"customer_name": "Asha", "phone_number": "+919876543210", "preferred_date": "2026-10-01", "preferred_time": "10:00 AM"}
        appt = self.client.post(f"/api/businesses/{self.biz}/appointments", json=body, headers=self.h["receptionist"]).json()
        url = f"/api/businesses/{self.biz}/appointments/{appt['id']}"
        self.assertEqual(self.client.delete(url, headers=self.h["receptionist"]).status_code, 403)
        self.assertEqual(self.client.patch(url, json={"status": "cancelled"}, headers=self.h["receptionist"]).status_code, 200)
        self.assertEqual(self.client.delete(url, headers=self.h["stranger"]).status_code, 403)
        self.assertEqual(self.client.delete(url, headers=self.h["owner"]).status_code, 204)


class ClinicCannotChangeItsOwnPlan(_Api):
    """F2: plan and status move only through Billing or a platform admin; settings need an owner or admin."""

    @property
    def ROUTERS(self):
        from backend.server.api.routes import businesses

        return (businesses.router,)

    def test_plan_and_status_are_refused_for_every_clinic_role(self):
        url = f"/api/onboarding/businesses/{self.biz}"
        for who in ("owner", "receptionist"):
            for body in ({"plan": "business"}, {"status": "active"}, {"plan": "business", "status": "active", "name": "X"}):
                self.assertIn(self.client.patch(url, json=body, headers=self.h[who]).status_code, (403,), (who, body))
        with self.factory() as db:
            b = db.get(self.Business, self.biz)
            self.assertNotEqual((b.plan, b.name), ("business", "X"))

    def test_settings_need_an_owner_or_admin_and_are_audited(self):
        from backend.server.database.models.audit_log import AuditLog

        url = f"/api/onboarding/businesses/{self.biz}"
        self.assertEqual(self.client.patch(url, json={"city": "Mumbai"}, headers=self.h["receptionist"]).status_code, 403)
        self.assertEqual(self.client.patch(url, json={"city": "Mumbai"}, headers=self.h["stranger"]).status_code, 403)
        r = self.client.patch(url, json={"city": "Mumbai", "working_hours": {"Monday": []}}, headers=self.h["owner"])
        self.assertEqual((r.status_code, r.json()["city"]), (200, "Mumbai"))
        with self.factory() as db:
            row = db.query(AuditLog).filter(AuditLog.action == "business.updated").one()
            self.assertEqual(row.meta["fields"], ["city", "working_hours"])

    def test_a_platform_admin_can_still_set_them(self):
        from backend.scripts.create_platform_admin import create_platform_admin
        from backend.server.auth.security import create_access_token

        with self.factory() as db:
            admin = create_platform_admin(db, "root@amsh.ai", "Root", "a-long-enough-pass")
            h = {"Authorization": f"Bearer {create_access_token(admin.id)}"}
        r = self.client.patch(f"/api/onboarding/businesses/{self.biz}", json={"plan": "business", "status": "active"}, headers=h)
        self.assertEqual((r.status_code, r.json()["plan"]), (200, "business"))


class CallsRouteOnlyThroughAssignedNumbers(_Api):
    """F3: a call reaches a clinic only through a number the platform assigned it, never one a clinic typed into its settings."""

    @property
    def ROUTERS(self):
        from backend.server.api.routes import admin_tenant_manage

        return (admin_tenant_manage.router,)

    def setUp(self):
        super().setUp()
        from backend.scripts.create_platform_admin import create_platform_admin
        from backend.server.auth.security import create_access_token

        with self.factory() as db:
            admin = create_platform_admin(db, "root@amsh.ai", "Root", "a-long-enough-pass")
            self.admin_h = {"Authorization": f"Bearer {create_access_token(admin.id)}"}

    def _calls(self, to, forwarded_from=None, query=None):
        """(business id Twilio routed to or None, business id Exotel routed to or None)."""
        import asyncio
        from types import SimpleNamespace

        from backend.server.api.routes import exotel, voice

        with self.factory() as db:
            tw = asyncio.run(voice.handle_incoming_call(To=to, From="+911", CallSid="CA1", ForwardedFrom=forwarded_from, db=db))
            ex = asyncio.run(exotel.handle_exotel_incoming_call(SimpleNamespace(query_params=query or {}), CallSid="E1", From="+911", To=to, CallType=None, Direction=None, db=db))
        tw_biz = tw.body.decode().split("/media-stream/")[1].split('"')[0] if b"/media-stream/" in tw.body else None
        return tw_biz, (ex["business_id"] if isinstance(ex, dict) else None)

    def _assign(self, biz, number, **extra):
        return self.client.post(f"/api/admin/tenants/{biz}/numbers", json={"number": number, **extra}, headers=self.admin_h)

    def test_a_clinic_typing_another_clinics_number_into_its_settings_gets_none_of_its_calls(self):
        with self.factory() as db:
            db.get(self.Business, "other-biz").business_phone = "+912000000000"  # the same line the fixture clinic shows
            db.commit()
        self.assertEqual(self._calls("+912000000000"), (None, None))  # unassigned: nobody gets it (no dev fallback)
        self.assertEqual(self._assign(self.biz, "+91 20000 00000").status_code, 201)
        self.assertEqual(self._calls("+912000000000"), (self.biz, self.biz))
        self.assertEqual(self._calls("02000000000"), (self.biz, self.biz))  # same line, provider's local format

    def test_a_number_cannot_be_assigned_twice_and_ambiguous_rows_are_refused(self):
        from backend.server.database.models.phone_number import PhoneNumber

        self.assertEqual(self._assign(self.biz, "+912000000000").status_code, 201)
        self.assertEqual(self._assign("other-biz", "02000000000").status_code, 409)
        self.assertEqual(self._assign("other-biz", "+913000000000", mode="forwarding", forwarded_from="+912000000000").status_code, 409)
        self.assertEqual(self._assign("other-biz", "123").status_code, 422)
        self.assertEqual(self.client.post(f"/api/admin/tenants/{self.biz}/numbers", json={"number": "+914000000000"}, headers=self.h["owner"]).status_code, 403)
        with self.factory() as db:  # rows written around the API that collide: the call is refused, not guessed
            db.add(PhoneNumber(business_id="other-biz", number="2000000000", status="active"))
            db.commit()
        self.assertEqual(self._calls("+912000000000"), (None, None))

    def test_short_or_partial_numbers_never_match(self):
        self.assertEqual(self._assign(self.biz, "+912000000000").status_code, 201)
        for to in ("", "0000", "+91", "000000"):
            self.assertEqual(self._calls(to), (None, None), to)

    def test_a_forwarded_call_routes_on_the_line_it_was_forwarded_from(self):
        self.assertEqual(self._assign(self.biz, "+15550000001", mode="forwarding", forwarded_from="+912000000000").status_code, 201)
        self.assertEqual(self._calls("+15559999999", forwarded_from="+912000000000")[0], self.biz)

    def test_exotel_trusts_a_business_id_only_with_our_signature(self):
        from backend.server.auth.webhook_signatures import sign_business_route

        self.assertEqual(self._calls("+919999999999", query={"business_id": "other-biz"})[1], None)
        self.assertEqual(self._calls("+919999999999", query={"business_id": "other-biz", "bsig": sign_business_route(self.biz)})[1], None)
        self.assertEqual(self._calls("+919999999999", query={"business_id": "other-biz", "bsig": sign_business_route("other-biz")})[1], "other-biz")

    def test_assignments_are_audited_and_removable(self):
        from backend.server.database.models.audit_log import AuditLog

        pn = self._assign(self.biz, "+912000000000").json()
        self.assertEqual(self.client.delete(f"/api/admin/tenants/other-biz/numbers/{pn['id']}", headers=self.admin_h).status_code, 404)
        self.assertEqual(self.client.delete(f"/api/admin/tenants/{self.biz}/numbers/{pn['id']}", headers=self.admin_h).status_code, 200)
        self.assertEqual(self._calls("+912000000000"), (None, None))
        with self.factory() as db:
            self.assertEqual(sorted(a.action for a in db.query(AuditLog).filter(AuditLog.action.like("admin.number_%"))), ["admin.number_assigned", "admin.number_removed"])


class WhatsAppRoutesOnlyThroughUnambiguousVerifiedNumbers(_Api):
    """F4: WhatsApp routing security: generic connect refuses WhatsApp (must use Meta Embedded Signup or platform admin),
    duplicate phone_number_id is refused (409 Conflict), ambiguous matches refuse inbound messages, and platform admin
    can assign/remove WhatsApp integrations with audit logs."""

    @property
    def ROUTERS(self):
        from backend.server.api.routes import admin_tenant_manage, integrations

        return (integrations.router, integrations.dashboard_router, admin_tenant_manage.router)

    def setUp(self):
        super().setUp()
        from backend.scripts.create_platform_admin import create_platform_admin
        from backend.server.auth.security import create_access_token

        with self.factory() as db:
            admin = create_platform_admin(db, "root@amsh.ai", "Root", "a-long-enough-pass")
            self.admin_h = {"Authorization": f"Bearer {create_access_token(admin.id)}"}

    def test_generic_connect_refuses_whatsapp(self):
        body = {"provider": "whatsapp", "config": {"phone_number_id": "12345"}}
        # Onboarding route
        r1 = self.client.post(f"/api/onboarding/businesses/{self.biz}/integrations/whatsapp/connect", json=body, headers=self.h["owner"])
        self.assertEqual(r1.status_code, 400)
        self.assertIn("cannot be connected via generic connect", r1.json()["detail"])
        # Dashboard route
        r2 = self.client.post(f"/api/businesses/{self.biz}/integrations/whatsapp/connect", json=body, headers=self.h["owner"])
        self.assertEqual(r2.status_code, 400)
        self.assertIn("cannot be connected via generic connect", r2.json()["detail"])

    def test_duplicate_phone_number_id_is_refused(self):
        # Connect WhatsApp for self.biz via admin
        r1 = self.client.post(
            f"/api/admin/tenants/{self.biz}/whatsapp",
            json={"phone_number_id": "1400432583145565", "waba_id": "1129742056242779", "access_token": "EAABBBCCC111222"},
            headers=self.admin_h,
        )
        self.assertEqual(r1.status_code, 201)

        # Trying to assign same phone_number_id to another business via admin -> 409
        r2 = self.client.post(
            f"/api/admin/tenants/other-biz/whatsapp",
            json={"phone_number_id": "1400432583145565", "waba_id": "99999", "access_token": "EAAXXXYYY111222"},
            headers=self.admin_h,
        )
        self.assertEqual(r2.status_code, 409)

        # Trying to connect via embedded-signup with same phone_number_id for other-biz -> 409
        r3 = self.client.post(
            f"/api/onboarding/businesses/other-biz/integrations/whatsapp/embedded-signup",
            json={"code": "code123", "phone_number_id": "1400432583145565", "waba_id": "1129742056242779"},
            headers=self.h["stranger"],
        )
        self.assertEqual(r3.status_code, 409)

    def test_ambiguous_phone_number_id_refuses_inbound_message(self):
        from backend.server.database.models.integration import Integration
        from backend.server.services.whatsapp_agent import find_whatsapp_integration

        with self.factory() as db:
            # Two businesses sharing the same phone_number_id (e.g. legacy/direct DB write)
            db.add(Integration(business_id=self.biz, provider="whatsapp", status="connected", config={"phone_number_id": "dup999"}))
            db.add(Integration(business_id="other-biz", provider="whatsapp", status="connected", config={"phone_number_id": "dup999"}))
            db.commit()

            # Ambiguous resolution returns None
            self.assertIsNone(find_whatsapp_integration(db, "dup999"))
            # Non-existent returns None
            self.assertIsNone(find_whatsapp_integration(db, "nonexistent"))

    def test_admin_can_assign_and_remove_whatsapp(self):
        from backend.server.database.models.audit_log import AuditLog

        # Non-admin forbidden
        r_forbidden = self.client.post(
            f"/api/admin/tenants/{self.biz}/whatsapp",
            json={"phone_number_id": "555111", "waba_id": "waba1", "access_token": "EAABBBCCC111222"},
            headers=self.h["owner"],
        )
        self.assertEqual(r_forbidden.status_code, 403)

        # Admin assigns
        r_assign = self.client.post(
            f"/api/admin/tenants/{self.biz}/whatsapp",
            json={"phone_number_id": "555111", "waba_id": "waba1", "access_token": "EAABBBCCC111222", "display_phone_number": "+91 99999 88888"},
            headers=self.admin_h,
        )
        self.assertEqual(r_assign.status_code, 201)
        self.assertTrue(r_assign.json()["connected"])
        self.assertEqual(r_assign.json()["phone_number_id"], "555111")

        # Admin removes
        r_remove = self.client.delete(f"/api/admin/tenants/{self.biz}/whatsapp", headers=self.admin_h)
        self.assertEqual(r_remove.status_code, 200)
        self.assertTrue(r_remove.json()["removed"])

        # Verify audit log
        with self.factory() as db:
            actions = [a.action for a in db.query(AuditLog).filter(AuditLog.action.like("admin.whatsapp_%")).all()]
            self.assertIn("admin.whatsapp_assigned", actions)
            self.assertIn("admin.whatsapp_removed", actions)


if __name__ == "__main__":
    unittest.main()
