"""Language lexicon loader. Language-specific words and patterns (Hinglish word lists, interjections, emergency phrases) are
DATA in `ai/locales/lexicon/<language>.json`, not constants scattered through Python. Adding a language's emergency phrases or
filler words is a new JSON file; code that needs them asks here. Region facts do not live here (see verticals/regions.py).

Neutral on purpose (stdlib only), so speech code, rules and the engine can all import it without cycles.
"""

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Pattern

LEXICON_DIR = Path(__file__).parent / "locales" / "lexicon"


@lru_cache(maxsize=None)
def load_lexicon(language: str) -> Dict[str, Any]:
    """The lexicon for a language code ('hi', 'en'...), or {} when there is none."""
    path = LEXICON_DIR / f"{(language or '').strip().lower()}.json"
    if not path.is_file():
        return {}
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def lexicon_languages() -> List[str]:
    return sorted(p.stem for p in LEXICON_DIR.glob("*.json"))


def compiled_patterns(language: str, key: str, flags: int = re.IGNORECASE) -> List[Pattern[str]]:
    return [re.compile(pattern, flags) for pattern in load_lexicon(language).get(key, [])]


def language_pack(language: str) -> Dict[str, Any]:
    """A language's pack (name, native fillers, 'speak X' phrases, style guidance, TTS/STT codes, extra strings), or {}.

    A pack is just `ai/locales/lexicon/<code>.json`. Adding a language = adding that file (and, for fully scripted lines such as
    the greeting, optionally `ai/locales/<code>.json`); no Python changes. A language without a pack still works: the model is told
    to speak it naturally, it just gets no code-chosen fillers."""
    code = str(language or "").strip().lower().split("-")[0]
    return load_lexicon(code)


def pack_languages() -> List[str]:
    """Codes of languages that have a pack with a name (i.e. that can be spoken, not only matched)."""
    return [code for code in lexicon_languages() if load_lexicon(code).get("name")]


RTL_SCRIPTS_HINT = "Right-to-left languages (Arabic, Hebrew, Persian, Urdu...) set \"direction\": \"rtl\" in their pack."


def text_direction(language: str) -> str:
    """'rtl' or 'ltr' for a language (from its pack; a language without a pack is 'ltr')."""
    return "rtl" if str(language_pack(language).get("direction") or "").lower() == "rtl" else "ltr"


def language_directory() -> List[Dict[str, Any]]:
    """What the dashboard needs to list and render each language: code, English and native name, text direction, and whether the
    agent has native fillers for it. One entry per pack; adding a pack file adds a language here."""
    out = []
    for code in pack_languages():
        pack = load_lexicon(code)
        out.append({
            "code": code,
            "name": pack.get("name"),
            "native_name": pack.get("native_name") or pack.get("name"),
            "direction": text_direction(code),
            "native_fillers": bool(pack.get("fillers")),
            "tts_language": pack.get("tts_language") or code,
            "stt_language": pack.get("stt_language") or code,
        })
    return out
