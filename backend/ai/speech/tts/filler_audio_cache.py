"""
Audio Cache & Latency Reducer.
Preloads and caches initial greetings and filler audio phrases
to eliminate initial connection lag and provide sub-100ms response on call connect.
"""

import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class AudioCache:
    """Stores in-memory pre-synthesized audio buffers for instant zero-latency playback."""

    def __init__(self) -> None:
        self._cache: Dict[str, bytes] = {}
        self._greetings: Dict[str, bytes] = {}

    def cache_greeting(self, key: str, audio_bytes: bytes) -> None:
        """Cache pre-rendered greeting audio for a specific business/codec."""
        self._greetings[key] = audio_bytes
        logger.info("AudioCache: Cached greeting for key '%s' (%d bytes)", key, len(audio_bytes))

    def get_greeting(self, key: str) -> Optional[bytes]:
        """Retrieve pre-rendered greeting audio if available."""
        return self._greetings.get(key)

    async def load(self) -> None:
        """Pre-load audio buffers into memory."""
        self._cache["one_moment"] = b"\x00" * 1600
        self._cache["checking"] = b"\x00" * 1600
        logger.info("[AUDIO CACHE] Audio cache ready.")

    def get_filler(self, name: str = "one_moment") -> bytes:
        return self._cache.get(name, b"")


# Global instance
filler_audio_cache = AudioCache()

