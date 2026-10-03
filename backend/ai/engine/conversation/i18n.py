"""Locale dictionaries for everything the receptionist says (backend/ai/locales/<lang>.json).
Add a language by dropping in a new <lang>.json; missing keys fall back to English."""

import json
from functools import lru_cache
from pathlib import Path
from typing import Dict, Optional

from backend.ai.lexicon import language_pack

_LOCALES_DIR = Path(__file__).resolve().parents[2] / "locales"
DEFAULT_LANGUAGE = "en"


@lru_cache(maxsize=None)
def _load(lang: str) -> Dict[str, str]:
    path = _LOCALES_DIR / f"{lang}.json"
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def language_code(lang: Optional[str]) -> str:
    """'nl-NL' -> 'nl'. Unlike normalize_language it never swaps an unknown language for English: the agent engine keeps the
    tenant's language so the model is told to speak it, and fixed lines fall back to English only when a language has none."""
    return (lang or DEFAULT_LANGUAGE).split("-")[0].lower()


def normalize_language(lang: Optional[str]) -> str:
    """'hi-IN' -> 'hi'; unknown or empty -> default."""
    code = (lang or DEFAULT_LANGUAGE).split("-")[0].lower()
    return code if (_load(code) or language_pack(code)) else DEFAULT_LANGUAGE  # any language that has a locale file or a pack


def t(lang: str, key: str, **fmt: object) -> str:
    """Localized string for `key`, falling back to English, then to the key itself."""
    text = (_load(lang).get(key) or (language_pack(lang).get("strings") or {}).get(key)
            or _load(DEFAULT_LANGUAGE).get(key) or key)
    return text.format(**fmt) if fmt else text
