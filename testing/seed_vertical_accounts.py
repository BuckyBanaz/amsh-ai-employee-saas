"""One test account per vertical (clinic, education, salon, wellness), made through the real API the way a customer signs up:
register -> business -> hours -> catalogue -> staff / rooms / departments -> AI receptionist -> policies -> activate -> free trial.

Run against a running API (default the dev compose port):
    TEST_ACCOUNT_PASSWORD='...' python testing/seed_vertical_accounts.py [--base http://127.0.0.1:8010] [--email-base you@gmail.com]

Idempotent: an account that already exists is signed in and only what is missing is added. Nothing is deleted. No phone number is
assigned (that would take routing away from another clinic): test them in the dashboard's Voice Studio, or assign a number in the
admin portal. Fake businesses and people only.
"""

import argparse
import os
import sys
from typing import Any, Dict, List

import httpx

HOURS = {d: [{"start": "09:00", "end": "18:00"}] for d in ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday")}
HOURS.update({"Saturday": [{"start": "10:00", "end": "14:00"}], "Sunday": []})

ACCOUNTS: List[Dict[str, Any]] = [
    {
        "tag": "clinic", "owner": "Test Clinic Owner",
        "business": {"name": "Test Dental Clinic", "vertical": "clinic", "business_subtype": "dental"},
        "services": [
            {"title": "Dental Consultation", "duration_minutes": 30, "price_amount": 60},
            {"title": "Teeth Cleaning", "duration_minutes": 45, "price_amount": 90},
            {"title": "Teeth Whitening", "duration_minutes": 60, "price_amount": 200},
        ],
        "staff": [{"name": "Dr. Alex Morgan", "role": "Doctor", "specialty": "Dentist"},
                  {"name": "Dr. Sam Patel", "role": "Doctor", "specialty": "Orthodontist"}],
        "agent": {"name": "Maya", "greeting_message": "Hello, thank you for calling Test Dental Clinic. This is Maya, how can I help you today?"},
    },
    {
        "tag": "education", "owner": "Test University Admin",
        "business": {"name": "Test University", "vertical": "education", "business_subtype": "university"},
        "services": [
            {"title": "BSc Computer Science", "kind": "course", "duration_minutes": 30, "attributes": {"level": "undergraduate", "intake": "September"}},
            {"title": "MBA", "kind": "course", "duration_minutes": 30, "attributes": {"level": "postgraduate", "intake": "January"}},
            {"title": "Campus Tour", "kind": "visit", "duration_minutes": 60},
            {"title": "Admissions Counselling", "kind": "counselling", "duration_minutes": 30},
        ],
        "staff": [{"name": "Jordan Lee", "role": "Admissions Counsellor"}],
        "departments_from_template": True,
        "agent": {"name": "Ava", "greeting_message": "Hello, thank you for calling Test University admissions. This is Ava, how can I help?"},
    },
    {
        "tag": "salon", "owner": "Test Salon Owner",
        "business": {"name": "Test Hair Salon", "vertical": "salon", "business_subtype": "hair_salon"},
        "services": [
            {"title": "Haircut", "duration_minutes": 45, "price_amount": 40},
            {"title": "Hair Colour", "duration_minutes": 120, "price_amount": 120},
            {"title": "Blow Dry", "duration_minutes": 30, "price_amount": 30},
        ],
        "staff": [{"name": "Chris Taylor", "role": "Stylist"}, {"name": "Robin Hayes", "role": "Stylist"}],
        "agent": {"name": "Lily", "greeting_message": "Hi, thanks for calling Test Hair Salon. This is Lily, how can I help you?"},
    },
    {
        "tag": "wellness", "owner": "Test Spa Owner",
        "business": {"name": "Test Day Spa", "vertical": "wellness", "business_subtype": "day_spa"},
        "resources": [{"name": "Treatment Room 1", "kind": "room"}, {"name": "Treatment Room 2", "kind": "room"}],
        "services": [
            {"title": "Swedish Massage", "duration_minutes": 60, "price_amount": 90, "resource_kind": "room"},
            {"title": "Deep Tissue Massage", "duration_minutes": 60, "price_amount": 110, "resource_kind": "room"},
            {"title": "Facial", "duration_minutes": 45, "price_amount": 80, "resource_kind": "room"},
        ],
        "staff": [{"name": "Jamie Brooks", "role": "Therapist"}],
        "agent": {"name": "Zoe", "greeting_message": "Hello, thank you for calling Test Day Spa. This is Zoe, how can I help you relax today?"},
    },
]

COMMON_BUSINESS = {"country": "United States", "city": "Austin", "timezone": "America/Chicago", "currency": "USD"}


def email_for(base: str, tag: str) -> str:
    user, _, domain = base.partition("@")
    return f"{user}+test-{tag}@{domain}"  # plus-addressing: every account's mail reaches the same inbox


class Api:
    def __init__(self, base: str) -> None:
        self.c = httpx.Client(base_url=base.rstrip("/"), timeout=30.0)
        self.h: Dict[str, str] = {}

    def call(self, method: str, path: str, ok=(200, 201), **kw) -> httpx.Response:
        r = self.c.request(method, path, headers=self.h, **kw)
        if r.status_code not in ok:
            raise SystemExit(f"{method} {path} -> {r.status_code}: {r.text[:400]}")
        return r


def seed(api: Api, spec: Dict[str, Any], email: str, password: str) -> Dict[str, Any]:
    r = api.c.post("/api/auth/login", json={"email": email, "password": password})
    if r.status_code != 200:
        api.h = {}
        r = api.call("POST", "/api/auth/register", json={"name": spec["owner"], "email": email, "password": password, "accept_terms": True})
    api.h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    me = api.call("GET", "/api/auth/me").json()

    biz_id = me.get("business_id")
    if not biz_id:
        biz_id = api.call("POST", "/api/onboarding/businesses", json={**spec["business"], **COMMON_BUSINESS,
                                                                      "business_email": email}).json()["id"]
    base = f"/api/onboarding/businesses/{biz_id}"
    api.call("PATCH", base, json={"working_hours": HOURS})

    for res in spec.get("resources", []):
        have = {x["name"] for x in api.call("GET", f"/api/businesses/{biz_id}/resources").json().get("items", [])}
        if res["name"] not in have:
            api.call("POST", f"/api/businesses/{biz_id}/resources", json={**res, "active": True})
    have = {s["title"] for s in api.call("GET", f"{base}/services").json()}
    for s in spec["services"]:
        if s["title"] not in have:
            api.call("POST", f"{base}/services", json={"price_currency": "USD", **s})
    have = {s["name"] for s in api.call("GET", f"{base}/staff").json()}
    for s in spec["staff"]:
        if s["name"] not in have:
            api.call("POST", f"{base}/staff", json=s)
    if spec.get("departments_from_template") and not api.call("GET", f"/api/businesses/{biz_id}/departments").json().get("items"):
        api.call("POST", f"/api/businesses/{biz_id}/departments/from-template")
    if not api.call("GET", f"{base}/agents").json():
        api.call("POST", f"{base}/agents", json={**spec["agent"], "voice_provider": "cartesia", "primary_language": "en", "languages": ["en"]})

    pending = [i["version_id"] for i in api.call("GET", f"/api/businesses/{biz_id}/policies").json().get("items", [])
               if i.get("requires_acceptance") and not i.get("accepted")]
    if pending:
        api.call("POST", f"/api/businesses/{biz_id}/policies/accept", json={"version_ids": pending})

    check = api.call("POST", f"/api/businesses/{biz_id}/vertical-config/validate").json()
    api.call("POST", f"/api/businesses/{biz_id}/vertical-config/activate")
    status = api.call("GET", f"/api/billing/businesses/{biz_id}").json()
    if status.get("status") not in ("trial", "active"):
        api.call("POST", f"/api/billing/businesses/{biz_id}/start-trial", json={"plan_id": "professional"})
        status = api.call("GET", f"/api/billing/businesses/{biz_id}").json()
    return {"business_id": biz_id, "warnings": [p["code"] for p in check.get("problems", [])],
            "status": status.get("status"), "ends": status.get("renewal_date")}


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--base", default=os.getenv("AMSH_API", "http://127.0.0.1:8010"))
    p.add_argument("--email-base", default=os.getenv("TEST_ACCOUNT_EMAIL_BASE", ""))
    a = p.parse_args()
    password = os.getenv("TEST_ACCOUNT_PASSWORD", "")
    if len(password) < 8 or "@" not in a.email_base:
        sys.exit("Set TEST_ACCOUNT_PASSWORD (8+ characters) and --email-base (an inbox you own, e.g. you@gmail.com)")
    api = Api(a.base)
    for spec in ACCOUNTS:
        email = email_for(a.email_base, spec["tag"])
        out = seed(api, spec, email, password)
        print(f"{spec['tag']:<10} {email:<45} {spec['business']['name']:<20} {out['status']:<6} until {out['ends']}  warnings={out['warnings']}")


if __name__ == "__main__":
    main()
