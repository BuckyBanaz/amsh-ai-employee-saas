"""After a call ends (phone call, playground call or WhatsApp conversation):

1. a real record of it: summary, intent, sentiment and action items (written by the LLM from the transcript, with a keyword
   fallback when no model is available; facts such as "an appointment was booked" always come from the database);
2. missed-call text-back (an SMS to a caller who hung up before saying anything), only when the owner switched it on;
3. alerts to the clinic's own staff (escalation, new booking, missed call), only when the owner configured a contact.

Runs in a background thread so hanging up never waits for it, and never raises.
"""

import asyncio
import json
import logging
import os
import re
import threading
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select

from backend.server.database.models.agent import Agent
from backend.server.database.models.audit_log import AuditLog
from backend.server.database.models.business import Business
from backend.server.database.models.call import Call
from backend.server.database.models.transaction import Transaction
from backend.server.database.session import SessionLocal

logger = logging.getLogger(__name__)

INTENTS = ("booking", "reschedule", "cancel", "inquiry", "emergency", "complaint", "other")
SENTIMENTS = ("positive", "neutral", "negative")
MISSED_CALL_ACTION = "followup.missed_call"
_TEST_PREFIXES = ("studio_", "webcall_", "sim_", "test_call_")

_KEYWORDS = [
    ("cancel", r"\bcancel|रद्द|कैंसल|band kar|radd"),
    ("reschedule", r"reschedul|postpone|change (?:the )?(?:time|date|appointment)|बदल|आगे कर|prepone"),
    ("booking", r"\bbook|appoint|slot|बुक|अपॉइंट|अपाइंट|apoint|appointment"),
    ("complaint", r"complain|worst|not happy|शिकायत|bakwas|बकवास"),
]


def is_test_call(call_id: str) -> bool:
    return (call_id or "").startswith(_TEST_PREFIXES)


# ------------------------------------------------------------------ analysis
def heuristic_analysis(turns: List[Tuple[str, str]]) -> Dict[str, Any]:
    """Keyword fallback used when the model cannot be reached."""
    from backend.ai.capabilities.rules.safety_emergency import EmergencyRule
    from backend.ai.engine.agent.emotion import caller_mood

    caller = [text for who, text in turns if who == "User"]
    joined = " ".join(caller)
    if EmergencyRule.evaluate(joined)[0]:
        intent = "emergency"
    else:
        intent = next((name for name, pattern in _KEYWORDS if re.search(pattern, joined, re.IGNORECASE)), "inquiry" if caller else "other")
    mood = caller_mood(joined)
    sentiment = "negative" if mood in ("upset", "worried") else "positive" if mood in ("thankful", "amused") else "neutral"
    first = caller[0].strip()[:160] if caller else ""
    summary = f'The caller said: "{first}"' if first else "The caller hung up before saying anything."
    return {"summary": summary, "intent": intent, "sentiment": sentiment, "action_items": [], "caller_name": None}


def _extract_json(text: str) -> Optional[Dict[str, Any]]:
    if not text:
        return None
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        data = json.loads(text[start : end + 1])
        return data if isinstance(data, dict) else None
    except ValueError:
        return None


def clean_analysis(raw: Optional[Dict[str, Any]], fallback: Dict[str, Any]) -> Dict[str, Any]:
    """Keep only well-formed fields from the model's answer; anything odd falls back to the keyword result."""
    raw = raw or {}
    summary = str(raw.get("summary") or "").strip()
    items = [str(i).strip()[:160] for i in (raw.get("action_items") or []) if str(i).strip()][:3] if isinstance(raw.get("action_items"), list) else []
    name = str(raw.get("caller_name") or "").strip()
    return {
        "summary": summary[:600] if len(summary) >= 8 else fallback["summary"],
        "intent": raw.get("intent") if raw.get("intent") in INTENTS else fallback["intent"],
        "sentiment": raw.get("sentiment") if raw.get("sentiment") in SENTIMENTS else fallback["sentiment"],
        "action_items": items,
        "caller_name": name[:60] if 1 < len(name) <= 60 and not re.search(r"unknown|not provided|n/?a|none", name, re.IGNORECASE) else None,
    }


ANALYSIS_PROMPT = (
    "You write records of phone calls and chats for a clinic's front desk. Read the transcript and answer with ONLY a JSON "
    'object: {"summary": one or two plain English sentences for the clinic owner, "intent": one of '
    + "|".join(INTENTS)
    + ', "sentiment": one of positive|neutral|negative (how the caller felt), "action_items": up to 3 short follow-ups for '
    'staff (empty list if none), "caller_name": the caller\'s name if they gave it, else null}. Do not invent anything that '
    "is not in the transcript. The transcript may be in Hindi, Hinglish or English; write in English."
)


async def llm_analysis(turns: List[Tuple[str, str]], backend: Any = None) -> Optional[Dict[str, Any]]:
    try:
        if backend is None:
            from backend.ai.engine.agent.llm_backend import build_chat_backend

            backend = build_chat_backend(temperature=0.1)
        lines = [f"{'Caller' if who == 'User' else 'AI'}: {text.strip()[:300]}" for who, text in turns[-60:]]
        result = await backend.chat(
            [{"role": "system", "content": ANALYSIS_PROMPT}, {"role": "user", "content": "\n".join(lines)}], []
        )
        return _extract_json(result.get("content") or "")
    except Exception as e:
        logger.warning("[POST-CALL] model analysis failed: %s", e)
        return None


def _booked(db: Any, call_id: str) -> List[Dict[str, Any]]:
    rows = db.scalars(select(Transaction).where(Transaction.call_id == call_id, Transaction.type == "appointment", Transaction.status == "confirmed")).all()
    return [dict(r.details or {}) for r in rows]


def _describe_booking(d: Dict[str, Any]) -> str:
    who = d.get("customer_name") or d.get("patient_name") or "the caller"
    return f"{d.get('preferred_date', '?')} {d.get('preferred_time', '')} with {d.get('doctor_name') or 'the clinic'} for {d.get('service_name') or 'an appointment'} ({who})".replace("  ", " ")


# ------------------------------------------------------------------ staff alerts and text-back
def _agent_config(db: Any, business_id: str) -> Dict[str, Any]:
    agent = db.query(Agent).filter(Agent.business_id == business_id).order_by(Agent.created_at.asc()).first()
    return dict(agent.config or {}) if agent else {}


def _recent_followup(db: Any, action: str, target_id: str, hours: int = 24) -> bool:
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    return db.scalar(select(AuditLog.id).where(AuditLog.action == action, AuditLog.target_id == target_id, AuditLog.created_at > since).limit(1)) is not None


def _digits(number: str) -> str:
    return re.sub(r"\D", "", number or "")


async def _send_missed_call_sms(db: Any, call: Call, business: Business, config: Dict[str, Any]) -> bool:
    """Returns True if a text-back was sent."""
    if (config.get("toggles") or {}).get("missed_call_followup") is not True:
        return False  # off unless the owner switches it on: it costs an SMS and messages a stranger
    number = call.caller_number or ""
    if len(_digits(number)) < 10 or _recent_followup(db, MISSED_CALL_ACTION, number):
        return False
    from backend.ai.tools.common.send_sms import send_sms_sync
    from backend.server.services.audit import audit

    phone = f" on {business.business_phone}" if business.business_phone else ""
    body = f"Sorry we missed your call to {business.name}. Call us back{phone} any time: our assistant answers 24/7, or tell us what you need and we will help."
    result = await asyncio.to_thread(send_sms_sync, number, body)
    if not (result or {}).get("queued"):
        return False  # SMS is switched off or there is no recipient: nothing was sent, so nothing is recorded
    audit(db, MISSED_CALL_ACTION, business_id=business.id, target_type="phone", target_id=number)
    return True


async def process_call_end(call_id: str, backend: Any = None) -> Optional[Dict[str, Any]]:
    """Analyse a finished call and run its follow-ups. Safe to call twice (a call is analysed once)."""
    from backend.server.notifications.dispatcher import NotificationDispatcher

    with SessionLocal() as db:
        call = db.get(Call, call_id)
        if not call or call.analyzed_at:
            return None
        turns = [(m.speaker, m.text) for m in call.messages if m.sequence > 0 and (m.text or "").strip()]
        business = db.get(Business, call.business_id)
        config = _agent_config(db, call.business_id)
        user_turns = [t for t in turns if t[0] == "User"]
        booked = _booked(db, call.id)

        fallback = heuristic_analysis(turns)
        analysis = clean_analysis(await llm_analysis(turns, backend), fallback) if user_turns else fallback
        if not user_turns:
            analysis["intent"], analysis["sentiment"] = "other", "neutral"
        if fallback["intent"] == "emergency":
            analysis["intent"], analysis["sentiment"] = "emergency", "negative"  # a rule, never left to the model
        items = list(analysis["action_items"])
        if booked:
            analysis["intent"] = "booking"  # the database says so
            items = [f"Appointment booked: {_describe_booking(b)}" for b in booked] + items
        if call.outcome == "transferred" or analysis["intent"] == "emergency":
            items.append("The call was handed to staff: follow up with the caller if needed.")
        if not user_turns:
            items.append("Missed call: the caller hung up before speaking. Consider calling back.")

        call.summary = analysis["summary"][:2000]
        call.intent = analysis["intent"]
        call.sentiment = analysis["sentiment"]
        call.action_items = items[:6]
        if analysis["caller_name"] and not call.caller_name:
            call.caller_name = analysis["caller_name"]
        call.analyzed_at = datetime.now(timezone.utc)
        db.commit()

        test = is_test_call(call.id) or call.id.startswith("wa_")
        if not test and business:
            try:
                if not user_turns:
                    await _send_missed_call_sms(db, call, business, config)
                    await NotificationDispatcher.notify_staff(call.business_id, "missed_call", f"Missed call from {call.caller_number} at {business.name}.")
                for b in booked:
                    await NotificationDispatcher.notify_staff(call.business_id, "booking", f"New booking: {_describe_booking(b)}.")
                if call.outcome == "transferred" or analysis["intent"] == "emergency":
                    label = "EMERGENCY call" if analysis["intent"] == "emergency" else "Call transferred to staff"
                    await NotificationDispatcher.notify_staff(call.business_id, "escalation", f"{label} from {call.caller_number}: {analysis['summary']}")
            except Exception as e:  # follow-ups must never undo the record
                logger.warning("[POST-CALL] follow-up failed for %s: %s", call_id, e)
        return analysis


def schedule(call_id: str) -> None:
    """Fire and forget from any thread or event loop."""
    if os.environ.get("AMSH_DISABLE_POST_CALL"):
        return

    def run() -> None:
        try:
            asyncio.run(process_call_end(call_id))
        except Exception as e:
            logger.warning("[POST-CALL] processing failed for %s: %s", call_id, e)

    threading.Thread(target=run, name=f"post-call-{call_id[:8]}", daemon=True).start()
