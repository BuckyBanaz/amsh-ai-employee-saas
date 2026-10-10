"""Outlook / Microsoft 365 calendar: OAuth connect + best-effort appointment sync (one event per appointment).

Same behaviour as services/google_calendar.py, on Microsoft Graph: booking creates an event, a reschedule updates it, a cancel
deletes it. A calendar failure never breaks booking. Works for personal Outlook.com and work/school accounts ("common" tenant).
"""

import logging
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
from backend.server.services.google_calendar import _parse_time

logger = logging.getLogger(__name__)

AUTHORITY = "https://login.microsoftonline.com/common/oauth2/v2.0"
AUTH_URL = f"{AUTHORITY}/authorize"
TOKEN_URL = f"{AUTHORITY}/token"
GRAPH = "https://graph.microsoft.com/v1.0"
SCOPES = "offline_access User.Read Calendars.ReadWrite"
SLOT_MINUTES = 30
PROVIDER = "outlook"
EVENT_KEY = "outlook_event_id"  # where the Graph event id is kept on the appointment's details


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
    return bool(_cfg("MICROSOFT_CLIENT_ID") and _cfg("MICROSOFT_CLIENT_SECRET"))


def make_state(business_id: str, user_id: str, ret: str = "onboarding") -> str:
    s = get_settings()
    payload = {"bid": business_id, "uid": user_id, "purpose": "outlook", "ret": ret, "exp": datetime.now(timezone.utc) + timedelta(minutes=10)}
    return jwt.encode(payload, s.JWT_SECRET, algorithm=s.JWT_ALGORITHM)


def read_state(state: str) -> dict | None:
    s = get_settings()
    try:
        data = jwt.decode(state, s.JWT_SECRET, algorithms=[s.JWT_ALGORITHM])
    except JWTError:
        return None
    return data if data.get("purpose") == "outlook" else None


def build_auth_url(state: str) -> str:
    return AUTH_URL + "?" + urlencode({
        "client_id": _cfg("MICROSOFT_CLIENT_ID"),
        "redirect_uri": _cfg("MICROSOFT_REDIRECT_URI"),
        "response_type": "code",
        "response_mode": "query",
        "scope": SCOPES,
        "prompt": "select_account",  # the owner picks the mailbox; Microsoft returns a refresh token because of offline_access
        "state": state,
    })


def exchange_code(code: str) -> dict:
    resp = httpx.post(TOKEN_URL, data={
        "code": code, "client_id": _cfg("MICROSOFT_CLIENT_ID"), "client_secret": _cfg("MICROSOFT_CLIENT_SECRET"),
        "redirect_uri": _cfg("MICROSOFT_REDIRECT_URI"), "grant_type": "authorization_code", "scope": SCOPES,
    }, timeout=8)
    resp.raise_for_status()
    return resp.json()


def outlook_email(access_token: str) -> str | None:
    try:
        r = httpx.get(f"{GRAPH}/me", headers={"Authorization": f"Bearer {access_token}"}, timeout=10)
        if r.status_code != 200:
            return None
        body = r.json()
        return body.get("mail") or body.get("userPrincipalName")
    except httpx.HTTPError:
        return None


def _access_token(integration: Integration) -> str | None:
    refresh = (integration.config or {}).get("refresh_token")
    if not refresh:
        return None
    resp = httpx.post(TOKEN_URL, data={
        "client_id": _cfg("MICROSOFT_CLIENT_ID"), "client_secret": _cfg("MICROSOFT_CLIENT_SECRET"),
        "refresh_token": CryptoManager.decrypt(refresh), "grant_type": "refresh_token", "scope": SCOPES,
    }, timeout=8)
    if resp.status_code != 200:
        logger.warning("Outlook token refresh failed: %s", resp.text[:200])
        return None
    data = resp.json()
    if data.get("refresh_token"):  # Microsoft may rotate the refresh token: keep the newest one
        integration.config = {**(integration.config or {}), "refresh_token": CryptoManager.encrypt(data["refresh_token"])}
    return data.get("access_token")


def event_body(details: dict, tz_name: str) -> dict | None:
    """A Graph event for one appointment. Times are sent in UTC, which Graph always accepts, so no Windows time zone names."""
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
    who = details.get("customer_name") or details.get("patient_name") or "Customer"
    text = f"Phone: {details.get('phone_number', '')}\nDoctor: {details.get('doctor_name', '')}\nNotes: {details.get('notes', '')}\nBooked via AMSh"
    return {
        "subject": f"{details.get('service_name') or 'Appointment'} - {who}",
        "body": {"contentType": "text", "content": text},
        "start": {"dateTime": start.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S"), "timeZone": "UTC"},
        "end": {"dateTime": end.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S"), "timeZone": "UTC"},
    }


def sync_appointment(db: Session, business_id: str, tx, deleted: bool = False) -> None:
    """Create / update / remove the Outlook event for an appointment. Never raises: a calendar failure must not break booking."""
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
        event_id = details.get(EVENT_KEY)

        if deleted or tx.status == "cancelled":
            if event_id:
                httpx.delete(f"{GRAPH}/me/events/{event_id}", headers=headers, timeout=8)
                if not deleted:
                    details.pop(EVENT_KEY, None)
                    tx.details = details
                    db.commit()
            return

        biz = db.get(Business, business_id)
        body = event_body(details, biz.timezone if biz else "UTC")
        if not body:
            return
        if event_id:
            resp = httpx.patch(f"{GRAPH}/me/events/{event_id}", headers=headers, json=body, timeout=8)
            if resp.status_code != 404:
                if resp.status_code >= 300:
                    logger.warning("Outlook event update failed: %s", resp.text[:200])
                return
        resp = httpx.post(f"{GRAPH}/me/events", headers=headers, json=body, timeout=8)
        if resp.status_code in (200, 201):
            details[EVENT_KEY] = resp.json()["id"]
            tx.details = details
            db.commit()
        else:
            logger.warning("Outlook event create failed: %s", resp.text[:200])
    except Exception as err:  # noqa: BLE001 - best effort by design
        logger.warning("Outlook Calendar sync skipped: %s", err)


def backfill_upcoming(db: Session, business_id: str, include_past: bool = True) -> dict:
    """Push appointments booked before the calendar was connected. Skips cancelled ones and any that already have an event."""
    from backend.server.database.models.transaction import Transaction

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    rows = db.query(Transaction).filter(Transaction.business_id == business_id, Transaction.type == "appointment").all()
    synced = skipped = 0
    for tx in rows:
        details = tx.details or {}
        if tx.status == "cancelled" or details.get(EVENT_KEY):
            skipped += 1
            continue
        if not include_past and (details.get("preferred_date") or "") < today:
            skipped += 1
            continue
        sync_appointment(db, business_id, tx)
        db.refresh(tx)
        if (tx.details or {}).get(EVENT_KEY):
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
