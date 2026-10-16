"""
Hindi / Hinglish conversation layer (one file). Spec: `issue.md` at the repo root.

Two layers, kept apart:
  Layer 1  universal receptionist logic: state, tools, availability, booking, rescheduling, cancellation, patient data, duplicate
           prevention. Language-independent; nothing in this file touches it.
  Layer 2  THIS FILE. Active only when `mode` is HINDI or HINGLISH. It decides the session's language mode and supplies one
           extra system note (response language, Hinglish phrasing, interruption handling, fillers). In ENGLISH mode it returns
           nothing, so an English caller's prompt is byte-for-byte what it was before this layer existed.

Region: the layer exists only for tenants whose region policy enables it (`verticals/language_policy.py`, today India);
elsewhere the mode is always ENGLISH. Within an enabled region the mode rules are:
  * Default ENGLISH.
  * An explicit request ("हिंदी में बात कीजिए", "Hindi mein baat karo") -> HINDI and it STAYS until they ask for English.
  * An explicit request for English ("can you speak in English") -> ENGLISH, sticky.
  * Without an explicit request the mode follows the caller: Devanagari -> HINDI, Roman Hindi words -> HINGLISH, else ENGLISH.
  * Other languages (Spanish...) are not handled here: the mode stays ENGLISH and the existing language notes apply.

To tune: Hinglish word list `_HINGLISH_WORDS`, interruptions `_INTERJECTION`, the prompt `_LAYER_NOTE`.
"""

import re
from enum import Enum
from typing import Optional

from backend.ai.engine.agent.hindi import has_devanagari
from backend.ai.lexicon import load_lexicon
from backend.ai.prompts import load_prompts


def _engine_note(key):
    return load_prompts("engine_notes")[key]



class LanguageMode(str, Enum):
    ENGLISH = "english"
    HINDI = "hindi"
    HINGLISH = "hinglish"


# Hindi lexical data lives in ai/locales/lexicon/hi.json: unambiguous Roman-script Hindi words (words that are also English,
# like "so" or "to", are left out on purpose) and the bare acknowledgements ("hello", "ji", "haan ji", "accha", "phir?"...).
_LEXICON = load_lexicon("hi")
_HINGLISH_WORDS = frozenset(_LEXICON.get("hinglish_words", []))
_INTERJECTION = re.compile(_LEXICON.get("interjections_pattern", "(?!)"), re.IGNORECASE)

_LAYER_NOTE = _engine_note("language_layer")["layer_note"]

_INTERRUPTION_NOTE = _engine_note("language_layer")["interruption_note"]


def is_interjection(text: Optional[str]) -> bool:
    """True when the whole message is a bare Hindi acknowledgement or nudge."""
    cleaned = re.sub(r"[\s,.!?।…\-]+$", "", re.sub(r"^[\s,.!?।…\-]+", "", str(text or "")))
    return bool(cleaned) and bool(_INTERJECTION.fullmatch(cleaned))


def looks_hinglish(roman_text: Optional[str]) -> bool:
    """Roman-script Hindi: at least two distinct Hindi words, or one in a message of at most two words."""
    words = re.findall(r"[a-z']+", str(roman_text or "").lower())
    hits = {w for w in words if w in _HINGLISH_WORDS}
    return len(hits) >= 2 or (len(hits) == 1 and len(words) <= 2)


class LanguageLayer:
    """Session-level language mode plus the one note that turns Layer 2 on."""

    def __init__(self, enabled: bool = True) -> None:
        # `enabled` is the resolved regional policy (verticals/language_policy.py), not a country check made here.
        self.enabled = enabled
        self.mode = LanguageMode.ENGLISH
        self.explicit: Optional[LanguageMode] = None  # set by "talk in Hindi" / "talk in English"; sticky until changed

    @property
    def active(self) -> bool:
        return self.mode in (LanguageMode.HINDI, LanguageMode.HINGLISH)

    def observe(self, utterance: str, roman: str, asked: Optional[str], auto_detect: bool = True) -> LanguageMode:
        """Update the mode from the caller's latest message. `asked` is `hindi.requested_language()` ('hi' / 'en' / other / None)."""
        if not self.enabled:
            self.mode = LanguageMode.ENGLISH  # this tenant's region does not get the layer
            return self.mode
        if asked == "hi":
            self.explicit = LanguageMode.HINDI
        elif asked == "en":
            self.explicit = LanguageMode.ENGLISH
        if self.explicit:
            self.mode = self.explicit
        elif not auto_detect:
            self.mode = LanguageMode.ENGLISH  # the owner pinned the language: never override it
        elif has_devanagari(utterance):
            self.mode = LanguageMode.HINDI
        elif looks_hinglish(roman):
            self.mode = LanguageMode.HINGLISH
        else:
            self.mode = LanguageMode.ENGLISH
        return self.mode

    def note(self, utterance: str, last_assistant: Optional[str]) -> Optional[str]:
        """The system note for this turn, or None in ENGLISH mode (English callers are untouched)."""
        if not self.active:
            return None
        text = _LAYER_NOTE
        if is_interjection(utterance) and last_assistant:
            text += " " + _INTERRUPTION_NOTE.format(said=str(utterance).strip(), last=str(last_assistant).strip()[:300])
        return text
