"""Message templates API and service (DOCS/24): admin and clinic endpoints, tenant isolation, resolution, rendering, preferences."""

import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.ai.evals.fixtures import make_db_factory
from backend.server.api.routes import message_templates as routes
from backend.server.auth.security import create_access_token
from backend.server.database.models.business import Business
from backend.server.database.models.message_template import MessageLog
from backend.server.database.models.user import User
from backend.server.database.session import get_db
from backend.server.services import message_templates as svc

SMS = "/booking.reminder/sms"


class MessageTemplateApi(unittest.TestCase):
    def setUp(self):
        factory, self.biz = make_db_factory()
        self.factory = factory
        with factory() as db:
            db.add(Business(id="biz-2", name="Other Clinic"))
            users = {
                "admin": User(email="a@amsh.ai", hashed_password="x", name="Admin", scope="platform", role="admin"),
                "owner": User(email="o@c.com", hashed_password="x", name="Owner", business_id=self.biz, role="owner"),
                "staff": User(email="s@c.com", hashed_password="x", name="Staff", business_id=self.biz, role="staff"),
                "other": User(email="x@o.com", hashed_password="x", name="Other", business_id="biz-2", role="owner"),
            }
            db.add_all(users.values())
            db.commit()
            self.h = {k: {"Authorization": f"Bearer {create_access_token(u.id)}"} for k, u in users.items()}
        app = FastAPI()
        app.include_router(routes.admin_router)
        app.include_router(routes.router)

        def override():
            with factory() as db:
                yield db

        app.dependency_overrides[get_db] = override
        self.c = TestClient(app)
        self.admin = "/api/admin/message-templates"
        self.mine = f"/api/businesses/{self.biz}"

    def put(self, url, who, **over):
        body = {"language": "en", "body": "Hi {{patient_name}}, see you {{date}} at {{time}}.", "status": "active", **over}
        return self.c.put(url, json=body, headers=self.h[who])

    # --- admin
    def test_admin_endpoints_need_a_platform_admin(self):
        self.assertEqual(self.c.get(f"{self.admin}/meta").status_code, 401)
        self.assertEqual(self.c.get(f"{self.admin}/meta", headers=self.h["owner"]).status_code, 403)
        meta = self.c.get(f"{self.admin}/meta", headers=self.h["admin"]).json()
        self.assertIn("booking.reminder", [e["key"] for e in meta["events"]])
        self.assertIn("hi", meta["languages"])

    def test_grid_shows_defaults_then_the_saved_template(self):
        def cell(grid, key, ch):
            return next(i for i in grid["items"] if i["key"] == key)["cells"][ch]
        grid = self.c.get(self.admin, headers=self.h["admin"]).json()
        self.assertEqual(cell(grid, "booking.reminder", "sms")["status"], "default")
        self.assertNotIn("push", next(i for i in grid["items"] if i["key"] == "booking.reminder")["cells"])  # not sent by that channel
        self.assertEqual(self.put(f"{self.admin}{SMS}", "admin", status="draft").status_code, 200)
        grid = self.c.get(self.admin, headers=self.h["admin"]).json()
        self.assertEqual(cell(grid, "booking.reminder", "sms")["status"], "draft")

    def test_saving_validates_variables_channel_language_and_email_subject(self):
        url = f"{self.admin}{SMS}"
        r = self.put(url, "admin", body="Hello {{secret}}")
        self.assertEqual(r.status_code, 400)
        self.assertIn("{{secret}}", r.json()["detail"])
        self.assertEqual(self.put(url, "admin", body="  ").status_code, 400)
        self.assertEqual(self.put(url, "admin", language="xx").status_code, 400)
        self.assertEqual(self.put(url, "admin", body="x" * 1601).status_code, 400)
        self.assertEqual(self.put(f"{self.admin}/booking.reminder/push", "admin").status_code, 404)  # event is not sent by push
        self.assertEqual(self.put(f"{self.admin}/nope/sms", "admin").status_code, 404)
        email = f"{self.admin}/booking.confirmed/email"
        self.assertEqual(self.put(email, "admin").status_code, 400)  # an email needs a subject
        self.assertEqual(self.put(email, "admin", subject="Confirmed {{date}}").status_code, 200)

    def test_versions_history_and_restore(self):
        url = f"{self.admin}{SMS}"
        self.put(url, "admin", body="first {{date}}")
        self.put(url, "admin", body="second {{date}}")
        row = self.put(url, "admin", body="third {{date}}").json()
        self.assertEqual((row["version"], [h["version"] for h in row["history"]]), (3, [2, 1]))
        back = self.c.post(f"{url}/restore", json={"language": "en", "version": 1}, headers=self.h["admin"]).json()
        self.assertEqual((back["body"], back["version"]), ("first {{date}}", 4))
        self.assertEqual(self.c.post(f"{url}/restore", json={"language": "en", "version": 99}, headers=self.h["admin"]).status_code, 404)

    def test_reset_goes_back_to_the_builtin_default(self):
        url = f"{self.admin}{SMS}"
        self.put(url, "admin", body="custom {{date}}")
        r = self.c.delete(url, headers=self.h["admin"]).json()
        self.assertEqual(r["removed"], 1)
        self.assertIn("Reminder:", r["default"]["body"])
        self.assertEqual(self.c.get(url, headers=self.h["admin"]).json()["own"], {})

    def test_preview_renders_a_sample_and_counts_sms_segments(self):
        r = self.c.post(f"{self.admin}{SMS}/preview", json={"body": "Hi {{patient_name}}, {{bogus}}"}, headers=self.h["admin"]).json()
        self.assertEqual(r["body"], "Hi Kamlesh, ")
        self.assertEqual(r["unknown_variables"], ["bogus"])
        self.assertEqual(r["sms"]["segments"], 1)
        hindi = self.c.post(f"{self.admin}{SMS}/preview", json={"body": "नमस्ते " * 11}, headers=self.h["admin"]).json()
        self.assertTrue(hindi["sms"]["unicode"])
        self.assertEqual(hindi["sms"]["segments"], 2)

    def test_whatsapp_approval_is_cleared_when_the_wording_changes(self):
        from backend.server.database.models.message_template import MessageTemplate
        url = f"{self.admin}/booking.reminder/whatsapp"
        self.put(url, "admin", body="Reminder {{date}}", whatsapp_name="reminder_v1")
        with self.factory() as db:
            row = db.query(MessageTemplate).one()
            row.meta_status = "approved"
            db.commit()
        self.assertEqual(self.put(url, "admin", body="Reminder {{date}}").json()["meta_status"], "approved")  # same text: stays approved
        self.assertIsNone(self.put(url, "admin", body="Different {{date}}").json()["meta_status"])

    # --- clinic
    def test_a_clinic_sees_only_its_own_events_and_cannot_touch_platform_ones(self):
        items = self.c.get(f"{self.mine}/message-templates", headers=self.h["owner"]).json()["items"]
        keys = [i["key"] for i in items]
        self.assertIn("booking.reminder", keys)
        self.assertNotIn("auth.password_reset", keys)
        self.assertEqual(self.put(f"{self.mine}/message-templates/auth.password_reset/email", "owner", subject="x").status_code, 403)

    def test_clinic_override_does_not_leak_to_other_clinics_and_reset_restores_the_default(self):
        url = f"{self.mine}/message-templates{SMS}"
        self.assertEqual(self.put(url, "owner", body="Dear {{patient_name}}, {{date}} {{time}} at {{clinic_name}}").status_code, 200)
        item = next(i for i in self.c.get(f"{self.mine}/message-templates", headers=self.h["owner"]).json()["items"] if i["key"] == "booking.reminder")
        self.assertTrue(item["customized"])
        with self.factory() as db:
            own = svc.resolve(db, "booking.reminder", "sms", "en", self.biz)
            other = svc.resolve(db, "booking.reminder", "sms", "en", "biz-2")
        self.assertEqual(own["source"], "business")
        self.assertEqual(other["source"], "default")
        self.assertEqual(self.c.delete(url, headers=self.h["owner"]).json()["removed"], 1)
        with self.factory() as db:
            self.assertEqual(svc.resolve(db, "booking.reminder", "sms", "en", self.biz)["source"], "default")

    def test_tenant_isolation_and_roles(self):
        url = f"{self.mine}/message-templates{SMS}"
        self.assertEqual(self.c.get(url, headers=self.h["other"]).status_code, 403)  # another clinic's owner
        self.assertEqual(self.c.get(url, headers=self.h["staff"]).status_code, 200)   # a member can read
        self.assertEqual(self.put(url, "staff").status_code, 403)                      # but not write
        self.assertEqual(self.put(url, "other").status_code, 403)
        self.assertEqual(self.c.delete(url, headers=self.h["staff"]).status_code, 403)
        self.assertEqual(self.c.get(f"{self.mine}/message-log", headers=self.h["other"]).status_code, 403)
        self.assertEqual(self.c.get(f"{self.mine}/message-preferences", headers=self.h["other"]).status_code, 403)
        self.assertEqual(self.c.get(f"{self.mine}/message-templates{SMS}").status_code, 401)
        self.assertEqual(self.c.get("/api/businesses/nope/message-templates", headers=self.h["owner"]).status_code, 404)

    def test_resolution_order_business_then_platform_then_default_then_english(self):
        with self.factory() as db:
            self.assertEqual(svc.resolve(db, "booking.reminder", "sms", "hi", self.biz)["source"], "default")
        self.put(f"{self.admin}{SMS}", "admin", body="platform {{date}}")
        with self.factory() as db:
            self.assertEqual(svc.resolve(db, "booking.reminder", "sms", "en", self.biz)["source"], "platform")
            self.assertEqual(svc.resolve(db, "booking.reminder", "sms", "hi", self.biz)["body"], "platform {{date}}")  # falls back to English
        self.put(f"{self.mine}/message-templates{SMS}", "owner", body="clinic {{date}}")
        with self.factory() as db:
            self.assertEqual(svc.resolve(db, "booking.reminder", "sms", "en", self.biz)["body"], "clinic {{date}}")
        self.put(f"{self.mine}/message-templates{SMS}", "owner", body="clinic draft {{date}}", status="draft")
        with self.factory() as db:  # a draft is never sent
            self.assertEqual(svc.resolve(db, "booking.reminder", "sms", "en", self.biz)["body"], "platform {{date}}")

    def test_preferences_validate_and_persist(self):
        url = f"{self.mine}/message-preferences"
        prefs = self.c.get(url, headers=self.h["owner"]).json()
        self.assertEqual(prefs["events"]["booking.reminder"]["order"], ["whatsapp", "sms"])
        self.assertFalse(prefs["events"]["call.missed_followup"]["enabled"])
        ok = self.c.put(url, json={"events": {"booking.reminder": {"order": ["sms", "whatsapp"], "enabled": False}}, "quiet_hours": {"enabled": True, "from": "22:00", "to": "07:30"}}, headers=self.h["owner"])
        self.assertEqual(ok.status_code, 200)
        again = self.c.get(url, headers=self.h["owner"]).json()
        self.assertEqual(again["events"]["booking.reminder"], {"enabled": False, "order": ["sms", "whatsapp"]})
        self.assertEqual(again["quiet_hours"], {"enabled": True, "from": "22:00", "to": "07:30"})
        for bad in ({"events": {"booking.reminder": {"order": ["push"]}}}, {"events": {"booking.reminder": {"order": ["sms", "sms"]}}},
                    {"events": {"auth.password_reset": {"enabled": False}}}, {"quiet_hours": {"from": "25:00"}}, {"events": {"nope": {}}}):
            self.assertEqual(self.c.put(url, json=bad, headers=self.h["owner"]).status_code, 400, bad)
        self.assertEqual(self.c.put(url, json={}, headers=self.h["staff"]).status_code, 403)

    def test_message_log_is_scoped_filtered_and_masked(self):
        with self.factory() as db:
            db.add_all([
                MessageLog(business_id=self.biz, event_key="booking.reminder", channel="sms", recipient="+919876543210", status="delivered"),
                MessageLog(business_id=self.biz, event_key="booking.confirmed", channel="whatsapp", recipient="asha@example.com", status="failed", error="Meta 2655111"),
                MessageLog(business_id="biz-2", event_key="booking.reminder", channel="sms", recipient="+911111111111", status="sent"),
            ])
            db.commit()
        mine = self.c.get(f"{self.mine}/message-log", headers=self.h["owner"]).json()["items"]
        self.assertEqual(len(mine), 2)  # the other clinic's row is not visible
        self.assertNotIn("9876543210", str(mine))
        self.assertIn("a***@example.com", [m["recipient"] for m in mine])
        failed = self.c.get(f"{self.mine}/message-log?status=failed", headers=self.h["owner"]).json()["items"]
        self.assertEqual([m["event"] for m in failed], ["Booking confirmed"])
        everything = self.c.get("/api/admin/message-log", headers=self.h["admin"]).json()["items"]
        self.assertEqual(len(everything), 3)
        self.assertEqual(self.c.get("/api/admin/message-log", headers=self.h["owner"]).status_code, 403)


class MessageTemplateRenderer(unittest.TestCase):
    def test_render_substitutes_only_values_and_escapes_html_on_request(self):
        self.assertEqual(svc.render("Hi {{name}} {{ link }}", {"name": "Asha", "link": "x"}), "Hi Asha x")
        self.assertEqual(svc.render("Hi {{name}}", {}), "Hi ")
        self.assertEqual(svc.render("{{name}}", {"name": "<b>A</b>"}, escape_html=True), "&lt;b&gt;A&lt;/b&gt;")
        self.assertEqual(svc.render("{{__import__}}", {"x": 1}), "")

    def test_every_builtin_default_only_uses_its_events_variables(self):
        for (event, channel), (subject, body) in svc._DEFAULTS.items():
            self.assertIn(channel, svc.EVENTS[event]["channels"], (event, channel))
            allowed = svc.EVENTS[event]["variables"]
            for v in svc.variables_in(body) + svc.variables_in(subject):
                self.assertIn(v, allowed, (event, channel, v))
            if channel == "email":
                self.assertTrue(subject, (event, channel))


class MessageTemplateMigration(unittest.TestCase):
    def test_migration_creates_the_tables(self):
        from sqlalchemy import create_engine, inspect

        from backend.server.database.migrate import run_migrations

        import os, tempfile
        url = f"sqlite:///{os.path.join(tempfile.mkdtemp(), 'm.db')}"
        run_migrations(url)
        tables = set(inspect(create_engine(url)).get_table_names())
        self.assertTrue({"message_templates", "message_log", "message_preferences"} <= tables)


if __name__ == "__main__":
    unittest.main()
