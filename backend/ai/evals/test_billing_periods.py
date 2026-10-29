"""F5: trials and paid plans end. A trial or paid period has a stored end; after it the clinic keeps its AI for the grace period,
then its calls are refused until it pays. Nothing changes `status` in the background, and a manual (staff-given) plan has no end."""

import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from backend.ai.evals.test_policies import Base
from backend.server.billing import entitlement
from backend.server.database.models.business import Business
from backend.server.database.models.phone_number import PhoneNumber
from backend.server.database.models.plan import Plan

NOW = datetime(2026, 10, 26, 12, 0, tzinfo=timezone.utc)


def biz(status, **kw):
    return SimpleNamespace(status=status, trial_ends_at=kw.get("trial_ends_at"), current_period_end=kw.get("current_period_end"),
                           billing_cycle=kw.get("billing_cycle"))


class Access(unittest.TestCase):
    def test_a_trial_runs_to_its_end_then_the_grace_period_then_expires(self):
        b = biz("trial", trial_ends_at=NOW)
        self.assertEqual(entitlement.access(b, NOW - timedelta(days=1), grace=3), "ok")
        self.assertEqual(entitlement.access(b, NOW + timedelta(days=2), grace=3), "grace")  # a day before grace ends: still answering
        self.assertEqual(entitlement.access(b, NOW + timedelta(days=4), grace=3), "expired")  # a day after
        self.assertTrue(entitlement.answers_calls(biz("trial", trial_ends_at=NOW + timedelta(days=1)), NOW))

    def test_a_paid_period_ends_but_a_manual_plan_and_other_statuses_do_not(self):
        self.assertEqual(entitlement.access(biz("active", current_period_end=NOW, billing_cycle="monthly"), NOW + timedelta(days=10), grace=3), "expired")
        self.assertEqual(entitlement.access(biz("active", billing_cycle="manual"), NOW + timedelta(days=999)), "ok")
        self.assertEqual(entitlement.access(biz("pending"), NOW), "ok")  # pending is not decided by dates (unchanged behaviour)

    def test_sqlite_naive_datetimes_are_read_as_utc(self):
        b = biz("trial", trial_ends_at=NOW.replace(tzinfo=None))
        self.assertEqual(entitlement.access(b, NOW + timedelta(days=10), grace=3), "expired")

    def test_a_month_is_a_calendar_month(self):
        self.assertEqual(entitlement.add_cycle(datetime(2026, 1, 31, tzinfo=timezone.utc), "monthly").date().isoformat(), "2026-02-28")
        self.assertEqual(entitlement.add_cycle(datetime(2026, 10, 26, tzinfo=timezone.utc), "yearly").date().isoformat(), "2027-10-26")


class Payments(unittest.TestCase):
    def test_renewing_early_adds_a_cycle_to_the_current_end(self):
        b = biz("active", current_period_end=NOW + timedelta(days=10), billing_cycle="monthly")
        entitlement.paid_period(b, "monthly", NOW)
        self.assertEqual(b.current_period_end, entitlement.add_cycle(NOW + timedelta(days=10), "monthly"))  # no days lost

    def test_paying_after_expiry_starts_from_now(self):
        b = biz("active", current_period_end=NOW - timedelta(days=20), billing_cycle="monthly")
        entitlement.paid_period(b, "yearly", NOW)
        self.assertEqual((b.current_period_end, b.billing_cycle), (entitlement.add_cycle(NOW, "yearly"), "yearly"))

    def test_a_prorated_upgrade_keeps_the_period_already_paid_for(self):
        end = NOW + timedelta(days=12)
        b = biz("active", current_period_end=end, billing_cycle="monthly")
        entitlement.paid_period(b, "monthly", NOW, keep_end=True)
        self.assertEqual(b.current_period_end, end)

    def test_a_trial_that_pays_becomes_a_paid_period_from_now(self):
        b = biz("trial", trial_ends_at=NOW + timedelta(days=5))
        entitlement.paid_period(b, "monthly", NOW)
        self.assertEqual((b.status, b.current_period_end), ("active", entitlement.add_cycle(NOW, "monthly")))


class BillingRoutes(Base):
    def setUp(self):
        super().setUp()
        from backend.server.api.routes import admin, billing, plivo, voice
        from backend.server.auth.webhook_signatures import verify_plivo, verify_twilio

        for r in (billing.router, voice.router, plivo.router, admin.router):
            self.c.app.include_router(r)
        for dep in (verify_twilio, verify_plivo):
            self.c.app.dependency_overrides[dep] = lambda: None  # signatures are tested in test_security
        with self.factory() as db:
            db.add(PhoneNumber(business_id=self.biz, number="+15550001111", mode="dedicated", status="active"))
            db.add(Plan(key="starter", name="Starter", price=99.0, cycle="monthly", price_yearly=990.0, status="active", kind="catalog"))
            db.commit()

    def _incoming(self):
        r = self.c.post("/api/voice/incoming", data={"To": "+15550001111", "From": "+15559998888", "CallSid": "CA-test"})
        self.assertEqual(r.status_code, 200, r.text)  # answered or politely refused, never an error
        return r

    def _set(self, **fields):
        with self.factory() as db:
            b = db.get(Business, self.biz)
            for k, v in fields.items():
                setattr(b, k, v)
            db.commit()

    def test_starting_a_trial_stores_its_real_end_and_the_billing_page_shows_it(self):
        r = self.c.post(f"/api/billing/businesses/{self.biz}/start-trial", headers=self.h["owner"], json={"plan_id": "starter"})
        self.assertEqual(r.status_code, 200, r.text)
        with self.factory() as db:
            b = db.get(Business, self.biz)
            days = (entitlement._utc(b.trial_ends_at) - datetime.now(timezone.utc)).days
        self.assertIn(days, (13, 14))  # the configured 14 days, from the trial's start (not the business's creation)
        s = self.c.get(f"/api/billing/businesses/{self.biz}", headers=self.h["owner"]).json()
        self.assertEqual((s["status"], s["access"], s["days_left"]), ("trial", "ok", 14))
        self.assertIsNotNone(s["renewal_date"])

    def test_an_expired_trial_refuses_calls_but_the_grace_period_does_not(self):
        self._set(status="trial", trial_ends_at=datetime.now(timezone.utc) - timedelta(days=1))
        self.assertNotIn("temporarily unavailable", self._incoming().text)  # in grace: still answered
        self._set(trial_ends_at=datetime.now(timezone.utc) - timedelta(days=30))
        self.assertIn("temporarily unavailable", self._incoming().text)
        s = self.c.get(f"/api/billing/businesses/{self.biz}", headers=self.h["owner"]).json()
        self.assertEqual((s["access"], s["days_left"]), ("expired", 0))
        with self.factory() as db:
            self.assertEqual(db.get(Business, self.biz).status, "trial")  # nothing flipped the status: access is read from dates

    def test_plivo_calls_are_refused_the_same_way(self):  # the Indian-number path
        def plivo():
            r = self.c.post("/api/voice/plivo/incoming", data={"To": "+15550001111", "From": "+919999988888", "CallUUID": "pl-1"})
            self.assertEqual(r.status_code, 200, r.text)
            return r.text
        self._set(status="trial", trial_ends_at=datetime.now(timezone.utc) - timedelta(days=1))
        self.assertNotIn("temporarily unavailable", plivo())
        self._set(trial_ends_at=datetime.now(timezone.utc) - timedelta(days=30))
        self.assertIn("temporarily unavailable", plivo())

    def test_an_expired_paid_plan_refuses_calls_until_it_pays(self):
        self._set(status="active", billing_cycle="monthly", current_period_end=datetime.now(timezone.utc) - timedelta(days=30))
        self.assertIn("temporarily unavailable", self._incoming().text)
        from unittest.mock import patch
        from backend.server.api.routes import billing
        from backend.server.common.config import get_settings

        # dev mode, whatever .env holds: no Razorpay order to read, signature accepted (both are tested elsewhere)
        with patch.object(get_settings(), "ALLOW_DEV_FALLBACKS", True), patch.object(billing, "_payments_configured", lambda: False), \
                patch.object(billing.RazorpayGateway, "verify_signature", staticmethod(lambda **kw: True)):
            r = self.c.post("/api/billing/razorpay/verify", headers=self.h["owner"], json={
                "razorpay_order_id": "order_x", "razorpay_payment_id": "pay_x", "razorpay_signature": "s", "plan_id": "starter",
                "business_id": self.biz, "cycle": "monthly"})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertNotIn("temporarily unavailable", self._incoming().text)
        with self.factory() as db:
            end = entitlement._utc(db.get(Business, self.biz).current_period_end)
        self.assertGreater(end, datetime.now(timezone.utc) + timedelta(days=27))  # a month from the payment

    def test_staff_turning_on_a_clinic_with_no_paid_period_marks_it_manual(self):
        self._set(status="pending")
        r = self.c.patch(f"/api/admin/tenants/{self.biz}", headers=self.h["super"], json={"status": "active"})
        self.assertEqual(r.status_code, 200, r.text)
        with self.factory() as db:
            self.assertEqual(db.get(Business, self.biz).billing_cycle, "manual")
        self.assertNotIn("temporarily unavailable", self._incoming().text)


class Migration(unittest.TestCase):
    def test_existing_trials_and_paid_plans_get_a_full_period_from_today_and_status_is_untouched(self):
        import importlib
        from unittest.mock import patch

        import sqlalchemy as sa
        from alembic.migration import MigrationContext
        from alembic.operations import Operations

        engine = sa.create_engine("sqlite://")
        with engine.begin() as conn:
            conn.execute(sa.text("CREATE TABLE businesses (id TEXT PRIMARY KEY, status TEXT, plan TEXT)"))
            conn.execute(sa.text("CREATE TABLE plans (key TEXT, price FLOAT, cycle TEXT, price_yearly FLOAT)"))
            conn.execute(sa.text("CREATE TABLE transactions (business_id TEXT, type TEXT, status TEXT, details TEXT, created_at TEXT)"))
            conn.execute(sa.text("INSERT INTO plans VALUES ('starter', 99, 'monthly', 990)"))
            for row in (("t1", "trial", "starter"), ("m1", "active", "starter"), ("y1", "active", "starter"), ("g1", "active", "starter"),
                        ("p1", "pending", "starter"), ("s1", "suspended", "starter")):
                conn.execute(sa.text("INSERT INTO businesses VALUES (:a, :b, :c)"), dict(zip("abc", row)))
            for b, amount in (("m1", 99), ("y1", 990)):
                conn.execute(sa.text("INSERT INTO transactions VALUES (:b, 'payment', 'confirmed', :d, '2026-10-01')"),
                             {"b": b, "d": '{"amount": %s, "payment_id": "pay_%s"}' % (amount, b)})
            mig = importlib.import_module("backend.migrations.versions.0016_billing_periods")
            with patch.object(mig, "op", Operations(MigrationContext.configure(conn))):
                mig.upgrade()
            rows = {r[0]: r[1:] for r in conn.execute(sa.text("SELECT id, status, billing_cycle, current_period_end, trial_ends_at FROM businesses"))}
        self.assertEqual(rows["m1"][:2], ("active", "monthly"))
        self.assertEqual(rows["y1"][:2], ("active", "yearly"))
        self.assertEqual(rows["g1"][:3], ("active", "manual", None))  # never paid (staff-given): no end
        self.assertIsNotNone(rows["t1"][3])
        self.assertEqual([rows[k][0] for k in ("t1", "p1", "s1")], ["trial", "pending", "suspended"])  # status untouched
        self.assertEqual(rows["p1"][1:], (None, None, None))


if __name__ == "__main__":
    unittest.main()
