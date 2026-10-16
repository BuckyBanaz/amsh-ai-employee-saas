"""
Prompt & Context Builder.
Constructs LLM prompt payload dynamically based on the current call state,
slots collected so far, and vertical configuration.
"""

from typing import Any, Dict, List
from backend.ai.engine.conversation.states import CallState
from backend.ai.verticals.schemas import VerticalConfig


class ContextBuilder:
    """Builds prompt context and system message for LLM inference."""

    @staticmethod
    def build_system_message(
        vertical_config: VerticalConfig,
        business_info: Dict[str, Any],
        collected_slots: Dict[str, Any],
        current_state: CallState,
    ) -> str:
        business_name = business_info.get("name", "our clinic")
        base_prompt = vertical_config.system_prompt_template.format(business_name=business_name)

        slots_summary = "\n".join([f"- {k}: {v}" for k, v in collected_slots.items()]) or "None"

        context_instructions = f"""
{base_prompt}

CURRENT CALL STATE: {current_state.value.upper()}
INFORMATION COLLECTED SO FAR:
{slots_summary}

INSTRUCTIONS FOR THIS TURN:
- Speak naturally and concisely (max 1-2 sentences).
- If information is missing, ask only for the specific missing detail.
- Do not repeat information that has already been confirmed.
- Once the user gives confirmation, trigger the booking tool immediately.
"""
        return context_instructions.strip()
