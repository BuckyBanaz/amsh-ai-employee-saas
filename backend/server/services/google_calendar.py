"""Google Calendar: OAuth connect + best-effort appointment sync (one event per appointment)."""

import logging
import re
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

import httpx
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from backend.server.auth.crypto import CryptoManager
from backend.server.common.config import get_settings
from backend.server.database.models.business import Business
from backend.server.database.models.integration import Integration

logger = logging.getLogger(__name__)

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
SCOPES = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email"
SLOT_MINUTES = 30
PROVIDER = "google_calendar"


def _cfg(name: str) -> str | None:
    """Credentials saved in the admin portal win over .env (same rule as the other platform integrations)."""
    try:
        from backend.server.api.routes.admin_integrations import _OVERRIDES
        if _OVERRIDES.get(name):
            return _OVERRIDES[name].strip()
    except Exception:  # noqa: BLE001 - admin module unavailable: fall back to .env
        pass
    return getattr(get_settings(), name, None)


def is_configured() -> bool:
    return bool(_cfg("GOOGLE_CLIENT_ID") and _cfg("GOOGLE_CLIENT_SECRET"))


def make_state(business_id: str, user_id: str, ret: str = "onboarding") -> str:
    s = get_settings()
    payload = {"bid": business_id, "uid": user_id, "purpose": "gcal", "ret": ret, "exp": datetime.now(timezone.utc) + timedelta(minutes=10)}
    return jwt.encode(payload, s.JWT_SECRET, algorithm=s.JWT_ALGORITHM)


def read_state(state: str) -> dict | None:
    s = get_settings()
    try:
        data = jwt.decode(state, s.JWT_SECRET, algorithms=[s.JWT_ALGORITHM])
    except JWTError:
        return None
    return data if data.get("purpose") == "gcal" else None


def build_auth_url(state: str) -> str:
    s = get_settings()
    return AUTH_URL + "?" + urlencode({
        "client_id": _cfg("GOOGLE_CLIENT_ID"),
        "redirect_uri": _cfg("GOOGLE_REDIRECT_URI"),
        "response_type": "code",
        "scope": SCOPES,
        "access_type": "offline",  # refresh token
        "prompt": "consent",  # Google only returns a refresh token on consent
        "state": state,
    })


def exchange_code(code: str) -> dict:
    s = get_settings()
    resp = httpx.post(TOKEN_URL, data={
        "code": code, "client_id": _cfg("GOOGLE_CLIENT_ID"), "client_secret": _cfg("GOOGLE_CLIENT_SECRET"),
        "redirect_uri": _cfg("GOOGLE_REDIRECT_URI"), "grant_type": "authorization_code",
    }, timeout=8)
    resp.raise_for_status()
    return resp.json()


def google_email(access_token: str) -> str | None:
    try:
        r = httpx.get("https://www.googleapis.com/oauth2/v2/userinfo", headers={"Authorization": f"Bearer {access_token}"}, timeout=10)
        return r.json().get("email") if r.status_code == 200 else None
    except httpx.HTTPError:
        return None


def _access_token(integration: Integration) -> str | None:
    refresh = (integration.config or {}).get("refresh_token")
    if not refresh:
        return None
    s = get_settings()
    resp = httpx.post(TOKEN_URL, data={
        "client_id": _cfg("GOOGLE_CLIENT_ID"), "client_secret": _cfg("GOOGLE_CLIENT_SECRET"),
        "refresh_token": CryptoManager.decrypt(refresh), "grant_type": "refresh_token",
    }, timeout=8)
    if resp.status_code != 200:
        logger.warning("Google token refresh failed: %s", resp.text)
        return None
    return resp.json().get("access_token")


def _parse_time(text: str) -> tuple[int, int]:
    m = re.search(r"(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?", text or "")
    if not m:
        return 10, 0
    hour, minute, mer = int(m.group(1)), int(m.group(2) or 0), (m.group(3) or "").lower()
    if mer == "pm" and hour < 12:
        hour += 12
    elif mer == "am" and hour == 12:
        hour = 0
    return hour % 24, minute


def _event_body(details: dict, tz_name: str) -> dict | None:
    date = details.get("preferred_date")
    if not date:
        return None
    try:
        tz = ZoneInfo(tz_name or "UTC")
        hour, minute = _parse_time(details.get("preferred_time", ""))
        start = datetime.strptime(date, "%Y-%m-%d").replace(hour=hour, minute=minute, tzinfo=tz)
    except (ValueError, KeyError):
        return None
    end = start + timedelta(minutes=SLOT_MINUTES)
    who = details.get("customer_name") or "Customer"
    return {
        "summary": f"{details.get('service_name') or 'Appointment'} - {who}",
        "description": f"Phone: {details.get('phone_number', '')}\nDoctor: {details.get('doctor_name', '')}\nNotes: {details.get('notes', '')}\nBooked via AMSh",
        "start": {"dateTime": start.isoformat(), "timeZone": tz.key},
        "end": {"dateTime": end.isoformat(), "timeZone": tz.key},
    }


def sync_appointment(db: Session, business_id: str, tx, deleted: bool = False) -> None:
    """Create/update/remove the Google event for an appointment transaction. Never raises:
    a calendar failure must not break booking."""
    try:
        if not is_configured():
            return
        integration = db.query(Integration).filter(
            Integration.business_id == business_id, Integration.provider == PROVIDER, Integration.status == "connected"
        ).first()
        if not integration:
            return
        token = _access_token(integration)
        if not token:
            return
        headers = {"Authorization": f"Bearer {token}"}
        details = dict(tx.details or {})
        event_id = details.get("google_event_id")

        if deleted or tx.status == "cancelled":
            if event_id:
                httpx.delete(f"{EVENTS_URL}/{event_id}", headers=headers, timeout=8)
                if not deleted:
                    details.pop("google_event_id", None)
                    tx.details = details
                    db.commit()
            return

        biz = db.get(Business, business_id)
        body = _event_body(details, biz.timezone if biz else "UTC")
        if not body:
            return
        if event_id:
            resp = httpx.patch(f"{EVENTS_URL}/{event_id}", headers=headers, json=body, timeout=8)
            if resp.status_code != 404:
                return
        resp = httpx.post(EVENTS_URL, headers=headers, json=body, timeout=8)
        if resp.status_code == 200:
            details["google_event_id"] = resp.json()["id"]
            tx.details = details
            db.commit()
        else:
            logger.warning("Google event create failed: %s", resp.text)
    except Exception as err:  # noqa: BLE001 - best effort by design
        logger.warning("Google Calendar sync skipped: %s", err)


def backfill_upcoming(db: Session, business_id: str, include_past: bool = True) -> dict:
    """Push appointments that already exist (booked before the calendar was connected).
    Skips cancelled ones and any that already have an event. Returns counts."""
    from backend.server.database.models.transaction import Transaction

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    rows = db.query(Transaction).filter(Transaction.business_id == business_id, Transaction.type == "appointment").all()
    synced = skipped = 0
    for tx in rows:
        details = tx.details or {}
        if tx.status == "cancelled" or details.get("google_event_id"):
            skipped += 1
            continue
        if not include_past and (details.get("preferred_date") or "") < today:
            skipped += 1
            continue
        sync_appointment(db, business_id, tx)
        db.refresh(tx)
        if (tx.details or {}).get("google_event_id"):
            synced += 1
        else:
            skipped += 1
    return {"synced": synced, "skipped": skipped}


def backfill_in_background(business_id: str) -> None:
    from backend.server.database.session import SessionLocal

    db = SessionLocal()
    try:
        backfill_upcoming(db, business_id)
    finally:
        db.close()
