"""Admin alerts: sign-ups, sign-ins, trials and plan changes show up as alerts for the platform admin, with unread tracking per admin."""

import unittest
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.ai.evals.fixtures import make_db_factory
from backend.server.api.routes import admin_alerts, auth, billing
from backend.server.auth.security import create_access_token, hash_password
from backend.server.database.models.audit_log import AuditLog
from backend.server.database.models.business import Business
from backend.server.database.models.user import User
from backend.server.database.session import get_db


class AlertsBase(unittest.TestCase):
    def setUp(self):
        factory, self.biz = make_db_factory()
        self.factory = factory
        with factory() as db:
            users = {
                "admin": User(email="a@amsh.ai", hashed_password="x", name="Admin", scope="platform", role="admin"),
                "admin2": User(email="b@amsh.ai", hashed_password="x", name="Admin 2", scope="platform", role="admin"),
                "owner": User(email="o@c.com", hashed_password=hash_password("Passw0rd!x"), name="Owner", business_id=self.biz, role="owner"),
            }
            db.add_all(users.values())
            db.commit()
            self.ids = {k: u.id for k, u in users.items()}
            self.h = {k: {"Authorization": f"Bearer {create_access_token(u.id)}"} for k, u in users.items()}
        app = FastAPI()
        for r in (admin_alerts.router, billing.router, auth.router):
            app.include_router(r)

        def override():
            with factory() as db:
                yield db

        app.dependency_overrides[get_db] = override
        self.c = TestClient(app)

    def titles(self, headers=None, **params):
        body = self.c.get("/api/admin/alerts", headers=headers or self.h["admin"], params=params).json()
        return [i["title"] for i in body["items"]], body

    def seed(self, action, minutes_ago=-1, **kw):  # default: just after this admin first looked
        with self.factory() as db:
            db.add(AuditLog(action=action, created_at=datetime.now(timezone.utc) - timedelta(minutes=minutes_ago), **kw))
            db.commit()


class Feed(AlertsBase):
    def test_needs_a_platform_admin(self):
        self.assertEqual(self.c.get("/api/admin/alerts").status_code, 401)
        self.assertEqual(self.c.get("/api/admin/alerts", headers=self.h["owner"]).status_code, 403)
        self.assertEqual(self.c.get("/api/admin/alerts/unread-count", headers=self.h["owner"]).status_code, 403)

    def test_the_events_the_owner_asked_for_become_alerts(self):
        self.titles()  # a first look sets this admin's "seen" marker
        self.seed("auth.register", actor_email="new@clinic.com")
        self.seed("business.created", actor_email="new@clinic.com", business_id=self.biz, meta={"name": "Sanjeevani Clinic", "vertical": "clinic", "country": "IN"})
        self.seed("auth.login", actor_email="o@c.com", business_id=self.biz, actor_user_id=self.ids["owner"])
        self.seed("billing.trial_started", business_id=self.biz, meta={"plan_name": "Growth"})
        self.seed("billing.plan_purchased", business_id=self.biz, meta={"plan_name": "Growth", "from_trial": True, "amount": 99, "currency": "USD"})
        titles, body = self.titles()
        self.assertIn("New signup", titles)
        self.assertIn("New clinic: Sanjeevani Clinic", titles)
        self.assertIn("Sign-in", titles)
        self.assertIn("Sanjeevani Clinic started a free trial", titles)
        self.assertIn("Sanjeevani Clinic moved from trial to Growth", titles)
        self.assertEqual(body["unread"], 5)
        converted = next(i for i in body["items"] if "moved from trial" in i["title"])
        self.assertEqual((converted["category"], converted["level"], converted["message"]), ("billing", "success", "Paid 99.00 USD."))
        self.assertEqual(converted["link"], f"/businesses/{self.biz}")

    def test_a_direct_purchase_is_not_called_a_trial_conversion(self):
        self.titles()
        self.seed("billing.plan_purchased", business_id=self.biz, meta={"plan_name": "Starter", "from_trial": False})
        self.assertEqual(self.titles()[0], ["Sanjeevani Clinic subscribed to Starter"])

    def test_suspension_and_plan_changes_by_an_admin(self):
        self.titles()
        self.seed("admin.tenant_updated", actor_email="a@amsh.ai", business_id=self.biz, meta={"before": {"status": "active", "plan": "growth"}, "after": {"status": "suspended", "plan": "growth"}})
        self.seed("admin.tenant_updated", actor_email="a@amsh.ai", business_id=self.biz, meta={"before": {"status": "active", "plan": "starter"}, "after": {"status": "active", "plan": "growth"}})
        self.seed("admin.tenant_updated", actor_email="a@amsh.ai", business_id=self.biz, meta={"before": {"status": "active", "plan": "growth"}, "after": {"status": "active", "plan": "growth"}})  # nothing changed
        titles, body = self.titles()
        self.assertEqual(len(titles), 2)
        self.assertTrue(any("was suspended" in t for t in titles))
        self.assertEqual(next(i for i in body["items"] if "suspended" in i["title"])["level"], "warning")

    def test_failed_sign_ins_and_admin_sign_ins_are_security_alerts(self):
        self.titles()
        self.seed("auth.login", outcome="failure", actor_email="x@y.com", ip="9.9.9.9")
        self.seed("auth.login", actor_email="a@amsh.ai", actor_user_id=self.ids["admin"])
        _, body = self.titles()
        self.assertEqual({i["category"] for i in body["items"]}, {"security"})
        self.assertEqual(body["counts"], {"security": 2})

    def test_old_events_and_other_actions_are_left_out(self):
        self.titles()
        self.seed("auth.register", minutes_ago=60 * 24 * 40, actor_email="old@x.com")
        self.seed("auth.password_changed", actor_email="o@c.com")
        self.assertEqual(self.titles()[0], [])


class UnreadAndPreferences(AlertsBase):
    def test_unread_is_per_admin_and_mark_read_clears_it(self):
        self.titles(headers=self.h["admin"])
        self.titles(headers=self.h["admin2"])
        self.seed("auth.register", actor_email="n@c.com", minutes_ago=0)  # after both first looks, before the mark-read below
        self.assertEqual(self.c.get("/api/admin/alerts/unread-count", headers=self.h["admin"]).json(), {"unread": 1})
        self.c.post("/api/admin/alerts/mark-read", headers=self.h["admin"])
        self.assertEqual(self.c.get("/api/admin/alerts/unread-count", headers=self.h["admin"]).json(), {"unread": 0})
        self.assertEqual(self.c.get("/api/admin/alerts/unread-count", headers=self.h["admin2"]).json(), {"unread": 1})  # the other admin has not looked

    def test_muting_a_category_hides_it_and_its_unread(self):
        self.titles()
        self.seed("auth.login", actor_email="o@c.com", actor_user_id=self.ids["owner"], business_id=self.biz)
        self.seed("auth.register", actor_email="n@c.com")
        r = self.c.put("/api/admin/alerts/preferences", headers=self.h["admin"], json={"muted": ["logins", "nonsense"]})
        self.assertEqual(r.json(), {"muted": ["logins"]})
        titles, body = self.titles()
        self.assertEqual(titles, ["New signup"])
        self.assertEqual(body["unread"], 1)
        self.assertEqual(body["muted"], ["logins"])

    def test_a_first_look_has_nothing_unread(self):
        self.seed("auth.register", actor_email="n@c.com", minutes_ago=120)
        titles, body = self.titles()
        self.assertEqual(titles, ["New signup"])
        self.assertEqual(body["unread"], 0)

    def test_providers_that_need_attention_are_listed_apart(self):
        from backend.server.database.models.platform_integration import PlatformIntegration

        with self.factory() as db:
            db.add(PlatformIntegration(id="groq", name="Groq", category="llm", status="API Error", config={"message": "invalid key"}))
            db.commit()
        _, body = self.titles()
        self.assertEqual(body["attention"][0]["title"], "Groq: API Error")
        self.assertEqual(body["attention"][0]["level"], "critical")


class RealEvents(AlertsBase):
    """The audit rows come from real actions, not only from seeded data."""

    def test_starting_a_trial_and_signing_in_raise_alerts(self):
        self.titles()
        r = self.c.post(f"/api/billing/businesses/{self.biz}/start-trial", headers=self.h["owner"], json={"plan_id": "growth"})
        self.assertEqual(r.status_code, 200, r.text)
        login = self.c.post("/api/auth/login", json={"email": "o@c.com", "password": "Passw0rd!x"})
        self.assertEqual(login.status_code, 200, login.text)
        titles, _ = self.titles()
        self.assertIn("Sanjeevani Clinic started a free trial", titles)
        self.assertTrue(any(t == "Sign-in" for t in titles))

    def test_changing_plan_raises_an_alert(self):
        from backend.server.database.models.plan import Plan

        with self.factory() as db:
            db.add(Plan(key="starter", name="Starter", price=29, status="active"))
            db.commit()
        self.titles()
        self.c.post(f"/api/billing/businesses/{self.biz}/start-trial", headers=self.h["owner"], json={"plan_id": "growth"})
        r = self.c.post(f"/api/billing/businesses/{self.biz}/change-plan", headers=self.h["admin"], json={"plan_id": "starter"})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertTrue(any("changed plan" in t for t in self.titles()[0]))


if __name__ == "__main__":
    unittest.main()
