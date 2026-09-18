"""
ElevenLabs Text-to-Speech (TTS) Client.
Provides human-like voice synthesis for AI responses.
"""

import logging
from typing import AsyncGenerator
import httpx

from backend.server.common.config import get_settings

logger = logging.getLogger(__name__)


class ElevenLabsTTS:
    """Client for ElevenLabs streaming TTS."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.api_key = getattr(self.settings, "ELEVENLABS_API_KEY", "")
        self.voice_id = "21m00Tcm4TlvDq8ikWAM"  # Default Rachel voice

    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def stream_speech(self, text: str) -> AsyncGenerator[bytes, None]:
        """Stream raw mulaw/mp3 audio chunks from ElevenLabs."""
        if not self.api_key:
            return

        url = f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}/stream"
        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json",
        }
        payload = {
            "text": text,
            "model_id": "eleven_turbo_v2_5",
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.8},
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                if response.status_code == 200:
                    async for chunk in response.aiter_bytes():
                        yield chunk
                else:
                    logger.warning(f"ElevenLabs TTS error {response.status_code}")


# Global singleton
elevenlabs_tts = ElevenLabsTTS()
