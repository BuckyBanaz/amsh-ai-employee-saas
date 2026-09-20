"""
Abstract Base Telephony Tunnel.
Defines the standard interface for all telephony providers (Exotel, Twilio, Telnyx, Plivo)
to stream bidirectional audio with STT, State Machine, and TTS.
"""

from abc import ABC, abstractmethod
import logging
from typing import Any, Dict, Optional
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class BaseTelephonyTunnel(ABC):
    """
    Abstract interface for streaming bidirectional telephony media streams.
    Decouples provider-specific protocols (Exotel JSON vs Twilio Media Streams)
    from core audio and conversation engines.
    """

    def __init__(
        self,
        websocket: WebSocket,
        business_id: str,
        caller_number: str = "+15550000000",
        call_id: Optional[str] = None
    ) -> None:
        self.websocket = websocket
        self.business_id = business_id
        self.caller_number = caller_number
        self.call_id = call_id
        self.stream_id: Optional[str] = None
        self.is_active = True

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the provider (e.g. 'exotel', 'twilio', 'telnyx')."""
        pass

    @property
    @abstractmethod
    def audio_codec(self) -> str:
        """Audio codec expected by telephony (e.g. 'pcm_s16le', 'audio/x-mulaw')."""
        pass

    @property
    @abstractmethod
    def sample_rate(self) -> int:
        """Audio sample rate in Hz (e.g. 8000)."""
        pass

    @property
    @abstractmethod
    def frame_size_bytes(self) -> int:
        """Size of 20ms audio frame in bytes (e.g. 320 for PCM16, 160 for mu-law)."""
        pass

    @abstractmethod
    async def parse_incoming_message(self, raw_message: str) -> Optional[Dict[str, Any]]:
        """
        Parse raw WebSocket message from telephony provider.
        Returns normalized dict:
        {
            'event': 'start' | 'media' | 'stop' | 'mark',
            'stream_id': str,
            'audio_payload': bytes (if media event),
            'metadata': dict
        }
        """
        pass

    @abstractmethod
    async def format_outgoing_audio(self, audio_chunk: bytes) -> str:
        """
        Format raw audio chunk into telephony provider's specific JSON message.
        """
        pass

    @abstractmethod
    async def format_clear_buffer(self) -> Optional[str]:
        """
        Format message to clear provider audio playback buffer on user barge-in.
        """
        pass

    @abstractmethod
    async def format_mark(self, mark_name: str) -> Optional[str]:
        """
        Format mark message to track audio playback completion.
        """
        pass
