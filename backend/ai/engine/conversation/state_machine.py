"""
Deterministic State Machine.
Orchestrates conversation transitions, slot filling, tool routing,
and guardrails validation in pure deterministic Python code.
"""

import difflib
import logging
import re
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from backend.ai.capabilities.operations.clinic.read_operations import ClinicReadOperations
from backend.ai.engine.conversation.spoken_numbers import normalize_phone, read_back_digits, spoken_to_digits
from backend.ai.engine.conversation.i18n import normalize_language, t
from backend.ai.engine.conversation.states import CallState
from backend.ai.capabilities.skills.emotional_tone import Sentiment, detect_sentiment, parse_profile
from backend.ai.engine.conversation.turn import Turn
from backend.ai.engine.guardrails.safety import SafetyGuardrails
from backend.ai.speech.tts.voice_profile import resolve_speed
from backend.ai.tools.framework.base import ToolContext, ToolResult
from backend.ai.tools.framework.registry import tool_registry
from backend.ai.verticals.schemas import IntentDefinition, VerticalConfig
from backend.server.database.models.agent import Agent
from backend.server.database.models.business import Business
from backend.server.database.models.service import Service
from backend.server.database.session import SessionLocal

logger = logging.getLogger(__name__)

_YES_WORDS = {"yes", "yeah", "yep", "yup", "correct", "right", "sure", "confirm", "confirmed", "ok", "okay", "haan", "han", "ha", "sahi", "theek", "perfect"}
_NO_WORDS = {"no", "nope", "not", "wrong", "incorrect", "nahi", "nahin", "galat"}


_SERVICES_QUESTION = re.compile(
    r"\b(?:what|which)\b.*\b(?:services?|treatments?|procedures?)\b"
    r"|\bwhat\s+(?:do|can)\s+you\s+(?:offer|provide|do|have)\b"
    r"|\b(?:services?|treatments?)\s+(?:do\s+you|are\s+(?:you\s+)?(?:available|offered))\b"
    r"|\b(?:konsi|kaunsi|kya)\s+(?:services?|treatment|kaam)\s+(?:hai|h|karte|provide)\b",
    re.IGNORECASE,
)

_DOCTORS_QUESTION = re.compile(
    r"\b(?:what|which|who)\b.*\b(?:doctors?|physicians?|dentists?|specialists?|staff)\b"
    r"|\b(?:kon|kaun)\s+(?:se\s+)?(?:doctors?|doctor)\s+(?:hain|hai|available|h)\b"
    r"|\bdoctor\s+(?:list|name|names|available)\b",
    re.IGNORECASE,
)

_SMALL_TALK_GREETING = re.compile(
    r"^(?:hi|hello|hey|good\s+(?:morning|afternoon|evening)|how\s+are\s+you|how\s+r\s+u|namaste|kaise\s+ho|what\'?s\s+up|howdy|kem\s+cho)[!.,?\s]*$",
    re.IGNORECASE,
)


def load_business_context(business_id: str) -> Tuple[Optional[str], List[str]]:
    """Blocking DB read: (business name, service titles). Run via asyncio.to_thread."""
    with SessionLocal() as db:
        business = db.get(Business, business_id)
        services = ClinicReadOperations.get_services(db, business_id)
        titles = [s["title"] for s in services]
        return (business.name if business else None), titles


def load_tone(business_id: str) -> Optional[str]:
    """Blocking DB read: the tenant's chosen personality (Agent.config['personality'])."""
    with SessionLocal() as db:
        agent = db.query(Agent).filter(Agent.business_id == business_id).order_by(Agent.created_at.asc()).first()
        return (agent.config or {}).get("personality") if agent else None


def load_agent_settings(business_id: str) -> Dict[str, Any]:
    """Blocking DB read: per-tenant agent overrides (tone, greeting, STT language, TTS voice/language)."""
    with SessionLocal() as db:
        agent = db.query(Agent).filter(Agent.business_id == business_id).order_by(Agent.created_at.asc()).first()
        if not agent:
            return {}
        cfg = agent.config or {}
        tts = cfg.get("tts_provider") or {}
        return {
            "name": agent.name,
            "tone": cfg.get("personality"),
            "language": agent.primary_language,
            "greeting": agent.greeting_message or None,
            "stt_language": (cfg.get("stt") or {}).get("language"),
            "voice_id": tts.get("voice_id"),
            "tts_language": tts.get("language"),
            # Voice tab speed/emotion (Cartesia generation_config); speed falls back to the personality's default.
            # Call Handling tab: idle/total call limits, enforced by the gateway's call watchdog
            "silence_timeout_seconds": (cfg.get("limits") or {}).get("silence_timeout_seconds"),
            "max_duration_minutes": (cfg.get("limits") or {}).get("max_duration_minutes"),
            "tts_speed": resolve_speed((cfg.get("voice_settings") or {}).get("speed"), cfg.get("personality")),
            "tts_emotion": (cfg.get("voice_settings") or {}).get("emotion") or None,
        }


def _join_natural(items: List[str], and_word: str = "and") -> str:
    if len(items) <= 1:
        return "".join(items)
    if len(items) == 2:
        return f"{items[0]} {and_word} {items[1]}"
    return f"{', '.join(items[:-1])}, {and_word} {items[-1]}"


def match_service(value: str, services: List[str]) -> str:
    """Map a loosely spoken service ('dental', 'teeth cleaning') to the closest real service title."""
    if not services:
        return value
    lowered = {s.lower(): s for s in services}
    v = str(value).strip().lower()
    if v in lowered:
        return lowered[v]
    for low, original in lowered.items():
        if v and (v in low or low in v):
            return original
    close = difflib.get_close_matches(v, list(lowered), n=1, cutoff=0.6)
    return lowered[close[0]] if close else value


def _yes_no(text: str) -> Optional[bool]:
    """True for an affirmative, False for a negative, None if unclear."""
    words = set(re.findall(r"[a-z']+", text.lower()))
    if words & _NO_WORDS:
        return False
    if words & _YES_WORDS:
        return True
    return None


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
        services: Optional[List[str]] = None,
        tone: Optional[str] = None,
        language: Optional[str] = None,
    ):
        self.language = normalize_language(language)
        self.tone_profile = parse_profile(tone)
        self.frustrated_turns = 0
        self._bridged: set = set()
        self.call_id = call_id
        self.business_id = business_id
        self.caller_number = caller_number
        self.vertical_config = vertical_config
        self.business_info = business_info or {"name": "Our Office"}
        self.agent_name = (self.business_info or {}).get("agent_name") or "Aura"
        self.db = db
        self.services: List[str] = services or []

        self.current_state: CallState = CallState.INITIALIZING
        self.current_intent: Optional[IntentDefinition] = None
        self.collected_slots: Dict[str, Any] = {}
        self.turns: List[Turn] = []
        self.sequence: int = 0
        # Read-back confirmation before running the intent's tool (e.g. booking).
        self.awaiting_confirmation: bool = False
        self.confirmed: bool = False
        self.last_asked_slot: Optional[str] = None

    def start_call(self, greeting_override: Optional[str] = None) -> str:
        """Start call and return initial greeting (the tenant's own greeting wins over the vertical template)."""
        self.current_state = CallState.GREETING
        greeting = greeting_override or t(
            self.language, "greeting", business_name=self.business_info.get("name", "our clinic")
        )
        self.current_state = CallState.INTENT_DETECTION
        return greeting

    def _acknowledge(self, changed_slots: List[str]) -> str:
        """Short read-back of a just-captured name/phone so the caller can catch STT mistakes."""
        parts = []
        if "service_name" in changed_slots:
            parts.append(str(self.collected_slots["service_name"]))
        if "patient_name" in changed_slots:
            parts.append(str(self.collected_slots["patient_name"]))
        if "phone_number" in changed_slots:
            parts.append(read_back_digits(str(self.collected_slots["phone_number"])))
        return t(self.language, "ack_got_it", details=", ".join(parts)) if parts else ""

    def _confirmation_summary(self) -> str:
        slots, lang = self.collected_slots, self.language
        bits = []
        if slots.get("patient_name"):
            bits.append(t(lang, "confirm_name", value=slots["patient_name"]))
        if slots.get("phone_number"):
            bits.append(t(lang, "confirm_phone", value=read_back_digits(str(slots["phone_number"]))))
        if slots.get("service_name"):
            bits.append(t(lang, "confirm_service", value=slots["service_name"]))
        if slots.get("doctor_name"):
            bits.append(t(lang, "confirm_doctor", value=slots["doctor_name"]))
        when = t(lang, "confirm_time_joiner").join(str(slots[k]) for k in ("preferred_date", "preferred_time") if slots.get(k))
        if when:
            relative = str(slots.get("preferred_date", "")).lower() in ("today", "tomorrow")
            bits.append(t(lang, "confirm_when_relative" if relative else "confirm_when_on", value=when))
        return t(lang, "confirm_intro", details=", ".join(bits))

    async def process_user_turn(
        self,
        user_transcript: str,
        extracted_intent: Optional[str] = None,
        extracted_slots: Optional[Dict[str, Any]] = None,
        nlu_category: Optional[str] = None,
        confidence: float = 1.0,
        is_correction: bool = False,
        overridden_slot: Optional[str] = None,
        is_ambiguous: bool = False,
    ) -> Dict[str, Any]:
        """Deterministic turn plus the emotional tone layer (phrasing only)."""
        sentiment = detect_sentiment(user_transcript)
        if sentiment == Sentiment.FRUSTRATED:
            self.frustrated_turns += 1
            # Second frustrated turn: stop looping and hand over to a human.
            if self.frustrated_turns >= 2 and self.current_state != CallState.ESCALATED:
                return await self._transfer_frustrated(user_transcript)

        result = await self._process_turn_core(
            user_transcript=user_transcript,
            extracted_intent=extracted_intent,
            extracted_slots=extracted_slots,
            nlu_category=nlu_category,
            confidence=confidence,
            is_correction=is_correction,
            overridden_slot=overridden_slot,
            is_ambiguous=is_ambiguous,
        )

        # Only bridge on ordinary prompts, once per sentiment, never over tool/escalation output.
        if (
            sentiment in (Sentiment.ANXIOUS, Sentiment.FRUSTRATED)
            and sentiment not in self._bridged
            and not result.get("tool_result")
            and not result.get("should_transfer")
            and not result.get("should_hangup")
        ):
            bridge = t(self.language, f"bridge_{sentiment.value}_{self.tone_profile.value}")
            if bridge:
                self._bridged.add(sentiment)
                result["bot_response"] = f"{bridge} {result['bot_response']}"
                if self.turns:
                    self.turns[-1].bot_response = result["bot_response"]
        return result

    async def _transfer_frustrated(self, user_transcript: str) -> Dict[str, Any]:
        self.sequence += 1
        self.current_state = CallState.ESCALATED
        tool_result: ToolResult = await tool_registry.execute(
            "transfer_call",
            ToolContext(
                business_id=self.business_id,
                caller_number=self.caller_number,
                call_id=self.call_id,
                db=self.db,
            ),
            department="front_desk",
            reason=f"Frustrated caller: {user_transcript}",
        )
        msg = t(self.language, "transfer_frustrated")
        self.turns.append(
            Turn(
                sequence=self.sequence,
                user_transcript=user_transcript,
                bot_response=msg,
                intent="frustration_escalation",
                tool_called="transfer_call",
                tool_result=tool_result.data,
            )
        )
        return {
            "bot_response": msg,
            "state": self.current_state.value,
            "tool_result": tool_result.data,
            "should_transfer": True,
            "transfer_target": "front_desk",
        }

    async def _process_turn_core(
        self,
        user_transcript: str,
        extracted_intent: Optional[str] = None,
        extracted_slots: Optional[Dict[str, Any]] = None,
        nlu_category: Optional[str] = None,
        confidence: float = 1.0,
        is_correction: bool = False,
        overridden_slot: Optional[str] = None,
        is_ambiguous: bool = False,
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
            tool_context = ToolContext(
                business_id=self.business_id,
                caller_number=self.caller_number,
                call_id=self.call_id,
                db=self.db,
                user_transcript=user_transcript,
            )
            tool_result: ToolResult = await tool_registry.execute(
                "transfer_call",
                tool_context,
                department=target_role or "front_desk",
                reason=f"Safety escalation: {user_transcript}",
            )
            bot_response = esc_msg or tool_result.message or t(self.language, "transfer_generic")

            turn = Turn(
                sequence=self.sequence,
                user_transcript=user_transcript,
                bot_response=bot_response,
                intent="escalation",
                tool_called="transfer_call",
                tool_result=tool_result.data,
            )
            self.turns.append(turn)
            return {
                "bot_response": bot_response,
                "state": self.current_state.value,
                "tool_result": tool_result.data,
                "should_transfer": True,
                "transfer_target": target_role,
            }

        # 1b. Persona & Identity Inquiries ("What is your name?", "Are you an AI?")
        if nlu_category == "persona" or extracted_intent in ("agent_identity", "persona_is_ai"):
            if extracted_intent == "persona_is_ai":
                msg = t(self.language, "persona_is_ai", business_name=self.business_info.get("name", "our clinic"))
            else:
                msg = t(self.language, "persona_identity", agent_name=self.agent_name, business_name=self.business_info.get("name", "our clinic"))
            self.turns.append(
                Turn(
                    sequence=self.sequence,
                    user_transcript=user_transcript,
                    bot_response=msg,
                    intent=extracted_intent or "agent_identity",
                    extracted_slots=dict(self.collected_slots),
                )
            )
            return {"bot_response": msg, "state": self.current_state.value}

        # 1c. Out-of-Scope Off-topic Queries ("PM of India", "Cricket")
        if nlu_category == "out_of_scope" or extracted_intent == "out_of_scope":
            msg = t(self.language, "out_of_scope_redirect")
            self.turns.append(
                Turn(
                    sequence=self.sequence,
                    user_transcript=user_transcript,
                    bot_response=msg,
                    intent="out_of_scope",
                    extracted_slots=dict(self.collected_slots),
                )
            )
            return {"bot_response": msg, "state": self.current_state.value}

        # 1d. Ambiguous or Unclear Queries ("Potato helicopter", "Woh wala kal kar dena")
        if nlu_category == "ambiguous_unclear" or confidence < 0.40:
            if extracted_intent == "clarification_needed" or is_ambiguous:
                msg = t(self.language, "ambiguous_clarification")
            else:
                msg = t(self.language, "unclear_speech_repeat")
            self.turns.append(
                Turn(
                    sequence=self.sequence,
                    user_transcript=user_transcript,
                    bot_response=msg,
                    intent="unclear",
                    extracted_slots=dict(self.collected_slots),
                )
            )
            return {"bot_response": msg, "state": self.current_state.value}

        # 1e. In-flow question about available services: answer from DB catalog
        if _SERVICES_QUESTION.search(user_transcript):
            if self.services:
                msg = t(self.language, "services_list", items=_join_natural(self.services, t(self.language, "list_and")))
            else:
                msg = t(self.language, "services_none")
            self.turns.append(
                Turn(
                    sequence=self.sequence,
                    user_transcript=user_transcript,
                    bot_response=msg,
                    intent="services_info",
                    extracted_slots=dict(self.collected_slots),
                )
            )
            return {"bot_response": msg, "state": self.current_state.value}

        # 1f. In-flow question about doctors / staff: answer from DB
        if _DOCTORS_QUESTION.search(user_transcript):
            doctors_list = []
            if self.db:
                doctors = ClinicReadOperations.get_doctors(self.db, self.business_id)
                doctors_list = [d["name"] for d in doctors]
            if doctors_list:
                msg = t(self.language, "doctors_list", items=_join_natural(doctors_list, t(self.language, "list_and")))
            else:
                msg = t(self.language, "doctors_none")
            self.turns.append(
                Turn(
                    sequence=self.sequence,
                    user_transcript=user_transcript,
                    bot_response=msg,
                    intent="doctors_info",
                    extracted_slots=dict(self.collected_slots),
                )
            )
            return {"bot_response": msg, "state": self.current_state.value}

        # 1g. Small talk greeting handling ("Hi, how are you?", "Hello")
        if _SMALL_TALK_GREETING.search(user_transcript.strip()):
            if "how are you" in user_transcript.lower() or "kaise" in user_transcript.lower():
                msg = t(self.language, "smalltalk_how_are_you")
            else:
                msg = t(self.language, "smalltalk_hello")
            self.turns.append(
                Turn(
                    sequence=self.sequence,
                    user_transcript=user_transcript,
                    bot_response=msg,
                    intent="greeting",
                    extracted_slots=dict(self.collected_slots),
                )
            )
            return {"bot_response": msg, "state": self.current_state.value}

        # 1h. Knowledge / Clinic FAQ Category (Answers verified knowledge without breaking slot collection!)
        if nlu_category == "knowledge" or extracted_intent == "clinic_faq":
            tool_context = ToolContext(
                business_id=self.business_id,
                caller_number=self.caller_number,
                call_id=self.call_id,
                db=self.db,
                user_transcript=user_transcript,
            )
            tool_result: ToolResult = await tool_registry.execute(
                "answer_faq",
                tool_context,
            )
            faq_msg = tool_result.message or t(self.language, "no_intent_guidance")
            self.turns.append(
                Turn(
                    sequence=self.sequence,
                    user_transcript=user_transcript,
                    bot_response=faq_msg,
                    intent="clinic_faq",
                    extracted_slots=dict(self.collected_slots),
                    tool_called="answer_faq",
                    tool_result=tool_result.data,
                )
            )
            return {
                "bot_response": faq_msg,
                "state": self.current_state.value,
                "tool_result": tool_result.data,
            }

        # 2. Update collected slots with newly extracted entities and normalize synonyms
        SLOT_SYNONYMS = {
            "service": "service_name",
            "treatment": "service_name",
            "procedure": "service_name",
            "reason": "service_name",
            "date": "preferred_date",
            "day": "preferred_date",
            "time": "preferred_time",
            "doctor": "doctor_name",
            "name": "patient_name",
            "patient": "patient_name",
            "phone": "phone_number",
            "mobile": "phone_number",
            "contact": "phone_number",
        }
        changed_slots: List[str] = []
        for k, v in extracted_slots.items():
            if v is not None and v != "":
                normalized_key = SLOT_SYNONYMS.get(k.lower(), k)
                if normalized_key == "service_name":
                    v = match_service(v, self.services)
                if normalized_key == "phone_number":
                    v = normalize_phone(v) or v
                if self.collected_slots.get(normalized_key) != v:
                    changed_slots.append(normalized_key)
                self.collected_slots[normalized_key] = v
                self.collected_slots[k] = v

        # Handle corrections
        if is_correction or overridden_slot:
            self.confirmed = False
            self.awaiting_confirmation = False

        # Deterministic Fallback 1: Phone number digits
        if "phone_number" not in self.collected_slots or len(str(self.collected_slots.get("phone_number", ""))) < 7:
            spoken = spoken_to_digits(user_transcript)
            if len(spoken) >= 7 and self.collected_slots.get("phone_number") != spoken:
                self.collected_slots["phone_number"] = spoken
                changed_slots.append("phone_number")

        # 3. Intent Resolution and Dynamic Intent Switching
        is_booking_mention = bool(
            extracted_intent in ("appointment_booking", "book_appointment")
            or "service_name" in self.collected_slots
            or any(kw in user_transcript.lower() for kw in ("book", "appointment", "consultation", "checkup", "cleaning", "schedule", "need a service", "service for"))
        )

        if is_booking_mention:
            for intent_def in self.vertical_config.intents:
                if "booking" in intent_def.name.lower() or "appointment" in intent_def.name.lower():
                    self.current_intent = intent_def
                    self.current_state = CallState.COLLECTING_SLOTS
                    break
        elif extracted_intent:
            for intent_def in self.vertical_config.intents:
                if intent_def.name.lower() == extracted_intent.lower():
                    self.current_intent = intent_def
                    self.current_state = CallState.COLLECTING_SLOTS
                    break
        
        # If still no intent matches yet, provide helpful guidance
        if self.current_intent is None:
            msg = t(self.language, "no_intent_guidance")
            return {"bot_response": msg, "state": self.current_state.value}


        # 4. Slot Filling & Validation
        missing_slots = []
        for slot in self.current_intent.slots:
            if slot.required and slot.name not in self.collected_slots:
                missing_slots.append(slot)

        if missing_slots:
            # Ask specifically for the first missing required slot
            next_slot = missing_slots[0]
            self.last_asked_slot = next_slot.name
            if next_slot.prompt_key:
                bot_prompt = t(self.language, next_slot.prompt_key)
            else:
                bot_prompt = next_slot.prompt or t(self.language, "ask_slot_generic", slot=next_slot.name)
            ack = self._acknowledge(changed_slots)
            if ack:
                bot_prompt = f"{ack} {bot_prompt}"
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

        # 5a. Read back the collected details and get a yes before running the tool
        if self.current_intent.target_tool and self.current_intent.slots and not self.confirmed:
            answer = _yes_no(user_transcript) if self.awaiting_confirmation else None
            details_changed = any(
                slot.name in changed_slots for slot in self.current_intent.slots
            )
            if self.awaiting_confirmation and answer is True and not details_changed:
                self.confirmed = True
            else:
                if self.awaiting_confirmation and answer is False and not details_changed:
                    msg = t(self.language, "confirm_which_detail")
                elif self.awaiting_confirmation and answer is None and not details_changed:
                    msg = t(self.language, "confirm_repeat_yes_no")
                else:
                    msg = self._confirmation_summary()
                self.awaiting_confirmation = True
                self.current_state = CallState.COLLECTING_SLOTS
                self.turns.append(
                    Turn(
                        sequence=self.sequence,
                        user_transcript=user_transcript,
                        bot_response=msg,
                        intent=self.current_intent.name,
                        extracted_slots=dict(self.collected_slots),
                    )
                )
                return {"bot_response": msg, "state": self.current_state.value}

        # 5. All required slots collected -> Execute Tool
        if self.current_intent.target_tool:
            self.current_state = CallState.EXECUTING_TOOL
            tool_context = ToolContext(
                business_id=self.business_id,
                caller_number=self.caller_number,
                call_id=self.call_id,
                db=self.db,
                user_transcript=user_transcript,
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
        closing_msg = t(self.language, "anything_else")
        self.current_state = CallState.CLOSING
        # Tool-less flow (e.g. FAQ) is done: free the intent so the next turn can start booking.
        self.current_intent = None
        return {"bot_response": closing_msg, "state": self.current_state.value}
