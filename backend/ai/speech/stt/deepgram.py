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
