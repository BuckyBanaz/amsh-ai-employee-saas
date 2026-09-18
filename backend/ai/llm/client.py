"""
Groq LLM Client.
Ultra-low latency LLM inference using LLaMA-3.1-8B-Instant for intent and slot extraction.
"""

import json
import logging
from typing import Any, Dict, List, Optional
import httpx

from backend.server.common.config import get_settings

logger = logging.getLogger(__name__)


class GroqLLMClient:
    """Client for Groq fast inference API (<300ms time-to-first-token)."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.api_key = getattr(self.settings, "GROQ_API_KEY", "")
        self.model = "llama-3.1-8b-instant"
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"

    async def extract_intent_and_slots(
        self,
        user_utterance: str,
        available_intents: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Extracts detected intent and slot values from a user utterance.
        If no API key is configured or call fails, falls back to rule-based keyword matching.
        """
        if not self.api_key:
            # Fallback to rule-based extraction
            return self._fallback_extraction(user_utterance, available_intents)

        system_prompt = f"""
You are an intent and slot extractor for an AI Receptionist.
Analyze the user utterance and extract:
1. "intent": matching one of {json.dumps([i['name'] for i in available_intents])}, or null if unclear.
2. "slots": a dictionary of extracted slot values (e.g. date, time, doctor, patient_name, service).

Respond ONLY with valid JSON in this exact structure:
{{"intent": "intent_name", "slots": {{"slot_name": "value"}}}}
"""

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.post(
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
        phone_match = re.search(r"(\+?\d[\d\-\s]{7,}\d)", user_utterance)
        if phone_match:
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

        return {"intent": intent, "slots": slots}


# Global singleton
llm_client = GroqLLMClient()
