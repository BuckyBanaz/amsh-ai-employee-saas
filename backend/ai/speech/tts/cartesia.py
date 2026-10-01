"""
Cartesia Sonic Text-to-Speech (TTS) Client.
Provides ultra-low latency (<100ms) voice streaming for real-time telephony.
"""

import asyncio
import logging
from typing import AsyncGenerator
import httpx

from backend.ai.llm.client import pooled_http_client
from backend.ai.realtime import latency
from backend.server.common.config import get_settings

logger = logging.getLogger(__name__)


class CartesiaTTS:
    """Client for Cartesia Sonic streaming TTS."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.api_key = getattr(self.settings, "CARTESIA_API_KEY", "")
        # Cartesia Sonic model & Voice ID
        self.model_id = "sonic-3.6"
        # Default for tenants who have not picked a voice: "Kiara - Joyful Woman", an upbeat Indian-accented English
        # voice. (The old default, "Skylar - Friendly Guide", is an American voice and sounded off for Indian callers.)
        self.voice_id = "f8f5f1b2-f02d-4d8e-a40d-fd850a487b3d"
        self.api_version = "2024-11-13"
        # Reused across calls: skips TCP+TLS setup (~100-200ms) per utterance. Long keep-alive so the connection is
        # still open when the next turn starts (httpx's 5 s default expired it while the caller was speaking).
        self._client = pooled_http_client(timeout=10.0)
        # Full-audio cache for the scripted prompts (greeting, slot questions) that
        # repeat across calls: a hit skips the Cartesia round trip entirely.
        self._audio_cache: dict[tuple, bytes] = {}
        self._preview_cache: dict[tuple, bytes] = {}  # dashboard previews (MP3), so repeats do not spend credits
        self._preview_inflight: dict[tuple, "asyncio.Future"] = {}  # syntheses in progress, shared by identical requests
        self.last_error: tuple[int, str] | None = None  # (HTTP status, message) of the last failed request

    def is_configured(self) -> bool:
        return bool(self.api_key)

    @staticmethod
    def generation_config(speed: float | None, emotion: str | None) -> dict:
        """Cartesia generation_config for the tenant's speed/emotion; empty when neither is set."""
        config: dict = {}
        if speed and abs(speed - 1.0) > 0.01:
            config["speed"] = round(min(max(float(speed), 0.6), 1.5), 2)
        if emotion:
            config["emotion"] = emotion
        return config

    async def stream_speech(
        self,
        text: str,
        voice_id: str | None = None,
        encoding: str = "pcm_mulaw",
        sample_rate: int = 8000,
        language: str | None = None,
        speed: float | None = None,
        emotion: str | None = None,
    ) -> AsyncGenerator[bytes, None]:
        """
        Stream raw audio chunks from Cartesia Sonic API.
        Default output encoding: 8000Hz (native phone audio format) for crystal-clear 0-transcode latency!
        `speed` (0.6-1.5) and `emotion` go in Cartesia's generation_config; the API accepts and applies speed
        (measured: 0.8x -> 5.12s, 1.25x -> 4.56s for the same sentence). Emotion is passed through as given.
        """
        if not self.api_key:
            return

        latency.mark("tts_request_start", chars=len(text))
        cache_key = (text, voice_id or self.voice_id, encoding, sample_rate, language, speed, emotion)
        cached = self._audio_cache.get(cache_key)
        if cached is not None:
            latency.mark("tts_first_audio", cached=True)
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
        generation_config = self.generation_config(speed, emotion)
        if generation_config:
            payload["generation_config"] = generation_config

        try:
            async with self._client.stream("POST", url, headers=headers, json=payload) as response:
                if response.status_code == 200:
                    collected = bytearray()
                    # Each network chunk is yielded the moment it arrives: playback starts on the first bytes, never
                    # after the whole sentence is synthesised.
                    async for chunk in response.aiter_bytes():
                        if not collected:
                            latency.mark("tts_first_audio", cached=False)
                        collected.extend(chunk)
                        yield chunk
                    # Only reached if playback wasn't cancelled mid-stream (barge-in),
                    # so a cached entry is always the complete utterance.
                    if len(self._audio_cache) < 200:
                        self._audio_cache[cache_key] = bytes(collected)
                else:
                    error_text = (await response.aread()).decode("utf-8", errors="ignore")
                    self.last_error = (response.status_code, error_text[:300])
                    level = logging.ERROR if response.status_code == 402 else logging.WARNING
                    logger.log(level, f"[CARTESIA TTS] Error ({response.status_code}){' OUT OF CREDITS' if response.status_code == 402 else ''}: {error_text}")
        except Exception as e:
            logger.error(f"[CARTESIA TTS] Stream failed: {e}")

    async def warm(self) -> None:
        """Open (or keep open) the pooled HTTPS connection to Cartesia so the next sentence skips TCP+TLS setup.
        Any response warms the connection; no audio is synthesised and no credits are spent. Never raises."""
        if not self.api_key:
            return
        try:
            await self._client.get("https://api.cartesia.ai/", timeout=3.0)  # tiny status response; same host/connection
        except Exception as e:
            logger.debug("[CARTESIA TTS] warm-up failed: %s", e)

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
            data = resp.json()
            return data.get("data", data) if isinstance(data, dict) else data
        except Exception as e:
            logger.error(f"[CARTESIA TTS] Failed to fetch voices: {e}")
            return []

    async def generate_preview_audio(
        self, text: str, voice_id: str, speed: float | None = None, emotion: str | None = None, language: str | None = None
    ) -> bytes | None:
        """MP3 for browser playback. Identical concurrent requests share one synthesis: the playground pre-generates each
        sentence while the model is still writing the next, and the browser asks for the same audio a moment later,
        so it must join the running request instead of paying for the sentence twice."""
        key = (text, voice_id or self.voice_id, language, speed, emotion)
        cached = self._preview_cache.get(key)
        if cached is not None:
            return cached
        running = self._preview_inflight.get(key)
        if running is not None:
            return await asyncio.shield(running)
        task = asyncio.ensure_future(self._generate_preview_uncached(text, voice_id, speed, emotion, language))
        self._preview_inflight[key] = task
        try:
            return await asyncio.shield(task)
        finally:
            if task.done():
                self._preview_inflight.pop(key, None)

    async def _generate_preview_uncached(
        self, text: str, voice_id: str, speed: float | None = None, emotion: str | None = None, language: str | None = None
    ) -> bytes | None:
        """Fetch a complete MP3 audio buffer for browser playback preview."""
        if not self.api_key:
            return None
            
        url = "https://api.cartesia.ai/tts/bytes"
        headers = {
            "X-API-Key": self.api_key,
            "Cartesia-Version": self.api_version,
            "Content-Type": "application/json",
        }
        
        target_voice = voice_id or self.voice_id
        payload = {
            "model_id": self.model_id,
            "transcript": text,
            "voice": {
                "mode": "id",
                "id": target_voice,
            },
            "output_format": {
                "container": "mp3",
                "encoding": "mp3",
                "sample_rate": 44100,
            },
        }
        if language:
            payload["language"] = language
        generation_config = self.generation_config(speed, emotion)
        if generation_config:
            payload["generation_config"] = generation_config
        cache_key = (text, target_voice, language, speed, emotion)
        cached = self._preview_cache.get(cache_key)
        if cached is not None:
            return cached  # the same sentence in the same voice costs no credits the second time

        self.last_error = None
        try:
            resp = await self._client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                if len(self._preview_cache) >= 150:
                    self._preview_cache.pop(next(iter(self._preview_cache)))
                self._preview_cache[cache_key] = resp.content
                return resp.content

            self.last_error = (resp.status_code, resp.text[:300])
            # Only an unknown voice id justifies a different voice. Credits (402), rate limits and server errors would
            # fail the same way, and silently swapping voices is what made previews "sound different" sometimes.
            if resp.status_code in (400, 404) and "voice" in resp.text.lower() and target_voice != self.voice_id:
                logger.info(f"[CARTESIA TTS] Voice {target_voice} not found; retrying preview with default voice {self.voice_id}")
                payload["voice"]["id"] = self.voice_id
                resp2 = await self._client.post(url, headers=headers, json=payload)
                if resp2.status_code == 200:
                    return resp2.content
            if resp.status_code == 402:
                logger.error("[CARTESIA TTS] OUT OF CREDITS (402): %s", resp.text[:200])
            else:
                logger.warning(f"[CARTESIA TTS] Preview generation failed with status {resp.status_code}: {resp.text}")
            return None
        except Exception as e:
            self.last_error = (0, str(e))
            logger.error(f"[CARTESIA TTS] Failed to generate preview audio: {e}")
            return None


# Global singleton
cartesia_tts = CartesiaTTS()
