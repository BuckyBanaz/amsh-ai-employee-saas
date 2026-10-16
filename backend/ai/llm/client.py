"""
Groq LLM Client.
Ultra-low latency LLM inference using LLaMA-3.1-8B-Instant for intent and slot extraction.
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional, Tuple
import httpx

from backend.server.common.config import get_settings

logger = logging.getLogger(__name__)

_pooled_clients: Dict[Tuple[Any, float], httpx.AsyncClient] = {}


def pooled_http_client(timeout: float) -> httpx.AsyncClient:
    """A long-lived client for a voice provider. httpx closes idle pooled connections after 5 s by default, which is
    shorter than one caller utterance, so each turn re-did TCP+TLS (one or two extra round trips, worst from India to
    US-hosted APIs). Keeping them open (PROVIDER_KEEPALIVE_SECONDS) lets the next turn reuse the warm connection.
    Keyed by running event loop to prevent 'is bound to a different event loop' errors across worker threads or reloads."""
    keepalive = float(getattr(get_settings(), "PROVIDER_KEEPALIVE_SECONDS", 120.0) or 5.0)
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    key = (loop, timeout)
    client = _pooled_clients.get(key)
    if client is None or client.is_closed:
        client = httpx.AsyncClient(
            timeout=timeout,
            limits=httpx.Limits(max_connections=100, max_keepalive_connections=20, keepalive_expiry=keepalive),
        )
        if loop is not None:
            _pooled_clients[key] = client
    return client


def reasoning_params(model: str) -> Dict[str, Any]:
    """Extra payload for Groq models: gpt-oss is a reasoning model (keep its thinking short); other models reject it."""
    return {"reasoning_effort": "low"} if "gpt-oss" in (model or "").lower() else {}


class GroqLLMClient:
    """Client for Groq fast inference API (<300ms time-to-first-token)."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.api_key = getattr(self.settings, "GROQ_API_KEY", "")
        self.model = getattr(self.settings, "GROQ_MODEL", None) or "openai/gpt-oss-20b"
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"
        self._override_client: Optional[httpx.AsyncClient] = None

    @property
    def _client(self) -> httpx.AsyncClient:
        return self._override_client or pooled_http_client(timeout=4.0)

    @_client.setter
    def _client(self, value: httpx.AsyncClient) -> None:
        self._override_client = value

    async def warm(self) -> None:
        """Open (or keep open) the pooled HTTPS connection to Groq so the next turn's completion skips TCP+TLS setup.
        A GET on the model list costs no tokens. Never raises: warming is an optimisation, not a dependency."""
        if not self.api_key:
            return
        try:
            await self._client.get(
                self.api_url.rsplit("/chat/completions", 1)[0] + "/models",
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=3.0,
            )
        except Exception as e:
            logger.debug("Groq warm-up failed: %s", e)

    async def extract_intent_and_slots(
        self,
        user_utterance: str,
        available_intents: List[Dict[str, Any]],
        available_services: Optional[List[str]] = None,
        current_intent: Optional[str] = None,
        missing_slot: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Extracts detected intent and slot values from a user utterance.
        If no API key is configured or call fails, falls back to rule-based keyword matching.
        """
        if not self.api_key:
            # Fallback to rule-based extraction
            return self._fallback_extraction(user_utterance, available_intents)

        service_hint = ""
        if available_services:
            service_hint = (
                f"Available services: {json.dumps(available_services)}. For the service_name slot, always return the "
                "closest matching service exactly as listed. If the user says only a partial or related word "
                "(e.g. 'Dental', 'Teeth', 'Checkup'), map it to the closest available service "
                "(e.g. 'Dental Consultation'). Use null if nothing is close.\n"
            )
        system_prompt = f"""
You are an intent and slot extractor for an AI Receptionist.
Analyze the user utterance and extract:
1. "intent": matching one of {json.dumps([i['name'] for i in available_intents])}, or null if unclear.
2. "slots": a dictionary of extracted slot values (e.g. date, time, doctor, patient_name, service).
Convert spoken word numbers (e.g. "eight nine zero one four one four one zero seven") into clean digit strings ("8901414107") for the phone_number slot.
{service_hint}Keep names exactly as spoken (Indian names are common); do not translate or alter them.
If the user spells out a word or name letter-by-letter (e.g., 'P A R I K S H I T' or 'P. A. R...'), combine the letters into a single clean word without spaces or punctuation. If the user corrects a previously stated slot (e.g., 'No, my name is actually XYZ' or 'No, it starts with K'), ensure you extract the new corrected value for that slot.

CRITICAL CONTEXT: The AI recently asked the user a question to fill the slot '{missing_slot or 'none'}' for the intent '{current_intent or 'none'}'. 
Strongly assume the user's answer corresponds to this slot if it matches the expected type, even if they only say a single word (e.g., 'Dental consultation' -> service_name). Always extract the slot if the intent aligns!

Respond ONLY with valid JSON in this exact structure:
{{"intent": "intent_name", "slots": {{"slot_name": "value"}}}}
"""

        try:
            resp = await self._client.post(
                self.api_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_utterance},
                    ],
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"},
                    # gpt-oss is a reasoning model; extraction needs no deep thinking.
                    **reasoning_params(self.model),
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                return json.loads(content)
        except Exception as e:
            logger.warning(f"Groq intent extraction failed: {e}. Falling back to rule-based parser.")

        return self._fallback_extraction(user_utterance, available_intents)

    def _fallback_extraction(
        self, user_utterance: str, available_intents: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Simple rule-based slot and intent extraction when offline or without API key."""
        import re
        lower = user_utterance.lower()
        slots: Dict[str, Any] = {}

        # Extract name: "My name is John Doe", "I am John Doe", "John Doe"
        name_match = re.search(r"(?:my name is|i am|name is|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)", user_utterance, re.IGNORECASE)
        if name_match:
            slots["patient_name"] = name_match.group(1).strip()
        elif len(user_utterance.split()) in (2, 3) and not any(w in lower for w in ["book", "yes", "no", "hello", "hi", "tomorrow"]):
            slots["patient_name"] = user_utterance.strip()

        # Extract phone: e.g. 555-987-6543 or +1555... or 10 digits
        from backend.ai.engine.conversation.spoken_numbers import spoken_to_digits
        spoken_digits = spoken_to_digits(user_utterance)
        phone_match = re.search(r"(\+?\d[\d\-\s]{7,}\d)", user_utterance)
        if len(spoken_digits) >= 7:
            slots["phone_number"] = spoken_digits
        elif phone_match:
            slots["phone_number"] = phone_match.group(1).strip()

        # Extract date
        if "tomorrow" in lower:
            slots["preferred_date"] = "tomorrow"
        elif "today" in lower:
            slots["preferred_date"] = "today"
        elif "next week" in lower:
            slots["preferred_date"] = "next week"
        else:
            date_match = re.search(r"\b(\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}(?:/\d{2,4})?)\b", user_utterance)
            if date_match:
                slots["preferred_date"] = date_match.group(1)

        # Extract time: e.g. 10 AM, 3:30 PM, 11:00
        time_match = re.search(r"\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b", lower)
        if time_match and any(w in lower for w in ["am", "pm", ":", "o'clock"]):
            slots["preferred_time"] = time_match.group(1).upper()

        # Extract doctor
        doc_match = re.search(r"(?:dr\.?|doctor)\s+([a-zA-Z]+)", user_utterance, re.IGNORECASE)
        if doc_match:
            slots["doctor_name"] = f"Dr. {doc_match.group(1)}"

        # Extract service
        if any(w in lower for w in ["cleaning", "dental cleaning"]):
            slots["service_name"] = "Dental Cleaning"
        elif any(w in lower for w in ["checkup", "consultation", "general"]):
            slots["service_name"] = "General Consultation"

        # Determine intent
        intent = None
        if any(w in lower for w in ["book", "appointment", "schedule", "see doctor", "visit"]):
            intent = "appointment_booking"
        elif any(w in lower for w in ["available", "availability", "open", "slot", "timing", "when"]):
            intent = "check_availability"

        if not intent:
            if "hours" in lower or "where" in lower or "location" in lower or "address" in lower:
                intent = "clinic_faq"
            elif any(w in lower for w in ["available", "free", "open", "check"]):
                intent = "check_availability"

        return {"intent": intent, "slots": slots}

    async def generate_text(self, system_prompt: str, user_utterance: str) -> str:
        """Generates a raw string response from the LLM based on system prompt and user utterance."""
        if not self.api_key:
            return "I'm sorry, my AI capabilities are currently offline."

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_utterance}
            ],
            "temperature": 0.3,
            "max_tokens": 150
        }
        
        try:
            resp = await self._client.post(self.api_url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.error(f"Groq generate_text failed: {e}")
            return "I apologize, but I am having trouble connecting to my knowledge base right now."


# Global singleton
llm_client = GroqLLMClient()
