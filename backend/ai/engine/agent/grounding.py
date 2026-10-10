"""Time grounding guard. Appointment times are the highest-risk thing a model can invent, so code checks them:
a clock time in a draft reply must have come from the caller, a tool result, or the clinic facts in the prompt.
Anything else is an invented slot, and the reply is rewritten before the caller ever hears it."""

import re
from functools import lru_cache
from typing import Any, Dict, Iterable, List, Optional, Pattern, Set, Tuple

from backend.ai.engine.agent.hindi import normalize as normalize_hindi
from backend.ai.lexicon import lexicon_languages, load_lexicon
from backend.ai.prompts import load_prompts


def _engine_note(key):
    return load_prompts("engine_notes")[key]


_NUM = re.compile(r"\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)(?![a-z])", re.IGNORECASE)
_HOURS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12}
_MINUTES = {"fifteen": 15, "thirty": 30, "forty five": 45, "forty-five": 45, "oh five": 5, "ten": 10, "twenty": 20}
_WORD = re.compile(
    r"\b(" + "|".join(_HOURS) + r")(?:\s+(fifteen|thirty|forty[ -]five|twenty|ten))?\s*(a\.?m\.?|p\.?m\.?)(?![a-z])",
    re.IGNORECASE,
)
_CLOCK24 = re.compile(r"\b([01]?\d|2[0-3]):([0-5]\d)\b")  # hours as stored in the prompt facts, e.g. 09:00-17:00

Minute = Tuple[int, int]  # (hour 0-23, minute)


def _to24(hour: int, minute: int, meridiem: str) -> Minute:
    pm = meridiem.lower().startswith("p")
    return (hour % 12) + (12 if pm else 0), minute


def times_in(text: str, include_24h: bool = False) -> Set[Minute]:
    """Every clock time mentioned in `text` as (hour24, minute)."""
    found: Set[Minute] = set()
    for m in _NUM.finditer(text):
        h = int(m[1])
        if 1 <= h <= 12:
            found.add(_to24(h, int(m[2] or 0), m[3]))
    for m in _WORD.finditer(text):
        minute = _MINUTES.get((m[2] or "").lower().replace("-", " ").replace("  ", " "), 0)
        found.add(_to24(_HOURS[m[1].lower()], minute, m[3]))
    if include_24h:
        for m in _CLOCK24.finditer(text):
            found.add((int(m[1]), int(m[2])))
    return found


ClockRule = Tuple[Pattern[str], Optional[Dict[str, int]], Tuple[int, int]]


@lru_cache(maxsize=None)
def _clock_rules() -> Tuple[ClockRule, ...]:
    """Spoken clock times from every language pack's "clock" data (ai/locales/lexicon/<code>.json). A caller who says
    "बारह बजे", "half twaalf" or "الثانية عشرة والنصف" has given a time just as much as one who says "12 PM"."""
    rules: List[ClockRule] = []
    for code in lexicon_languages():
        clock = load_lexicon(code).get("clock") or {}
        words = {w.lower(): int(h) for h, ws in (clock.get("hours") or {}).items() for w in ws}
        if words:
            words.update({str(h): h for h in range(1, 13)})  # digits too: "12 baje", "12 uur", "a las 12"
        if words:
            # longest first, so "الثانية عشرة" (12) is read whole and not as "الثانية" (2)
            alt = "|".join(re.escape(w) for w in sorted(words, key=len, reverse=True))
            for template, offset in clock.get("patterns") or []:
                rx = re.compile(r"(?<!\w)" + template.replace("{h}", f"(?P<h>{alt})") + r"(?!\w)", re.IGNORECASE)
                rules.append((rx, words, (0, int(offset))))
        for phrase, hour, minute in clock.get("fixed") or []:
            rules.append((re.compile(r"(?<!\w)" + phrase + r"(?!\w)", re.IGNORECASE), None, (int(hour), int(minute))))
    return tuple(rules)


def spoken_clock_times(text: str) -> Set[Tuple[int, int]]:
    """(hour 1-12, minute) for every clock time said in words, in any language with a pack. AM/PM is never implied."""
    low = (text or "").lower()
    hits: List[Tuple[int, int, Tuple[int, int], bool]] = []  # (start, end, time, has an offset / is a whole phrase)
    for rx, words, (hour, minute) in _clock_rules():
        for m in rx.finditer(low):
            if words is None:
                hits.append((m.start(), m.end(), (hour, minute), minute != 0))
                continue
            total = (words[m.group("h").lower()] * 60 + minute) % 720  # hour word + offset: "half twaalf" = 12:00 - 30 min
            hits.append((m.start(), m.end(), (total // 60 or 12, total % 60), minute != 0))
    # "साढ़े दस बजे" also matches the plain "{h} baje": the plain hour inside a more specific phrase is not a second time.
    specific = [(s, e) for s, e, _, exact in hits if exact]
    return {t for s, e, t, exact in hits if exact or not any(s < e2 and s2 < e for s2, e2 in specific)}


def grounded_times(messages: Iterable[Dict[str, Any]]) -> Set[Minute]:
    """Times the model is allowed to say: from the system facts, anything the caller said, and tool results."""
    allowed: Set[Minute] = set()
    for msg in messages:
        role, content = msg.get("role"), msg.get("content") or ""
        if role == "system":
            allowed |= times_in(content, include_24h=True)
        elif role in ("user", "tool"):
            allowed |= times_in(content, include_24h=True)
            if role == "user":  # "12 baje", "twelve o'clock", "half twaalf": the caller gave the hour, AM/PM is ours to say
                allowed |= {(h % 12 + pm, m) for h, m in spoken_clock_times(normalize_hindi(content)) for pm in (0, 12)}
    return allowed


def ungrounded(draft: str, messages: Iterable[Dict[str, Any]]) -> List[str]:
    """Human-readable list of invented times in `draft` (empty means the reply is grounded)."""
    mentioned = times_in(draft)
    if not mentioned:
        return []
    allowed = grounded_times(messages)
    return [f"{(h % 12) or 12}:{m:02d} {'PM' if h >= 12 else 'AM'}" for h, m in sorted(mentioned - allowed)]


# ---- claims of a completed action ------------------------------------------------------------------------------------
# "Your appointment is confirmed" must never be spoken unless a tool actually confirmed it. Models happily say it after a
# plain-chat read-back (no tool call), and the caller then hangs up believing they are booked.
_AUX = r"(?:is|are|has been|have been|been|now)"
_CLAIMS = {
    "book": re.compile(
        rf"\b{_AUX}\s+(?:confirmed|booked|scheduled)\b|\b(?:i|we)(?:'ve|’ve| have)?\s+(?:booked|scheduled|confirmed)\b"
        r"|\byou(?:'re|’re| are)\s+(?:all set|booked|confirmed)\b|\ball set\b|\bbooking\s+(?:is\s+)?(?:done|complete|confirmed)\b"
        r"|बुक\s*हो\s*(?:गय[ाी]|गई)|बुक\s*कर\s*(?:दिय[ाी]|दी)|कन्फर्म\s*हो\s*(?:गय[ाी]|गई)|कन्फर्म\s*कर\s*(?:दिय[ाी]|दी)"
        r"|\b(?:book|confirm)\s+(?:ho\s+gaya|ho\s+gayi|kar\s+diya)\b",
        re.IGNORECASE,
    ),
    "cancel": re.compile(
        rf"\b{_AUX}\s+(?:cancelled|canceled)\b|\b(?:i|we)(?:'ve|’ve| have)?\s+(?:cancelled|canceled)\b"
        r"|कैंसिल\s*हो\s*(?:गय[ाी]|गई)|रद्द\s*हो\s*(?:गय[ाी]|गई)|रद्द\s*कर\s*(?:दिय[ाी]|दी)|\bcancel\s+(?:ho\s+gaya|ho\s+gayi|kar\s+diya|kar\s+di)\b",
        re.IGNORECASE,
    ),
    "reschedule": re.compile(
        rf"\b{_AUX}\s+(?:rescheduled|moved)\b|\b(?:i|we)(?:'ve|’ve| have)?\s+(?:rescheduled|moved)\b"
        r"|\breschedule\s+(?:ho\s+gaya|ho\s+gayi|kar\s+diya)\b",
        re.IGNORECASE,
    ),
}
# Tool result codes that make a claim true, per kind.
SUCCESS_CODES = {
    "book": {"booked", "already_booked", "dry_run"},
    "cancel": {"cancelled", "dry_run"},
    "reschedule": {"rescheduled", "dry_run"},
}


def unbacked_claim(sentence: str, succeeded: Set[str]) -> Optional[str]:
    """The kind ('book'/'cancel'/'reschedule') of a completed-action claim in `sentence` that no tool has backed
    during this call, else None. Questions ("shall I confirm?") are not claims."""
    if sentence.rstrip().endswith("?"):
        return None
    for kind, pattern in _CLAIMS.items():
        if kind not in succeeded and pattern.search(sentence):
            return kind
    return None


CLAIM_NOTE = _engine_note("claim_note")

# ---- model reasoning that leaked into the reply ---------------------------------------------------------------------
_LEAK = re.compile(
    r"\b(?:we need to (?:respond|reply|confirm that|output)|the user (?:says|said|wants|asks|is asking|wrote)|i should (?:respond|reply)|"
    r"let me think|as an ai language model|according to the (?:system|tool|instructions))\b",
    re.IGNORECASE,
)


def is_reasoning_leak(sentence: str) -> bool:
    """True for a 'sentence' that is the model thinking out loud (or only ellipsis/punctuation noise), not speech."""
    if not re.search(r"\w", sentence):
        return True
    return bool(_LEAK.search(sentence))


GUARD_NOTE = _engine_note("guard_note")
