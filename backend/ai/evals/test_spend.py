"""Admin spend and profit: what each tool costs, per clinic and per day, against the cash collected."""

import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.ai.evals.fixtures import make_db_factory
from backend.server.api.routes import admin_spend
from backend.server.auth.security import create_access_token
from backend.server.database.models.business import Business
from backend.server.database.models.call import Call
from backend.server.database.models.message import Message
from backend.server.database.models.message_template import MessageLog
from backend.server.database.models.spend import CostRate, UsageEvent
from backend.server.database.models.transaction import Transaction
from backend.server.database.models.user import User
from backend.server.database.session import get_db

NOW = datetime.now(timezone.utc)


class SpendBase(unittest.TestCase):
    def setUp(self):
        self.factory, self.biz = make_db_factory()
        with self.factory() as db:
            db.add(Business(id="biz-trial", name="Trial Clinic", plan="starter", status="trial"))
            db.add_all([
                User(email="s@amsh.ai", hashed_password="x", name="Super", scope="platform", role="superadmin"),
                User(email="a@amsh.ai", hashed_password="x", name="Admin", scope="platform", role="admin"),
                User(email="o@c.com", hashed_password="x", name="Owner", business_id=self.biz, role="owner"),
            ])
            db.commit()
            ids = {u.email: u.id for u in db.query(User).all()}
        self.h = {k: {"Authorization": f"Bearer {create_access_token(ids[e])}"} for k, e in (("super", "s@amsh.ai"), ("admin", "a@amsh.ai"), ("owner", "o@c.com"))}
        app = FastAPI()
        app.include_router(admin_spend.router)

        def override():
            with self.factory() as db:
                yield db

        app.dependency_overrides[get_db] = override
        self.c = TestClient(app)

    def call(self, call_id, biz, seconds, ai_chars=0, days_ago=0):
        with self.factory() as db:
            db.add(Call(id=call_id, business_id=biz, caller_number="+911", duration_seconds=seconds, started_at=NOW - timedelta(days=days_ago)))
            db.commit()
            if ai_chars:
                db.add(Message(call_id=call_id, speaker="AI", text="x" * ai_chars, created_at=NOW - timedelta(days=days_ago)))
                db.add(Message(call_id=call_id, speaker="User", text="y" * 900, created_at=NOW - timedelta(days=days_ago)))  # the caller's words are not spoken by us
                db.commit()

    def add(self, *objs):
        with self.factory() as db:
            db.add_all(objs)
            db.commit()

    def report(self, **p):
        r = self.c.get("/api/admin/spend", headers=self.h["admin"], params=p)
        self.assertEqual(r.status_code, 200, r.text)
        return r.json()


class Math(SpendBase):
    def seed(self):
        self.call("real-1", self.biz, 600, ai_chars=1000)  # 10 minutes on the phone
        self.add(
            UsageEvent(business_id=self.biz, tool="llm", provider="groq", input_units=2_000_000, output_units=1_000_000, source="live"),
            UsageEvent(business_id=self.biz, tool="llm", provider="gemini:gemini-3.1-flash-lite", input_units=1_000_000, output_units=0, estimated=True, source="live"),
            MessageLog(business_id=self.biz, event_key="booking.confirmed", channel="sms", recipient="x", status="sent"),
            MessageLog(business_id=self.biz, event_key="booking.confirmed", channel="sms", recipient="x", status="delivered"),
            MessageLog(business_id=self.biz, event_key="booking.confirmed", channel="sms", recipient="x", status="failed"),  # not charged
            MessageLog(business_id=self.biz, event_key="reminder", channel="email", recipient="x", status="sent"),
            Transaction(business_id=self.biz, type="payment", status="confirmed", details={"amount": 99.0, "currency": "USD"}),
            Transaction(business_id=self.biz, type="payment", status="confirmed", details={"amount": 0.0, "payment_id": "trial_no_card_required"}),
            Transaction(business_id=self.biz, type="payment", status="confirmed", details={"amount": 5000.0, "currency": "INR"}),
        )

    def test_every_tool_is_priced_from_what_was_recorded(self):
        self.seed()
        tools = {t["tool"]: t for t in self.report()["by_tool"]}
        self.assertAlmostEqual(tools["telephony"]["cost"], 10 * 0.012, places=4)
        self.assertAlmostEqual(tools["stt"]["cost"], 10 * 0.0043, places=4)
        self.assertAlmostEqual(tools["tts"]["cost"], 1000 / 1000 * 0.03, places=4)  # only the AI's turns are spoken by us
        self.assertAlmostEqual(tools["llm.groq"]["cost"], 2 * 0.15 + 1 * 0.60, places=4)
        self.assertAlmostEqual(tools["llm.gemini"]["cost"], 1 * 0.10, places=4)
        self.assertAlmostEqual(tools["sms"]["cost"], 2 * 0.0075, places=4)  # the failed one costs nothing
        self.assertAlmostEqual(tools["email"]["cost"], 0.0004, places=4)
        self.assertTrue(tools["llm.gemini"]["estimated"] and not tools["llm.groq"]["estimated"])

    def test_profit_is_cash_collected_minus_spend(self):
        self.seed()
        r = self.report()
        spend = sum(t["cost"] for t in r["by_tool"])
        self.assertAlmostEqual(r["totals"]["spend"], spend, places=3)
        self.assertEqual(r["totals"]["revenue"], 99.0)  # the trial row is not revenue; the rupee payment is left out, not converted
        self.assertAlmostEqual(r["totals"]["profit"], 99.0 - spend, places=3)
        self.assertAlmostEqual(r["totals"]["margin_pct"], (99 - spend) / 99 * 100, places=1)
        self.assertTrue(any("other than USD" in n for n in r["notes"]))
        self.assertTrue(any("counted from text length" in n for n in r["notes"]))
        clinic = next(t for t in r["by_tenant"] if t["id"] == self.biz)
        self.assertEqual((clinic["calls"], clinic["minutes"], clinic["revenue"]), (1, 10.0, 99.0))

    def test_shares_add_up_and_the_daily_series_covers_every_day(self):
        self.seed()
        r = self.report(days=7)
        self.assertAlmostEqual(sum(t["share_pct"] for t in r["by_tool"]), 100, delta=0.5)
        self.assertEqual(len(r["by_day"]), 7)
        self.assertAlmostEqual(sum(d["spend"] for d in r["by_day"]), r["totals"]["spend"], places=3)

    def test_testing_is_counted_apart_and_playground_calls_use_no_phone_line(self):
        self.call("sim_abc", self.biz, 300, ai_chars=2000)  # a browser playground call
        self.call("test_call_xyz", self.biz, 120)  # a "call me" test: a real phone line, but a test
        self.add(UsageEvent(business_id=self.biz, tool="llm", provider="groq", input_units=1_000_000, output_units=0, source="test"))
        r = self.report()
        tools = {t["tool"]: t for t in r["by_tool"]}
        self.assertAlmostEqual(tools["telephony"]["quantity"], 2.0)  # only the 2-minute phone test, not the 5-minute browser one
        self.assertAlmostEqual(tools["stt"]["cost"], 0.0)  # test calls are not counted as live speech recognition
        self.assertAlmostEqual(tools["tts"]["cost"], 2 * 0.03, places=4)  # but the voice was synthesised
        self.assertAlmostEqual(r["totals"]["testing_spend"], r["totals"]["spend"], places=4)  # everything here was testing
        clinic = next(t for t in r["by_tenant"] if t["id"] == self.biz)
        self.assertEqual(clinic["calls"], 0)  # test calls are not counted as the clinic's calls

    def test_old_activity_falls_outside_the_window(self):
        self.call("old-1", self.biz, 600, days_ago=45)
        self.assertEqual(self.report(days=30)["totals"]["spend"], 0)
        self.assertGreater(self.report(days=90)["totals"]["spend"], 0)

    def test_clinics_costing_the_most_against_revenue_come_first_and_trial_burn_is_shown(self):
        self.call("real-1", self.biz, 600)
        self.call("real-2", "biz-trial", 6000)  # a trial clinic burning a lot, paying nothing
        self.add(Transaction(business_id=self.biz, type="payment", status="confirmed", details={"amount": 99.0, "currency": "USD"}))
        r = self.report()
        self.assertEqual([t["id"] for t in r["by_tenant"]], ["biz-trial", self.biz])
        self.assertLess(r["by_tenant"][0]["profit"], 0)
        self.assertGreater(r["totals"]["trial_spend"], 0)

    def test_clinics_at_a_plan_limit_are_listed(self):
        from backend.server.database.models.plan import Plan

        self.add(Plan(key="starter", name="Starter", price=29, status="active", quotas={"voice_minutes": 100}))
        self.call("real-1", "biz-trial", 5400)  # 90 of 100 minutes this month
        limits = self.report()["limits"]
        self.assertEqual([(l["id"], l["key"], l["state"], l["percent"]) for l in limits], [("biz-trial", "voice_minutes", "near", 90)])

    def test_no_revenue_means_no_margin_instead_of_a_division_error(self):
        self.call("real-1", self.biz, 60)
        self.assertIsNone(self.report()["totals"]["margin_pct"])


class RateCard(SpendBase):
    def test_reading_needs_an_admin_and_editing_needs_a_super_admin(self):
        self.assertEqual(self.c.get("/api/admin/spend").status_code, 401)
        self.assertEqual(self.c.get("/api/admin/spend", headers=self.h["owner"]).status_code, 403)
        self.assertEqual(self.c.get("/api/admin/spend/rates", headers=self.h["owner"]).status_code, 403)
        self.assertEqual(self.c.put("/api/admin/spend/rates", headers=self.h["admin"], json={"prices": {"tts": 0.05}}).status_code, 403)

    def test_an_edited_price_reprices_the_history_and_going_back_to_default_clears_it(self):
        self.call("real-1", self.biz, 60, ai_chars=1000)
        base = {t["tool"]: t for t in self.report()["by_tool"]}["tts"]["cost"]
        r = self.c.put("/api/admin/spend/rates", headers=self.h["super"], json={"prices": {"tts": 0.06}})
        self.assertEqual(r.status_code, 200, r.text)
        tts = next(i for i in r.json()["items"] if i["key"] == "tts")
        self.assertEqual((tts["price"], tts["default"], tts["edited"]), (0.06, 0.03, True))
        self.assertAlmostEqual({t["tool"]: t for t in self.report()["by_tool"]}["tts"]["cost"], base * 2, places=5)
        self.c.put("/api/admin/spend/rates", headers=self.h["super"], json={"prices": {"tts": 0.03}})
        with self.factory() as db:
            self.assertEqual(db.query(CostRate).count(), 0)

    def test_bad_prices_are_refused(self):
        for body in ({"nonsense": 1.0}, {"tts": -1.0}, {"tts": 99999.0}):
            self.assertEqual(self.c.put("/api/admin/spend/rates", headers=self.h["super"], json={"prices": body}).status_code, 422, body)
        with self.factory() as db:
            self.assertEqual(db.query(CostRate).count(), 0)

    def test_the_card_lists_every_tool_with_its_unit(self):
        items = self.c.get("/api/admin/spend/rates", headers=self.h["admin"]).json()["items"]
        self.assertEqual({i["key"] for i in items}, {"llm.groq.input", "llm.groq.output", "llm.gemini.input", "llm.gemini.output", "stt", "tts", "telephony", "sms", "whatsapp", "email"})
        self.assertTrue(all(i["unit"] and i["default"] >= 0 and not i["edited"] for i in items))


class Metering(unittest.TestCase):
    def test_the_backend_reports_tokens_to_the_clinic_sink_and_a_broken_sink_never_breaks_a_reply(self):
        from backend.ai.engine.agent.llm_backend import GroqChatBackend

        seen = []
        b = GroqChatBackend()
        b.usage_sink = lambda *a: seen.append(a)
        b._record_usage({"prompt_tokens": 120, "completion_tokens": 30})
        self.assertEqual(seen, [("groq", b.model, 120, 30, False)])
        b.usage_sink = lambda *a: 1 / 0
        b._record_usage({"prompt_tokens": 1, "completion_tokens": 1})  # must not raise
        self.assertEqual(b.usage["calls"], 2)

    def test_recording_writes_an_event_and_marks_test_calls(self):
        from backend.server.services import cost_tracking

        factory, biz = make_db_factory()
        with patch("backend.server.database.session.SessionLocal", factory), patch.dict("os.environ", {}, clear=False):
            cost_tracking.record_llm(biz, "sim_1", "groq", 100, 20, estimated=True)  # a test call id
            cost_tracking.record_llm(biz, "CA123", "gemini", 50, 5)
            cost_tracking.record_llm(biz, "CA123", "gemini", 0, 0)  # nothing to record
        with factory() as db:
            rows = db.query(UsageEvent).order_by(UsageEvent.provider).all()
        self.assertEqual([(r.provider, r.source, r.estimated, r.input_units) for r in rows], [("gemini", "live", False, 50), ("groq", "test", True, 100)])

    def test_a_scripted_backend_without_a_hook_is_left_alone(self):
        from backend.ai.evals.test_agent_core import ScriptedBackend, make_engine

        engine, _ = make_engine(ScriptedBackend())
        self.assertFalse(hasattr(engine.backend, "usage_sink"))

    def test_the_engine_hooks_every_backend_in_a_fallback_chain(self):
        from backend.ai.engine.agent.llm_backend import FallbackChatBackend, GeminiChatBackend, GroqChatBackend
        from backend.ai.evals.test_agent_core import make_engine

        chain = FallbackChatBackend([GroqChatBackend(), GeminiChatBackend()])
        engine, _ = make_engine(chain)
        self.assertTrue(all(b.usage_sink for b in engine.backend.backends))


if __name__ == "__main__":
    unittest.main()
