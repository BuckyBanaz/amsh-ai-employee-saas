"""
Conversational Natural Language Understanding (NLU) & Intent Router.
Performs single-pass semantic classification, slot extraction, persona detection,
context resolution, and confidence scoring via Groq JSON mode (<250ms).
"""

import json
import logging
import re
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from backend.ai.engine.conversation.spoken_numbers import normalize_phone, spoken_to_digits
from backend.ai.llm.client import llm_client, reasoning_params

logger = logging.getLogger(__name__)


class NLUCategory(str, Enum):
    PERSONA = "persona"
    ACTION = "action"
    KNOWLEDGE = "knowledge"
    OUT_OF_SCOPE = "out_of_scope"
    AMBIGUOUS_UNCLEAR = "ambiguous_unclear"


class NLUResult(BaseModel):
    category: NLUCategory = NLUCategory.AMBIGUOUS_UNCLEAR
    intent: Optional[str] = None
    confidence: float = 0.8
    slots: Dict[str, Any] = Field(default_factory=dict)
    is_correction: bool = False
    overridden_slot: Optional[str] = None
    clarification_prompt: Optional[str] = None
    is_ambiguous: bool = False
    raw_utterance: str = ""


# Persona identity patterns for offline/fast regex recognition
_PERSONA_NAME_REGEX = re.compile(
    r"\b(?:who\s+are\s+you|what\s+is\s+your\s+name|what\'?s\s+your\s+name|who\s+am\s+i\s+(?:speaking|talking)\s+to|"
    r"aapka\s+naam\s+kya\s+hai|tera\s+naam\s+kya\s+hai|tum\s+kaun\s+ho|aap\s+kaun\s+hain|tumhara\s+naam|kaun\s+bol\s+raha\s+hai)\b",
    re.IGNORECASE,
)

_PERSONA_AI_REGEX = re.compile(
    r"\b(?:are\s+you\s+(?:an?\s+)?(?:ai|robot|bot|real\s+person|human)|kya\s+tum\s+(?:ai|robot|bot|computer)\s+ho|"
    r"kya\s+aap\s+(?:ai|robot|insan)\s+ho|am\s+i\s+talking\s+to\s+a\s+(?:robot|human|real\s+person))\b",
    re.IGNORECASE,
)

# Out-of-scope off-topic patterns
_OUT_OF_SCOPE_REGEX = re.compile(
    r"\b(?:prime\s+minister|pm\s+of|cricket|football|weather\s+in|recipe|who\s+won|president\s+of|"
    r"tell\s+me\s+a\s+joke|capital\s+of|movie|song|dance|mars|space\s+ship|helicopter)\b",
    re.IGNORECASE,
)


class ConversationalNLU:
    """Unified conversational intelligence engine with 5-way categorization."""

    @staticmethod
    async def analyze_turn(
        user_utterance: str,
        available_intents: List[Dict[str, Any]],
        available_services: Optional[List[str]] = None,
        agent_name: str = "Aura",
        business_name: str = "our clinic",
        current_intent: Optional[str] = None,
        collected_slots: Optional[Dict[str, Any]] = None,
        missing_slot: Optional[str] = None,
        recent_turns: Optional[List[Dict[str, str]]] = None,
    ) -> NLUResult:
        """
        Analyzes user speech into a structured NLUResult in <250ms via Groq LLM.
        Falls back to deterministic rule-based analysis if offline or API error occurs.
        """
        utterance = (user_utterance or "").strip()
        collected_slots = collected_slots or {}

        if not utterance:
            return NLUResult(
                category=NLUCategory.AMBIGUOUS_UNCLEAR,
                intent="unclear",
                confidence=0.1,
                raw_utterance=utterance,
            )

        # 1. Fast deterministic check for Persona Identity
        if _PERSONA_NAME_REGEX.search(utterance):
            return NLUResult(
                category=NLUCategory.PERSONA,
                intent="agent_identity",
                confidence=0.98,
                raw_utterance=utterance,
            )
        if _PERSONA_AI_REGEX.search(utterance):
            return NLUResult(
                category=NLUCategory.PERSONA,
                intent="persona_is_ai",
                confidence=0.98,
                raw_utterance=utterance,
            )

        # 2. Fast check for obvious Out-of-Scope trivia
        if _OUT_OF_SCOPE_REGEX.search(utterance):
            return NLUResult(
                category=NLUCategory.OUT_OF_SCOPE,
                intent="out_of_scope",
                confidence=0.95,
                raw_utterance=utterance,
            )

        # 3. If Groq API key is available, run single-pass LLM NLU
        if llm_client.api_key:
            try:
                result = await ConversationalNLU._groq_nlu_inference(
                    utterance=utterance,
                    available_intents=available_intents,
                    available_services=available_services,
                    agent_name=agent_name,
                    business_name=business_name,
                    current_intent=current_intent,
                    collected_slots=collected_slots,
                    missing_slot=missing_slot,
                    recent_turns=recent_turns,
                )
                if result:
                    return result
            except Exception as e:
                logger.warning(f"Groq Conversational NLU inference error: {e}. Falling back to rule-based parser.")

        # 4. Fallback Rule-Based Parser
        return ConversationalNLU._fallback_rule_analysis(
            utterance=utterance,
            available_intents=available_intents,
            available_services=available_services,
            current_intent=current_intent,
            collected_slots=collected_slots,
            missing_slot=missing_slot,
        )

    @staticmethod
    async def _groq_nlu_inference(
        utterance: str,
        available_intents: List[Dict[str, Any]],
        available_services: Optional[List[str]] = None,
        agent_name: str = "Aura",
        business_name: str = "our clinic",
        current_intent: Optional[str] = None,
        collected_slots: Optional[Dict[str, Any]] = None,
        missing_slot: Optional[str] = None,
        recent_turns: Optional[List[Dict[str, str]]] = None,
    ) -> Optional[NLUResult]:
        """Groq JSON structured NLU extraction."""
        services_text = json.dumps(available_services or [])
        intents_names = [i["name"] for i in available_intents]
        slots_json = json.dumps(collected_slots or {})

        recent_history_str = "None"
        if recent_turns:
            recent_history_str = "\n".join([f"{t.get('role', 'user').upper()}: {t.get('content', '')}" for t in recent_turns[-3:]])

        system_prompt = f"""
You are the Conversational NLU (Natural Language Understanding) Engine for an AI Receptionist named '{agent_name}' at '{business_name}'.
Classify the caller's utterance into one of 5 semantic categories:

CATEGORIES:
1. "persona": Caller asks about you, your name ("who are you?", "naam kya hai?"), or asks if you are an AI/human.
   -> category="persona", intent="agent_identity" or "persona_is_ai"
2. "action": Caller wants to book, reschedule, cancel, or check availability, OR is answering a requested slot (providing their name, phone, date, time, service).
   -> category="action", intent="appointment_booking" or "check_availability"
3. "knowledge": Caller asks a legitimate clinic FAQ (hours, Sunday open?, address, doctor specialties, treatment pricing, procedures).
   -> category="knowledge", intent="clinic_faq"
4. "out_of_scope": Off-topic trivia, weather, politics ("PM of India"), cricket, jokes, or unrelated chatter.
   -> category="out_of_scope", intent="out_of_scope"
5. "ambiguous_unclear": Broken audio, nonsense phrases ("potato helicopter", "blue banana doctor"), or vague pronoun references ("change that one") when no prior context exists.
   -> category="ambiguous_unclear", intent="unclear"

CONTEXT & MEMORY:
- In-progress intent: '{current_intent or 'none'}'
- Last asked slot: '{missing_slot or 'none'}'
- Slots collected so far: {slots_json}
- Available services: {services_text}
- Recent history:
{recent_history_str}

SLOT & CORRECTION RULES:
- ALWAYS extract any mentioned entities into "slots", such as:
  * "preferred_date": relative or absolute date (e.g. "tomorrow", "today", "Thursday", "2026-09-29")
  * "preferred_time": time of day (e.g. "5 PM", "10:00 AM", "morning", "afternoon")
  * "patient_name": caller's name
  * "doctor_name": mentioned doctor
  * "service_name": mapped to closest service from available services
  * "phone_number": normalized digits
- If caller provides information answering the last asked slot '{missing_slot}', extract it directly.
- Normalize spoken word digits ("nine eight seven six...") into digit strings ("9876...") for phone_number.
- Map requested treatments to closest service in available services.
- If caller corrects a previously provided detail (e.g. "Actually Thursday", "No make it 5 PM"), set "is_correction": true, "overridden_slot": "slot_name", and update the slot value!
- Set "confidence": a float between 0.0 and 1.0 (low for nonsense/unclear <0.4, high >0.85).

RESPOND ONLY IN VALID JSON FORMAT MATCHING THIS STRUCTURE:
{{
  "category": "persona" | "action" | "knowledge" | "out_of_scope" | "ambiguous_unclear",
  "intent": "string",
  "confidence": 0.95,
  "slots": {{}},
  "is_correction": false,
  "overridden_slot": null,
  "is_ambiguous": false,
  "clarification_prompt": null
}}
"""

        payload = {
            "model": llm_client.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": utterance},
            ],
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
            **reasoning_params(llm_client.model),
        }

        resp = await llm_client._client.post(
            llm_client.api_url,
            headers={
                "Authorization": f"Bearer {llm_client.api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=3.5,
        )

        if resp.status_code == 200:
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)

            category_str = parsed.get("category", "ambiguous_unclear").lower()
            try:
                category_enum = NLUCategory(category_str)
            except ValueError:
                category_enum = NLUCategory.AMBIGUOUS_UNCLEAR

            slots_dict = parsed.get("slots") or {}
            is_correction = bool(parsed.get("is_correction", False))
            overridden_slot = parsed.get("overridden_slot")

            # Deterministic supplement for date/correction
            lower_u = utterance.lower()
            correction_match = re.search(r"\b(?:actually|no\s+make\s+it|instead|rather)\s+(.+)", lower_u)
            if correction_match:
                is_correction = True
                correction_tail = correction_match.group(1).strip()
                days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "tomorrow", "today", "kal"]
                for day in days:
                    if day in correction_tail:
                        slots_dict["preferred_date"] = day.capitalize() if day not in ("tomorrow", "today", "kal") else day
                        overridden_slot = "preferred_date"
                        break
            elif "preferred_date" not in slots_dict:
                if "tomorrow" in lower_u or "kal" in lower_u:
                    slots_dict["preferred_date"] = "tomorrow"
                elif "today" in lower_u or "aaj" in lower_u:
                    slots_dict["preferred_date"] = "today"

            return NLUResult(
                category=category_enum,
                intent=parsed.get("intent"),
                confidence=float(parsed.get("confidence", 0.8)),
                slots=slots_dict,
                is_correction=is_correction,
                overridden_slot=overridden_slot,
                is_ambiguous=bool(parsed.get("is_ambiguous", False)),
                clarification_prompt=parsed.get("clarification_prompt"),
                raw_utterance=utterance,
            )

        return None

    @staticmethod
    def _fallback_rule_analysis(
        utterance: str,
        available_intents: List[Dict[str, Any]],
        available_services: Optional[List[str]] = None,
        current_intent: Optional[str] = None,
        collected_slots: Optional[Dict[str, Any]] = None,
        missing_slot: Optional[str] = None,
    ) -> NLUResult:
        """Deterministic offline parser."""
        lower = utterance.lower().strip()
        slots: Dict[str, Any] = {}
        is_correction = False
        overridden_slot = None

        # Obvious persona
        if _PERSONA_NAME_REGEX.search(lower):
            return NLUResult(category=NLUCategory.PERSONA, intent="agent_identity", confidence=0.95, raw_utterance=utterance)
        if _PERSONA_AI_REGEX.search(lower):
            return NLUResult(category=NLUCategory.PERSONA, intent="persona_is_ai", confidence=0.95, raw_utterance=utterance)

        # Obvious out of scope
        if _OUT_OF_SCOPE_REGEX.search(lower):
            return NLUResult(category=NLUCategory.OUT_OF_SCOPE, intent="out_of_scope", confidence=0.90, raw_utterance=utterance)

        # Check for corrections like "actually thursday" or "no make it 5 pm"
        correction_match = re.search(r"\b(?:actually|no\s+make\s+it|instead|rather)\s+(.+)", lower)
        if correction_match:
            is_correction = True
            correction_tail = correction_match.group(1).strip()
            if any(day in correction_tail for day in ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "tomorrow", "today", "kal"]):
                slots["preferred_date"] = correction_tail
                overridden_slot = "preferred_date"
            elif any(t in correction_tail for t in ["am", "pm", "morning", "afternoon", "evening", "baje"]):
                slots["preferred_time"] = correction_tail.upper()
                overridden_slot = "preferred_time"

        # Check phone digits
        phone_digits = spoken_to_digits(utterance)
        if len(phone_digits) >= 7:
            slots["phone_number"] = phone_digits

        # Check date
        if "tomorrow" in lower or "kal" in lower:
            slots["preferred_date"] = "tomorrow"
        elif "today" in lower or "aaj" in lower:
            slots["preferred_date"] = "today"

        # Check time
        time_match = re.search(r"\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b", lower)
        if time_match and any(w in lower for w in ["am", "pm", ":", "o'clock", "baje"]):
            slots["preferred_time"] = time_match.group(1).upper()

        # If answering a missing slot
        if missing_slot and not slots.get(missing_slot):
            if missing_slot == "patient_name" and len(utterance.split()) <= 4:
                cleaned_name = re.sub(r"^(?:my\s+name\s+is|i\s+am|this\s+is|mera\s+naam\s+hai)\s+", "", utterance, flags=re.I).strip()
                slots["patient_name"] = cleaned_name

        # Knowledge / FAQ detection
        if any(w in lower for w in ["open", "close", "timing", "hours", "fee", "cost", "price", "charge", "address", "location", "parking", "sunday", "doctor", "service"]):
            return NLUResult(
                category=NLUCategory.KNOWLEDGE,
                intent="clinic_faq",
                confidence=0.88,
                slots=slots,
                raw_utterance=utterance,
            )

        # Action / Booking detection
        if any(w in lower for w in ["book", "appointment", "schedule", "milna", "dikha", "visit", "consultation", "checkup"]) or current_intent or slots:
            return NLUResult(
                category=NLUCategory.ACTION,
                intent="appointment_booking",
                confidence=0.85,
                slots=slots,
                is_correction=is_correction,
                overridden_slot=overridden_slot,
                raw_utterance=utterance,
            )

        # Unclear fallback
        return NLUResult(
            category=NLUCategory.AMBIGUOUS_UNCLEAR,
            intent="unclear",
            confidence=0.3,
            raw_utterance=utterance,
        )
