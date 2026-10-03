"""
Safety & Emergency Rules.
Deterministic detection of life-threatening situations so they are escalated with no LLM delay.
Whole-phrase matching only: bare "emergency", "accident", "severe pain" or numbers such as "108" are NOT triggers, because
callers say them in ordinary sentences ("do you take emergency appointments?", "my number ends in 108").

Localised and table-driven: detection patterns are listed per language in EMERGENCY_PATTERNS (add a language = add an entry),
and the number spoken to the caller comes from the business's region (`BusinessContext.emergency_numbers`), not from this file.
Detection stays on for EVERY listed language whatever the clinic's region: a missed emergency is worse than a false alarm, and
a caller may speak a language the clinic's region does not predict.
"""

import logging
import re
from typing import Dict, Optional, Sequence, Tuple

logger = logging.getLogger(__name__)

EMERGENCY_PATTERNS: Dict[str, "re.Pattern[str]"] = {
    "en": re.compile(
        r"\b(?:chest\s+pain|heart\s+attack|stroke|(?:can(?:'|no)?t|cannot|unable\s+to)\s+breathe|difficulty\s+breathing|"
        r"(?:heavy|severe)\s+bleeding|bleeding\s+(?:heavily|a\s+lot|badly)|unconscious|passed\s+out|seizure|overdose|"
        r"suicid\w*|want\s+to\s+die|kill\s+myself)\b",
        re.IGNORECASE,
    ),
    "hi": re.compile(
        r"सीने\s*में\s*दर्द|सांस\s*(?:नहीं|लेने\s*में)|साँस\s*(?:नहीं|लेने\s*में)|दिल\s*का\s*दौरा|हार्ट\s*अटैक|बेहोश|बहुत\s*खून|खून\s*बह|आत्महत्या|"
        r"\b(?:seene\s+mein\s+dard|saans\s+nahi|sans\s+nahi|behosh|dil\s+ka\s+daura|khoon\s+beh\w*)\b",
        re.IGNORECASE,
    ),
}


def emergency_message(emergency_numbers: Optional[Sequence[str]] = None) -> str:
    """What is spoken on an emergency. The numbers come from the business context; with none known it says 'local'."""
    where = f" ({' or '.join(emergency_numbers)})" if emergency_numbers else ""
    return (
        "This sounds like a serious medical emergency. Please hang up and immediately dial your local emergency number"
        f"{where}. I am also alerting our duty medical team now."
    )


class EmergencyRule:
    """Evaluates the caller's words for acute medical emergencies."""

    @staticmethod
    def evaluate(user_text: str, emergency_numbers: Optional[Sequence[str]] = None) -> Tuple[bool, Optional[str]]:
        """Returns (is_emergency, message to speak). On an emergency the message is spoken at once and the call escalated."""
        text = user_text or ""
        match = next((m for pattern in EMERGENCY_PATTERNS.values() if (m := pattern.search(text))), None)
        if not match:
            return False, None
        logger.warning("SAFETY GUARDRAIL TRIGGERED: matched '%s' in caller input.", match.group(0))
        return True, emergency_message(emergency_numbers)
