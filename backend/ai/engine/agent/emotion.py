"""Emotion engine: lets the voice laugh, sound sympathetic, excited or playful instead of reading every line the same way.

How it works
  1. The model may begin a sentence with one cue in square brackets ("[warm]", "[playful]", ...) and add "[laugh]" for a
     light laugh. `parse_cues` removes every bracket tag from the text, so nothing is ever read aloud or shown, and turns
     the cue into a Cartesia emotion; a laugh becomes the "[laughter]" tag Cartesia renders as a real laugh.
  2. `caller_mood` reads what the caller said (laughing, worried, upset, thankful) and gives the model a one-line hint. When
     the model gave no cue, the mood picks a fitting default emotion, so the voice still reacts.
  3. `EmotionState` keeps laughing rare: never in a serious moment, and not more than once every few turns.

Only the sentence's delivery changes. The words, booking facts and every guard are untouched.
"""

import re
from typing import Optional, Tuple

# cue the model may write -> Cartesia emotion value
CUES = {
    "warm": "content",
    "happy": "happy",
    "excited": "enthusiastic",
    "playful": "joking/comedic",
    "sympathetic": "sympathetic",
    "apologetic": "apologetic",
    "curious": "curious",
    "calm": "calm",
    "surprised": "surprised",
}
_LAUGH_WORDS = {"laugh", "laughs", "laughter", "chuckle", "chuckles", "giggle", "giggles", "haha", "hehe"}
# Any [square] tag is a cue (models also write Hindi ones such as [हँसते हुए]); other brackets only when they hold a known cue.
_TAG = re.compile(r"\[\s*([^\[\]\n]{1,30}?)\s*\]|[\(\{<]\s*([A-Za-z_]{2,12})\s*[\)\}>]")
_LAUGH_HI = ("हँस", "हंस")  # हँसते हुए, हंसी, ...
# A laugh the model wrote out as words ("हाहाहा", "hahaha"): the voice would read it as syllables, so it becomes a real laugh.
_WRITTEN_LAUGH = re.compile(r"(?:हा\s*){2,}|\b(?:ha){2,}h?\b|\bhehe+\b|(?:ही\s*){2,}", re.IGNORECASE)
_ASK_LAUGH = re.compile(r"हंस|हँस|\blaugh|\bhans\b|\bhasna\b|\bhans\s+ke\b", re.IGNORECASE)

EMOTION_RULE = (
    "VOICE: you may start a sentence with one cue: [warm] [happy] [excited] [playful] [sympathetic] [apologetic] "
    "[calm]. [laugh] = a light laugh, only if the caller jokes (rare, never if they are worried). "
    "Cues are never spoken; most sentences need none."
)

# --- the caller's mood ----------------------------------------------------------------------------------------------
_AMUSED = re.compile(r"\b(?:ha){2,}\b|\bhehe+\b|\blol\b|\blmao\b|😂|🤣|हा\s*हा|हाहा|हीही|\bfunny\b|मज़ा|मजा|मज़ेदार|मजेदार|शायरी|joke|मज़ाक|मजाक", re.IGNORECASE)
_WORRIED = re.compile(
    r"दर्द|तकलीफ|तकलीफ़|परेशान|डर\b|घबरा|चिंता|बहुत\s*बुरा|\bpain\b|\bhurts?\b|\bworried\b|\bscared\b|\bnervous\b|\bafraid\b|\bsad\b|\bdukh\b|\bdard\b|\bpareshan\b|\btension\b",
    re.IGNORECASE,
)
_UPSET = re.compile(r"गुस्सा|बेकार|बकवास|\bangry\b|\bfrustrat|\bridiculous\b|\bwaste\b|\bnonsense\b|\bbakwas\b|\bgussa\b|\bnot happy\b|\bterrible\b|\bworst\b", re.IGNORECASE)
_THANKFUL = re.compile(r"धन्यवाद|शुक्रिया|थैंक|\bthank|\bthanks\b|\bshukriya\b|\bdhanyavad\b|\bappreciate", re.IGNORECASE)

MOOD_NOTES = {
    "amused": "MOOD: the caller is joking or laughing. You may answer with a light laugh ([laugh]) and a playful line, then steer back.",
    "worried": "MOOD: the caller sounds worried or in discomfort. Be gentle and reassuring ([sympathetic]); no jokes, no laughing.",
    "upset": "MOOD: the caller sounds upset. Stay calm and take it seriously ([apologetic] or [calm]); no jokes, no laughing.",
    "thankful": "MOOD: the caller is thanking you. Answer warmly ([warm] or [happy]) in a few words.",
}
_MOOD_DEFAULT_CUE = {"amused": "playful", "worried": "sympathetic", "upset": "apologetic", "thankful": "warm"}
SERIOUS = {"worried", "upset"}


def caller_mood(text: Optional[str]) -> Optional[str]:
    """'amused' / 'worried' / 'upset' / 'thankful' when the caller's words clearly show it, else None. Serious moods win."""
    s = text or ""
    if _UPSET.search(s):
        return "upset"
    if _WORRIED.search(s):
        return "worried"
    if _AMUSED.search(s):
        return "amused"
    if _THANKFUL.search(s):
        return "thankful"
    return None


# --- cues in the model's sentences ----------------------------------------------------------------------------------
def parse_cues(sentence: str) -> Tuple[str, Optional[str], bool]:
    """(text without any bracket tags, cue name or None, laugh requested). Unknown tags are dropped, never spoken."""
    cue: Optional[str] = None
    laugh = False

    def take(match: "re.Match[str]") -> str:
        nonlocal cue, laugh
        square = match.group(1) is not None
        word = (match.group(1) or match.group(2)).strip().lower().replace(" ", "_")
        if not square and word not in _LAUGH_WORDS and word not in CUES:
            return match.group(0)  # ordinary parentheses such as "(OPD)" stay
        if word in _LAUGH_WORDS or word.startswith(_LAUGH_HI):
            laugh = True
        elif word in CUES and cue is None:
            cue = word
        return ""

    text = _TAG.sub(take, sentence)
    if _WRITTEN_LAUGH.search(text):
        laugh = True
        text = _WRITTEN_LAUGH.sub("", text)
    text = re.sub(r"^[\s,;:!.\-]+", "", text)  # nothing dangling where a tag or written laugh was
    return re.sub(r"\s{2,}", " ", text).strip(" \t"), cue, laugh


class EmotionState:
    """Per-call memory that keeps expressiveness natural: laughter is rare and never in a serious moment."""

    LAUGH_EVERY = 4  # at least this many turns between laughs

    def __init__(self) -> None:
        self.turn = 0
        self.mood: Optional[str] = None
        self.last_laugh_turn = -99
        self.asked_laugh = False  # the caller asked to hear a laugh: the "not too often" limit does not apply

    def hear(self, caller_text: str) -> Optional[str]:
        """Call once per caller turn. Returns the mood hint for the model, if any."""
        self.turn += 1
        self.mood = caller_mood(caller_text)
        self.asked_laugh = bool(_ASK_LAUGH.search(caller_text or "")) and self.mood not in SERIOUS
        return MOOD_NOTES.get(self.mood) if self.mood else None

    def direct(self, cue: Optional[str], laugh: bool, first_in_reply: bool) -> Tuple[Optional[str], bool]:
        """(Cartesia emotion or None, laugh) for one sentence, after the safety rules."""
        if not cue and first_in_reply and self.mood in _MOOD_DEFAULT_CUE:
            cue = _MOOD_DEFAULT_CUE[self.mood]  # the model gave no cue: let the caller's mood pick one
        too_soon = self.turn - self.last_laugh_turn < self.LAUGH_EVERY and not self.asked_laugh
        if laugh and (self.mood in SERIOUS or too_soon):
            laugh = False
        if laugh:
            self.last_laugh_turn = self.turn
        if self.mood in SERIOUS and cue in ("playful", "excited", "happy"):
            cue = _MOOD_DEFAULT_CUE[self.mood]  # never a cheerful voice for a worried or upset caller
        return (CUES.get(cue) if cue else None), laugh


def tts_text(text: str, laugh: bool) -> str:
    """The text to synthesise: a real laugh is Cartesia's [laughter] tag placed before the words."""
    return f"[laughter] {text}" if laugh and text else text
