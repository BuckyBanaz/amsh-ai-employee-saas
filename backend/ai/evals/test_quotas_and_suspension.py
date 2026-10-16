"""Plan quotas (seats, knowledge documents, voice minutes, messages) and the block on suspended clinics."""

import unittest
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.ai.evals.fixtures import make_db_factory
from backend.server.api.routes import auth, knowledge, usage, users
from backend.server.auth.security import create_access_token, hash_password
from backend.server.database.models.business import Business
from backend.server.database.models.call import Call
from backend.server.database.models.message_template import MessageLog
from backend.server.database.models.plan import Plan
from backend.server.database.models.user import User
from backend.server.database.session import get_db
from backend.server.services import quotas

NOW = datetime(2026, 9, 30, 10, 0, tzinfo=timezone.utc)


class Base(unittest.TestCase):
    def setUp(self):
        self.factory, self.biz = make_db_factory()
        with self.factory() as db:
            db.add(Plan(key="starter", name="Starter", status="active", quotas={"seats": 2, "knowledge_docs": 1, "voice_minutes": 10, "messages": 5}, overage={"per_minute": 0, "per_message": 0, "per_gb": 0}, features=[]))
            db.add(Plan(key="scale", name="Scale", status="active", quotas={"seats": None, "knowledge_docs": None, "voice_minutes": None, "messages": None}, overage={"per_minute": 0, "per_message": 0, "per_gb": 0}, features=[]))
            b = db.get(Business, self.biz)
            b.plan = "starter"
            owner = User(email="o@c.com", hashed_password=hash_password("long-password-1"), name="Owner", business_id=self.biz, role="owner", is_active=True)
            admin = User(email="a@amsh.ai", hashed_password="x", name="Admin", scope="platform", role="admin")
            db.add_all([owner, admin])
            db.commit()
            self.owner_id = owner.id
            self.h = {"owner": {"Authorization": f"Bearer {create_access_token(owner.id)}"}, "admin": {"Authorization": f"Bearer {create_access_token(admin.id)}"}}
        app = FastAPI()
        for r in (auth.router, users.router, knowledge.router, usage.router):
            app.include_router(r)

        def override():
            with self.factory() as db:
                yield db

        app.dependency_overrides[get_db] = override
        self.c = TestClient(app)

    def biz_obj(self, db):
        return db.get(Business, self.biz)


class Quotas(Base):
    def test_usage_is_counted_from_the_clinics_own_rows_this_month(self):
        with self.factory() as db:
            db.add_all([
                Call(business_id=self.biz, caller_number="+1", duration_seconds=300, started_at=datetime(2026, 9, 5, tzinfo=timezone.utc)),
                Call(business_id=self.biz, caller_number="+1", duration_seconds=90, started_at=datetime(2026, 9, 20, tzinfo=timezone.utc)),
                Call(business_id=self.biz, caller_number="+1", duration_seconds=6000, started_at=datetime(2026, 8, 30, tzinfo=timezone.utc)),  # last month
                MessageLog(business_id=self.biz, event_key="booking.confirmed", channel="sms", recipient="+1", status="sent", created_at=datetime(2026, 9, 6, tzinfo=timezone.utc)),
                MessageLog(business_id=self.biz, event_key="booking.confirmed", channel="sms", recipient="+1", status="failed", created_at=datetime(2026, 9, 6, tzinfo=timezone.utc)),  # a failure is not a sent message
            ])
            db.commit()
            u = quotas.used(db, self.biz_obj(db), NOW)
        self.assertEqual((u["voice_minutes"], u["messages"], u["seats"]), (6.5, 1, 1))

    def test_status_states(self):
        with self.factory() as db:
            db.add(Call(business_id=self.biz, caller_number="+1", duration_seconds=9 * 60, started_at=datetime(2026, 9, 5, tzinfo=timezone.utc)))
            db.commit()
            rows = {r["key"]: r for r in quotas.status_for(db, self.biz_obj(db), NOW)}
        self.assertEqual((rows["voice_minutes"]["state"], rows["voice_minutes"]["percent"]), ("near", 90))
        self.assertEqual(rows["seats"]["state"], "ok")
        with self.factory() as db:
            b = self.biz_obj(db)
            b.plan = "scale"
            db.commit()
            self.assertEqual({r["state"] for r in quotas.status_for(db, b, NOW)}, {"unlimited"})
            b.plan = "no-such-plan"
            self.assertEqual({r["limit"] for r in quotas.status_for(db, b, NOW)}, {None})  # an unknown plan limits nothing

    def test_voice_is_only_cut_off_when_enforcement_is_on(self):
        with self.factory() as db:
            db.add(Call(business_id=self.biz, caller_number="+1", duration_seconds=11 * 60, started_at=datetime(2026, 9, 5, tzinfo=timezone.utc)))
            db.commit()
            b = self.biz_obj(db)
            self.assertTrue(quotas.voice_allowed(db, b, enforce=False, now=NOW))
            self.assertFalse(quotas.voice_allowed(db, b, enforce=True, now=NOW))
            b.plan = "scale"
            self.assertTrue(quotas.voice_allowed(db, b, enforce=True, now=NOW))

    def test_seats_are_enforced_on_invites(self):
        def invite(n):
            return self.c.post(f"/api/businesses/{self.biz}/users", json={"name": f"N{n}", "email": f"n{n}@c.com", "role": "receptionist"}, headers=self.h["owner"])

        self.assertEqual(invite(1).status_code, 201)  # owner + one invite = 2 of 2 seats
        r = invite(2)
        self.assertEqual(r.status_code, 402)
        self.assertIn("Upgrade", r.json()["detail"])

    def test_knowledge_documents_are_enforced(self):
        body = {"doc_type": "faq", "question": "Hours?", "answer": "9 to 5"}
        url = f"/api/onboarding/businesses/{self.biz}/knowledge"
        self.assertEqual(self.c.post(url, json=body, headers=self.h["owner"]).status_code, 201)
        r = self.c.post(url, json=body, headers=self.h["owner"])
        self.assertEqual(r.status_code, 402)

    def test_usage_endpoint_is_members_only(self):
        url = f"/api/businesses/{self.biz}/usage"
        self.assertEqual(self.c.get(url).status_code, 401)
        d = self.c.get(url, headers=self.h["owner"]).json()
        self.assertEqual(d["plan"]["name"], "Starter")
        self.assertEqual({q["key"] for q in d["quotas"]}, {"voice_minutes", "messages", "seats", "knowledge_docs"})
        with self.factory() as db:
            db.add(Business(id="biz-2", name="Other"))
            other = User(email="x@o.com", hashed_password="x", name="X", business_id="biz-2", role="owner", is_active=True)
            db.add(other)
            db.commit()
            tok = {"Authorization": f"Bearer {create_access_token(other.id)}"}
        self.assertEqual(self.c.get(url, headers=tok).status_code, 403)


class Suspension(Base):
    def suspend(self):
        with self.factory() as db:
            self.biz_obj(db).status = "suspended"
            db.commit()

    def test_a_suspended_clinics_staff_cannot_sign_in_but_the_clinic_data_is_kept(self):
        ok = self.c.post("/api/auth/login", json={"email": "o@c.com", "password": "long-password-1"})
        self.assertEqual(ok.status_code, 200)
        self.suspend()
        r = self.c.post("/api/auth/login", json={"email": "o@c.com", "password": "long-password-1"})
        self.assertEqual(r.status_code, 403)
        self.assertIn("suspended", r.json()["detail"])

    def test_a_token_issued_before_the_suspension_stops_working(self):
        url = f"/api/businesses/{self.biz}/usage"
        self.assertEqual(self.c.get(url, headers=self.h["owner"]).status_code, 200)
        self.suspend()
        r = self.c.get(url, headers=self.h["owner"])
        self.assertEqual(r.status_code, 403)
        self.assertIn("suspended", r.json()["detail"])

    def test_platform_admins_are_never_blocked_and_reactivation_restores_access(self):
        self.suspend()
        self.assertEqual(self.c.get(f"/api/businesses/{self.biz}/usage", headers=self.h["admin"]).status_code, 200)
        with self.factory() as db:
            self.biz_obj(db).status = "active"
            db.commit()
        self.assertEqual(self.c.get(f"/api/businesses/{self.biz}/usage", headers=self.h["owner"]).status_code, 200)


if __name__ == "__main__":
    unittest.main()
