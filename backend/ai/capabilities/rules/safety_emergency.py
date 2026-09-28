"""
Safety & Emergency Rules.
Deterministic detection of life-threatening situations (English and Hindi/Devanagari) so they are escalated with no LLM delay.
Whole-phrase matching only: bare "emergency", "accident", "severe pain" or numbers such as "108" are NOT triggers, because
callers say them in ordinary sentences ("do you take emergency appointments?", "my number ends in 108").
"""

import logging
import re
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

_ENGLISH = re.compile(
    r"\b(?:chest\s+pain|heart\s+attack|stroke|(?:can(?:'|no)?t|cannot|unable\s+to)\s+breathe|difficulty\s+breathing|"
    r"(?:heavy|severe)\s+bleeding|bleeding\s+(?:heavily|a\s+lot|badly)|unconscious|passed\s+out|seizure|overdose|"
    r"suicid\w*|want\s+to\s+die|kill\s+myself)\b",
    re.IGNORECASE,
)
_HINDI = re.compile(
    r"सीने\s*में\s*दर्द|सांस\s*(?:नहीं|लेने\s*में)|साँस\s*(?:नहीं|लेने\s*में)|दिल\s*का\s*दौरा|हार्ट\s*अटैक|बेहोश|बहुत\s*खून|खून\s*बह|आत्महत्या|"
    r"\b(?:seene\s+mein\s+dard|saans\s+nahi|sans\s+nahi|behosh|dil\s+ka\s+daura|khoon\s+beh\w*)\b",
    re.IGNORECASE,
)

EMERGENCY_MESSAGE = (
    "This sounds like a serious medical emergency. Please hang up and immediately dial your local emergency number "
    "(112 or 108 in India). I am also alerting our duty medical team now."
)


class EmergencyRule:
    """Evaluates the caller's words for acute medical emergencies."""

    @staticmethod
    def evaluate(user_text: str) -> Tuple[bool, Optional[str]]:
        """Returns (is_emergency, message to speak). On an emergency the message is spoken at once and the call escalated."""
        text = user_text or ""
        match = _ENGLISH.search(text) or _HINDI.search(text)
        if not match:
            return False, None
        logger.warning("SAFETY GUARDRAIL TRIGGERED: matched '%s' in caller input.", match.group(0))
        return True, EMERGENCY_MESSAGE
