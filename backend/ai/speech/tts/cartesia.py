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
        # Cartesia Sonic model & Voice ID
        self.model_id = "sonic-3"
        self.voice_id = "a631bc8b-ea1c-49bb-8dab-7a118afd11b8"
        self.api_version = "2025-04-16"
        # Reused across calls: skips TCP+TLS setup (~100-200ms) per utterance.
        self._client = httpx.AsyncClient(timeout=10.0)
        # Full-audio cache for the scripted prompts (greeting, slot questions) that
        # repeat across calls: a hit skips the Cartesia round trip entirely.
        self._audio_cache: dict[tuple, bytes] = {}

    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def stream_speech(
        self,
        text: str,
        voice_id: str | None = None,
        encoding: str = "pcm_mulaw",
        sample_rate: int = 8000,
        language: str | None = None,
    ) -> AsyncGenerator[bytes, None]:
        """
        Stream raw audio chunks from Cartesia Sonic API.
        Default output encoding: 8000Hz (native phone audio format) for crystal-clear 0-transcode latency!
        """
        if not self.api_key:
            return

        cache_key = (text, voice_id or self.voice_id, encoding, sample_rate, language)
        cached = self._audio_cache.get(cache_key)
        if cached is not None:
            yield cached
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
                "sample_rate": sample_rate,
            },
        }

        if language:
            payload["language"] = language

        try:
            async with self._client.stream("POST", url, headers=headers, json=payload) as response:
                if response.status_code == 200:
                    collected = bytearray()
                    async for chunk in response.aiter_bytes():
                        collected.extend(chunk)
                        yield chunk
                    # Only reached if playback wasn't cancelled mid-stream (barge-in),
                    # so a cached entry is always the complete utterance.
                    if len(self._audio_cache) < 200:
                        self._audio_cache[cache_key] = bytes(collected)
                else:
                    error_text = await response.aread()
                    logger.warning(f"[CARTESIA TTS] Error ({response.status_code}): {error_text.decode('utf-8', errors='ignore')}")
        except Exception as e:
            logger.error(f"[CARTESIA TTS] Stream failed: {e}")
    async def get_voices(self) -> list[dict]:
        """Fetch all available voices from Cartesia."""
        if not self.api_key:
            return []
        
        url = "https://api.cartesia.ai/voices"
        headers = {
            "X-API-Key": self.api_key,
            "Cartesia-Version": self.api_version,
        }
        try:
            resp = await self._client.get(url, headers=headers)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.error(f"[CARTESIA TTS] Failed to fetch voices: {e}")
            return []

    async def generate_preview_audio(self, text: str, voice_id: str) -> bytes | None:
        """Fetch a complete MP3 audio buffer for browser playback preview."""
        if not self.api_key:
            return None
            
        # For browser preview we request standard 44.1kHz MP3, not raw PCM
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
                "id": voice_id,
            },
            "output_format": {
                "container": "mp3",
                "encoding": "mp3",
                "sample_rate": 44100,
            },
        }
        try:
            resp = await self._client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            return resp.content
        except Exception as e:
            logger.error(f"[CARTESIA TTS] Failed to generate preview audio: {e}")
            return None


# Global singleton
cartesia_tts = CartesiaTTS()
