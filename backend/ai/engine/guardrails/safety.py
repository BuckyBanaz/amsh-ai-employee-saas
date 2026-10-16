"""
Safety & Escalation Guardrails.
Determines in pure Python (0ms latency, zero hallucination) if a user utterance
triggers emergency response or immediate human escalation.
"""

import re
from typing import Optional, Tuple
from backend.ai.verticals.schemas import VerticalConfig


class SafetyGuardrails:
    """Evaluates safety and escalation rules without relying on LLM."""

    @staticmethod
    def check_escalation(
        transcript: str,
        vertical_config: VerticalConfig,
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Check if transcript triggers any escalation rule defined in the vertical config.
        Returns: (is_triggered, action_message, target_role)
        """
        lower_text = transcript.lower().strip()

        # Disambiguate pure identity inquiries ("are you a human?") from transfer requests ("I want to talk to a human")
        is_pure_identity_query = bool(re.search(
            r"\b(?:are\s+you\s+(?:an?\s+)?(?:human|real\s+person|ai|robot|bot)|kya\s+aap\s+(?:insan|human|robot)\s+ho|tum\s+(?:insan|robot)\s+ho)\b",
            lower_text,
        )) and not bool(re.search(r"\b(?:transfer|connect|talk|speak|give|get|want|need|baat)\b", lower_text))

        for rule in vertical_config.escalation_rules:
            # If user is purely asking "Are you a human?" without requesting to speak with one, do not escalate
            if is_pure_identity_query and rule.target_role != "emergency":
                continue
            for keyword in rule.trigger_keywords:
                if keyword.lower() in lower_text:
                    return (True, rule.message, rule.target_role)

        return (False, None, None)
