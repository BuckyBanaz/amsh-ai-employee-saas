"""Message templates (DOCS/24): the event catalogue, built-in defaults, the renderer, and how a template is found.

Resolution order for (event, channel, language): the business's own active override, then the platform's active template, then
the same two in English, then the built-in default below. Only `{{variable}}` placeholders from the event's allow-list are
substituted (no code, no loops). An unknown variable is refused when a template is saved; at send time a missing value renders
as an empty string and is logged.

Not wired yet: the existing senders (`dispatcher.py`, `reminders.py`, `auth.py`...) still use their hardcoded strings. They move
here one at a time through `resolve()` + `render()`.
"""

import html
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.server.database.models.message_template import MessageLog, MessagePreferences, MessageTemplate

logger = logging.getLogger(__name__)

CHANNELS = ("email", "sms", "whatsapp", "push")
STATUSES = ("draft", "active", "archived")
HISTORY_LIMIT = 20
BODY_LIMIT = {"email": 10000, "sms": 1600, "whatsapp": 1024, "push": 500}
SUBJECT_LIMIT = 200
_VAR = re.compile(r"\{\{\s*(\w+)\s*\}\}")
_HHMM = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")

PATIENT_VARS = ["patient_name", "service", "doctor", "date", "time", "clinic_name", "clinic_phone", "manage_link"]


def _event(label: str, group: str, owner: str, to: str, variables: List[str], channels: List[str], order: List[str], enabled: bool = True) -> Dict[str, Any]:
    return {"label": label, "group": group, "owner": owner, "to": to, "variables": variables, "channels": channels, "default_order": order, "default_enabled": enabled}


# owner "platform": only AMSh edits the wording. owner "business": the platform template is the default and a clinic may override it.
EVENTS: Dict[str, Dict[str, Any]] = {
    "auth.verify_email": _event("Verify email", "Account", "platform", "Owner / staff", ["name", "link", "business_name"], ["email", "push"], ["email"]),
    "auth.password_reset": _event("Password reset", "Account", "platform", "Owner / staff", ["name", "link"], ["email"], ["email"]),
    "team.invite": _event("Team invite", "Account", "platform", "Staff", ["name", "link", "business_name"], ["email"], ["email"]),
    "billing.trial_ending": _event("Trial ending", "Billing", "platform", "Owner", ["name", "days_left", "plan", "business_name"], ["email", "push"], ["email", "push"]),
    "billing.payment_receipt": _event("Payment receipt", "Billing", "platform", "Owner", ["name", "plan", "amount", "invoice_link"], ["email"], ["email"]),
    "billing.plan_limit_reached": _event("Plan limit reached", "Billing", "platform", "Owner", ["name", "plan", "business_name"], ["email", "push"], ["email", "push"]),
    "booking.confirmed": _event("Booking confirmed", "Patient messages", "business", "Patient", PATIENT_VARS, ["whatsapp", "sms", "email"], ["whatsapp", "sms"]),
    "booking.rescheduled": _event("Booking rescheduled", "Patient messages", "business", "Patient", PATIENT_VARS, ["whatsapp", "sms", "email"], ["whatsapp", "sms"]),
    "booking.cancelled": _event("Booking cancelled", "Patient messages", "business", "Patient", ["patient_name", "service", "date", "time", "clinic_name", "clinic_phone"], ["whatsapp", "sms", "email"], ["sms"]),
    "booking.reminder": _event("Appointment reminder", "Patient messages", "business", "Patient", PATIENT_VARS, ["whatsapp", "sms", "email"], ["whatsapp", "sms"]),
    "call.missed_followup": _event("Missed-call follow-up", "Patient messages", "business", "Patient", ["patient_name", "clinic_name", "clinic_phone"], ["sms", "whatsapp"], ["sms"], enabled=False),
    "feedback.request": _event("Feedback request", "Patient messages", "business", "Patient", ["patient_name", "service", "clinic_name", "manage_link"], ["whatsapp", "sms", "email"], ["whatsapp", "sms"], enabled=False),
    "alert.escalation": _event("Escalation alert", "Staff alerts", "business", "Clinic staff", ["caller", "reason", "summary", "call_link"], ["sms", "email", "push"], ["sms", "email"]),
    "alert.booking": _event("New booking alert", "Staff alerts", "business", "Clinic staff", ["caller", "summary", "call_link"], ["sms", "email", "push"], ["email"], enabled=False),
    "alert.missed_call": _event("Missed call alert", "Staff alerts", "business", "Clinic staff", ["caller", "call_link"], ["sms", "email", "push"], ["sms"], enabled=False),
    "platform.provider_down": _event("Provider down", "Platform alerts", "platform", "Platform admins", ["provider", "message"], ["email", "push"], ["email", "push"]),
}

# Built-in English defaults: the text used when no row exists. (event, channel) -> (subject, body)
_DEFAULTS: Dict[Tuple[str, str], Tuple[Optional[str], str]] = {
    ("auth.verify_email", "email"): ("Confirm your email for AMSh", "Hi {{name}},\n\nConfirm your email to finish setting up {{business_name}} on AMSh:\n{{link}}\n\nThe link works for 24 hours."),
    ("auth.verify_email", "push"): (None, "Please confirm your email address to unlock your dashboard."),
    ("auth.password_reset", "email"): ("Reset your AMSh password", "Hi {{name}},\n\nUse this link to choose a new password:\n{{link}}\n\nIf you did not ask for this, you can ignore this email."),
    ("team.invite", "email"): ("You have been invited to {{business_name}}", "Hi {{name}},\n\nYou were invited to join {{business_name}} on AMSh. Accept here:\n{{link}}"),
    ("billing.trial_ending", "email"): ("Your AMSh trial ends in {{days_left}} days", "Hi {{name}},\n\nYour trial for {{business_name}} ends in {{days_left}} days. Pick a plan to keep your AI receptionist answering calls."),
    ("billing.trial_ending", "push"): (None, "Your trial ends in {{days_left}} days. Choose a plan to keep your receptionist live."),
    ("billing.payment_receipt", "email"): ("Payment received: {{plan}}", "Hi {{name}},\n\nThank you. We received {{amount}} for the {{plan}} plan.\nInvoice: {{invoice_link}}"),
    ("billing.plan_limit_reached", "email"): ("You reached your {{plan}} plan limit", "Hi {{name}},\n\n{{business_name}} reached the limit of the {{plan}} plan. Upgrade to avoid missed calls."),
    ("billing.plan_limit_reached", "push"): (None, "Plan limit reached. Upgrade to keep every call answered."),
    ("booking.confirmed", "whatsapp"): (None, "Hi {{patient_name}}, your {{service}} with {{doctor}} is confirmed for {{date}} at {{time}}.\nNeed to change it? {{manage_link}}"),
    ("booking.confirmed", "sms"): (None, "Hi {{patient_name}}, your {{service}} with {{doctor}} is confirmed for {{date}} at {{time}}. {{clinic_name}}, {{clinic_phone}}"),
    ("booking.confirmed", "email"): ("Appointment confirmed: {{date}} at {{time}}", "Hi {{patient_name}},\n\nYour {{service}} with {{doctor}} at {{clinic_name}} is confirmed for {{date}} at {{time}}.\nManage it: {{manage_link}}"),
    ("booking.reminder", "whatsapp"): (None, "Hi {{patient_name}}, a reminder of your {{service}} with {{doctor}} on {{date}} at {{time}} at {{clinic_name}}.\nReply 1 to confirm or 2 to reschedule."),
    ("booking.reminder", "sms"): (None, "Reminder: {{service}} with {{doctor}} tomorrow, {{date}} at {{time}}. {{clinic_name}}, {{clinic_phone}}"),
    ("booking.cancelled", "sms"): (None, "Hi {{patient_name}}, your {{service}} on {{date}} at {{time}} was cancelled. Call {{clinic_name}} on {{clinic_phone}} to rebook."),
    ("call.missed_followup", "sms"): (None, "Hi {{patient_name}}, sorry we missed your call. {{clinic_name}} will call you back soon, or call {{clinic_phone}}."),
    ("alert.escalation", "sms"): (None, "AMSh alert: {{caller}} needs a person. Reason: {{reason}}. {{call_link}}"),
    ("alert.escalation", "email"): ("Caller needs a person: {{reason}}", "{{caller}} asked for a person.\n\nReason: {{reason}}\nSummary: {{summary}}\nCall: {{call_link}}"),
    ("alert.escalation", "push"): (None, "{{caller}} needs a person: {{reason}}"),
    ("platform.provider_down", "email"): ("Provider down: {{provider}}", "{{provider}} is failing.\n\n{{message}}"),
    ("platform.provider_down", "push"): (None, "{{provider}} is down. {{message}}"),
}

SAMPLE: Dict[str, str] = {
    "name": "Priya", "link": "https://app.amsh.ai/l/x7Kq", "business_name": "Sanjeevani Hospital", "days_left": "3", "plan": "Growth",
    "amount": "Rs 4,999", "invoice_link": "https://app.amsh.ai/i/2041", "patient_name": "Kamlesh", "service": "Dental Consultation",
    "doctor": "Dr. Sarah Wilson", "date": "Thu 8 Oct", "time": "10:30 AM", "clinic_name": "Sanjeevani Hospital", "clinic_phone": "+91 98765 43210",
    "manage_link": "https://amsh.ai/m/9fT2", "caller": "+91 98111 22334", "reason": "Billing question",
    "summary": "Caller disputes a charge from the last visit.", "call_link": "https://app.amsh.ai/c/881", "provider": "Twilio",
    "message": "Account inactive: SMS confirmations are failing.",
}


class TemplateError(ValueError):
    """A template or preference that cannot be saved; the message is safe to show to the user."""


def event_def(event_key: str) -> Dict[str, Any]:
    if event_key not in EVENTS:
        raise TemplateError(f"Unknown event '{event_key}'")
    return EVENTS[event_key]


def check_cell(event_key: str, channel: str) -> Dict[str, Any]:
    event = event_def(event_key)
    if channel not in event["channels"]:
        raise TemplateError(f"'{event['label']}' is not sent by {channel}")
    return event


def builtin(event_key: str, channel: str) -> Optional[Dict[str, Any]]:
    found = _DEFAULTS.get((event_key, channel))
    if not found:
        return None
    return {"subject": found[0], "body": found[1], "language": "en"}


def variables_in(text: Optional[str]) -> List[str]:
    return list(dict.fromkeys(_VAR.findall(text or "")))


def render(text: Optional[str], context: Dict[str, Any], *, escape_html: bool = False) -> str:
    """Substitute `{{variable}}` from `context`. A missing value becomes an empty string and is logged, never an error."""
    def sub(match: "re.Match[str]") -> str:
        key = match.group(1)
        value = context.get(key)
        if value is None:
            logger.warning("[TEMPLATES] missing value for {{%s}}", key)
            return ""
        return html.escape(str(value)) if escape_html else str(value)
    return _VAR.sub(sub, text or "")


def sms_info(rendered: str) -> Dict[str, Any]:
    unicode_text = any(ord(c) > 127 for c in rendered)
    single, multi = (70, 67) if unicode_text else (160, 153)
    n = len(rendered)
    return {"characters": n, "segments": 1 if n <= single else -(-n // multi), "unicode": unicode_text}


def validate_content(event_key: str, channel: str, language: str, subject: Optional[str], body: str, known_languages: List[str]) -> Tuple[Optional[str], str]:
    event = check_cell(event_key, channel)
    if language not in known_languages:
        raise TemplateError(f"Unknown language '{language}'")
    body = (body or "").strip()
    if not body:
        raise TemplateError("The message cannot be empty")
    if len(body) > BODY_LIMIT[channel]:
        raise TemplateError(f"The message is too long for {channel} (limit {BODY_LIMIT[channel]} characters)")
    subject = (subject or "").strip() or None
    if channel == "email":
        if not subject:
            raise TemplateError("An email needs a subject")
        if len(subject) > SUBJECT_LIMIT:
            raise TemplateError(f"The subject is too long (limit {SUBJECT_LIMIT} characters)")
    else:
        subject = None
    unknown = [v for v in variables_in(body) + variables_in(subject) if v not in event["variables"]]
    if unknown:
        raise TemplateError(f"Unknown variable {', '.join('{{' + v + '}}' for v in dict.fromkeys(unknown))} for '{event['label']}'. Allowed: {', '.join(event['variables'])}")
    return subject, body


def _row(db: Session, scope: str, business_id: Optional[str], event_key: str, channel: str, language: str) -> Optional[MessageTemplate]:
    q = select(MessageTemplate).where(
        MessageTemplate.scope == scope, MessageTemplate.event_key == event_key, MessageTemplate.channel == channel, MessageTemplate.language == language
    )
    q = q.where(MessageTemplate.business_id == business_id) if business_id else q.where(MessageTemplate.business_id.is_(None))
    return db.scalars(q).first()


def own_row(db: Session, scope: str, business_id: Optional[str], event_key: str, channel: str, language: str) -> Optional[MessageTemplate]:
    return _row(db, scope, business_id, event_key, channel, language)


def resolve(db: Session, event_key: str, channel: str, language: str = "en", business_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """The template to send: first active business row, platform row, then the built-in default, trying `language` then English."""
    check_cell(event_key, channel)
    for lang in dict.fromkeys([language, "en"]):
        candidates = []
        if business_id and EVENTS[event_key]["owner"] == "business":
            candidates.append(("business", business_id))
        candidates.append(("platform", None))
        for scope, bid in candidates:
            row = _row(db, scope, bid, event_key, channel, lang)
            if row and row.status == "active":
                return {**shape(row), "source": scope}
    default = builtin(event_key, channel)
    return {**default, "source": "default", "status": "active", "version": 0, "id": None} if default else None


def shape(row: MessageTemplate) -> Dict[str, Any]:
    return {
        "id": row.id, "scope": row.scope, "business_id": row.business_id, "event_key": row.event_key, "channel": row.channel,
        "language": row.language, "subject": row.subject, "body": row.body, "status": row.status, "whatsapp_name": row.whatsapp_name,
        "meta_status": row.meta_status, "sms_template_id": row.sms_template_id, "version": row.version,
        "history": [{"version": h["version"], "subject": h.get("subject"), "body": h["body"], "updated_by": h.get("updated_by"), "updated_at": h.get("updated_at")} for h in (row.history or [])],
        "updated_by": row.updated_by, "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def preview(event_key: str, channel: str, subject: Optional[str], body: str) -> Dict[str, Any]:
    event = check_cell(event_key, channel)
    ctx = {k: SAMPLE.get(k, "") for k in event["variables"]}
    text = render(body, ctx)
    out: Dict[str, Any] = {"subject": render(subject, ctx) if subject else None, "body": text, "unknown_variables": [v for v in variables_in(body) + variables_in(subject) if v not in event["variables"]]}
    if channel == "sms":
        out["sms"] = sms_info(text)
    return out


# --- Clinic preferences ---

DEFAULT_QUIET = {"enabled": False, "from": "21:00", "to": "08:00"}


def get_preferences(db: Session, business_id: str) -> Dict[str, Any]:
    row = db.get(MessagePreferences, business_id)
    stored = (row.data if row else None) or {}
    events = {}
    for key, event in EVENTS.items():
        if event["owner"] != "business":
            continue
        mine = (stored.get("events") or {}).get(key) or {}
        events[key] = {"enabled": bool(mine.get("enabled", event["default_enabled"])), "order": list(mine.get("order", event["default_order"]))}
    return {"events": events, "quiet_hours": {**DEFAULT_QUIET, **(stored.get("quiet_hours") or {})}}


def save_preferences(db: Session, business_id: str, events: Optional[Dict[str, Any]], quiet_hours: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    current = get_preferences(db, business_id)
    for key, value in (events or {}).items():
        event = event_def(key)
        if event["owner"] != "business":
            raise TemplateError(f"'{event['label']}' is managed by AMSh")
        order = value.get("order", current["events"][key]["order"])
        if len(set(order)) != len(order) or any(c not in event["channels"] for c in order):
            raise TemplateError(f"Channels for '{event['label']}' must be unique and from: {', '.join(event['channels'])}")
        current["events"][key] = {"enabled": bool(value.get("enabled", current["events"][key]["enabled"])), "order": order}
    if quiet_hours is not None:
        merged = {**current["quiet_hours"], **quiet_hours}
        if not (_HHMM.match(str(merged["from"])) and _HHMM.match(str(merged["to"]))):
            raise TemplateError("Quiet hours must be times like 21:00")
        current["quiet_hours"] = {"enabled": bool(merged["enabled"]), "from": merged["from"], "to": merged["to"]}
    row = db.get(MessagePreferences, business_id)
    if row is None:
        row = MessagePreferences(business_id=business_id, data=current)
        db.add(row)
    else:
        row.data = current
    db.commit()
    return current


def mask_recipient(value: str) -> str:
    v = str(value or "")
    if "@" in v:
        name, _, domain = v.partition("@")
        return f"{name[:1]}***@{domain}"
    digits = re.sub(r"\D", "", v)
    if len(digits) >= 7:
        return f"{v[:3]}{'•' * 3} {'•' * 2}{digits[-3:]}"
    return v


def log_shape(row: MessageLog) -> Dict[str, Any]:
    return {
        "id": row.id, "business_id": row.business_id, "event_key": row.event_key, "event": EVENTS.get(row.event_key, {}).get("label", row.event_key),
        "channel": row.channel, "recipient": mask_recipient(row.recipient), "status": row.status, "provider": row.provider,
        "error": row.error, "template_version": row.template_version, "created_at": row.created_at.isoformat() if row.created_at else None,
    }
