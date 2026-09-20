"""
Exotel Telephony Call Tunnel.
Handles Indian Telephony (+91 DIDs) using Linear PCM16 (8kHz, 320 bytes/frame).
Supports Exotel Voicebot Applet WebSocket protocol.
"""

import base64
import json
import logging
from typing import Any, Dict, Optional
from fastapi import WebSocket

from backend.ai.realtime.call_tunnels.base_tunnel import BaseTelephonyTunnel

logger = logging.getLogger(__name__)


class ExotelTunnel(BaseTelephonyTunnel):
    """
    Exotel Voicebot WebSocket Tunnel for India (+91) incoming calls.
    - Codec: Linear PCM 16-bit signed LE @ 8000 Hz.
    - Frame size: 320 bytes (20ms).
    """

    @property
    def provider_name(self) -> str:
        return "exotel"

    @property
    def audio_codec(self) -> str:
        return "pcm_s16le"

    @property
    def sample_rate(self) -> int:
        return 8000

    @property
    def frame_size_bytes(self) -> int:
        return 320

    async def parse_incoming_message(self, raw_message: str) -> Optional[Dict[str, Any]]:
        """
        Parse Exotel WebSocket JSON message.
        Exotel format:
        - Start: {"event": "start", "stream_sid": "...", "start": {"call_sid": "...", "from": "..."}}
        - Media: {"event": "media", "stream_sid": "...", "media": {"payload": "<base64 PCM>"}}
        - Stop: {"event": "stop", "stream_sid": "..."}
        """
        try:
            msg = json.loads(raw_message)
        except json.JSONDecodeError:
            return None

        event_type = msg.get("event", "")
        stream_id = msg.get("stream_sid") or msg.get("stream_id", "")
        if stream_id and not self.stream_id:
            self.stream_id = stream_id

        if event_type == "start":
            start_data = msg.get("start", {})
            call_sid = start_data.get("call_sid") or start_data.get("call_id", "")
            caller_from = start_data.get("from") or start_data.get("caller_id", self.caller_number)
            self.call_id = call_sid or self.call_id
            self.caller_number = caller_from
            return {
                "event": "start",
                "stream_id": stream_id,
                "audio_payload": None,
                "metadata": {
                    "call_id": self.call_id,
                    "from": self.caller_number,
                    "custom_parameters": start_data.get("custom_parameters", {})
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
                logger.warning("Exotel base64 decode failed: %s", e)
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

        elif event_type == "stop":
            return {
                "event": "stop",
                "stream_id": stream_id or self.stream_id,
                "audio_payload": None,
                "metadata": msg.get("stop", {})
            }

        elif event_type == "mark":
            return {
                "event": "mark",
                "stream_id": stream_id or self.stream_id,
                "audio_payload": None,
                "metadata": msg.get("mark", {})
            }

        return None

    async def format_outgoing_audio(self, audio_chunk: bytes) -> str:
        """
        Format PCM audio chunk for Exotel Voicebot stream.
        """
        payload = base64.b64encode(audio_chunk).decode("utf-8")
        return json.dumps({
            "event": "media",
            "stream_sid": self.stream_id,
            "media": {
                "payload": payload
            }
        })

    async def format_clear_buffer(self) -> Optional[str]:
        """Exotel buffer clear command on barge-in."""
        if not self.stream_id:
            return None
        return json.dumps({
            "event": "clear",
            "stream_sid": self.stream_id
        })

    async def format_mark(self, mark_name: str) -> Optional[str]:
        """Track audio playback marker."""
        if not self.stream_id:
            return None
        return json.dumps({
            "event": "mark",
            "stream_sid": self.stream_id,
            "mark": {
                "name": mark_name
            }
        })
