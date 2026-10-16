"""
Plivo Telephony Call Tunnel.
Handles India (+91) and global Plivo numbers using 8-bit mu-law (8kHz, 160 bytes/frame).
Supports the Plivo Audio Streaming WebSocket protocol (bidirectional <Stream>).

Plivo protocol reference:
- Inbound (Plivo -> server): start, media, dtmf, playedStream, clearedAudio
- Outbound (server -> Plivo): playAudio, checkpoint, clearAudio
- Plivo sends no WebSocket "stop"; the stream ends when the socket closes.
- Per-call data is passed as <Stream extraHeaders="k=v;k2=v2">, echoed in the start event.
"""

import base64
import json
import logging
from typing import Any, Dict, Optional
from fastapi import WebSocket

from backend.ai.realtime.call_tunnels.base_tunnel import BaseTelephonyTunnel

logger = logging.getLogger(__name__)

PLIVO_CONTENT_TYPE = "audio/x-mulaw"
PLIVO_SAMPLE_RATE = 8000


def parse_extra_headers(raw: Optional[str]) -> Dict[str, str]:
    """Parse Plivo's extra_headers into a dict.
    Live Plivo sends "{X-PH-token: 123.abc}" (braces, X-PH- prefix, ": "); the docs show "token=123.abc;k=v". Both are accepted."""
    out: Dict[str, str] = {}
    body = (raw or "").strip()
    if body.startswith("{") and body.endswith("}"):
        body = body[1:-1]
    for part in body.replace(",", ";").split(";"):
        part = part.strip()
        cut = min((i for i in (part.find("="), part.find(":")) if i > 0), default=-1)
        if cut <= 0:
            continue
        key, value = part[:cut].strip(), part[cut + 1:].strip()
        if key.lower().startswith("x-ph-"):
            key = key[5:]
        out[key] = value
    return out


def plivo_play_audio_message(payload_b64: str) -> str:
    """playAudio for an already base64-encoded mu-law frame."""
    return json.dumps({
        "event": "playAudio",
        "media": {"contentType": PLIVO_CONTENT_TYPE, "sampleRate": PLIVO_SAMPLE_RATE, "payload": payload_b64},
    })


def plivo_checkpoint_message(stream_id: str, name: str) -> str:
    """checkpoint: Plivo echoes it back as playedStream once playback reaches it."""
    return json.dumps({"event": "checkpoint", "streamId": stream_id, "name": name})


def plivo_clear_audio_message(stream_id: str) -> str:
    """clearAudio: drop everything Plivo has queued (barge-in)."""
    return json.dumps({"event": "clearAudio", "streamId": stream_id})


class PlivoTunnel(BaseTelephonyTunnel):
    """
    Plivo Audio Streaming WebSocket Tunnel.
    - Codec: 8-bit G.711 mu-law @ 8000 Hz (matches <Stream contentType="audio/x-mulaw;rate=8000">).
    - Frame size: 160 bytes (20ms).
    """

    @property
    def provider_name(self) -> str:
        return "plivo"

    @property
    def audio_codec(self) -> str:
        return PLIVO_CONTENT_TYPE

    @property
    def sample_rate(self) -> int:
        return PLIVO_SAMPLE_RATE

    @property
    def frame_size_bytes(self) -> int:
        return 160

    async def parse_incoming_message(self, raw_message: str) -> Optional[Dict[str, Any]]:
        """
        Parse a Plivo Audio Streaming WebSocket JSON message.
        - Start: {"event": "start", "streamId": "...", "start": {"callId": "...", ...}, "extra_headers": "k=v;..."}
        - Media: {"event": "media", "streamId": "...", "media": {"payload": "<base64 mulaw>"}}
        - PlayedStream: {"event": "playedStream", "streamId": "...", "name": "<checkpoint>"} -> normalized as "mark"
        - ClearedAudio: {"event": "clearedAudio", "streamId": "..."} -> ignored
        """
        try:
            msg = json.loads(raw_message)
        except json.JSONDecodeError:
            return None

        event_type = msg.get("event", "")
        stream_id = msg.get("streamId") or msg.get("stream_id", "")
        if stream_id and not self.stream_id:
            self.stream_id = stream_id

        if event_type == "start":
            start_data = msg.get("start", {})
            call_id = start_data.get("callId") or start_data.get("call_id", "")
            self.call_id = call_id or self.call_id
            return {
                "event": "start",
                "stream_id": stream_id,
                "audio_payload": None,
                "metadata": {
                    "call_id": self.call_id,
                    "from": self.caller_number,
                    "account_id": start_data.get("accountId"),
                    "custom_parameters": parse_extra_headers(msg.get("extra_headers")),
                    "media_format": start_data.get("mediaFormat", {}),
                }
            }

        elif event_type == "media":
            media_data = msg.get("media", {})
            b64_payload = media_data.get("payload", "")
            if not b64_payload:
                return None
            try:
                audio_bytes = base64.b64decode(b64_payload)
            except Exception as e:
                logger.warning("Plivo base64 decode failed: %s", e)
                return None

            return {
                "event": "media",
                "stream_id": stream_id or self.stream_id,
                "audio_payload": audio_bytes,
                "metadata": {
                    "timestamp": media_data.get("timestamp"),
                    "chunk": media_data.get("chunk")
                }
            }

        elif event_type == "playedStream":
            # Equivalent of Twilio's "mark" echo: the checkpoint before this point has finished playing.
            return {
                "event": "mark",
                "stream_id": stream_id or self.stream_id,
                "audio_payload": None,
                "metadata": {"name": msg.get("name", "")}
            }

        return None

    async def format_outgoing_audio(self, audio_chunk: bytes) -> str:
        """Format mu-law audio chunk as a Plivo playAudio message."""
        return plivo_play_audio_message(base64.b64encode(audio_chunk).decode("utf-8"))

    async def format_clear_buffer(self) -> Optional[str]:
        """Plivo clearAudio command on barge-in."""
        if not self.stream_id:
            return None
        return plivo_clear_audio_message(self.stream_id)

    async def format_mark(self, mark_name: str) -> Optional[str]:
        """Plivo checkpoint: Plivo echoes it back as playedStream once playback reaches it."""
        if not self.stream_id:
            return None
        return plivo_checkpoint_message(self.stream_id, mark_name)
