"""Browser speech-to-text through Deepgram.

The dashboard playgrounds used Chrome's built-in recogniser (weak on Hindi/Hinglish, and not what phone calls use). The
browser now streams its microphone (webm/opus from MediaRecorder) to this WebSocket, which relays it to Deepgram
(`nova-3`, `multi` for English + Hindi) and sends back simple transcript events. The Deepgram key never reaches the browser.

Browser -> server: binary audio chunks.
Server -> browser JSON: {"type": "ready"}, {"type": "interim", "text"}, {"type": "final", "text"} (the caller finished an
utterance), {"type": "error", "message"}.
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional

import websockets
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.ai.speech.stt.deepgram import model_for, resolve_stt_language
from backend.server.auth.security import decode_access_token
from backend.server.common.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["stt"])

DEEPGRAM_BROWSER_URL = (
    "wss://api.deepgram.com/v1/listen?model={model}&language={language}&interim_results=true&smart_format=true"
    "&punctuate=true&endpointing=700&utterance_end_ms=1200&vad_events=true"
)  # no `encoding`: the browser sends a container format (webm/opus) that Deepgram detects itself


class TranscriptAssembler:
    """Turns Deepgram's stream (interim results, finalised segments, end-of-speech markers) into utterance events:
    `interim` while the caller is talking, one `final` per utterance carrying the whole utterance."""

    def __init__(self) -> None:
        self._done: List[str] = []  # finalised segments of the current utterance

    def _utterance(self, extra: str = "") -> str:
        return " ".join(p for p in [*self._done, extra.strip()] if p).strip()

    def feed(self, message: Dict[str, Any]) -> List[Dict[str, str]]:
        kind = message.get("type")
        if kind == "UtteranceEnd":  # silence long enough: flush whatever is pending
            text, self._done = self._utterance(), []
            return [{"type": "final", "text": text}] if text else []
        if kind != "Results":
            return []
        alternatives = (message.get("channel") or {}).get("alternatives") or [{}]
        text = (alternatives[0].get("transcript") or "").strip()
        if not message.get("is_final"):
            merged = self._utterance(text)
            return [{"type": "interim", "text": merged}] if merged else []
        if text:
            self._done.append(text)
        if message.get("speech_final"):
            full, self._done = self._utterance(), []
            return [{"type": "final", "text": full}] if full else []
        merged = self._utterance()
        return [{"type": "interim", "text": merged}] if merged else []


def _authorised(token: str) -> Optional[str]:
    try:
        return decode_access_token(token)
    except Exception:
        return None


@router.websocket("/api/voice/stt-stream")
async def stt_stream(ws: WebSocket, token: str = "", language: str = "multi") -> None:
    """Relay the browser's microphone to Deepgram and the transcripts back."""
    if not _authorised(token):
        await ws.close(code=4401)
        return
    await ws.accept()
    api_key = getattr(get_settings(), "DEEPGRAM_API_KEY", None)
    if not api_key:
        await ws.send_json({"type": "error", "message": "Deepgram is not configured on the server"})
        await ws.close()
        return

    lang = resolve_stt_language(language)
    url = DEEPGRAM_BROWSER_URL.format(model=model_for(lang), language=lang)
    try:
        dg = await websockets.connect(url, additional_headers={"Authorization": f"Token {api_key}"}, ping_interval=5)
    except Exception as e:
        logger.warning("[STT STREAM] Deepgram connection failed: %s", e)
        await ws.send_json({"type": "error", "message": "Speech recognition is unavailable right now"})
        await ws.close()
        return

    assembler = TranscriptAssembler()
    await ws.send_json({"type": "ready"})

    async def upstream() -> None:
        try:
            while True:
                chunk = await ws.receive_bytes()
                await dg.send(chunk)
        except (WebSocketDisconnect, RuntimeError):
            pass
        finally:
            try:
                await dg.send(json.dumps({"type": "CloseStream"}))
            except Exception:
                pass

    async def downstream() -> None:
        async for raw in dg:
            try:
                message = json.loads(raw)
            except (TypeError, ValueError):
                continue
            for event in assembler.feed(message):
                await ws.send_json(event)

    tasks = [asyncio.create_task(upstream()), asyncio.create_task(downstream())]
    try:
        await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
    except Exception as e:
        logger.warning("[STT STREAM] relay ended: %s", e)
    finally:
        for t in tasks:
            t.cancel()
        try:
            await dg.close()
        except Exception:
            pass
        try:
            await ws.close()
        except Exception:
            pass


@router.get("/api/voice/stt-config")
def stt_config() -> Dict[str, Any]:
    """Tells the dashboard whether Deepgram speech recognition is available (otherwise it keeps the browser recogniser)."""
    return {"deepgram": bool(getattr(get_settings(), "DEEPGRAM_API_KEY", None))}
