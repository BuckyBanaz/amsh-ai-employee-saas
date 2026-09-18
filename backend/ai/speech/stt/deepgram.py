"""
Deepgram Speech-to-Text (STT) Client.
Provides fast streaming transcription for inbound Twilio voice streams.
"""

import asyncio
import json
import logging
from typing import Any, AsyncIterator, Dict, Optional

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


DEEPGRAM_LIVE_URL = (
    "wss://api.deepgram.com/v1/listen"
    "?model=nova-2&encoding=mulaw&sample_rate=8000&channels=1"
    "&punctuate=true&interim_results=true&endpointing=300&vad_events=true"
)


class DeepgramLiveConnection:
    """One live Deepgram streaming session, scoped to a single phone call.
    Push raw mulaw audio chunks in via `send_audio`; consume transcript and
    speech-started (barge-in) events via `events()`."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.api_key = getattr(self.settings, "DEEPGRAM_API_KEY", "")
        self._ws: Optional[WebSocketClientProtocol] = None
        self._queue: "asyncio.Queue[Dict[str, Any]]" = asyncio.Queue()
        self._reader_task: Optional[asyncio.Task] = None

    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def connect(self) -> bool:
        if not self.api_key:
            logger.warning("[DEEPGRAM LIVE] No API key configured — live STT disabled")
            return False
        try:
            self._ws = await websockets.connect(
                DEEPGRAM_LIVE_URL,
                additional_headers={"Authorization": f"Token {self.api_key}"},
                ping_interval=5,
            )
            self._reader_task = asyncio.create_task(self._read_loop())
            return True
        except Exception as e:
            logger.error(f"[DEEPGRAM LIVE] Connection failed: {e}")
            return False

    async def send_audio(self, mulaw_bytes: bytes) -> None:
        if self._ws is not None:
            try:
                await self._ws.send(mulaw_bytes)
            except Exception as e:
                logger.warning(f"[DEEPGRAM LIVE] Failed to send audio chunk: {e}")

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
                    await self._queue.put({"type": "speech_started"})
                elif msg_type == "Results":
                    alt = msg.get("channel", {}).get("alternatives", [{}])[0]
                    transcript = alt.get("transcript", "")
                    if transcript:
                        await self._queue.put(
                            {
                                "type": "transcript",
                                "text": transcript,
                                "is_final": bool(msg.get("is_final")),
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
