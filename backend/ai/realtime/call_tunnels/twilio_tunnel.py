"""
Twilio Telephony Call Tunnel.
Handles US & Global Telephony (+1 DIDs) using 8-bit mu-law (8kHz, 160 bytes/frame).
Supports standard Twilio Media Streams WebSocket protocol.
"""

import base64
import json
import logging
from typing import Any, Dict, Optional
from fastapi import WebSocket

from backend.ai.realtime.call_tunnels.base_tunnel import BaseTelephonyTunnel

logger = logging.getLogger(__name__)


class TwilioTunnel(BaseTelephonyTunnel):
    """
    Twilio Media Streams WebSocket Tunnel for US/Global (+1) incoming calls.
    - Codec: 8-bit G.711 mu-law @ 8000 Hz.
    - Frame size: 160 bytes (20ms).
    """

    @property
    def provider_name(self) -> str:
        return "twilio"

    @property
    def audio_codec(self) -> str:
        return "audio/x-mulaw"

    @property
    def sample_rate(self) -> int:
        return 8000

    @property
    def frame_size_bytes(self) -> int:
        return 160

    async def parse_incoming_message(self, raw_message: str) -> Optional[Dict[str, Any]]:
        """
        Parse Twilio Media Streams WebSocket JSON message.
        Twilio format:
        - Start: {"event": "start", "streamSid": "...", "start": {"callSid": "...", "customParameters": {"from": "..."}}}
        - Media: {"event": "media", "streamSid": "...", "media": {"payload": "<base64 mulaw>"}}
        - Stop: {"event": "stop", "streamSid": "..."}
        - Mark: {"event": "mark", "streamSid": "...", "mark": {"name": "..."}}
        """
        try:
            msg = json.loads(raw_message)
        except json.JSONDecodeError:
            return None

        event_type = msg.get("event", "")
        stream_id = msg.get("streamSid") or msg.get("stream_sid", "")
        if stream_id and not self.stream_id:
            self.stream_id = stream_id

        if event_type == "start":
            start_data = msg.get("start", {})
            call_sid = start_data.get("callSid") or start_data.get("call_sid", "")
            custom_params = start_data.get("customParameters", {})
            caller_from = custom_params.get("from") or custom_params.get("From", self.caller_number)
            self.call_id = call_sid or self.call_id
            self.caller_number = caller_from
            return {
                "event": "start",
                "stream_id": stream_id,
                "audio_payload": None,
                "metadata": {
                    "call_id": self.call_id,
                    "from": self.caller_number,
                    "account_sid": start_data.get("accountSid"),
                    "custom_parameters": custom_params
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
                logger.warning("Twilio base64 decode failed: %s", e)
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
        Format mu-law audio chunk for Twilio Media Streams.
        """
        payload = base64.b64encode(audio_chunk).decode("utf-8")
        return json.dumps({
            "event": "media",
            "streamSid": self.stream_id,
            "media": {
                "payload": payload
            }
        })

    async def format_clear_buffer(self) -> Optional[str]:
        """Twilio buffer clear command on barge-in."""
        if not self.stream_id:
            return None
        return json.dumps({
            "event": "clear",
            "streamSid": self.stream_id
        })

    async def format_mark(self, mark_name: str) -> Optional[str]:
        """Track audio playback marker."""
        if not self.stream_id:
            return None
        return json.dumps({
            "event": "mark",
            "streamSid": self.stream_id,
            "mark": {
                "name": mark_name
            }
        })
