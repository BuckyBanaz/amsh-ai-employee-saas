"""Shared setup for the smoke and browser tests: a real API process on a throwaway SQLite database, migrated by the app's own
startup (so the Alembic migrations are exercised too), plus a few helpers. Nothing here touches a real database or sends anything."""

import contextlib
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, Iterator, Optional, Tuple

ROOT = Path(__file__).resolve().parent.parent
ADMIN_EMAIL, ADMIN_PASSWORD = "owner-admin@amsh-smoke.com", "Smoke-Admin-Pass-123!"
OWNER_EMAIL, OWNER_PASSWORD = "dr.rao@clinic-smoke.com", "Smoke-Owner-Pass-1!"


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def api_env(db_path: str) -> Dict[str, str]:
    env = dict(os.environ)
    env.update({
        "DATABASE_URL": f"sqlite:///{db_path}", "JWT_SECRET": "smoke-test-secret-that-is-long-enough-0123456789",
        "AMSH_DISABLE_SMS": "1", "AMSH_DISABLE_POST_CALL": "1", "AMSH_DISABLE_COST_TRACKING": "",  # cost tracking stays ON: the spend report is under test
        "GROQ_API_KEY": "", "GEMINI_API_KEY": "", "LLM_PROVIDERS": "groq",  # no model keys: the AI answers "unavailable", nothing leaves the machine
        "PYTHONPATH": str(ROOT),
    })
    return env


@contextlib.contextmanager
def running_api(port: Optional[int] = None) -> Iterator[Tuple[str, str]]:
    """Yields (base_url, db_path) once /health answers."""
    port = port or free_port()
    tmp = tempfile.mkdtemp(prefix="amsh-smoke-")
    db_path = os.path.join(tmp, "smoke.db")
    log = open(os.path.join(tmp, "api.log"), "w")
    proc = subprocess.Popen([sys.executable, "-m", "uvicorn", "backend.main:app", "--port", str(port), "--log-level", "warning"], cwd=ROOT, env=api_env(db_path), stdout=log, stderr=subprocess.STDOUT)
    base = f"http://127.0.0.1:{port}"
    try:
        for _ in range(120):
            try:
                urllib.request.urlopen(f"{base}/health", timeout=1)
                break
            except Exception:
                if proc.poll() is not None:
                    raise RuntimeError(f"API exited early, see {tmp}/api.log")
                time.sleep(0.5)
        else:
            raise RuntimeError(f"API did not start, see {tmp}/api.log")
        yield base, db_path
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
        log.close()


def call(base: str, method: str, path: str, body: Any = None, token: Optional[str] = None) -> Tuple[int, Any]:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{base}{path}", data=data, method=method, headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {})})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw.decode("utf-8", "ignore")


def db_session(db_path: str):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    return sessionmaker(bind=create_engine(f"sqlite:///{db_path}"))()


def make_platform_admin(db_path: str) -> None:
    sys.path.insert(0, str(ROOT))
    from backend.scripts.create_platform_admin import create_platform_admin

    with db_session(db_path) as db:
        create_platform_admin(db, ADMIN_EMAIL, "Owner Admin", ADMIN_PASSWORD)


def login(base: str, email: str, password: str) -> Tuple[str, Dict[str, Any]]:
    status, body = call(base, "POST", "/api/auth/login", {"email": email, "password": password})
    assert status == 200, f"login failed for {email}: {status} {body}"
    return body["access_token"], body["user"]


def seed_clinic(base: str, db_path: str) -> Dict[str, str]:
    """A clinic created the way a customer does it (register, create business, start the trial), plus the rows onboarding would add."""
    sys.path.insert(0, str(ROOT))
    from backend.server.database.models.agent import Agent
    from backend.server.database.models.business import Business
    from backend.server.database.models.service import Service
    from backend.server.database.models.staff import Staff

    status, _ = call(base, "POST", "/api/auth/register", {"name": "Dr. Rao", "email": OWNER_EMAIL, "password": OWNER_PASSWORD})
    assert status == 201, status
    token, _user = login(base, OWNER_EMAIL, OWNER_PASSWORD)
    status, biz = call(base, "POST", "/api/onboarding/businesses", {"name": "Sanjeevani Clinic", "vertical": "clinic", "country": "IN", "city": "Pune", "timezone": "Asia/Kolkata", "currency": "INR"}, token)
    assert status == 201, (status, biz)
    hours = {d: [{"start": "09:00", "end": "17:00"}] for d in ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday")}
    hours["Sunday"] = []
    with db_session(db_path) as db:
        b = db.get(Business, biz["id"])
        b.working_hours, b.status = hours, "active"
        db.add_all([
            Staff(business_id=b.id, name="Dr. Sharma", role="Doctor", specialty="General Physician"),
            Service(business_id=b.id, title="General Consultation", duration_minutes=30, price_amount=500),
            Agent(business_id=b.id, name="Maya", primary_language="en", config={"gender": "female"}),
        ])
        db.commit()
    status, trial = call(base, "POST", f"/api/billing/businesses/{biz['id']}/start-trial", {"plan_id": "starter"}, token)
    assert status == 200, (status, trial)
    return {"business_id": biz["id"], "owner_token": token}


def seed_spend(db_path: str, business_id: str) -> None:
    """Some metered use and a payment, so the spend report has something to show."""
    from datetime import datetime, timedelta, timezone

    sys.path.insert(0, str(ROOT))
    from backend.server.database.models.call import Call
    from backend.server.database.models.message import Message
    from backend.server.database.models.message_template import MessageLog
    from backend.server.database.models.spend import UsageEvent
    from backend.server.database.models.transaction import Transaction

    now = datetime.now(timezone.utc)
    with db_session(db_path) as db:
        for i in range(6):
            cid = f"CA-smoke-{i}"
            db.add(Call(id=cid, business_id=business_id, caller_number="+919876500001", duration_seconds=120 + 40 * i, started_at=now - timedelta(days=i * 3), outcome="resolved"))
            db.flush()
            db.add(Message(call_id=cid, speaker="AI", text="Namaste, Sanjeevani Clinic. How can I help? " * 6, created_at=now - timedelta(days=i * 3)))
            db.add(UsageEvent(business_id=business_id, tool="llm", provider="groq", input_units=60_000 + i * 5000, output_units=6000, estimated=True, created_at=now - timedelta(days=i * 3)))
            db.add(UsageEvent(business_id=business_id, tool="llm", provider="gemini", input_units=20_000, output_units=2000, created_at=now - timedelta(days=i * 3)))
            db.add(MessageLog(business_id=business_id, event_key="booking.confirmed", channel="sms", recipient="+919876500001", status="sent", created_at=now - timedelta(days=i * 3)))
        db.add(MessageLog(business_id=business_id, event_key="reminder", channel="whatsapp", recipient="+919876500001", status="delivered"))
        db.add(Transaction(business_id=business_id, type="payment", status="confirmed", details={"amount": 49.0, "currency": "USD", "payment_id": "pay_smoke_1", "plan": "starter"}))
        db.commit()
