"""Natural fillers: the small human sounds around a reply ("hmm...", "achha...", "one moment...").

Chosen by code, not written by the model: it costs no prompt tokens, cannot be forgotten or overused, and is easy to test and
switch off. Two kinds:

* a **backchannel** put in front of the first sentence of some replies: a thinking sound when the caller asked a question,
  a short acknowledgement when they told us something, a light "oh nice!" when they were joking. Never for a worried or
  upset caller, never twice within three turns, never when the sentence already starts with one.
* a **wait filler** spoken at once when the model is about to use a tool (check the calendar, book), so the caller hears
  "one moment..." while the next model call runs instead of silence.

Language follows the sentence itself (Devanagari -> Hindi, plain English -> English); anything else gets no filler.
"""

import re
from typing import Optional

from backend.ai.engine.agent.hindi import has_devanagari

HI = {
    "think": ["हम्म…", "अच्छा…", "देखिए…"],
    "ack": ["अच्छा…", "जी…", "ठीक है…"],
    "delight": ["अरे वाह!", "ओह, बढ़िया!"],
}
EN = {
    "think": ["Hmm…", "Let me see…", "Okay…"],
    "ack": ["Right…", "Okay…", "I see…"],
    "delight": ["Oh nice!", "Oh, great!"],
}
WAIT = {"hi": "जी, एक सेकंड…", "en": "One moment…"}

MIN_TURNS_BETWEEN = 3
_SERIOUS = {"worried", "upset"}
_QUESTION = re.compile(
    r"\?\s*$|^\s*(?:क्या|कैसे|कब|कौन|कितना|कितने|क्यों|कहाँ|कहां)\b|\b(?:what|how|when|why|which|who|where|do you|can you|could you|is there|are there)\b",
    re.IGNORECASE,
)
_STARTS_WITH_SOUND = re.compile(
    r"^\W*(?:हम्म|अच्छा|ओह|अरे|जी|ठीक|हाँ|हां|बिल्कुल|देखिए|hmm+|oh|okay|ok|right|sure|great|alright|well|so|i see|let me|one moment)(?![\wऀ-ॿ])",
    re.IGNORECASE,
)
_ENGLISH_WORDS = frozenset(
    "the a an is are was were be can could would will you your yours which what when where who how for to of and or with on at in it this that "
    "please sure day time works work like want need help have has do does did sorry thanks thank yes no okay ok let me my our we us i".split()
)


def sentence_language(sentence: str) -> Optional[str]:
    """'hi' for Devanagari, 'en' for plain English, None for anything else (Roman Hindi, other languages)."""
    if has_devanagari(sentence):
        return "hi"
    words = re.findall(r"[A-Za-z']+", sentence.lower())
    if words and sum(w in _ENGLISH_WORDS for w in words) >= max(1, len(words) // 3):
        return "en"
    return None


def has_leading_sound(sentence: str) -> bool:
    return bool(_STARTS_WITH_SOUND.match(sentence or ""))


def choose_backchannel(
    caller_text: str,
    first_sentence: str,
    mood: Optional[str],
    turn_no: int,
    last_filler_turn: int,
    rotation: int,
) -> Optional[str]:
    """The filler to put before `first_sentence`, or None."""
    if mood in _SERIOUS or turn_no <= 1 or turn_no - last_filler_turn < MIN_TURNS_BETWEEN:
        return None
    if has_leading_sound(first_sentence) or len(first_sentence.split()) < 3:
        return None
    language = sentence_language(first_sentence)
    if language is None:
        return None
    caller = (caller_text or "").strip()
    if mood == "amused":
        kind = "delight"
    elif _QUESTION.search(caller):
        kind = "think"
    elif len(caller.split()) >= 4:
        kind = "ack"
    else:
        return None
    options = (HI if language == "hi" else EN)[kind]
    return options[rotation % len(options)]


def wait_text(hindi: bool) -> str:
    return WAIT["hi" if hindi else "en"]
