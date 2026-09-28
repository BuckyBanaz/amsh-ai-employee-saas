"""Appointment reminders: fewer forgotten visits.

A background loop looks for confirmed appointments that start within the clinic's reminder window (default 24 hours before,
never closer than one hour) and messages the patient once. It is OFF unless both are true:
  * the server setting REMINDERS_ENABLED is on (it messages real patients), and
  * the clinic switched it on: Agent.config["toggles"]["reminders"] is true.

Channels: SMS always; WhatsApp only when the clinic configured an approved template
(Agent.config["reminders"] = {"lead_hours": 24, "whatsapp_template": "appointment_reminder", "whatsapp_language": "en"}),
because WhatsApp only allows free-form messages inside 24 hours of the patient's last message.
"""

import asyncio
import logging
import re
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.ai.engine.agent.datetime_utils import parse_date, parse_time
from backend.server.database.models.agent import Agent
from backend.server.database.models.business import Business
from backend.server.database.models.integration import Integration
from backend.server.database.models.transaction import Transaction

logger = logging.getLogger(__name__)

DEFAULT_LEAD_HOURS = 24
MIN_LEAD_HOURS, MAX_LEAD_HOURS = 2, 72
NEVER_CLOSER_THAN = timedelta(hours=1)  # a reminder an hour before is noise; the patient is already on the way


def appointment_start(details: Dict[str, Any], tz_name: str) -> Optional[datetime]:
    """Timezone-aware start of an appointment from its stored date and time text, or None if unreadable."""
    try:
        tz = ZoneInfo(tz_name or "UTC")
    except Exception:
        tz = ZoneInfo("UTC")
    day: Optional[date] = parse_date(str(details.get("preferred_date") or ""), datetime.now(tz).date())
    at = parse_time(str(details.get("preferred_time") or ""))
    if not day or not at:
        return None
    return datetime.combine(day, at, tzinfo=tz)


def clinic_settings(db: Session, business_id: str) -> Dict[str, Any]:
    agent = db.query(Agent).filter(Agent.business_id == business_id).order_by(Agent.created_at.asc()).first()
    cfg = dict(agent.config or {}) if agent else {}
    reminders = dict(cfg.get("reminders") or {})
    try:
        lead = int(reminders.get("lead_hours") or DEFAULT_LEAD_HOURS)
    except (TypeError, ValueError):
        lead = DEFAULT_LEAD_HOURS
    return {
        "enabled": (cfg.get("toggles") or {}).get("reminders") is True,
        "lead": timedelta(hours=min(max(lead, MIN_LEAD_HOURS), MAX_LEAD_HOURS)),
        "template": reminders.get("whatsapp_template"),
        "language": reminders.get("whatsapp_language") or "en",
    }


def due_reminders(db: Session, now: Optional[datetime] = None) -> List[Tuple[Transaction, Business, datetime, Dict[str, Any]]]:
    """Appointments to remind right now: [(appointment, business, start, clinic settings)]."""
    now = now or datetime.now(timezone.utc)
    out = []
    settings_cache: Dict[str, Dict[str, Any]] = {}
    rows = db.scalars(select(Transaction).where(Transaction.type == "appointment", Transaction.status == "confirmed")).all()
    for t in rows:
        details = t.details or {}
        if details.get("reminder_sent_at"):
            continue
        cfg = settings_cache.get(t.business_id) or settings_cache.setdefault(t.business_id, clinic_settings(db, t.business_id))
        if not cfg["enabled"]:
            continue
        business = db.get(Business, t.business_id)
        if not business:
            continue
        start = appointment_start(details, business.timezone)
        if start and NEVER_CLOSER_THAN < (start - now) <= cfg["lead"]:
            out.append((t, business, start, cfg))
    return out


def reminder_text(details: Dict[str, Any], business: Business, start: datetime) -> str:
    who = details.get("customer_name") or details.get("patient_name") or "there"
    doctor = f" with {details['doctor_name']}" if details.get("doctor_name") and details["doctor_name"] != "Duty Doctor" else ""
    when = f"{start:%A, %d %B} at {start:%I:%M %p}".replace(" 0", " ")
    contact = f" To reschedule or cancel, call {business.business_phone}." if business.business_phone else " To reschedule or cancel, reply or call us."
    return f"Hi {who}, a reminder of your appointment at {business.name}{doctor} on {when}.{contact}"


def _phone(details: Dict[str, Any]) -> str:
    return re.sub(r"[^\d+]", "", str(details.get("phone_number") or details.get("phone") or ""))


async def send_one(db: Session, t: Transaction, business: Business, start: datetime, cfg: Dict[str, Any]) -> Dict[str, Any]:
    """Send the reminder over the channels available and mark it sent when at least one message went out."""
    from backend.ai.tools.common.send_sms import send_sms_sync
    from backend.server.services.whatsapp_agent import send_template

    details = dict(t.details or {})
    phone = _phone(details)
    if len(re.sub(r"\D", "", phone)) < 10:
        return {"sent": False, "reason": "no usable phone number"}
    text = reminder_text(details, business, start)
    result: Dict[str, Any] = {"sent": False}

    sms = await asyncio.to_thread(send_sms_sync, phone, text)
    if sms.get("queued"):
        result["sms"], result["sent"] = True, True

    if cfg.get("template"):
        integration = next(
            (i for i in db.scalars(select(Integration).where(Integration.business_id == business.id, Integration.provider == "whatsapp", Integration.status == "connected")).all()),
            None,
        )
        if integration and (integration.config or {}).get("access_token"):
            who = details.get("customer_name") or "there"
            ok = await send_template(dict(integration.config), re.sub(r"\D", "", phone), cfg["template"], cfg["language"], [who, business.name, f"{start:%A, %d %B} at {start:%I:%M %p}".replace(" 0", " ")])
            if ok:
                result["whatsapp"], result["sent"] = True, True

    if result["sent"]:
        t.details = {**details, "reminder_sent_at": datetime.now(timezone.utc).isoformat()}
        db.commit()
    return result


async def run_cycle(session_factory: Any = None, now: Optional[datetime] = None) -> int:
    """One pass. Returns how many appointments were reminded."""
    if session_factory is None:
        from backend.server.database.session import SessionLocal as session_factory
    sent = 0
    with session_factory() as db:
        for t, business, start, cfg in due_reminders(db, now):
            try:
                if (await send_one(db, t, business, start, cfg)).get("sent"):
                    sent += 1
            except Exception as e:
                logger.warning("[REMINDERS] could not remind appointment %s: %s", t.id, e)
    if sent:
        logger.info("[REMINDERS] sent %d reminder(s)", sent)
    return sent


async def reminder_loop(interval_seconds: int = 300) -> None:
    while True:
        try:
            await run_cycle()
        except Exception as e:
            logger.warning("[REMINDERS] cycle failed: %s", e)
        await asyncio.sleep(max(60, interval_seconds))
