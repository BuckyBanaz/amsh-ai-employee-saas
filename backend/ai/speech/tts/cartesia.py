"""
Cartesia Sonic Text-to-Speech (TTS) Client.
Provides ultra-low latency (<100ms) voice streaming for real-time telephony.
"""

import logging
from typing import AsyncGenerator
import httpx

from backend.server.common.config import get_settings

logger = logging.getLogger(__name__)


class CartesiaTTS:
    """Client for Cartesia Sonic streaming TTS."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.api_key = getattr(self.settings, "CARTESIA_API_KEY", "")
        # "sonic-english" was sunsetted by Cartesia; sonic-2 is the current
        # low-latency model as of the 2025-04-16 API version.
        self.model_id = "sonic-2"
        # Standard friendly female voice (Barbershop / Sarah / Doctor Receptionist)
        self.voice_id = "a0e99841-438c-4a64-b679-ae501e7d6091"
        self.api_version = "2025-04-16"

    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def stream_speech(
        self, text: str, voice_id: str | None = None, encoding: str = "pcm_mulaw"
    ) -> AsyncGenerator[bytes, None]:
        """
        Stream raw audio chunks from Cartesia Sonic API.
        Default output encoding: pcm_mulaw 8000Hz (native Twilio phone audio format) for 0-transcode latency!
        """
        if not self.api_key:
            return

        url = "https://api.cartesia.ai/tts/bytes"
        headers = {
            "X-API-Key": self.api_key,
            "Cartesia-Version": self.api_version,
            "Content-Type": "application/json",
        }
        payload = {
            "model_id": self.model_id,
            "transcript": text,
            "voice": {
                "mode": "id",
                "id": voice_id or self.voice_id,
            },
            "output_format": {
                "container": "raw",
                "encoding": encoding,
                "sample_rate": 8000 if encoding == "pcm_mulaw" else 24000,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                async with client.stream("POST", url, headers=headers, json=payload) as response:
                    if response.status_code == 200:
                        async for chunk in response.aiter_bytes():
                            yield chunk
                    else:
                        error_text = await response.aread()
                        logger.warning(f"[CARTESIA TTS] Error ({response.status_code}): {error_text.decode('utf-8', errors='ignore')}")
        except Exception as e:
            logger.error(f"[CARTESIA TTS] Stream failed: {e}")


# Global singleton
cartesia_tts = CartesiaTTS()
