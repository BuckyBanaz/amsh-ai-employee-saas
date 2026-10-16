"""
Booking / conversation channels: the one place that says where a patient interaction came from.

Every booking records `details["source"]` (what created it, e.g. `ai_voice_receptionist`, `ai_whatsapp_chat`,
`manual_dashboard`) and, for new bookings, `details["channel"]` (one of CHANNELS below). `channel_of()` reads either, and for
rows written before channels existed it also looks at the call id (WhatsApp chats use `wa_...` ids), so old bookings show
the right channel too.

To add a channel (email, website widget, Instagram...): add it to CHANNELS, make that integration write
`source="ai_<name>"` (or `details["channel"]="<key>"`), and add a keyword to `_KEYWORDS` if its source name is unusual.
The dashboard reads `channel` and `channel_label` from the API and needs no change for a known key.
"""

from typing import Any, Dict, Optional

# key -> (label, colour for charts)
CHANNELS: Dict[str, tuple] = {
    "phone": ("Phone call", "#0066FF"),
    "whatsapp": ("WhatsApp", "#10B981"),
    "web_chat": ("Website chat", "#8B5CF6"),
    "email": ("Email", "#EC4899"),
    "social": ("Social media", "#06B6D4"),
    "walk_in": ("Front desk", "#F59E0B"),
    "dashboard": ("Dashboard", "#64748B"),
    "other": ("Other", "#94A3B8"),
}

# First match wins. Checked against the lower-cased source / channel text.
_KEYWORDS = (
    ("whatsapp", "whatsapp"),
    ("web_chat", "web"),
    ("web_chat", "widget"),
    ("email", "mail"),
    ("social", "instagram"),
    ("social", "facebook"),
    ("social", "messenger"),
    ("social", "social"),
    ("walk_in", "walk"),
    ("walk_in", "front_desk"),
    ("dashboard", "manual"),
    ("dashboard", "dashboard"),
    ("phone", "voice"),
    ("phone", "phone"),
    ("phone", "call"),
)


def channel_of(details: Optional[Dict[str, Any]], call_id: Optional[str] = None) -> str:
    """The canonical channel key for a booking row."""
    details = details or {}
    explicit = str(details.get("channel") or "").strip().lower()
    if explicit in CHANNELS:
        return explicit
    text = f"{explicit} {details.get('source') or ''}".lower().replace(" ", "_")
    for key, word in _KEYWORDS:
        if word in text:
            # Old WhatsApp bookings were stored as a "voice receptionist" source: the chat's call id gives them away.
            if key == "phone" and str(call_id or "").startswith("wa_"):
                return "whatsapp"
            return key
    if str(call_id or "").startswith("wa_"):
        return "whatsapp"
    return "phone" if call_id else "other"


def channel_label(key: str) -> str:
    return CHANNELS.get(key, CHANNELS["other"])[0]


def channel_color(key: str) -> str:
    return CHANNELS.get(key, CHANNELS["other"])[1]
