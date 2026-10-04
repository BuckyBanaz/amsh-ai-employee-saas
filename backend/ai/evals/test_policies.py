"""Policy and privacy management: documents by region and vertical, acceptance, and the AI following the platform's privacy rules."""

import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.ai.evals.fixtures import make_db_factory
from backend.server.api.routes import admin_policies, auth, policies as policy_routes
from backend.server.auth.security import create_access_token
from backend.server.database.models.audit_log import AuditLog
from backend.server.database.models.business import Business
from backend.server.database.models.policy import PolicyAcceptance
from backend.server.database.models.user import User
from backend.server.database.session import get_db
from backend.server.services import policies as svc

BODY = "# Heading\n\nSome policy text that is long enough to publish."


class Base(unittest.TestCase):
    def setUp(self):
        self.factory, self.biz = make_db_factory()
        with self.factory() as db:
            db.get(Business, self.biz).country = "India"
            db.add(Business(id="biz-us", name="US Clinic", country="United States", vertical="clinic"))
            users = {
                "super": User(email="s@amsh.ai", hashed_password="x", name="Super", scope="platform", role="superadmin"),
                "admin": User(email="a@amsh.ai", hashed_password="x", name="Admin", scope="platform", role="admin"),
                "owner": User(email="o@c.com", hashed_password="x", name="Owner", business_id=self.biz, role="owner"),
                "staff": User(email="st@c.com", hashed_password="x", name="Staff", business_id=self.biz, role="staff"),
                "usowner": User(email="u@us.com", hashed_password="x", name="US Owner", business_id="biz-us", role="owner"),
            }
            db.add_all(users.values())
            db.commit()
            self.ids = {k: u.id for k, u in users.items()}
        self.h = {k: {"Authorization": f"Bearer {create_access_token(i)}"} for k, i in self.ids.items()}
        app = FastAPI()
        for r in (admin_policies.router, policy_routes.public_router, policy_routes.business_router, auth.router):
            app.include_router(r)

        def override():
            with self.factory() as db:
                yield db

        app.dependency_overrides[get_db] = override
        self.c = TestClient(app)

    def make(self, key="terms", region="*", vertical="*", body=BODY, publish=True, requires_acceptance=True, who="super"):
        r = self.c.post("/api/admin/policies", headers=self.h[who], json={"key": key, "title": key.title(), "scope_region": region, "scope_vertical": vertical, "requires_acceptance": requires_acceptance, "body": body})
        self.assertEqual(r.status_code, 201, r.text)
        pid = r.json()["id"]
        if publish:
            self.assertEqual(self.c.post(f"/api/admin/policies/{pid}/publish", headers=self.h["super"]).status_code, 200)
        return pid

    def status(self, who="owner", biz=None):
        return self.c.get(f"/api/businesses/{biz or self.biz}/policies", headers=self.h[who]).json()


class Resolution(Base):
    def test_the_most_specific_policy_wins_per_key_and_unknown_regions_get_only_global(self):
        self.make("privacy", body="# Global privacy text that is long enough to publish")
        self.make("privacy", region="DPDP", body="# India privacy text that is long enough to publish")
        self.make("privacy", region="US", body="# US privacy text that is long enough to publish")
        self.make("baa", region="HIPAA", vertical="clinic", body="# BAA text that is long enough to publish for clinics")
        with self.factory() as db:
            by = lambda country, vertical="clinic": {p.key: v.body.split("\n")[0] for p, v in svc.applicable(db, country, vertical)}  # noqa: E731
            self.assertEqual(by("India")["privacy"], "# India privacy text that is long enough to publish")  # framework beats global
            self.assertEqual(by("USA")["privacy"], "# US privacy text that is long enough to publish")  # country beats global
            self.assertIn("baa", by("United States"))  # HIPAA clinic
            self.assertNotIn("baa", by("United States", "salon"))  # not for another vertical
            self.assertNotIn("baa", by("India"))
            self.assertEqual(set(by("Atlantis")), {"privacy"})  # an unrecognised country is not guessed at: global only
            self.assertEqual(by("")["privacy"], "# Global privacy text that is long enough to publish")

    def test_unpublished_and_archived_policies_do_not_apply(self):
        pid = self.make("terms", publish=False)
        with self.factory() as db:
            self.assertEqual(svc.applicable(db, "India", "clinic"), [])
        self.c.post(f"/api/admin/policies/{pid}/publish", headers=self.h["super"])
        with self.factory() as db:
            self.assertEqual(len(svc.applicable(db, "India", "clinic")), 1)
        self.c.post(f"/api/admin/policies/{pid}/archive", headers=self.h["super"])
        with self.factory() as db:
            self.assertEqual(svc.applicable(db, "India", "clinic"), [])
        self.c.post(f"/api/admin/policies/{pid}/restore", headers=self.h["super"])
        with self.factory() as db:
            self.assertEqual(len(svc.applicable(db, "India", "clinic")), 1)


class Documents(Base):
    def test_only_a_super_admin_can_change_policies_but_any_platform_admin_can_read(self):
        self.assertEqual(self.c.get("/api/admin/policies").status_code, 401)
        self.assertEqual(self.c.get("/api/admin/policies", headers=self.h["owner"]).status_code, 403)
        self.assertEqual(self.c.get("/api/admin/policies", headers=self.h["admin"]).status_code, 200)
        for h in ("admin", "owner"):
            r = self.c.post("/api/admin/policies", headers=self.h[h], json={"key": "terms", "title": "T", "body": BODY})
            self.assertEqual(r.status_code, 403, h)
        pid = self.make(publish=False)
        for method, path in (("put", f"/api/admin/policies/{pid}/draft"), ("post", f"/api/admin/policies/{pid}/publish"), ("post", f"/api/admin/policies/{pid}/archive"), ("put", "/api/admin/policies/rules"), ("post", "/api/admin/policies/starters")):
            r = getattr(self.c, method)(path, headers=self.h["admin"], json={"body": BODY})
            self.assertEqual(r.status_code, 403, path)

    def test_publishing_makes_versions_and_supersedes_the_old_one(self):
        pid = self.make()
        self.c.put(f"/api/admin/policies/{pid}/draft", headers=self.h["super"], json={"body": BODY + " Second edition.", "summary": "Added a clause", "requires_reacceptance": True})
        d = self.c.post(f"/api/admin/policies/{pid}/publish", headers=self.h["super"]).json()
        self.assertEqual([(v["version"], v["status"]) for v in d["versions"]], [(2, "published"), (1, "superseded")])
        self.assertEqual(d["versions"][0]["summary"], "Added a clause")

    def test_refusals(self):
        pid = self.make(publish=False, body="too short")
        r = self.c.post(f"/api/admin/policies/{pid}/publish", headers=self.h["super"])
        self.assertEqual(r.status_code, 422)
        self.assertIn("too short", r.json()["detail"])
        done = self.make("privacy")
        self.assertEqual(self.c.post(f"/api/admin/policies/{done}/publish", headers=self.h["super"]).status_code, 422)  # nothing left to publish
        dup = self.c.post("/api/admin/policies", headers=self.h["super"], json={"key": "privacy", "title": "P", "body": BODY})
        self.assertEqual(dup.status_code, 422)
        for bad in ({"key": "a b!", "title": "T"}, {"key": "ok", "title": "T", "scope_region": "ATLANTIS"}):
            self.assertEqual(self.c.post("/api/admin/policies", headers=self.h["super"], json=bad).status_code, 422, bad)
        self.assertEqual(self.c.get("/api/admin/policies/nope", headers=self.h["super"]).status_code, 404)

    def test_every_change_is_audited(self):
        pid = self.make()
        self.c.post(f"/api/admin/policies/{pid}/archive", headers=self.h["super"])
        with self.factory() as db:
            actions = {a for (a,) in db.query(AuditLog.action).all()}
        self.assertTrue({"admin.policy_created", "admin.policy_published", "admin.policy_archived"} <= actions)

    def test_starter_drafts_are_added_once_and_never_published(self):
        r = self.c.post("/api/admin/policies/starters", headers=self.h["super"]).json()
        self.assertEqual(r["created"], 5)
        self.assertEqual(self.c.post("/api/admin/policies/starters", headers=self.h["super"]).json()["created"], 0)
        self.assertTrue(all(i["published_version"] is None and i["has_draft"] for i in r["items"]))
        with self.factory() as db:
            self.assertEqual(svc.applicable(db, "India", "clinic"), [])  # a draft binds nobody
        body = self.c.get(f"/api/admin/policies/{r['items'][0]['id']}", headers=self.h["super"]).json()["versions"][0]["body"]
        self.assertIn("STARTER DRAFT", body)  # says so, so nobody publishes it unread


class Acceptance(Base):
    @patch("backend.server.api.routes.auth._send_verification_email")  # the real one opens the production database
    def test_signup_needs_acceptance_only_once_terms_or_privacy_are_published(self, _mail):
        reg = lambda email, **extra: self.c.post("/api/auth/register", json={"name": "N", "email": email, "password": "Passw0rd!xyz", **extra})  # noqa: E731
        self.assertEqual(reg("a1@x.com").status_code, 201)  # nothing published: nothing to accept
        self.make("terms")
        self.make("privacy", body="# Privacy text that is long enough to be published")
        r = reg("a2@x.com")
        self.assertEqual(r.status_code, 422)
        self.assertIn("Terms of Service", r.json()["detail"])
        self.assertEqual(reg("a2@x.com", accept_terms=True).status_code, 201)
        with self.factory() as db:
            user = db.query(User).filter(User.email == "a2@x.com").one()
            rows = db.query(PolicyAcceptance).filter(PolicyAcceptance.user_id == user.id).all()
            self.assertEqual(sorted(r.version for r in rows), [1, 1])
            self.assertTrue(all(r.business_id is None for r in rows))  # accepted before a business existed
            self.assertEqual(db.query(User).filter(User.email == "a2@x.com").count(), 1)
        self.assertEqual(reg("a3@x.com", accept_terms=False).status_code, 422)  # and no account was made
        with self.factory() as db:
            self.assertEqual(db.query(User).filter(User.email == "a3@x.com").count(), 0)

    def test_the_owner_sees_what_applies_and_must_accept_it(self):
        self.make("dpa", region="DPDP", body="# India addendum with enough text to publish it")
        self.make("terms")
        self.make("notice", requires_acceptance=False, body="# An information notice with enough text to publish it")
        s = self.status()
        self.assertEqual([i["key"] for i in s["items"]], ["terms", "dpa", "notice"])  # terms first
        self.assertEqual(s["pending"], 2)  # the notice needs no acceptance
        self.assertEqual(self.status("usowner", "biz-us")["pending"], 1)  # the India addendum does not apply in the US
        ids = [i["version_id"] for i in s["items"] if i["requires_acceptance"]]
        r = self.c.post(f"/api/businesses/{self.biz}/policies/accept", headers=self.h["owner"], json={"version_ids": ids})
        self.assertEqual((r.status_code, r.json()["accepted"], r.json()["pending"]), (200, 2, 0))
        again = self.c.post(f"/api/businesses/{self.biz}/policies/accept", headers=self.h["owner"], json={"version_ids": ids}).json()
        self.assertEqual(again["accepted"], 0)  # accepting twice records nothing new
        with self.factory() as db:
            a = db.query(PolicyAcceptance).first()
            self.assertEqual((a.user_id, a.business_id), (self.ids["owner"], self.biz))

    def test_the_business_counts_as_accepted_for_its_staff_but_only_an_owner_can_accept(self):
        self.make("terms")
        vid = self.status()["items"][0]["version_id"]
        self.assertEqual(self.c.post(f"/api/businesses/{self.biz}/policies/accept", headers=self.h["staff"], json={"version_ids": [vid]}).status_code, 403)
        self.c.post(f"/api/businesses/{self.biz}/policies/accept", headers=self.h["owner"], json={"version_ids": [vid]})
        self.assertEqual(self.status("staff")["pending"], 0)
        self.assertEqual(self.c.get(f"/api/businesses/{self.biz}/policies", headers=self.h["usowner"]).status_code, 403)  # another business's policies
        self.assertEqual(self.c.post(f"/api/businesses/biz-us/policies/accept", headers=self.h["owner"], json={"version_ids": [vid]}).status_code, 403)

    def test_only_a_current_version_that_applies_can_be_accepted(self):
        self.make("dpa", region="DPDP", body="# India addendum with enough text to publish it")
        vid = self.status()["items"][0]["version_id"]
        self.assertEqual(self.c.post("/api/businesses/biz-us/policies/accept", headers=self.h["usowner"], json={"version_ids": [vid]}).status_code, 422)  # not for the US
        self.assertEqual(self.c.post(f"/api/businesses/{self.biz}/policies/accept", headers=self.h["owner"], json={"version_ids": ["made-up"]}).status_code, 422)

    def test_a_new_version_asks_again_unless_it_says_it_does_not_need_to(self):
        pid = self.make("terms")
        vid = self.status()["items"][0]["version_id"]
        self.c.post(f"/api/businesses/{self.biz}/policies/accept", headers=self.h["owner"], json={"version_ids": [vid]})
        # a minor edit that does not need re-acceptance
        self.c.put(f"/api/admin/policies/{pid}/draft", headers=self.h["super"], json={"body": BODY + " Typo fixed.", "summary": "Typo", "requires_reacceptance": False})
        self.c.post(f"/api/admin/policies/{pid}/publish", headers=self.h["super"])
        s = self.status()
        self.assertEqual((s["items"][0]["version"], s["pending"]), (2, 0))
        # a material change that does
        self.c.put(f"/api/admin/policies/{pid}/draft", headers=self.h["super"], json={"body": BODY + " New data use.", "summary": "New data use", "requires_reacceptance": True})
        self.c.post(f"/api/admin/policies/{pid}/publish", headers=self.h["super"])
        s = self.status()
        self.assertEqual((s["items"][0]["version"], s["pending"], s["items"][0]["summary"]), (3, 1, "New data use"))
        r = self.c.get(f"/api/admin/policies/{pid}/acceptances", headers=self.h["admin"]).json()["items"]
        self.assertEqual([(a["email"], a["version"], a["business"]) for a in r], [("o@c.com", 1, "Sanjeevani Clinic")])

    def test_the_public_page_serves_the_text_for_the_region(self):
        self.make("privacy", body="# Global privacy text that is long enough to publish")
        self.make("privacy", region="DPDP", body="# India privacy text that is long enough to publish")
        self.assertEqual(self.c.get("/api/policies/public/privacy").json()["body"].split("\n")[0], "# Global privacy text that is long enough to publish")
        self.assertEqual(self.c.get("/api/policies/public/privacy?country=India").json()["body"].split("\n")[0], "# India privacy text that is long enough to publish")
        self.assertEqual(self.c.get("/api/policies/public/terms").status_code, 404)  # not published


class AiRules(Base):
    def rule(self, region="*", vertical="*", data=None, who="super"):
        return self.c.put("/api/admin/policies/rules", headers=self.h[who], json={"scope_region": region, "scope_vertical": vertical, "data": data or {}})

    def test_the_platform_edit_reaches_the_ai_instructions_for_that_region_only(self):
        from backend.ai.evals.test_agent_core import ScriptedBackend, make_engine

        r = self.rule("DPDP", data={"compliance_clause": "COMPLIANCE (India): Never read a patient's number back unless they ask."})
        self.assertEqual(r.status_code, 200, r.text)
        with self.factory() as db:
            self.assertIn("Never read a patient's number", svc.rule_data(db, "India", "clinic")["compliance_clause"])
            self.assertNotIn("compliance_clause", svc.rule_data(db, "United States", "clinic"))
        engine, _ = make_engine(ScriptedBackend(), compliance_clause="COMPLIANCE (India): Never read a patient's number back unless they ask.")
        self.assertIn("Never read a patient's number back", engine._system)
        built_in, _ = make_engine(ScriptedBackend())
        self.assertIn("COMPLIANCE", built_in._system)  # without an edit the built-in clause still applies
        self.assertNotIn("Never read a patient's number back", built_in._system)

    def test_load_facts_picks_up_the_saved_rule(self):
        from backend.ai.engine.agent.facts import load_facts

        self.rule("IN", data={"compliance_clause": "Edited clause for India."})
        with self.factory() as db:
            self.assertEqual(load_facts(db, self.biz).compliance_clause, "Edited clause for India.")

    def test_a_more_specific_rule_overrides_key_by_key(self):
        self.rule("*", data={"compliance_clause": "Global clause.", "recording_notice": {"en": "Global notice."}})
        self.rule("IN", data={"recording_notice": {"en": "India notice."}})
        with self.factory() as db:
            d = svc.rule_data(db, "India", "clinic")
        self.assertEqual((d["compliance_clause"], d["recording_notice"]["en"]), ("Global clause.", "India notice."))

    def test_rule_limits_and_clearing(self):
        self.assertEqual(self.rule(data={"compliance_clause": "x" * 901}).status_code, 422)  # sent to the AI on every turn
        self.assertEqual(self.rule(data={"recording_notice": {"en": "x" * 301}}).status_code, 422)  # spoken at every call
        self.assertEqual(self.rule("ATLANTIS", data={"compliance_clause": "x"}).status_code, 422)
        self.rule("DPDP", data={"compliance_clause": "Something"})
        self.assertEqual(len(self.c.get("/api/admin/policies/rules", headers=self.h["admin"]).json()["rules"]), 1)
        self.rule("DPDP", data={})  # saving nothing removes the rule: back to the built-in text
        self.assertEqual(self.c.get("/api/admin/policies/rules", headers=self.h["admin"]).json()["rules"], [])

    def test_the_overview_shows_the_effect_for_each_region(self):
        self.rule("IN", data={"compliance_clause": "Edited India clause."})
        regions = {r["code"]: r for r in self.c.get("/api/admin/policies/rules", headers=self.h["admin"]).json()["regions"]}
        self.assertEqual(regions["IN"]["effective_clause"], "Edited India clause.")
        self.assertIn("DPDP", regions["IN"]["built_in_clause"])  # the original is shown beside the edit
        self.assertIn("HIPAA", regions["US"]["effective_clause"])
        self.assertTrue(regions["US"]["notice_enabled"])


class RecordingNotice(Base):
    def test_a_recording_business_says_so_in_the_greeting_in_the_callers_language(self):
        with self.factory() as db:
            b = db.get(Business, self.biz)
            self.assertEqual(svc.greeting_with_notice(db, b, "Hello.", True, "en"), "Hello. " + svc.BUILTIN_RECORDING_NOTICE["en"])
            self.assertTrue(svc.greeting_with_notice(db, b, "Namaste.", True, "hi").endswith(svc.BUILTIN_RECORDING_NOTICE["hi"]))
            self.assertEqual(svc.greeting_with_notice(db, b, "Hello.", False, "en"), "Hello.")  # no recording, nothing to disclose

    def test_the_platform_can_reword_or_switch_off_the_notice_for_a_region(self):
        self.c.put("/api/admin/policies/rules", headers=self.h["super"], json={"scope_region": "IN", "data": {"recording_notice": {"en": "This call is recorded for quality."}}})
        self.c.put("/api/admin/policies/rules", headers=self.h["super"], json={"scope_region": "US", "data": {"recording_notice_enabled": False}})
        with self.factory() as db:
            self.assertEqual(svc.greeting_with_notice(db, db.get(Business, self.biz), "Hi.", True, "en"), "Hi. This call is recorded for quality.")
            self.assertEqual(svc.greeting_with_notice(db, db.get(Business, self.biz), "Hi.", True, "hi"), "Hi. This call is recorded for quality.")  # no Hindi text: falls back to English
            self.assertEqual(svc.greeting_with_notice(db, db.get(Business, "biz-us"), "Hi.", True, "en"), "Hi.")

    def test_greeting_for_reads_the_clinics_recording_switch_and_never_stops_a_call(self):
        with patch("backend.server.database.session.SessionLocal", self.factory):
            self.assertTrue(svc.greeting_for(self.biz, "Hello.", "en").endswith(svc.BUILTIN_RECORDING_NOTICE["en"]))  # recording is on by default
            self.assertEqual(svc.greeting_for("no-such-business", "Hello.", "en"), "Hello.")
        with patch("backend.server.database.session.SessionLocal", side_effect=RuntimeError("db down")):
            self.assertEqual(svc.greeting_for(self.biz, "Hello.", "en"), "Hello.")  # fails open, logged

    def test_the_owner_sees_what_the_ai_will_do_for_their_region(self):
        ai = self.status()["ai"]
        self.assertEqual(ai["framework"], "DPDP Act (India) & DISHA")
        self.assertEqual(ai["emergency"], "112 / 108")
        self.assertTrue(ai["recording_on"] and "recorded" in ai["recording_notice"] and ai["privacy_instruction"])
        self.assertFalse(ai["custom_privacy_instruction"])
        with self.factory() as db:
            db.get(Business, "biz-us").country = "Atlantis"
            db.commit()
        self.assertIn("Not recognised", self.status("usowner", "biz-us")["ai"]["region"])  # an unknown country is said to be unknown, not guessed


if __name__ == "__main__":
    unittest.main()
