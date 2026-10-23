"""
Deepgram Speech-to-Text (STT) Client.
Provides fast streaming transcription for inbound Twilio voice streams.
"""

import asyncio
import json
import logging
import time
from typing import Any, AsyncIterator, Awaitable, Callable, Dict, Optional

import websockets
from websockets.client import WebSocketClientProtocol

from backend.server.common.config import get_settings

logger = logging.getLogger(__name__)


class DeepgramSTT:
    """Client for Deepgram Nova-2 voice transcription."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.api_key = getattr(self.settings, "DEEPGRAM_API_KEY", "")

    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def transcribe_audio(self, audio_bytes: bytes, mimetype: str = "audio/wav") -> Optional[str]:
        """Transcribe an audio payload using Deepgram Nova-2."""
        if not self.api_key:
            return None
        import httpx
        try:
            url = "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true"
            headers = {
                "Authorization": f"Token {self.api_key}",
                "Content-Type": mimetype,
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, headers=headers, content=audio_bytes)
                if resp.status_code == 200:
                    data = resp.json()
                    transcript = data["results"]["channels"][0]["alternatives"][0]["transcript"]
                    return transcript
                else:
                    logger.warning(f"[DEEPGRAM STT] Error ({resp.status_code}): {resp.text}")
        except Exception as e:
            logger.error(f"[DEEPGRAM STT] Transcription failed: {e}")
        return None



# Global singleton
deepgram_stt = DeepgramSTT()


RECENT_AUDIO_S = 30.0  # caller audio kept per call for the utterance's sound cues (about 240 KB of mulaw)
ENDPOINTING_MS = 200  # silence Deepgram waits before it finalises an utterance (the endpointing= value in the URL below)
DEEPGRAM_LIVE_URL_TEMPLATE = (
    "wss://api.deepgram.com/v1/listen"
    "?model={model}&language={language}&encoding={encoding}&sample_rate=8000&channels=1"
    "&punctuate=true&interim_results=true&endpointing=200&vad_events=true&utterance_end_ms=1000"
)  # utterance_end_ms: an UtteranceEnd closes a turn whose pause endpointing missed (noise), see the phone gateway

# Languages Nova-3's multilingual mode understands while the caller switches between them mid-sentence.
_MULTI_LANGS = ("en", "hi")


def resolve_stt_language(explicit: Optional[str]) -> str:
    """Language code for live speech-to-text. Measured on Hindi and English speech: `nova-3` + `multi` transcribed both
    correctly ("...अपॉइंटमेंट book करना है" and "Can we talk in Hindi?"), while `nova-2` + `en-IN` failed on Hindi and
    `hi` wrote English as Devanagari. So callers in English or Hindi (or with nothing configured) get `multi`; other
    languages (Punjabi, Bengali, Spanish...) keep the owner's explicit setting."""
    code = (explicit or "").strip()
    if not code or code.lower().split("-")[0] in _MULTI_LANGS or code == "multi":
        return "multi"
    return code


def model_for(language: str) -> str:
    return "nova-3" if language == "multi" else "nova-2"


class DeepgramLiveConnection:
    """One live Deepgram streaming session, scoped to a single phone call.
    Push raw mulaw audio chunks in via `send_audio`; consume transcript and
    speech-started (barge-in) events via `events()`."""

    def __init__(self, encoding: str = "mulaw", language: str = "en-IN") -> None:
        self.encoding = encoding  # "mulaw" (Twilio/Plivo) or "linear16" (PCM path)
        self.language = language  # "en-IN" (India), "en-US" (US), "en-GB" (UK), "hi" (Hindi)
        self.settings = get_settings()
        self.api_key = getattr(self.settings, "DEEPGRAM_API_KEY", "")
        self._ws: Optional[WebSocketClientProtocol] = None
        self._queue: "asyncio.Queue[Dict[str, Any]]" = asyncio.Queue()
        self._reader_task: Optional[asyncio.Task] = None
        # Wall-clock (monotonic) time of the first audio byte Deepgram received. Deepgram's word timestamps are offsets
        # into that audio, and telephony audio arrives in real time, so audio_t0 + last word end ~= when the caller
        # stopped speaking. Used only for latency measurement.
        self.audio_t0: Optional[float] = None
        # Barge-in hook. When set, SpeechStarted calls it straight from the reader instead of queueing an event: the
        # queue's consumer is busy for the whole AI turn, so a queued event would only be seen after the AI finished.
        self.on_speech_started: Optional[Callable[[], Awaitable[None]]] = None
        # The audio Deepgram actually received, last RECENT_AUDIO_S seconds, indexed like its word timestamps (seconds since
        # the first byte it got), so the caller's own sound for an utterance can be cut out exactly (laughter detection).
        self.bytes_per_second = 16000 if encoding == "linear16" else 8000
        self._recent = bytearray()
        self._recent_start = 0  # byte offset (since the first byte sent) of _recent[0]

    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def connect(self) -> bool:
        if not self.api_key:
            logger.warning("[DEEPGRAM LIVE] No API key configured — live STT disabled")
            return False
        language = resolve_stt_language(self.language)
        for attempt in (1, 2):
            try:
                url = DEEPGRAM_LIVE_URL_TEMPLATE.format(model=model_for(language), encoding=self.encoding, language=language)
                self._ws = await websockets.connect(
                    url,
                    additional_headers={"Authorization": f"Token {self.api_key}"},
                    ping_interval=5,
                )
                self.language = language
                self._reader_task = asyncio.create_task(self._read_loop())
                return True
            except Exception as e:
                logger.error(f"[DEEPGRAM LIVE] Connection failed ({model_for(language)}/{language}): {e}")
                if attempt == 1 and language == "multi":
                    language = "en-IN"  # never leave a call deaf because the multilingual mode was refused: use the old setting
                    continue
                return False
        return False

    async def send_audio(self, mulaw_bytes: bytes) -> None:
        if self._ws is not None:
            try:
                await self._ws.send(mulaw_bytes)
                if self.audio_t0 is None:
                    self.audio_t0 = time.monotonic()
                self._recent.extend(mulaw_bytes)
                excess = len(self._recent) - int(RECENT_AUDIO_S * self.bytes_per_second)
                if excess > 0:
                    del self._recent[:excess]
                    self._recent_start += excess
            except Exception as e:
                logger.warning(f"[DEEPGRAM LIVE] Failed to send audio chunk: {e}")

    def audio_between(self, start_s: float, end_s: Optional[float] = None) -> bytes:
        """The audio Deepgram received between two of its own word offsets (seconds); clipped to what is still kept."""
        bps = self.bytes_per_second
        step = 2 if self.encoding == "linear16" else 1  # never split a PCM16 sample
        lo = max(int(start_s * bps) // step * step - self._recent_start, 0)
        hi = len(self._recent) if end_s is None else max(int(end_s * bps) // step * step - self._recent_start, 0)
        return bytes(self._recent[lo:hi])

    async def _read_loop(self) -> None:
        assert self._ws is not None
        try:
            async for raw in self._ws:
                try:
                    msg = json.loads(raw)
                except (TypeError, ValueError):
                    continue

                msg_type = msg.get("type")
                if msg_type == "SpeechStarted":
                    if self.on_speech_started is not None:
                        try:
                            await self.on_speech_started()
                        except Exception as e:  # a failed barge-in must never stop transcription
                            logger.warning(f"[DEEPGRAM LIVE] speech_started handler failed: {e}")
                    else:
                        await self._queue.put({"type": "speech_started"})
                elif msg_type == "UtteranceEnd":
                    await self._queue.put({"type": "utterance_end", "received_at": time.monotonic()})
                elif msg_type == "Results":
                    alt = msg.get("channel", {}).get("alternatives", [{}])[0]
                    transcript = alt.get("transcript", "")
                    if transcript:
                        words = alt.get("words") or []
                        speech_end = None
                        if words and self.audio_t0 is not None and isinstance(words[-1].get("end"), (int, float)):
                            speech_end = self.audio_t0 + float(words[-1]["end"])
                        first_start = words[0].get("start") if words else None
                        await self._queue.put(
                            {
                                "type": "transcript",
                                "text": transcript,
                                "is_final": bool(msg.get("is_final")),
                                "speech_final": bool(msg.get("speech_final")),
                                "received_at": time.monotonic(),  # before any queueing delay in the consumer
                                "speech_end_at": speech_end,  # estimated, see audio_t0
                                "audio_start_s": first_start if isinstance(first_start, (int, float)) else None,  # see audio_between
                            }
                        )
        except Exception as e:
            logger.info(f"[DEEPGRAM LIVE] Read loop ended: {e}")
        finally:
            await self._queue.put({"type": "closed"})

    async def events(self) -> AsyncIterator[Dict[str, Any]]:
        """Yields events until the connection closes."""
        while True:
            event = await self._queue.get()
            if event.get("type") == "closed":
                return
            yield event

    async def close(self) -> None:
        if self._reader_task:
            self._reader_task.cancel()
        if self._ws is not None:
            try:
                await self._ws.close()
            except Exception:
                pass
