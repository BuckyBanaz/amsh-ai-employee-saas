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


class LanguageMode(str, Enum):
    ENGLISH = "english"
    HINDI = "hindi"
    HINGLISH = "hinglish"


# Unambiguous Roman-script Hindi words. Words that are also English ("so", "me", "to", "par") are left out on purpose.
_HINGLISH_WORDS = frozenset(
    "haan han ji nahi nahin nhi kya hai hain hoon hun mujhe mera meri mere aap aapka aapki aapko aapke kal aaj parso karna karni "
    "karo karen karani karana karte karti kijiye kijiyega chahiye chahta chahti batao bataiye bhai theek thik accha acha achha kaise kab kitne baje subah "
    "shaam dopahar raat baat wala wali abhi phir fir lekin kyun kyunki toh sunai suno sun rahe rahi samajh hoga hogi kaun kaisa "
    "kaisi bolo boliye dijiye lijiye lena dena batana bataye milega milegi chahunga chahungi thi tha".split()
)

# A bare acknowledgement or nudge that is NOT a new request ("hello", "ji", "haan ji", "accha", "phir?", "sun rahe ho?").
_INTERJECTION = re.compile(
    r"(?:he+l+o+|hallo|hello\s+ji|ji|haan(?:\s+ji)?|han(?:\s+ji)?|a(?:cc|ch)h?a(?:\s+ji)?|theek\s+hai(?:\s+ji)?|thik\s+hai(?:\s+ji)?"
    r"|ya\s+phir|phir|fir|kya|sun\s+(?:rahe|rahi)\s+ho|suniye|हेलो|हैलो|जी|हाँ\s*जी|हां\s*जी|हाँ|हां|अच्छा|ठीक\s*है(?:\s*जी)?"
    r"|या\s*फिर|फिर|क्या|सुन\s*रहे\s*हो|सुन\s*रही\s*हो)",
    re.IGNORECASE,
)

_LAYER_NOTE = (
    "HINDI/HINGLISH MODE (affects only how you talk; booking, availability, tools and safety rules are exactly the same as in "
    "English). "
    "LANGUAGE: reply in Hindi/Hinglish for the rest of the call, including confirmations: not \"Great! Your appointment is "
    "confirmed\" but \"बहुत बढ़िया Rohan जी। आपकी appointment गुरुवार, 8 अक्टूबर को सुबह 10:30 बजे confirm हो गई है।\" Use Devanagari "
    "when the caller writes Devanagari, otherwise Roman Hinglish. Natural Hinglish is right: keep everyday English words "
    "(appointment, confirm, doctor, clinic, slot) instead of stiff translations. "
    "NAMES stay unchanged: doctor names, service names (e.g. Dental Consultation), the clinic name, AMSh. "
    "DATES AND TIMES: say them the Hindi way (weekday and month in Hindi, \"सुबह 10:30 बजे\" / \"shaam 5 baje\"); the actual day and "
    "time must match exactly what the tools returned. "
    "INTERRUPTIONS: short words like हेलो, जी, हाँ जी, अच्छा, ठीक है जी, या फिर, फिर?, क्या?, सुन रहे हो? (or hello, ji, haan ji, "
    "accha, theek hai ji, phir?, kya?, sun rahe ho?) are not new requests. Read them against where the conversation is: never "
    "restart, never re-greet, never ask \"how can I help\" again. Acknowledge in one short phrase (\"जी, मैं सुन रही हूँ\") and "
    "carry on with the pending step, using what the caller already told you. "
    "FILLERS: an occasional short \"जी, एक सेकंड।\" while you check something is natural; do not overuse it."
)

_INTERRUPTION_NOTE = (
    "The caller's latest message, \"{said}\", is only a Hindi acknowledgement or nudge, not a new request. Do NOT start over or "
    "greet again. Briefly acknowledge (\"जी, मैं सुन रही हूँ\" / \"जी, बोलिए\", in your own voice), then continue exactly where you "
    "were. Your last message was: \"{last}\". Repeat or gently rephrase that pending question once, keeping everything already "
    "collected (name, date, appointment)."
)


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
