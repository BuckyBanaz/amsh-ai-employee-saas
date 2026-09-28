"""Live catalogue of the chat models the dashboard's model picker can offer. Nothing is hard-coded: the lists come from the
Groq and Gemini APIs (cached for a few minutes), so new or retired models show up without a code change."""

import logging
import time
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

_TTL_SECONDS = 600
_cache: Dict[str, Any] = {"at": 0.0, "data": None}

# Model ids that are not chat/text models, so they cannot run a receptionist conversation.
_GROQ_SKIP = ("whisper", "tts", "guard", "safeguard", "orpheus", "playai", "compound", "embed", "transcribe")
# Gemini: only the `gemini-*` text family (the API also lists music, image, research-agent and speech models that share
# generateContent), minus its own speech/image/embedding/live variants.
_GEMINI_SKIP = ("embedding", "tts", "image", "audio", "live", "robotics", "imagen", "veo", "aqa", "learnlm", "computer-use", "transcribe", "omni")


def _groq_rows(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    rows = []
    for m in payload.get("data", []):
        mid = str(m.get("id", ""))
        if not mid or m.get("active") is False or any(s in mid.lower() for s in _GROQ_SKIP):
            continue
        rows.append(
            {
                "provider": "groq",
                "id": mid,
                "label": mid.split("/")[-1] + (f" ({m['owned_by']})" if m.get("owned_by") else ""),
                "context_window": m.get("context_window"),
            }
        )
    return rows


def _gemini_rows(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    rows = []
    for m in payload.get("models", []):
        mid = str(m.get("name", "")).replace("models/", "")
        methods = m.get("supportedGenerationMethods") or []
        if not mid.startswith("gemini-") or "generateContent" not in methods or any(s in mid.lower() for s in _GEMINI_SKIP):
            continue
        rows.append(
            {
                "provider": "gemini",
                "id": mid,
                "label": m.get("displayName") or mid,
                "context_window": m.get("inputTokenLimit"),
            }
        )
    return rows


async def fetch_catalog(groq_key: Optional[str], gemini_key: Optional[str], client: Optional[httpx.AsyncClient] = None, force: bool = False) -> Dict[str, Any]:
    """{'models': [...], 'errors': {provider: message}}. A provider without a key or that fails contributes no models."""
    if not force and _cache["data"] is not None and time.monotonic() - _cache["at"] < _TTL_SECONDS:
        return _cache["data"]
    own = client is None
    client = client or httpx.AsyncClient(timeout=10.0)
    models: List[Dict[str, Any]] = []
    errors: Dict[str, str] = {}
    try:
        if groq_key:
            try:
                r = await client.get("https://api.groq.com/openai/v1/models", headers={"Authorization": f"Bearer {groq_key}"})
                r.raise_for_status()
                models += _groq_rows(r.json())
            except Exception as e:
                errors["groq"] = f"{type(e).__name__}: {str(e)[:120]}"
        else:
            errors["groq"] = "GROQ_API_KEY is not configured"
        if gemini_key:
            try:
                r = await client.get(
                    "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", headers={"x-goog-api-key": gemini_key}
                )
                r.raise_for_status()
                models += _gemini_rows(r.json())
            except Exception as e:
                errors["gemini"] = f"{type(e).__name__}: {str(e)[:120]}"
        else:
            errors["gemini"] = "GEMINI_API_KEY is not configured"
    finally:
        if own:
            await client.aclose()
    data = {"models": models, "errors": errors}
    if models:  # never cache an empty result: a transient failure should be retried on the next request
        _cache.update(at=time.monotonic(), data=data)
    return data


def clear_cache() -> None:
    _cache.update(at=0.0, data=None)
