"""
Deepgram Speech-to-Text (STT) Client.
Provides fast streaming transcription for inbound Twilio voice streams.
"""

import logging
from typing import Optional
from backend.server.common.config import get_settings

logger = logging.getLogger(__name__)


class DeepgramSTT:
    """Client for Deepgram Nova-2 voice transcription."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.api_key = getattr(self.settings, "DEEPGRAM_API_KEY", "")

    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def transcribe_audio_chunk(self, audio_bytes: bytes) -> Optional[str]:
        """Transcribe an audio chunk (WAV/mulaw)."""
        if not self.api_key:
            return None
        # Placeholder for Deepgram Live WebSocket or prerecorded API
        return None


# Global singleton
deepgram_stt = DeepgramSTT()
