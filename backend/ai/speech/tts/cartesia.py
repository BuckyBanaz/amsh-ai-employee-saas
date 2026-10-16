"""
Cartesia Sonic Text-to-Speech (TTS) Client.
Provides ultra-low latency (<100ms) voice streaming for real-time telephony.
"""

import asyncio
import base64
import json
import logging
import uuid
from collections import OrderedDict
from typing import AsyncGenerator, Optional
import httpx
import websockets
from websockets.exceptions import ConnectionClosed

from backend.ai.llm.client import pooled_http_client
from backend.ai.realtime import latency
from backend.server.common.config import get_settings

logger = logging.getLogger(__name__)


class _WebSocketUnavailable(Exception):
    """Raised before anything was streamed: the caller falls back to the REST endpoint for this sentence."""


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
        # Finished utterances, least recently used evicted first: the greeting and fillers recur on every call, so they stay
        self._audio_cache: "OrderedDict[tuple, bytes]" = OrderedDict()
        self._audio_cache_bytes = 0
        self._preview_cache: dict[tuple, bytes] = {}  # dashboard previews (MP3), so repeats do not spend credits
        self._preview_inflight: dict[tuple, "asyncio.Future"] = {}  # syntheses in progress, shared by identical requests
        self.last_error: tuple[int, str] | None = None  # (HTTP status, message) of the last failed request
        # One shared WebSocket connection, reused across calls (skips the ~100-200ms TLS+TCP handshake per utterance).
        # Cartesia's websocket streams audio as it is generated instead of waiting for the whole utterance like the REST
        # /tts/bytes endpoint used before, which measured ~530ms to the first chunk; the websocket is what gets Cartesia's
        # advertised <100ms. Multiple utterances can be in flight at once, told apart by `context_id`.
        self._ws: Optional["websockets.WebSocketClientProtocol"] = None
        self._ws_lock = asyncio.Lock()
        self._ws_reader_task: Optional[asyncio.Task] = None
        self._ws_pending: dict[str, "asyncio.Queue"] = {}

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
        Stream raw audio chunks from Cartesia Sonic, over the websocket for low time-to-first-chunk, falling back to
        the REST endpoint if the websocket is unavailable (network blocks it, or Cartesia is down for that transport).
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
            self._audio_cache.move_to_end(cache_key)
            latency.mark("tts_first_audio", cached=True)
            yield cached
            return

        collected = bytearray()
        try:
            async for chunk in self._stream_speech_ws(text, voice_id, encoding, sample_rate, language, speed, emotion):
                collected.extend(chunk)
                yield chunk
        except _WebSocketUnavailable as e:
            logger.warning(f"[CARTESIA TTS] Websocket unavailable ({e}); falling back to REST for this sentence")
            async for chunk in self._stream_speech_rest(text, voice_id, encoding, sample_rate, language, speed, emotion):
                collected.extend(chunk)
                yield chunk
        if collected:
            # Only cache a REST-fallback or a websocket run that finished (a barge-in cancellation stops mid-stream and
            # never reaches here, so a cached entry is always the complete utterance).
            self._remember(cache_key, bytes(collected))

    AUDIO_CACHE_ENTRIES = 400
    AUDIO_CACHE_BYTES = 24 * 1024 * 1024  # ~12 minutes of 8 kHz 16-bit phone audio

    def _remember(self, key: tuple, audio: bytes) -> None:
        old = self._audio_cache.pop(key, None)
        if old is not None:
            self._audio_cache_bytes -= len(old)
        self._audio_cache[key] = audio
        self._audio_cache_bytes += len(audio)
        while self._audio_cache and (len(self._audio_cache) > self.AUDIO_CACHE_ENTRIES or self._audio_cache_bytes > self.AUDIO_CACHE_BYTES):
            _, dropped = self._audio_cache.popitem(last=False)
            self._audio_cache_bytes -= len(dropped)

    async def prewarm(self, text: str, **params) -> None:
        """Synthesize `text` now (same parameters as the later `stream_speech` call) so it plays from memory when needed:
        the "one moment..." filler a tool turn starts with. Never raises; a cached text is not requested again."""
        try:
            async for _ in self.stream_speech(text, **params):
                pass
        except Exception as e:
            logger.debug(f"[CARTESIA TTS] prewarm skipped: {e}")

    async def _stream_speech_ws(
        self,
        text: str,
        voice_id: str | None,
        encoding: str,
        sample_rate: int,
        language: str | None,
        speed: float | None,
        emotion: str | None,
    ) -> AsyncGenerator[bytes, None]:
        """One utterance over the shared Cartesia websocket. Raises `_WebSocketUnavailable` (never yields partial audio
        first) if the connection cannot be established or the request cannot be sent, so the caller can fall back to REST
        cleanly; a failure after Cartesia accepted the request (mid-stream) instead just ends the generator early."""
        context_id = uuid.uuid4().hex
        payload: dict = {
            "model_id": self.model_id,
            "transcript": text,
            "voice": {"mode": "id", "id": voice_id or self.voice_id},
            "output_format": {"container": "raw", "encoding": encoding, "sample_rate": sample_rate},
            "context_id": context_id,
            "add_timestamps": False,
        }
        if language:
            payload["language"] = language
        generation_config = self.generation_config(speed, emotion)
        if generation_config:
            payload["generation_config"] = generation_config

        try:
            ws = await self._ensure_ws()
        except Exception as e:
            raise _WebSocketUnavailable(str(e)) from e

        queue: asyncio.Queue = asyncio.Queue()
        self._ws_pending[context_id] = queue
        finished = False
        first_marked = False
        try:
            try:
                await ws.send(json.dumps(payload))
            except Exception as e:
                raise _WebSocketUnavailable(str(e)) from e
            while True:
                msg = await queue.get()
                if msg is None:  # the reader loop lost the connection: nothing more is coming for this utterance
                    finished = True
                    return
                if msg.get("type") == "error":
                    self.last_error = (0, str(msg.get("error"))[:300])
                    logger.warning(f"[CARTESIA TTS] Websocket error for utterance: {msg.get('error')}")
                    finished = True
                    return
                if msg.get("type") == "chunk" and msg.get("data"):
                    if not first_marked:  # the live path: without this mark tts_ttfb / tts_to_telephony were always null
                        latency.mark("tts_first_audio", cached=False, transport="ws")
                        first_marked = True
                    yield base64.b64decode(msg["data"])
                if msg.get("done"):
                    finished = True
                    return
        finally:
            self._ws_pending.pop(context_id, None)
            if not finished and self._ws is not None:
                # A barge-in cancelled us mid-utterance: tell Cartesia to stop generating the rest so it doesn't spend
                # credits on audio nobody will hear. Best-effort — the connection is shared, so we don't wait for or
                # even check a reply here.
                try:
                    await self._ws.send(json.dumps({"context_id": context_id, "cancel": True}))
                except Exception:
                    pass

    async def _ensure_ws(self) -> "websockets.WebSocketClientProtocol":
        """Returns the shared connection, opening (or reopening, after a drop) it under a lock so concurrent sentences
        don't each try to reconnect at once."""
        async with self._ws_lock:
            if self._ws is not None and self._ws.close_code is None:
                return self._ws
            url = f"wss://api.cartesia.ai/tts/websocket?api_key={self.api_key}&cartesia_version={self.api_version}"
            self._ws = await asyncio.wait_for(websockets.connect(url, ping_interval=20, ping_timeout=20), timeout=5.0)
            if self._ws_reader_task is None or self._ws_reader_task.done():
                self._ws_reader_task = asyncio.ensure_future(self._ws_reader_loop(self._ws))
            return self._ws

    async def _ws_reader_loop(self, ws: "websockets.WebSocketClientProtocol") -> None:
        """Dispatches every incoming message to the queue of the utterance (`context_id`) it belongs to. Runs for the
        life of one connection; a drop releases every utterance still waiting so none hangs forever."""
        try:
            async for raw in ws:
                try:
                    msg = json.loads(raw)
                except ValueError:
                    continue
                q = self._ws_pending.get(msg.get("context_id"))
                if q is not None:
                    q.put_nowait(msg)
        except (ConnectionClosed, Exception) as e:
            logger.warning(f"[CARTESIA TTS] Websocket connection lost: {e}")
        finally:
            if self._ws is ws:
                self._ws = None
            for q in self._ws_pending.values():
                q.put_nowait(None)  # unblock anyone still waiting; they fall back to REST on their next sentence

    async def _stream_speech_rest(
        self,
        text: str,
        voice_id: str | None = None,
        encoding: str = "pcm_mulaw",
        sample_rate: int = 8000,
        language: str | None = None,
        speed: float | None = None,
        emotion: str | None = None,
    ) -> AsyncGenerator[bytes, None]:
        """The original REST /tts/bytes path: ~500ms to the first chunk (measured), kept only as a fallback for when
        the websocket cannot be reached at all."""
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
