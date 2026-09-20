"""
Safety & Emergency Rules.
Deterministic keyword detection that immediately transfers life-threatening situations
to emergency services or human staff with 0ms LLM delay.
"""

import logging
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

EMERGENCY_KEYWORDS = [
    "chest pain",
    "heart attack",
    "stroke",
    "cannot breathe",
    "cant breathe",
    "difficulty breathing",
    "heavy bleeding",
    "bleeding heavily",
    "unconscious",
    "seizure",
    "severe pain",
    "emergency",
    "ambulance",
    "911",
    "108",
    "112",
    "accident"
]


class EmergencyRule:
    """Evaluates user transcript for acute medical emergencies."""

    @staticmethod
    def evaluate(user_text: str) -> Tuple[bool, Optional[str]]:
        """
        Returns (is_emergency, emergency_response_message).
        If emergency detected, response must be spoken immediately and call transferred.
        """
        lower = user_text.lower().strip()
        for kw in EMERGENCY_KEYWORDS:
            if kw in lower:
                logger.warning("SAFETY GUARDRAIL TRIGGERED: Detected '%s' in caller input.", kw)
                message = (
                    "This sounds like a serious medical emergency. Please hang up and immediately dial "
                    "emergency services at 911 or 108. I am also alerting our duty medical team now."
                )
                return True, message
        return False, None
