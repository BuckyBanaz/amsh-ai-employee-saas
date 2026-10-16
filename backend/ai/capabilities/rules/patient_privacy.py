"""
Patient Privacy & Returning-Patient Rule.
Two jobs for the agent's prompt:
1. PRIVACY_RULE: the agent knows only the person it is talking to. It never reveals another patient's data or the
   clinic's internal business data, and never looks up appointments for a number that is not the caller's own.
2. known_patient_block(): a few safe lines about THIS patient (name, last visits) so a returning patient is
   greeted like one. The data comes from this business's own records, matched on the caller's own number only.
"""

from backend.ai.prompts import load_prompts
import re
from typing import Any, Dict, List, Optional

PRIVACY_RULE = load_prompts("receptionist")["privacy_rule"]  # wording lives in ai/prompts/receptionist.json

_NAME_CHARS = re.compile(r"[^A-Za-zऀ-ॿ .'\-]")
_GUEST = {"guest patient", "guest", "unknown", ""}


def clean_name(name: Optional[str]) -> str:
    """A person's name safe to put in a prompt: letters, spaces and . ' - only, at most 40 characters. A WhatsApp profile name
    is typed by the user, so anything that could read as an instruction is cut out."""
    cleaned = _NAME_CHARS.sub("", str(name or "")).strip()
    return re.sub(r"\s+", " ", cleaned)[:40].strip()


def known_patient_block(history: List[Dict[str, Any]], profile_name: Optional[str] = None) -> str:
    """Prompt lines about the caller. `history` is the caller's own appointments, newest first (from
    ClinicReadOperations.get_patient_history). Empty string when there is nothing safe to say. Wording: engine_notes.json."""
    notes = load_prompts("engine_notes")["known_patient"]
    name = ""
    for row in history:
        candidate = clean_name(row.get("customer_name"))
        if candidate.lower() not in _GUEST:
            name = candidate
            break
    if not history:
        profile = clean_name(profile_name)
        if not profile:
            return ""
        return notes["new_patient"].format(profile=profile)
    visits = notes["visit_separator"].join(
        notes["visit"].format(
            service=clean_name(row.get("service_name")) or notes["visit_default_service"],
            date=row.get("preferred_date"), time=row.get("preferred_time"), status=row.get("status"),
        )
        for row in history
    )
    who = notes["name_on_file"].format(name=name) if name else notes["no_name"]
    return notes["returning_patient"].format(who=who, visits=visits)
