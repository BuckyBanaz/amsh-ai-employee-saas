"""
Safety & Escalation Guardrails.
Determines in pure Python (0ms latency, zero hallucination) if a user utterance
triggers emergency response or immediate human escalation.
"""

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

        for rule in vertical_config.escalation_rules:
            for keyword in rule.trigger_keywords:
                if keyword.lower() in lower_text:
                    return (True, rule.message, rule.target_role)

        return (False, None, None)
