"""Locale dictionaries for everything the receptionist says (backend/ai/locales/<lang>.json).
Add a language by dropping in a new <lang>.json; missing keys fall back to English."""

import json
from functools import lru_cache
from pathlib import Path
from typing import Dict, Optional

_LOCALES_DIR = Path(__file__).resolve().parents[2] / "locales"
DEFAULT_LANGUAGE = "en"


@lru_cache(maxsize=None)
def _load(lang: str) -> Dict[str, str]:
    path = _LOCALES_DIR / f"{lang}.json"
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def normalize_language(lang: Optional[str]) -> str:
    """'hi-IN' -> 'hi'; unknown or empty -> default."""
    code = (lang or DEFAULT_LANGUAGE).split("-")[0].lower()
    return code if _load(code) else DEFAULT_LANGUAGE


def t(lang: str, key: str, **fmt: object) -> str:
    """Localized string for `key`, falling back to English, then to the key itself."""
    text = _load(lang).get(key) or _load(DEFAULT_LANGUAGE).get(key) or key
    return text.format(**fmt) if fmt else text
