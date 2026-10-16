"""
Booking guard (clinic operation): a patient who already has an upcoming appointment and wants to CHANGE it must reschedule,
never create a second one. Deterministic and language-independent: it runs in the booking tool, so it holds whatever the model
decides to call.

EXPECTATIONS (change them here):
1. Only the patient's own upcoming appointments count (same phone, date today or later, status in BLOCKING_STATUSES).
2. A new booking is refused when the caller used change words ("reschedule", "move", "change", "बदल"...), or when they
   already hold an upcoming appointment for the same service. The refusal tells the model to look the appointment up and
   reschedule it.
3. It is allowed when the caller clearly asks for an additional one ("another appointment", "also book", "for my wife",
   "ek aur"...), or when the services differ and no change words were said.
"""

import re
from datetime import date
from typing import Any, Dict, Iterable, List, Optional

from backend.ai.engine.agent.datetime_utils import parse_date
from backend.ai.engine.agent.validator import same_phone

_CHANGE = re.compile(
    r"\b(?:re-?schedul\w*|chang\w*|mov(?:e|ing)|shift\w*|postpon\w*|prepon\w*|instead|different\s+(?:day|date|time)|"
    r"another\s+(?:day|date|time|slot)|badal\w*|aage|peeche|doosre\s+din|dusre\s+din|dusri\s+date|doosri\s+date)\b|बदल|आगे|पीछे|दूसरे\s*दिन",
    re.IGNORECASE,
)
_ADDITIONAL = re.compile(
    r"\b(?:another\s+(?:appointment|booking|one)|additional|extra|second\s+(?:appointment|booking)|one\s+more|also\s+book|as\s+well|"
    r"for\s+my\s+(?:wife|husband|son|daughter|mother|father|brother|sister|friend|kid|child|baby)|ek\s+aur|aur\s+ek|doosri\s+appointment|dusri\s+appointment)\b",
    re.IGNORECASE,
)


def existing_appointment_conflict(
    upcoming: Iterable[Dict[str, Any]], phone: str, service: Optional[str], said: Iterable[str], today: date
) -> Optional[Dict[str, Any]]:
    """The patient's soonest upcoming appointment that this booking would duplicate, or None when the booking may go ahead.
    `upcoming`: ClinicReadOperations.get_appointments rows already filtered to blocking statuses."""
    heard = " ".join(said)
    if _ADDITIONAL.search(heard):
        return None
    mine: List[tuple] = []
    for row in upcoming:
        when = parse_date(row.get("preferred_date"), today)
        if when and when >= today and same_phone(row.get("phone_number"), phone):
            mine.append((when, str(row.get("preferred_time") or ""), row))
    if not mine:
        return None
    mine.sort(key=lambda item: (item[0], item[1]))
    wants_change = bool(_CHANGE.search(heard))
    wanted = (service or "").strip().lower()
    for _, _, row in mine:
        if wants_change or (wanted and str(row.get("service_name") or "").strip().lower() == wanted):
            return row
    return None
