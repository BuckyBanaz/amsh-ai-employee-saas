"""Facts about a Cartesia voice that the persona depends on. The agent's grammatical gender in Hindi ("kar sakti hoon" vs
"kar sakta hoon") must match the voice the caller hears, so it is read from the voice itself instead of being a setting
the owner has to keep in sync."""

import logging
from typing import Dict, Optional

import httpx

logger = logging.getLogger(__name__)

_GENDER_CACHE: Dict[str, Optional[str]] = {}
_MAP = {"feminine": "female", "masculine": "male"}  # "gender_neutral" and anything else -> None (unknown)


def voice_gender(voice_id: Optional[str]) -> Optional[str]:
    """'female' / 'male' for a Cartesia voice id, or None if unknown/unavailable. Blocking (a short HTTP call, cached
    per process): call it from a thread, never from the event loop."""
    if not voice_id:
        return None
    if voice_id in _GENDER_CACHE:
        return _GENDER_CACHE[voice_id]
    from backend.server.common.config import get_settings

    key = getattr(get_settings(), "CARTESIA_API_KEY", None)
    if not key:
        return None
    try:
        resp = httpx.get(
            f"https://api.cartesia.ai/voices/{voice_id}",
            headers={"X-API-Key": key, "Cartesia-Version": "2024-11-13"},
            timeout=3.0,
        )
        if resp.status_code != 200:
            return None  # not cached: a transient failure should be retried on the next call
        gender = _MAP.get(str(resp.json().get("gender") or "").lower())
        _GENDER_CACHE[voice_id] = gender
        return gender
    except Exception as e:
        logger.warning("Could not read gender of voice %s: %s", voice_id, e)
        return None
