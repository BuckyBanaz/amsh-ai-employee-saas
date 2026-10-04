"""API smoke test on the real application (real routes, real auth, real migrations, SQLite). Writes results/api_smoke.json.

    python testing/api_smoke.py
"""

import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import harness as h  # noqa: E402

RESULTS = []


def check(name: str, ok: bool, detail: str = "") -> None:
    RESULTS.append({"check": name, "ok": bool(ok), "detail": detail})
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail and not ok else ""))


def main() -> int:
    started = time.time()
    with h.running_api() as (base, db_path):
        check("API starts and migrates an empty SQLite database (0001 to latest)", True)
        h.make_platform_admin(db_path)
        clinic = h.seed_clinic(base, db_path)
        biz, owner = clinic["business_id"], clinic["owner_token"]
        admin, _ = h.login(base, h.ADMIN_EMAIL, h.ADMIN_PASSWORD)

        # ---- access control on the new admin routes
        for path in ("/api/admin/alerts", "/api/admin/alerts/unread-count", "/api/admin/spend", "/api/admin/spend/rates"):
            check(f"{path} refuses no token", h.call(base, "GET", path)[0] == 401)
            check(f"{path} refuses a clinic owner", h.call(base, "GET", path, token=owner)[0] == 403)
        check("rate card edit refuses a clinic owner", h.call(base, "PUT", "/api/admin/spend/rates", {"prices": {"tts": 0.05}}, owner)[0] == 403)

        # ---- alerts: the events the owner asked for, from real actions
        s, feed = h.call(base, "GET", "/api/admin/alerts", token=admin)
        check("alerts feed loads for an admin", s == 200, str(s))
        titles = [i["title"] for i in feed["items"]] if s == 200 else []
        check("alert: new signup", "New signup" in titles, str(titles))
        check("alert: new clinic", "New clinic: Sanjeevani Clinic" in titles, str(titles))
        check("alert: clinic sign-in", "Sign-in" in titles, str(titles))
        check("alert: free trial started", "Sanjeevani Clinic started a free trial" in titles, str(titles))
        check("first look leaves nothing unread, then a new event is unread", feed["unread"] == 0)
        h.call(base, "POST", f"/api/billing/businesses/{biz}/change-plan", {"plan_id": "starter"}, admin)
        h.login(base, h.OWNER_EMAIL, h.OWNER_PASSWORD)
        s, n = h.call(base, "GET", "/api/admin/alerts/unread-count", token=admin)
        check("unread count rises after a new sign-in", s == 200 and n["unread"] >= 1, str(n))
        h.call(base, "POST", "/api/admin/alerts/mark-read", token=admin)
        check("mark-read clears the badge", h.call(base, "GET", "/api/admin/alerts/unread-count", token=admin)[1]["unread"] == 0)
        s, _ = h.call(base, "PUT", "/api/admin/alerts/preferences", {"muted": ["logins"]}, admin)
        s2, muted = h.call(base, "GET", "/api/admin/alerts", token=admin)
        check("muting sign-ins hides them", s == 200 and "Sign-in" not in [i["title"] for i in muted["items"]])
        h.call(base, "PUT", "/api/admin/alerts/preferences", {"muted": []}, admin)

        # ---- spend and profit
        h.seed_spend(db_path, biz)
        s, rep = h.call(base, "GET", "/api/admin/spend?days=30", token=admin)
        check("spend report loads", s == 200, str(s))
        if s == 200:
            tools = {t["tool"]: t for t in rep["by_tool"]}
            check("spend: every tool present and LLM/telephony/SMS priced", all(tools[k]["cost"] > 0 for k in ("llm.groq", "llm.gemini", "telephony", "tts", "sms", "whatsapp")), json.dumps({k: v["cost"] for k, v in tools.items()}))
            check("spend: revenue is the recorded payment, profit = revenue - spend", rep["totals"]["revenue"] == 49.0 and abs(rep["totals"]["profit"] - (49.0 - rep["totals"]["spend"])) < 0.01, json.dumps(rep["totals"]))
            check("spend: the clinic is listed with its own profit", any(t["id"] == biz for t in rep["by_tenant"]))
        s, rates = h.call(base, "PUT", "/api/admin/spend/rates", {"prices": {"tts": 0.06}}, admin)
        check("rate card saves (super admin)", s == 200 and any(i["key"] == "tts" and i["edited"] for i in rates["items"]), str(s))
        s, after = h.call(base, "GET", "/api/admin/spend?days=30", token=admin)
        check("an edited price reprices the report", after["by_tool"] and next(t for t in after["by_tool"] if t["tool"] == "tts")["cost"] > next(t for t in rep["by_tool"] if t["tool"] == "tts")["cost"] * 1.9)
        check("an unknown rate is refused", h.call(base, "PUT", "/api/admin/spend/rates", {"prices": {"bogus": 1}}, admin)[0] == 422)

        # ---- playground: test mode, nothing real
        s, sim = h.call(base, "POST", "/api/voice/simulate", {"business_id": biz, "call_id": "my-own-id", "caller_number": "+919876500002", "user_transcript": "I want to book a checkup tomorrow at 10 AM"}, admin)
        check("admin can simulate any clinic", s == 200, str(s))
        if s == 200:
            check("playground reply says test mode", sim.get("test_mode") is True and isinstance(sim.get("test_actions"), list), json.dumps(sim)[:200])
            check("playground call id is forced to a test call", str(sim.get("call_id")).startswith("sim_"), str(sim.get("call_id")))
        s, _ = h.call(base, "POST", "/api/voice/simulate", {"business_id": biz, "user_transcript": "hi"}, owner)
        check("the clinic owner can use their own playground", s == 200, str(s))
        s, appts = h.call(base, "GET", f"/api/businesses/{biz}/appointments", token=owner)
        check("playground created no appointment", s == 200 and (appts if isinstance(appts, list) else appts.get("items", appts.get("appointments", []))) == [], str(appts)[:200])
        s, _ = h.call(base, "POST", "/api/voice/simulate", {"business_id": biz, "user_transcript": "hi"})
        check("simulate refuses no token", s == 401)

        # ---- policies: documents, consent at sign-up and before launch, and the AI following the region's rules
        for path in ("/api/admin/policies", "/api/admin/policies/rules"):
            check(f"{path} refuses no token and a clinic owner", h.call(base, "GET", path)[0] == 401 and h.call(base, "GET", path, token=owner)[0] == 403)
        s, made = h.call(base, "POST", "/api/admin/policies/starters", token=admin)
        check("starter policy drafts are added (not published)", s == 200 and made["created"] == 5 and all(i["published_version"] is None for i in made["items"]), str(made)[:200])
        check("an unpublished policy binds nobody", h.call(base, "GET", "/api/policies/public/terms")[0] == 404)
        for item in made["items"]:
            if (item["key"], item["scope_region"]) in (("terms", "*"), ("privacy", "*"), ("dpa", "DPDP")):
                s, _ = h.call(base, "POST", f"/api/admin/policies/{item['id']}/publish", token=admin)
                check(f"admin publishes {item['title']}", s == 200, str(s))
        s, pub = h.call(base, "GET", "/api/policies/public/privacy?country=India")
        check("the public page serves the published text without a login", s == 200 and "Privacy Policy" in pub["title"] and pub["version"] == 1, str(pub)[:120])
        s, r = h.call(base, "POST", "/api/auth/register", {"name": "New Owner", "email": "second@clinic-smoke.com", "password": h.OWNER_PASSWORD})
        check("sign-up now needs the Terms and Privacy to be accepted", s == 422 and "Terms of Service" in str(r), f"{s} {r}")
        s, r = h.call(base, "POST", "/api/auth/register", {"name": "New Owner", "email": "second@clinic-smoke.com", "password": h.OWNER_PASSWORD, "accept_terms": True})
        check("sign-up works once they are accepted, and the acceptance is recorded", s == 201, f"{s} {r}")
        from backend.server.database.models.policy import PolicyAcceptance

        with h.db_session(db_path) as db:
            n = db.query(PolicyAcceptance).count()
        check("acceptance records exist for the new account (terms + privacy)", n == 2, str(n))
        s, st = h.call(base, "GET", f"/api/businesses/{biz}/policies", token=owner)
        check("the clinic in India is shown Terms, Privacy and the DPDP addendum", s == 200 and [i["key"] for i in st["items"]] == ["terms", "privacy", "dpa"] and st["pending"] == 3, str(st)[:200])
        check("the owner is told what the AI does for India", st["ai"]["framework"].startswith("DPDP") and st["ai"]["recording_on"] and "recorded" in st["ai"]["recording_notice"], str(st["ai"]))
        s, r = h.call(base, "POST", f"/api/billing/businesses/{biz}/change-plan", {"plan_id": "starter"}, owner)  # not a go-live action; the trial was started before any policy existed
        s, r = h.call(base, "POST", "/api/billing/razorpay/create-order", {"plan_id": "starter", "cycle": "monthly", "business_id": biz}, owner)
        check("payment is refused until the owner accepts", s == 409 and "Accept these policies" in str(r), f"{s} {r}")
        s, r = h.call(base, "POST", f"/api/businesses/{biz}/policies/accept", {"version_ids": [i["version_id"] for i in st["items"]]}, owner)
        check("the owner accepts all three", s == 200 and r["accepted"] == 3 and r["pending"] == 0, str(r)[:160])

        from backend.server.database.models.message import Message

        def greeting_of(call_id: str) -> str:
            with h.db_session(db_path) as db:
                m = db.query(Message).filter(Message.call_id == call_id, Message.sequence == 0).first()
                return m.text if m else ""

        s, _ = h.call(base, "POST", "/api/voice/simulate", {"business_id": biz, "call_id": "sim_policy_a", "user_transcript": "hello"}, owner)
        check("the AI's opening line carries the built-in recording notice", "may be recorded" in greeting_of("sim_policy_a"), greeting_of("sim_policy_a"))
        s, rules = h.call(base, "PUT", "/api/admin/policies/rules", {"scope_region": "IN", "data": {"recording_notice": {"en": "Heads up: this call is recorded for training."}, "compliance_clause": "COMPLIANCE (India): Say nothing about other patients."}}, admin)
        check("admin edits the India rule", s == 200 and any(r["code"] == "IN" and "Say nothing about other patients" in r["effective_clause"] for r in rules["regions"]), str(s))
        s, _ = h.call(base, "POST", "/api/voice/simulate", {"business_id": biz, "call_id": "sim_policy_b", "user_transcript": "hello"}, owner)
        check("the edited notice is what the next call says", "Heads up: this call is recorded for training." in greeting_of("sim_policy_b"), greeting_of("sim_policy_b"))
        s, aud = h.call(base, "GET", "/api/admin/audit?action=admin.policy", token=admin)
        check("policy changes are in the audit log", s == 200 and aud["total"] >= 5, str(aud.get("total")))

        # ---- suspension still works with the new routes in place
        s, _ = h.call(base, "PATCH", f"/api/admin/tenants/{biz}", {"status": "suspended"}, admin)
        check("admin can suspend a clinic", s == 200, str(s))
        s, _ = h.call(base, "POST", "/api/auth/login", {"email": h.OWNER_EMAIL, "password": h.OWNER_PASSWORD})
        check("a suspended clinic cannot sign in", s in (401, 403), str(s))
        s, feed = h.call(base, "GET", "/api/admin/alerts", token=admin)
        check("alert: clinic suspended", any("was suspended" in i["title"] for i in feed["items"]))

    failed = [r for r in RESULTS if not r["ok"]]
    out = {"ran_at": time.strftime("%Y-%m-%d %H:%M:%S"), "seconds": round(time.time() - started, 1), "passed": len(RESULTS) - len(failed), "failed": len(failed), "checks": RESULTS}
    Path(__file__).parent.joinpath("results", "api_smoke.json").write_text(json.dumps(out, indent=2))
    print(f"\n{out['passed']} passed, {out['failed']} failed in {out['seconds']}s")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
