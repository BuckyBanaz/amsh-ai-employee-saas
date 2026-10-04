"""Sends a message for an event (DOCS/24): picks the template, renders it, respects the clinic's preferences, tries the channels in
order, and records every attempt in `message_log`.

    result = await send_event("booking.reminder", business_id=..., context={...}, phone="+91...", email=None)

* Template: clinic override, platform template, then the built-in text (`services/message_templates.resolve`), in the patient's
  language with English as the fallback.
* Preferences (clinic-owned events): the clinic can switch an event off, choose the channel order, and set quiet hours. Quiet hours
  hold back only messages AMSh starts itself (a reminder, a follow-up), never the answer to something the patient just did.
* Channels: `sms` (Exotel / Twilio), `email` (platform SMTP or Resend) and `whatsapp`. WhatsApp text that AMSh starts must use a
  Meta-approved template (`meta_status == "approved"` and a recorded `whatsapp_name`); inside the 24-hour window after the patient's
  own message (`window_open=True`) free text is allowed. A channel that cannot be used is skipped and the next one is tried.
* `fanout=False` (default): stop at the first channel that sends. `fanout=True` (staff alerts): send on every channel with an address.

Adapters are injected so tests never send anything; the real ones wrap the existing senders.
"""

import asyncio
import concurrent.futures
import logging
import re
from datetime import datetime, time, timezone
from typing import Any, Awaitable, Callable, Dict, List, Optional
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from backend.server.database.models.business import Business
from backend.server.database.models.integration import Integration
from backend.server.database.models.message_template import MessageLog
from backend.server.services import message_templates as templates

logger = logging.getLogger(__name__)

Adapter = Callable[..., Awaitable[Dict[str, Any]]]


async def _sms(phone: str, text: str, **_: Any) -> Dict[str, Any]:
    from backend.ai.tools.common.send_sms import send_sms_sync

    res = await asyncio.to_thread(send_sms_sync, phone, text)
    return {"ok": bool((res or {}).get("queued")), "provider": "sms", "error": None if (res or {}).get("queued") else str((res or {}).get("skipped") or "not sent")}


async def _email(email: str, text: str, subject: Optional[str] = None, **_: Any) -> Dict[str, Any]:
    from backend.server.services.email_service import send_email

    res = await send_email(email, subject or "AMSh", text)
    return {"ok": bool(res.get("sent")), "provider": res.get("provider"), "error": None if res.get("sent") else "email provider did not accept the message"}


async def _whatsapp(config: Dict[str, Any], phone: str, text: str, template: Optional[Dict[str, Any]] = None, language: str = "en", params: Optional[List[str]] = None, **_: Any) -> Dict[str, Any]:
    from backend.server.services.whatsapp_agent import send_template, send_text

    digits = re.sub(r"\D", "", phone)
    ok = await send_template(config, digits, template["whatsapp_name"], language, params or []) if template else await send_text(config, digits, text)
    return {"ok": bool(ok), "provider": "whatsapp", "error": None if ok else "WhatsApp rejected the message"}


ADAPTERS: Dict[str, Adapter] = {"sms": _sms, "email": _email, "whatsapp": _whatsapp}


def in_quiet_hours(quiet: Dict[str, Any], tz_name: Optional[str], now: Optional[datetime] = None) -> bool:
    """True when `now` (in the clinic's timezone) falls inside the clinic's quiet window; the window may cross midnight."""
    if not quiet.get("enabled"):
        return False
    try:
        tz = ZoneInfo(tz_name or "UTC")
    except Exception:
        tz = ZoneInfo("UTC")
    local = (now or datetime.now(timezone.utc)).astimezone(tz).time()
    start, end = time.fromisoformat(quiet["from"]), time.fromisoformat(quiet["to"])
    return start <= local < end if start <= end else (local >= start or local < end)


def whatsapp_params(body: str, context: Dict[str, Any]) -> List[str]:
    """Meta templates take {{1}}, {{2}}...: the template's variables in order of first appearance."""
    return [str(context.get(v, "")) for v in templates.variables_in(body)]


def _whatsapp_config(db: Session, business_id: Optional[str]) -> Optional[Dict[str, Any]]:
    if not business_id:
        return None
    row = db.query(Integration).filter(Integration.business_id == business_id, Integration.provider == "whatsapp", Integration.status == "connected").first()
    config = dict(row.config or {}) if row else {}
    return config if config.get("access_token") and config.get("phone_number_id") else None


def _log(db: Session, business_id: Optional[str], event_key: str, channel: str, recipient: str, res: Dict[str, Any], tpl: Dict[str, Any]) -> None:
    try:
        db.add(MessageLog(business_id=business_id, event_key=event_key, channel=channel, recipient=recipient, template_id=tpl.get("id"), template_version=tpl.get("version"),
                          status="sent" if res.get("ok") else "failed", provider=res.get("provider"), error=(res.get("error") or None) and str(res["error"])[:500]))
        db.commit()
    except Exception as e:  # a log failure must never stop a patient message
        db.rollback()
        logger.warning("[MESSENGER] could not write message_log: %s", e)


async def send_event(
    db: Session, event_key: str, *, business_id: Optional[str], context: Dict[str, Any], phone: Optional[str] = None, email: Optional[str] = None,
    language: str = "en", fanout: bool = False, window_open: bool = False, respect_preferences: bool = True, now: Optional[datetime] = None,
    adapters: Optional[Dict[str, Adapter]] = None, only_channels: Optional[List[str]] = None,
) -> Dict[str, Any]:
    event = templates.event_def(event_key)
    send = {**ADAPTERS, **(adapters or {})}
    business = db.get(Business, business_id) if business_id else None
    if respect_preferences and business_id and event["owner"] == "business":
        prefs = templates.get_preferences(db, business_id)
        mine = prefs["events"][event_key]
        if not mine["enabled"]:
            return {"sent": False, "reason": "switched off by the clinic", "attempts": []}
        order = mine["order"]
        if event["proactive"] and in_quiet_hours(prefs["quiet_hours"], business.timezone if business else None, now):
            return {"sent": False, "deferred": True, "reason": "quiet hours", "attempts": []}
    else:
        order = event["channels"] if fanout else event["default_order"]  # a fan-out (staff alert) uses every channel the contact has

    if only_channels:  # the person asked for a particular channel ("send it on WhatsApp"): try it first, then the clinic's own order
        order = [c for c in only_channels if c in event["channels"]] + [c for c in order if c not in only_channels]
    attempts: List[Dict[str, Any]] = []
    sent_any = False
    for channel in order:
        if channel not in event["channels"] or channel not in templates.LIVE_CHANNELS:
            continue
        address = email if channel == "email" else phone
        if not address or (channel != "email" and len(re.sub(r"\D", "", address)) < 8):
            attempts.append({"channel": channel, "sent": False, "reason": "no address"})
            continue
        tpl = templates.resolve(db, event_key, channel, language, business_id)
        if not tpl:
            attempts.append({"channel": channel, "sent": False, "reason": "no template"})
            continue
        text = templates.render(tpl["body"], context)
        if event["group"] == "Staff alerts" and channel == "sms":
            text = text[:300]  # the limit staff alerts have always had
        subject = templates.render(tpl.get("subject"), context) if tpl.get("subject") else None
        kwargs: Dict[str, Any] = {"subject": subject}
        if channel == "whatsapp":
            config = _whatsapp_config(db, business_id)
            approved = tpl.get("meta_status") == "approved" and tpl.get("whatsapp_name")
            if not config:
                attempts.append({"channel": channel, "sent": False, "reason": "WhatsApp is not connected"})
                continue
            if not window_open and not approved:
                attempts.append({"channel": channel, "sent": False, "reason": "needs a Meta-approved template"})
                continue
            kwargs.update(config=config, template=tpl if (approved and not window_open) else None, language=language, params=whatsapp_params(tpl["body"], context))
        try:
            res = await send[channel](address, text, **kwargs) if channel != "whatsapp" else await send[channel](kwargs.pop("config"), address, text, **kwargs)
        except Exception as e:
            res = {"ok": False, "provider": channel, "error": str(e)}
        _log(db, business_id, event_key, channel, address, res, tpl)
        attempts.append({"channel": channel, "sent": bool(res.get("ok")), "reason": res.get("error"), "source": tpl.get("source")})
        if res.get("ok"):
            sent_any = True
            if not fanout:
                break
    return {"sent": sent_any, "attempts": attempts}


def context_for(event_key: str, **values: Any) -> Dict[str, Any]:
    """Every variable the event allows, empty unless given, so a missing value is blank text instead of a logged warning."""
    ctx: Dict[str, Any] = {v: "" for v in templates.event_def(event_key)["variables"]}
    ctx.update({k: v for k, v in values.items() if v is not None})
    return ctx


def send_event_sync(db: Session, event_key: str, **kwargs: Any) -> Dict[str, Any]:
    """`send_event` for synchronous callers (booking tools, workers). Runs in its own short-lived thread and event loop, so it is safe
    whether or not the caller is already inside a running loop; the caller waits for the result."""
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(lambda: asyncio.run(send_event(db, event_key, **kwargs))).result()
