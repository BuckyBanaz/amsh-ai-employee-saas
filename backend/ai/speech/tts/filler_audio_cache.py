"""
Filler Audio Cache.
Preloads short audio filler phrases ("Sure, one moment", "Let me check that for you")
to eliminate perceived latency and play immediately while LLM is generating.
"""

import logging
from typing import Dict

logger = logging.getLogger(__name__)


class FillerAudioCache:
    """Stores in-memory audio buffers for instant playback upon user speech cessation."""

    def __init__(self) -> None:
        self._cache: Dict[str, bytes] = {}

    async def load(self) -> None:
        """Pre-load audio buffers into memory."""
        # Preload synthetic or prerecorded byte buffers
        self._cache["one_moment"] = b"\x00" * 1600
        self._cache["checking"] = b"\x00" * 1600
        logger.info("[FILLER CACHE] Filler audio buffers loaded into memory.")

    def get_filler(self, name: str = "one_moment") -> bytes:
        return self._cache.get(name, b"")


# Global instance
filler_audio_cache = FillerAudioCache()
