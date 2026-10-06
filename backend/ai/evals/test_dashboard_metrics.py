"""The clinic dashboard shows real numbers only: zero or "no data" when there is none, trends only when there is something to compare."""

import unittest
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.ai.evals.fixtures import make_db_factory
from backend.server.api.routes import dashboard_stats
from backend.server.auth.security import create_access_token
from backend.server.database.models.business import Business
from backend.server.database.models.call import Call
from backend.server.database.models.transaction import Transaction
from backend.server.database.models.user import User
from backend.server.database.session import get_db
from backend.server.services import dashboard_metrics as dm

# Wednesday 2026-09-30 10:00 in Kolkata (04:30 UTC). The fixture clinic is in Asia/Kolkata.
NOW = datetime(2026, 9, 30, 4, 30, tzinfo=timezone.utc)


def at(days_ago: int, hour: int) -> datetime:
    """A local (Kolkata) time on a given day, as UTC."""
    local = datetime(2026, 9, 30, hour, 0, tzinfo=timezone(timedelta(hours=5, minutes=30))) - timedelta(days=days_ago)
    return local.astimezone(timezone.utc)


class Metrics(unittest.TestCase):
    def setUp(self):
        self.factory, self.biz = make_db_factory()

    def run_metrics(self):
        with self.factory() as db:
            return dm.compute(db, db.get(Business, self.biz), now=NOW)

    def call(self, db, days_ago, hour, outcome="resolved", latency=None, number="+911"):
        c = Call(business_id=self.biz, caller_number=number, outcome=outcome, started_at=at(days_ago, hour), latency_ms=latency, duration_seconds=60)
        db.add(c)
        db.flush()
        return c

    def test_a_clinic_with_no_activity_gets_zeros_and_no_invented_rates(self):
        d = self.run_metrics()
        m = d["metrics"]
        self.assertEqual((m["total_calls"], m["booked_appointments"], m["new_patients"]), (0, 0, 0))
        for key in ("resolution_rate", "conversion_rate", "avg_latency", "ai_accuracy", "calls_trend", "appointments_trend", "patients_trend", "resolution_trend"):
            self.assertIsNone(m[key], key)
        self.assertEqual(m["calls_spark"], [0] * 6)
        self.assertEqual(d["performance"]["resolution_rate"], None)
        self.assertEqual(sum(b["calls"] for b in d["call_volume"]), 0)
        self.assertEqual((d["recent_activity"], d["appointment_sources"]["total"]), ([], 0))

    def test_counts_rates_and_trends_follow_the_clinics_own_day(self):
        with self.factory() as db:
            for h in (9, 9, 9, 11):  # four calls today, one of them handed to staff
                self.call(db, 0, h, outcome="transferred" if h == 11 else "resolved", latency=400 if h == 9 else 800)
            self.call(db, 1, 10)  # two yesterday
            self.call(db, 1, 15)
            self.call(db, 0, 12, outcome="live")  # still in progress: not counted as resolved or transferred
            self.call(db, 0, 23).started_at = at(0, 23)  # 23:00 local is still "today" in Kolkata (17:30 UTC)
            db.add_all([Transaction(business_id=self.biz, type="appointment", details={"phone_number": "+91001"}, created_at=at(0, 9)),
                        Transaction(business_id=self.biz, type="appointment", details={"phone_number": "+91002"}, created_at=at(1, 9))])
            db.commit()
        m = self.run_metrics()["metrics"]
        self.assertEqual(m["total_calls"], 6)
        self.assertEqual(m["calls_trend"], "+200% from yesterday")  # 6 vs 2
        self.assertEqual(m["booked_appointments"], 1)
        self.assertEqual(m["appointments_trend"], "+0% from yesterday")  # 1 vs 1
        self.assertEqual(m["resolution_rate"], "80%")  # 4 of the 5 finished calls were not handed over
        self.assertEqual(m["avg_latency"], "500ms")  # mean of the four calls that recorded a latency (400, 400, 400, 800)
        self.assertEqual(m["new_patients"], 2)
        self.assertIsNone(m["patients_trend"])  # nobody before last week to compare with
        self.assertEqual(m["calls_spark"][-1], 100)  # today is the busiest of the six days
        self.assertEqual(len(m["calls_spark"]), 6)

    def test_hourly_chart_uses_three_hour_windows_in_local_time(self):
        with self.factory() as db:
            for h in (1, 9, 10, 11, 20):
                self.call(db, 0, h)
            db.commit()
        volume = {b["time"]: b["calls"] for b in self.run_metrics()["call_volume"]}
        self.assertEqual(volume["12 AM"], 1)  # 01:00
        self.assertEqual(volume["9 AM"], 3)   # 09:00, 10:00, 11:00
        self.assertEqual(volume["6 PM"], 1)   # 20:00

    def test_performance_panel_adds_up_and_ignores_other_clinics(self):
        with self.factory() as db:
            db.add(Business(id="biz-2", name="Other"))
            a, b, c = self.call(db, 1, 9), self.call(db, 2, 9, outcome="transferred"), self.call(db, 3, 9)
            db.add(Call(business_id="biz-2", caller_number="+1", outcome="resolved", started_at=at(1, 9)))
            db.add(Transaction(business_id=self.biz, type="appointment", call_id=a.id, details={}, created_at=at(1, 9)))
            db.commit()
        p = self.run_metrics()["performance"]
        self.assertEqual((p["calls"], p["escalated_to_human"], p["booked_appointments"], p["resolved"], p["general_inquiries"]), (3, 1, 1, 2, 1))
        self.assertEqual(p["resolution_rate"], 66.7)

    def test_trend_helper(self):
        self.assertIsNone(dm.trend(5, 0, "yesterday"))
        self.assertEqual(dm.trend(3, 4, "yesterday"), "-25% from yesterday")

    def test_playground_and_studio_test_calls_are_excluded_from_metrics(self):
        with self.factory() as db:
            # 2 real calls
            self.call(db, 0, 9)
            self.call(db, 0, 10)
            # 3 playground/studio test calls
            db.add_all([
                Call(id="test_call_1", business_id=self.biz, caller_number="+91999", outcome="resolved", started_at=at(0, 9), duration_seconds=60),
                Call(id="studio_abc2", business_id=self.biz, caller_number="+91888", outcome="resolved", started_at=at(0, 10), duration_seconds=45),
                Call(id="sim_call_3", business_id=self.biz, caller_number="+91777", outcome="resolved", started_at=at(0, 11), duration_seconds=30),
            ])
            db.commit()
        m = self.run_metrics()["metrics"]
        # Only the 2 real calls are counted; the 3 test calls are skipped
        self.assertEqual(m["total_calls"], 2)



class Endpoint(unittest.TestCase):
    def test_members_only_and_shape(self):
        factory, biz = make_db_factory()
        with factory() as db:
            db.add(Business(id="biz-2", name="Other"))
            owner = User(email="o@c.com", hashed_password="x", name="Owner", business_id=biz, role="owner")
            other = User(email="x@o.com", hashed_password="x", name="Other", business_id="biz-2", role="owner")
            db.add_all([owner, other])
            db.commit()
            ho = {"Authorization": f"Bearer {create_access_token(owner.id)}"}
            hx = {"Authorization": f"Bearer {create_access_token(other.id)}"}
        app = FastAPI()
        app.include_router(dashboard_stats.router)

        def override():
            with factory() as db:
                yield db

        app.dependency_overrides[get_db] = override
        c = TestClient(app)
        self.assertEqual(c.get(f"/api/businesses/{biz}/dashboard/stats").status_code, 401)
        self.assertEqual(c.get(f"/api/businesses/{biz}/dashboard/stats", headers=hx).status_code, 403)
        body = c.get(f"/api/businesses/{biz}/dashboard/stats", headers=ho).json()
        self.assertEqual(body["metrics"]["total_calls"], 0)
        self.assertIsNone(body["metrics"]["calls_trend"])
        self.assertEqual(set(body), {"metrics", "performance", "call_volume", "appointment_sources", "recent_activity", "timezone", "as_of"})


if __name__ == "__main__":
    unittest.main()
