"""
Deterministic State Machine.
Orchestrates conversation transitions, slot filling, tool routing,
and guardrails validation in pure deterministic Python code.
"""

import logging
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from backend.ai.engine.conversation.states import CallState
from backend.ai.engine.conversation.turn import Turn
from backend.ai.engine.guardrails.safety import SafetyGuardrails
from backend.ai.tools.framework.base import ToolContext, ToolResult
from backend.ai.tools.framework.registry import tool_registry
from backend.ai.verticals.schemas import IntentDefinition, VerticalConfig

logger = logging.getLogger(__name__)


class ConversationStateMachine:
    """Manages call state and deterministic transitions for one ongoing call."""

    def __init__(
        self,
        call_id: str,
        business_id: str,
        caller_number: str,
        vertical_config: VerticalConfig,
        business_info: Optional[Dict[str, Any]] = None,
        db: Optional[Session] = None,
    ):
        self.call_id = call_id
        self.business_id = business_id
        self.caller_number = caller_number
        self.vertical_config = vertical_config
        self.business_info = business_info or {"name": "Our Office"}
        self.db = db

        self.current_state: CallState = CallState.INITIALIZING
        self.current_intent: Optional[IntentDefinition] = None
        self.collected_slots: Dict[str, Any] = {}
        self.turns: List[Turn] = []
        self.sequence: int = 0

    def start_call(self) -> str:
        """Start call and return initial greeting."""
        self.current_state = CallState.GREETING
        greeting = self.vertical_config.greeting_template.format(
            business_name=self.business_info.get("name", "our clinic")
        )
        self.current_state = CallState.INTENT_DETECTION
        return greeting

    async def process_user_turn(
        self,
        user_transcript: str,
        extracted_intent: Optional[str] = None,
        extracted_slots: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Processes a user utterance deterministically through state transitions.
        Returns response message, state, and any tool action required.
        """
        self.sequence += 1
        extracted_slots = extracted_slots or {}

        # 1. Safety Guardrails Check (0ms, pure Python)
        is_escalated, esc_msg, target_role = SafetyGuardrails.check_escalation(
            user_transcript, self.vertical_config
        )
        if is_escalated:
            self.current_state = CallState.ESCALATED
            turn = Turn(
                sequence=self.sequence,
                user_transcript=user_transcript,
                bot_response=esc_msg or "Transferring your call.",
                intent="escalation",
            )
            self.turns.append(turn)
            return {
                "bot_response": esc_msg,
                "state": self.current_state.value,
                "should_transfer": True,
                "transfer_target": target_role,
            }

        # 2. Update collected slots with newly extracted entities
        for k, v in extracted_slots.items():
            if v is not None and v != "":
                self.collected_slots[k] = v

        # 3. Intent Resolution if not already in an active intent flow
        if self.current_intent is None and extracted_intent:
            for intent_def in self.vertical_config.intents:
                if intent_def.name.lower() == extracted_intent.lower():
                    self.current_intent = intent_def
                    self.current_state = CallState.COLLECTING_SLOTS
                    break

        # If no intent matches yet, provide helpful guidance
        if self.current_intent is None:
            msg = "I'm here to help with scheduling appointments, checking hours, or answering questions. What can I do for you?"
            return {"bot_response": msg, "state": self.current_state.value}

        # 4. Slot Filling & Validation
        missing_slots = []
        for slot in self.current_intent.slots:
            if slot.required and slot.name not in self.collected_slots:
                missing_slots.append(slot)

        if missing_slots:
            # Ask specifically for the first missing required slot
            next_slot = missing_slots[0]
            bot_prompt = next_slot.prompt or f"Could you please provide the {next_slot.name}?"
            self.current_state = CallState.COLLECTING_SLOTS
            turn = Turn(
                sequence=self.sequence,
                user_transcript=user_transcript,
                bot_response=bot_prompt,
                intent=self.current_intent.name,
                extracted_slots=dict(self.collected_slots),
            )
            self.turns.append(turn)
            return {"bot_response": bot_prompt, "state": self.current_state.value}

        # 5. All required slots collected -> Execute Tool
        if self.current_intent.target_tool:
            self.current_state = CallState.EXECUTING_TOOL
            tool_context = ToolContext(
                business_id=self.business_id,
                caller_number=self.caller_number,
                call_id=self.call_id,
                db=self.db,
            )
            tool_result: ToolResult = await tool_registry.execute(
                self.current_intent.target_tool,
                tool_context,
                **self.collected_slots,
            )

            self.current_state = CallState.CLOSING
            turn = Turn(
                sequence=self.sequence,
                user_transcript=user_transcript,
                bot_response=tool_result.message,
                intent=self.current_intent.name,
                extracted_slots=dict(self.collected_slots),
                tool_called=self.current_intent.target_tool,
                tool_result=tool_result.data,
            )
            self.turns.append(turn)

            return {
                "bot_response": tool_result.message,
                "state": self.current_state.value,
                "tool_result": tool_result.data,
                "should_hangup": tool_result.should_hangup,
                "should_transfer": tool_result.should_transfer,
                "transfer_target": tool_result.transfer_target,
            }

        # Fallback completion
        closing_msg = "Is there anything else I can help you with today?"
        self.current_state = CallState.CLOSING
        return {"bot_response": closing_msg, "state": self.current_state.value}
