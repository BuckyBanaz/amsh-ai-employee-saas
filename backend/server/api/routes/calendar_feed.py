"""Calendar feed: the clinic's appointments as an iCalendar (.ics) subscription.

Google Calendar, Outlook and Apple Calendar can subscribe to a URL ("Add calendar from URL"), so bookings the AI makes appear
in the clinic's own calendar with no OAuth setup. It is read-only (a subscription, not two-way sync) and the URL contains a
secret token derived from the server secret, so it cannot be guessed. Changing JWT_SECRET invalidates every feed URL.
"""

import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.server.api.routes._shared import get_business_or_404, require_membership
from backend.server.auth.security import get_current_user
from backend.server.common.config import get_settings
from backend.server.database.models.business import Business
from backend.server.database.models.transaction import Transaction
from backend.server.database.models.user import User
from backend.server.database.session import get_db
from backend.server.workers.jobs.reminders import appointment_start

router = APIRouter(tags=["calendar"])

SLOT_MINUTES = 30
_TOKEN_LEN = 32


def feed_token(business_id: str) -> str:
    return hmac.new(get_settings().JWT_SECRET.encode(), f"ical:{business_id}".encode(), hashlib.sha256).hexdigest()[:_TOKEN_LEN]


def _escape(text: str) -> str:
    return str(text).replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\r", "").replace("\n", "\\n")


def _fold(line: str) -> List[str]:
    """RFC 5545: lines longer than 75 octets are folded onto continuation lines that start with a space."""
    raw = line.encode("utf-8")
    if len(raw) <= 75:
        return [line]
    parts, current = [], b""
    for ch in line:
        piece = ch.encode("utf-8")
        limit = 75 if not parts else 74
        if len(current) + len(piece) > limit:
            parts.append(current)
            current = b""
        current += piece
    parts.append(current)
    return [parts[0].decode("utf-8")] + [" " + p.decode("utf-8") for p in parts[1:]]


def build_ics(business: Business, appointments: List[Transaction], now: datetime) -> str:
    stamp = now.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AMSh//AI Receptionist//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
             f"X-WR-CALNAME:{_escape(business.name)} appointments"]
    for t in appointments:
        d: Dict[str, Any] = t.details or {}
        start = appointment_start(d, business.timezone)
        if not start:
            continue
        end = start + timedelta(minutes=SLOT_MINUTES)
        who = d.get("customer_name") or d.get("patient_name") or "Patient"
        service = d.get("service_name") or "Appointment"
        description = "\n".join(x for x in (f"Patient: {who}", f"Phone: {d.get('phone_number') or d.get('phone') or ''}", f"Doctor: {d.get('doctor_name') or ''}", "Booked by AMSh") if not x.endswith(": "))
        for out in (
            "BEGIN:VEVENT", f"UID:{t.id}@amsh", f"DTSTAMP:{stamp}",
            f"DTSTART:{start.astimezone(timezone.utc):%Y%m%dT%H%M%SZ}", f"DTEND:{end.astimezone(timezone.utc):%Y%m%dT%H%M%SZ}",
            f"SUMMARY:{_escape(f'{service}: {who}')}", f"DESCRIPTION:{_escape(description)}", "STATUS:CONFIRMED", "END:VEVENT",
        ):
            lines.extend(_fold(out))
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"


@router.get("/api/businesses/{business_id}/calendar-feed")
def get_feed_url(business_id: str, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Dict[str, str]:
    """The subscription URL to paste into Google Calendar / Outlook / Apple Calendar."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    base = str(request.base_url).rstrip("/")
    return {"url": f"{base}/api/calendar/{business_id}/{feed_token(business_id)}.ics"}


@router.get("/api/calendar/{business_id}/{token}.ics")
def calendar_feed(business_id: str, token: str, db: Session = Depends(get_db)) -> Response:
    if not hmac.compare_digest(token, feed_token(business_id)):
        raise HTTPException(status_code=404, detail="Calendar not found")
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Calendar not found")
    rows = db.scalars(select(Transaction).where(Transaction.business_id == business_id, Transaction.type == "appointment", Transaction.status == "confirmed")).all()
    now = datetime.now(timezone.utc)
    keep = [t for t in rows if (s := appointment_start(t.details or {}, business.timezone)) and now - timedelta(days=14) <= s <= now + timedelta(days=180)]
    return Response(content=build_ics(business, keep, now), media_type="text/calendar; charset=utf-8", headers={"Cache-Control": "private, max-age=300"})
