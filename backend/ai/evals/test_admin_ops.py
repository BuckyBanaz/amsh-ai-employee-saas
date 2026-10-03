"""Admin portal operations: audit log, security overview, staff accounts, support tickets, announcements."""

import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.ai.evals.fixtures import make_db_factory
from backend.server.api.routes import admin_audit, admin_users, support
from backend.server.auth.security import create_access_token
from backend.server.database.models.audit_log import AuditLog
from backend.server.database.models.business import Business
from backend.server.database.models.user import User
from backend.server.database.session import get_db


class Base(unittest.TestCase):
    def setUp(self):
        factory, self.biz = make_db_factory()
        self.factory = factory
        with factory() as db:
            db.add(Business(id="biz-2", name="Other Clinic", plan="growth"))
            users = {
                "super": User(email="s@amsh.ai", hashed_password="x", name="Super", scope="platform", role="superadmin"),
                "admin": User(email="a@amsh.ai", hashed_password="x", name="Admin", scope="platform", role="admin"),
                "owner": User(email="o@c.com", hashed_password="x", name="Owner", business_id=self.biz, role="owner"),
                "staff": User(email="st@c.com", hashed_password="x", name="Staff", business_id=self.biz, role="staff"),
                "other": User(email="x@o.com", hashed_password="x", name="Other Owner", business_id="biz-2", role="owner"),
            }
            db.add_all(users.values())
            db.commit()
            self.ids = {k: u.id for k, u in users.items()}
            self.h = {k: {"Authorization": f"Bearer {create_access_token(u.id)}"} for k, u in users.items()}
        app = FastAPI()
        for r in (admin_audit.router, admin_users.router, support.tenant_router, support.admin_router, support.announce_admin_router, support.announce_public_router):
            app.include_router(r)

        def override():
            with factory() as db:
                yield db

        app.dependency_overrides[get_db] = override
        self.c = TestClient(app)


class AuditAndSecurity(Base):
    def seed(self):
        now = datetime.now(timezone.utc)
        with self.factory() as db:
            db.add_all([
                AuditLog(action="auth.login", outcome="failure", actor_email="o@c.com", ip="1.1.1.1", created_at=now - timedelta(hours=1)),
                AuditLog(action="auth.login", outcome="failure", actor_email="o@c.com", ip="1.1.1.1", created_at=now - timedelta(hours=2)),
                AuditLog(action="auth.login_blocked", outcome="failure", actor_email="o@c.com", ip="1.1.1.1", created_at=now - timedelta(minutes=30)),
                AuditLog(action="auth.login", outcome="success", actor_email="=HYPERLINK(1)", ip="2.2.2.2", created_at=now - timedelta(days=3)),
                AuditLog(action="admin.tenant_updated", outcome="success", actor_email="a@amsh.ai", business_id=self.biz, created_at=now - timedelta(days=10)),
            ])
            db.commit()

    def test_both_need_a_platform_admin(self):
        for url in ("/api/admin/audit", "/api/admin/audit/export.csv", "/api/admin/security"):
            self.assertEqual(self.c.get(url).status_code, 401, url)
            self.assertEqual(self.c.get(url, headers=self.h["owner"]).status_code, 403, url)

    def test_audit_filters_and_pages(self):
        self.seed()
        h = self.h["admin"]
        everything = self.c.get("/api/admin/audit", headers=h).json()
        self.assertEqual(everything["total"], 5)
        self.assertEqual(everything["items"][0]["action"], "auth.login_blocked")  # newest first
        self.assertEqual(self.c.get("/api/admin/audit?action=auth.", headers=h).json()["total"], 4)
        self.assertEqual(self.c.get("/api/admin/audit?outcome=failure", headers=h).json()["total"], 3)
        self.assertEqual(self.c.get("/api/admin/audit?actor=o@c", headers=h).json()["total"], 3)
        self.assertEqual(self.c.get(f"/api/admin/audit?business_id={self.biz}", headers=h).json()["items"][0]["business_name"], "Sanjeevani Clinic")
        self.assertEqual(self.c.get("/api/admin/audit?q=2.2.2", headers=h).json()["total"], 1)
        since = (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()
        self.assertEqual(self.c.get("/api/admin/audit", params={"since": since}, headers=h).json()["total"], 4)
        page = self.c.get("/api/admin/audit?limit=2&offset=4", headers=h).json()
        self.assertEqual((len(page["items"]), page["total"]), (1, 5))
        self.assertIn("auth.login", everything["facets"]["actions"])

    def test_csv_export_neutralises_formulas(self):
        self.seed()
        r = self.c.get("/api/admin/audit/export.csv", headers=self.h["admin"])
        self.assertEqual(r.headers["content-type"].split(";")[0], "text/csv")
        self.assertIn("attachment", r.headers["content-disposition"])
        self.assertIn("'=HYPERLINK(1)", r.text)  # prefixed so a spreadsheet shows text instead of running it
        self.assertEqual(len(r.text.strip().splitlines()), 6)

    def test_security_overview_counts_failures_and_never_returns_secrets(self):
        self.seed()
        d = self.c.get("/api/admin/security", headers=self.h["admin"]).json()
        self.assertEqual((d["counters"]["failed_logins_24h"], d["counters"]["lockouts_24h"]), (2, 1))
        self.assertEqual(d["top_ips"][0], {"ip": "1.1.1.1", "failures": 2})
        self.assertEqual({a["email"] for a in d["admins"]}, {"s@amsh.ai", "a@amsh.ai"})
        text = str(d)
        from backend.server.common.config import get_settings

        for secret in ("hashed_password", get_settings().JWT_SECRET, "x" * 8):  # the setting names may appear; their values and password hashes never
            self.assertNotIn(secret, text)
        self.assertTrue(all(isinstance(c["ok"], bool) for c in d["checks"]))
        self.assertTrue(d["problems"])  # the test environment is not production-safe, and it says so


class StaffAccounts(Base):
    def test_only_a_super_admin_manages_staff(self):
        self.assertEqual(self.c.get("/api/admin/admin-users").status_code, 401)
        self.assertEqual(self.c.get("/api/admin/admin-users", headers=self.h["owner"]).status_code, 403)
        self.assertEqual(self.c.get("/api/admin/admin-users", headers=self.h["admin"]).status_code, 403)  # an admin is not a super admin
        r = self.c.get("/api/admin/admin-users", headers=self.h["super"]).json()
        self.assertEqual({u["email"] for u in r["items"]}, {"s@amsh.ai", "a@amsh.ai"})

    def test_create_validates_and_emails_a_setup_link_instead_of_setting_a_known_password(self):
        sent = []

        async def fake(user, workspace):
            sent.append(user.email)
            return True

        with patch.object(admin_users, "send_password_setup_email", fake):
            h = self.h["super"]
            self.assertEqual(self.c.post("/api/admin/admin-users", json={"name": "N", "email": "bad"}, headers=h).status_code, 400)
            self.assertEqual(self.c.post("/api/admin/admin-users", json={"name": "N", "email": "n@amsh.ai", "role": "owner"}, headers=h).status_code, 400)
            self.assertEqual(self.c.post("/api/admin/admin-users", json={"name": "N", "email": "A@amsh.ai"}, headers=h).status_code, 409)  # duplicate, any case
            ok = self.c.post("/api/admin/admin-users", json={"name": "Nina", "email": "Nina@AMSH.ai", "role": "support"}, headers=h)
            self.assertEqual(ok.status_code, 201)
        self.assertEqual((ok.json()["email"], ok.json()["role"], ok.json()["setup_email_sent"]), ("nina@amsh.ai", "support", True))
        self.assertEqual(sent, ["nina@amsh.ai"])
        with self.factory() as db:
            u = db.query(User).filter_by(email="nina@amsh.ai").one()
            self.assertEqual(u.scope, "platform")
            self.assertIsNone(u.business_id)
            self.assertNotIn(u.hashed_password, ("", "x"))

    def test_guards_keep_at_least_one_super_admin_and_protect_yourself(self):
        h = self.h["super"]
        me = self.ids["super"]
        self.assertEqual(self.c.patch(f"/api/admin/admin-users/{me}", json={"role": "admin"}, headers=h).status_code, 400)
        self.assertEqual(self.c.patch(f"/api/admin/admin-users/{me}", json={"is_active": False}, headers=h).status_code, 400)
        self.assertEqual(self.c.patch(f"/api/admin/admin-users/{self.ids['owner']}", json={"role": "admin"}, headers=h).status_code, 404)  # not a staff account
        promoted = self.c.patch(f"/api/admin/admin-users/{self.ids['admin']}", json={"role": "superadmin"}, headers=h)
        self.assertEqual(promoted.json()["role"], "superadmin")
        demoted = self.c.patch(f"/api/admin/admin-users/{self.ids['admin']}", json={"role": "analyst", "is_active": False}, headers=h)
        self.assertEqual((demoted.json()["role"], demoted.json()["active"]), ("analyst", False))
        with self.factory() as db:  # the only other super admin is gone: the last one cannot be removed by anyone
            self.assertEqual(db.query(AuditLog).filter_by(action="admin.staff_updated").count(), 2)

    def test_invited_business_users_no_longer_get_a_shared_default_password(self):
        from backend.server.api.routes import admin as admin_routes

        app = FastAPI()
        app.include_router(admin_routes.router)

        def override():
            with self.factory() as db:
                yield db

        app.dependency_overrides[get_db] = override
        c = TestClient(app)
        sent = []

        async def fake(user, workspace):
            sent.append(user.email)
            return True

        with patch.object(admin_routes, "send_password_setup_email", fake):
            r = c.post("/api/admin/business-users/invite", json={"business_id": self.biz, "name": "New", "email": "new@c.com", "role": "staff"}, headers=self.h["admin"])
            self.assertEqual(r.status_code, 200)
            self.assertTrue(r.json()["setup_email_sent"])
            self.assertEqual(c.post("/api/admin/business-users/invite", json={"business_id": self.biz, "name": "Short", "email": "short@c.com", "password": "abc"}, headers=self.h["admin"]).status_code, 400)
        from backend.server.auth.security import verify_password

        with self.factory() as db:
            self.assertFalse(verify_password("Password123!", db.query(User).filter_by(email="new@c.com").one().hashed_password))


class Tickets(Base):
    def open(self, who="owner", **over):
        body = {"subject": "Calls not answered", "body": "Since morning the AI does not pick up.", "category": "telephony", "priority": "high", **over}
        return self.c.post(f"/api/businesses/{self.biz}/tickets", json=body, headers=self.h[who])

    def test_a_clinic_opens_and_follows_its_own_ticket_only(self):
        r = self.open()
        self.assertEqual(r.status_code, 201)
        tid = r.json()["id"]
        self.assertEqual(r.json()["number"], 1001)
        self.assertEqual(self.open().json()["number"], 1002)
        mine = self.c.get(f"/api/businesses/{self.biz}/tickets", headers=self.h["staff"]).json()["items"]
        self.assertEqual(len(mine), 2)
        self.assertEqual(self.c.get(f"/api/businesses/{self.biz}/tickets/{tid}", headers=self.h["other"]).status_code, 403)
        self.assertEqual(self.c.get(f"/api/businesses/biz-2/tickets/{tid}", headers=self.h["other"]).status_code, 404)  # right clinic, someone else's ticket
        self.assertEqual(self.c.get(f"/api/businesses/{self.biz}/tickets").status_code, 401)
        self.assertEqual(self.open(subject="x").status_code, 422)
        self.assertEqual(self.open(category="nonsense").status_code, 422)

    def test_staff_work_the_ticket_and_the_clinic_never_sees_internal_notes(self):
        tid = self.open().json()["id"]
        a = self.h["admin"]
        self.assertEqual(self.c.post(f"/api/admin/tickets/{tid}/messages", json={"body": "Checking the Exotel balance.", "internal": True}, headers=a).status_code, 201)
        reply = self.c.post(f"/api/admin/tickets/{tid}/messages", json={"body": "Topped up, please retry."}, headers=a).json()
        self.assertEqual(reply["status"], "waiting")
        self.assertIsNotNone(reply["first_response_at"])
        self.assertEqual(len(reply["messages"]), 3)  # staff see the note
        clinic = self.c.get(f"/api/businesses/{self.biz}/tickets/{tid}", headers=self.h["owner"]).json()
        self.assertEqual([m["body"] for m in clinic["messages"]], ["Since morning the AI does not pick up.", "Topped up, please retry."])
        back = self.c.post(f"/api/businesses/{self.biz}/tickets/{tid}/messages", json={"body": "Works now", "internal": True}, headers=self.h["owner"]).json()
        self.assertEqual(back["status"], "open")  # a reply from the clinic reopens it, and a clinic cannot write an internal note
        self.assertEqual([m["internal"] for m in back["messages"]], [False, False, False])

    def test_admin_list_filters_counts_and_patch_rules(self):
        t1, t2 = self.open().json()["id"], self.open(priority="low", subject="Invoice question", category="billing").json()["id"]
        a = self.h["admin"]
        self.assertEqual(self.c.patch(f"/api/admin/tickets/{t1}", json={"status": "resolved"}, headers=a).json()["status"], "resolved")
        listing = self.c.get("/api/admin/tickets", headers=a).json()
        self.assertEqual((listing["counts"]["open"], listing["counts"]["resolved"], listing["total"]), (1, 1, 2))
        self.assertEqual([t["id"] for t in self.c.get("/api/admin/tickets?status=open", headers=a).json()["items"]], [t2])
        self.assertEqual(len(self.c.get("/api/admin/tickets?category=billing", headers=a).json()["items"]), 1)
        self.assertEqual(len(self.c.get("/api/admin/tickets?q=invoice", headers=a).json()["items"]), 1)
        self.assertEqual(len(self.c.get("/api/admin/tickets?q=%231001", headers=a).json()["items"]), 1)
        self.assertEqual(self.c.patch(f"/api/admin/tickets/{t2}", json={"assignee_id": self.ids["owner"]}, headers=a).status_code, 400)  # a clinic user is not staff
        assigned = self.c.patch(f"/api/admin/tickets/{t2}", json={"assignee_id": self.ids["super"], "priority": "urgent"}, headers=a).json()
        self.assertEqual((assigned["assignee"], assigned["priority"]), ("Super", "urgent"))
        self.assertEqual(len(self.c.get("/api/admin/tickets?assignee=unassigned", headers=a).json()["items"]), 1)
        self.assertEqual(self.c.patch(f"/api/admin/tickets/{t2}", json={"unassign": True}, headers=a).json()["assignee"], None)
        for url in ("/api/admin/tickets", f"/api/admin/tickets/{t1}"):
            self.assertEqual(self.c.get(url, headers=self.h["owner"]).status_code, 403)


class Announcements(Base):
    def make(self, **over):
        body = {"title": "Planned maintenance", "body": "Sunday 2am", "level": "warning", "status": "published", **over}
        return self.c.post("/api/admin/announcements", json=body, headers=self.h["admin"])

    def test_clinics_see_only_live_notices_for_their_audience(self):
        now = datetime.now(timezone.utc)
        self.make()
        self.make(title="Draft", status="draft")
        self.make(title="Expired", ends_at=(now - timedelta(days=1)).isoformat())
        self.make(title="Later", starts_at=(now + timedelta(days=1)).isoformat())
        self.make(title="Growth only", plans=["Growth"])
        self.make(title="One clinic", business_ids=[self.biz])
        seen = lambda who: sorted(a["title"] for a in self.c.get("/api/announcements", headers=self.h[who]).json()["items"])
        self.assertEqual(seen("owner"), ["One clinic", "Planned maintenance"])
        self.assertEqual(seen("other"), ["Growth only", "Planned maintenance"])
        self.assertEqual(self.c.get("/api/announcements").status_code, 401)
        self.assertNotIn("business_ids", self.c.get("/api/announcements", headers=self.h["owner"]).json()["items"][0])  # audience stays private

    def test_admin_crud_and_validation(self):
        a = self.h["admin"]
        created = self.make().json()
        self.assertIsNotNone(created["published_at"])
        self.assertEqual(self.make(title="x").status_code, 422)
        self.assertEqual(self.make(level="loud").status_code, 422)
        now = datetime.now(timezone.utc)
        self.assertEqual(self.make(starts_at=now.isoformat(), ends_at=(now - timedelta(hours=1)).isoformat()).status_code, 400)
        archived = self.c.patch(f"/api/admin/announcements/{created['id']}", json={"title": "Planned maintenance", "status": "archived"}, headers=a)
        self.assertEqual(archived.json()["status"], "archived")
        listing = self.c.get("/api/admin/announcements", headers=a).json()["items"]
        self.assertFalse(listing[0]["live"])
        self.assertEqual(self.c.delete(f"/api/admin/announcements/{created['id']}", headers=a).status_code, 204)
        self.assertEqual(self.c.delete(f"/api/admin/announcements/{created['id']}", headers=a).status_code, 404)
        self.assertEqual(self.c.get("/api/admin/announcements", headers=self.h["owner"]).status_code, 403)
        self.assertEqual(self.c.post("/api/admin/announcements", json={"title": "Hello there"}, headers=self.h["owner"]).status_code, 403)


if __name__ == "__main__":
    unittest.main()


class Verticals(Base):
    def setUp(self):
        super().setUp()
        from backend.server.api.routes import admin_verticals

        app = FastAPI()
        app.include_router(admin_verticals.router)

        def override():
            with self.factory() as db:
                yield db

        app.dependency_overrides[get_db] = override
        self.v = TestClient(app)

    def test_lists_live_verticals_with_usage_and_stays_read_only(self):
        self.assertEqual(self.v.get("/api/admin/verticals").status_code, 401)
        self.assertEqual(self.v.get("/api/admin/verticals", headers=self.h["owner"]).status_code, 403)
        data = self.v.get("/api/admin/verticals", headers=self.h["admin"]).json()
        clinic = next(i for i in data["items"] if i["name"] == "clinic")
        self.assertIn("hi", clinic["languages"])
        self.assertIn("book_appointment", clinic["tools"])
        self.assertGreaterEqual(clinic["businesses"], 1)  # the fixtures' clinic uses it
        self.assertFalse(data["editable"])
        self.assertEqual(self.v.post("/api/admin/verticals", json={}, headers=self.h["admin"]).status_code, 405)

    def test_detail_and_unknown(self):
        d = self.v.get("/api/admin/verticals/clinic?language=hi", headers=self.h["admin"]).json()
        self.assertEqual(d["language"], "hi")
        self.assertTrue(d["system_prompt_template"])
        self.assertTrue(d["intents"][0]["slots"])
        self.assertEqual(self.v.get("/api/admin/verticals/restaurant", headers=self.h["admin"]).status_code, 404)
