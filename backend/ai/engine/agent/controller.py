"""Conversation controller: what AMSh already knows about this call, and the one thing it needs next.

The LLM decides HOW to say something; this module decides WHAT is already settled and what is still missing, from the
caller's own words and the tools' results, in plain code (not in a giant prompt). Three jobs:

  1. `CallState` tracks name / phone / intent / service / date / time / language / mood and the last turn on each side,
     and renders a short note for the model: known facts, the single next thing to ask, and how long to answer.
  2. `CallState.repeat_ask` spots a sentence that asks again for something the caller already gave (a confirmation that
     reads the value back is fine); the agent loop then regenerates the round once with a correction.
  3. `SentenceDeduper` drops a sentence that says the same thing as one already spoken this turn ("Aapka naam bataiye." /
     "Kripya apna naam bataiye.").

Nothing here books, cancels or speaks anything. It only reads and reminds, like progress.py.
"""

import re
from dataclasses import dataclass, field
from datetime import date
from functools import lru_cache
from typing import Any, Dict, Iterable, List, Optional, Pattern, Set, Tuple

from backend.ai.engine.agent.datetime_utils import dates_in, parse_time
from backend.ai.engine.agent.hindi import normalize
from backend.ai.engine.agent.progress import _INTENT as BOOKING_INTENT
from backend.ai.lexicon import lexicon_languages, load_lexicon
from backend.ai.prompts import load_prompts

SLOT_ORDER = ("service", "date", "time", "name", "phone")  # the order a booking is asked for, one item per turn

# --- what the caller said -----------------------------------------------------------------------------------------
_NOT_NAMES = {
    "a", "an", "the", "not", "calling", "looking", "trying", "interested", "here", "fine", "good", "great", "okay", "ok", "sorry",
    "from", "in", "on", "at", "for", "to", "wanting", "want", "needing", "need", "having", "going", "just", "again", "back",
    "also", "still", "sure", "yes", "no", "hello", "hi", "so", "very", "bol", "hoon", "hu", "hai", "tha", "thi", "ji", "sir", "madam",
    "kya", "kyaa", "kaun", "kon", "kab", "bata", "batao", "batayiye", "bataiye", "bataye", "kaise", "kyun", "kyon", "what", "who", "how", "when", "is", "are", "was",
    "appointment", "booking", "doctor", "clinic", "patient", "new", "old", "your", "my", "me", "you", "it", "this", "that",
}
# Explicit statements of a name: any word that is not on the list above is taken.
_NAME_EXPLICIT = re.compile(
    r"(?:my\s+name\s+is|my\s+name's|call\s+me|mera\s+naam|meraa\s+naam|mera\s+nam)\s+([a-z][a-z.'-]+(?:\s+[a-z][a-z.'-]+)?)",
    re.IGNORECASE,
)
# Weak openers ("I am Rohan", "this is Rohan", "main Rohan bol raha hoon"): only when the name starts with a capital.
_NAME_WEAK = re.compile(r"(?:\bI\s*am|\bI'm|\bthis\s+is|\bmain|\bmai)\s+([A-Z][a-z.'-]+(?:\s+[A-Z][a-z.'-]+)?)")
_PHONE_DIGITS = re.compile(r"\d")
_CHANGE = re.compile(r"cancel|reschedul|postpone|change\s+(my|the)\s+(appointment|slot|time|date)|radd|raddh|badal|आगे\s+बढ़ा|रद्द|बदल", re.IGNORECASE)

SLOTS = ("name", "phone", "service", "date", "time")


def _pack_strings(key: str) -> List[str]:
    """Every language pack's list for `key` (ai/locales/lexicon/<code>.json). A caller may switch language mid-call, so all
    packs count, never only the caller's current one."""
    return [w for code in lexicon_languages() for w in (load_lexicon(code).get(key) or [])]


@lru_cache(maxsize=None)
def _asks() -> Dict[str, Optional[Pattern[str]]]:
    """How a sentence of ours asks for each slot, from the packs' "slot_asks" (regex lists, one per language)."""
    out: Dict[str, Optional[Pattern[str]]] = {}
    for slot in SLOTS:
        patterns = [p for code in lexicon_languages() for p in ((load_lexicon(code).get("slot_asks") or {}).get(slot) or [])]
        out[slot] = re.compile("|".join(f"(?:{p})" for p in patterns), re.IGNORECASE) if patterns else None
    return out


@lru_cache(maxsize=None)
def _imperative() -> Optional[Pattern[str]]:
    """A request for the caller's information ("tell me", "bata do"): counts as asking even without a question mark."""
    patterns = _pack_strings("imperative")
    return re.compile("|".join(f"(?:{p})" for p in patterns), re.IGNORECASE) if patterns else None


@lru_cache(maxsize=None)
def _fluff() -> Set[str]:
    """Politeness words that carry no meaning for "is this the same question again" ("please tell me your name" == "name?")."""
    return {w.lower() for w in _pack_strings("fluff")}


_WORD = re.compile(r"[\wऀ-ॿ]+", re.UNICODE)


def _controller_note() -> str:
    return load_prompts("engine_notes")["controller_note"]


def _multi_note() -> str:
    return load_prompts("engine_notes")["multi_note"]


@lru_cache(maxsize=None)
def _hesitation() -> Tuple[Set[str], Set[str], Set[str]]:
    """(start, extra, filler) word sets for a caller who is only buying time ("ruko...", "wait", "ek second", "hmm"), from the
    packs' hesitation_* lists. Answered with a nod, never with the questionnaire."""
    return (set(_pack_strings("hesitation_start")), set(_pack_strings("hesitation_extra")), set(_pack_strings("hesitation_filler")))


def content_words(text: str) -> Set[str]:
    return {w for w in (m.lower() for m in _WORD.findall(text or "")) if w not in _fluff()}


def _repeat_note() -> str:
    return load_prompts("engine_notes")["repeat_note"]


class SentenceDeduper:
    """One per turn. A sentence that means the same as one already produced this turn (after dropping politeness words) is
    dropped, so a retry or a second tool round cannot make the caller hear the same question twice."""

    def __init__(self, threshold: float = 0.75) -> None:
        self.threshold = threshold
        self._seen: List[Set[str]] = []

    def is_dup(self, sentence: str) -> bool:
        words = content_words(sentence)
        if not words:
            return False
        for prev in self._seen:
            if len(words & prev) / len(words | prev) >= self.threshold:
                return True
        self._seen.append(words)
        return False


@dataclass
class CallState:
    services: List[str] = field(default_factory=list)  # the clinic's service titles, to recognise one in the caller's words
    caller_name: Optional[str] = None
    phone: Optional[str] = None  # digits the caller stated, or "calling number" once they agreed to use it
    intent: Optional[str] = None  # "book" | "change" | None
    service: Optional[str] = None
    day: Optional[date] = None
    when: Optional[Any] = None  # datetime.time
    language: Optional[str] = None
    emotion: Optional[str] = None
    last_user_turn: str = ""
    last_ai_turn: str = ""
    caller_words: int = 0  # length of the caller's latest message
    booked: bool = False

    # ------------------------------------------------------------------ reading the caller
    def observe(self, utterance: str, today: date, language: Optional[str] = None, emotion: Optional[str] = None,
                calling_number_ok: bool = False) -> None:
        text = utterance or ""
        roman = normalize(text)
        self.last_user_turn = text
        self.caller_words = len(text.split())
        self.language = language or self.language
        self.emotion = emotion
        if BOOKING_INTENT.search(text) or BOOKING_INTENT.search(roman):
            self.intent = "book"
        if _CHANGE.search(text) or _CHANGE.search(roman):
            self.intent = "change"
        for source in (text, roman):
            if name := self._name_in(source):
                self.caller_name = name
                break
        digits = "".join(_PHONE_DIGITS.findall(roman))
        if len(digits) >= 10:
            self.phone = digits[-10:]
        elif calling_number_ok and not self.phone:
            self.phone = "calling number"
        if svc := self._service_in(roman):
            self.service = svc
        days = dates_in(roman, today)
        if days:
            self.day = sorted(days)[-1]  # the latest mention wins
        if (t := parse_time(roman)) is not None:
            self.when = t

    def observe_tools(self, calls: Iterable[Dict[str, Any]], succeeded: Iterable[str]) -> None:
        """What a tool call carried is as good as what the caller said (the model only passes what it was told)."""
        for c in calls or []:
            args = c.get("args") or {}
            if args.get("patient_name") and not self.caller_name:
                self.caller_name = str(args["patient_name"])
            if args.get("service_name") and not self.service:
                self.service = str(args["service_name"])
        self.booked = bool({"book", "book_appointment"} & set(succeeded or []))

    def observe_reply(self, reply: str) -> None:
        self.last_ai_turn = reply or ""

    @staticmethod
    def _name_in(text: str) -> Optional[str]:
        for rx in (_NAME_EXPLICIT, _NAME_WEAK):
            m = rx.search(text)
            if not m:
                continue
            words = [w for w in m.group(1).split() if w.lower().strip(".'-") not in _NOT_NAMES]
            if words:
                return " ".join(w.capitalize() for w in words[:2])
        return None

    def _service_in(self, roman: str) -> Optional[str]:
        low = roman.lower()
        best, best_hits = None, 0
        for title in self.services:
            tokens = [t for t in re.findall(r"[a-z]{4,}", title.lower()) if t not in ("consultation", "appointment", "service", "treatment", "visit")]
            hits = sum(1 for t in tokens if t in low) or (1 if title.lower() in low else 0)
            if hits > best_hits:
                best, best_hits = title, hits
        return best

    # ------------------------------------------------------------------ what is known / needed
    def known(self) -> Dict[str, str]:
        out: Dict[str, str] = {}
        if self.service:
            out["service"] = self.service
        if self.day:
            out["date"] = self.day.isoformat()
        if self.when:
            out["time"] = self.when.strftime("%I:%M %p")
        if self.caller_name:
            out["name"] = self.caller_name
        if self.phone:
            out["phone"] = self.phone
        return out

    def missing(self) -> List[str]:
        if self.intent != "book" or self.booked:
            return []
        known = self.known()
        return [s for s in SLOT_ORDER if s not in known]

    def next_needed(self) -> Optional[str]:
        miss = self.missing()
        return miss[0] if miss else None

    def note(self) -> Optional[str]:
        """The short, code-derived reminder for the model. None when there is nothing useful to say."""
        known = self.known()
        if not known and not self.intent and not self.emotion:
            return None
        nxt = self.next_needed()
        brevity = (
            "The caller is brief: answer in one short sentence."
            if self.caller_words and self.caller_words <= 4
            else "Keep it to one or two short sentences unless the caller asked for detail."
        )
        return _controller_note().format(
            known=", ".join(f"{k}={v}" for k, v in known.items()) or "nothing yet",
            next=(f"ask only for {nxt}, in one short question" if nxt else "nothing is missing for a booking; move to confirm or answer what was asked"),
            brevity=brevity,
        )

    # ------------------------------------------------------------------ hesitation
    def is_hesitation(self, utterance: str) -> bool:
        """The caller is only buying time: "ruko", "wait", "ek second", "रुको मेरे को ना...". Short, no digits, and not a
        request, a service, a name, a day or a time. The agent answers with a nod instead of repeating its questions."""
        words = [w.lower() for w in _WORD.findall(utterance or "")]
        if not words or len(words) > 5 or any(ch.isdigit() for ch in utterance):
            return False
        start, extra, filler = _hesitation()
        allowed = start | filler | extra
        if not all(w in allowed for w in words):  # "just wanted to ask about timings" is a real question, not a pause
            return False
        roman = normalize(utterance)
        return not (BOOKING_INTENT.search(utterance) or BOOKING_INTENT.search(roman) or self._service_in(roman) or self._name_in(utterance))

    # ------------------------------------------------------------------ one question per turn
    def slots_asked(self, sentence: str) -> Set[str]:
        """Every slot this sentence asks the caller for ("your full name and phone number?" -> {name, phone})."""
        s = sentence or ""
        if "?" not in s and "？" not in s and not (_imperative() and _imperative().search(s)):
            return set()
        return {slot for slot, rx in _asks().items() if rx and rx.search(s)}

    def separate_asks(self, sentence: str) -> Set[str]:
        """The slots this sentence asks for as separate questions. "Which day and time suit you?" is one question (when), not
        two: blocking it cost a second LLM round and stacked the regenerated reply on what was already said."""
        asked = self.slots_asked(sentence)
        return asked - {"time"} if {"date", "time"} <= asked else asked

    def multi_correction(self, slots: Iterable[str]) -> str:
        return _multi_note().format(slots=", ".join(sorted(set(slots))))

    # ------------------------------------------------------------------ repeated questions
    def repeat_ask(self, sentence: str) -> Optional[str]:
        """The slot this sentence asks the caller for again, if the caller already gave it. A sentence that says the known value
        back to the caller ("Is your name Rohan?") is a confirmation, not a repeat."""
        s = sentence or ""
        if "?" not in s and "？" not in s and not (_imperative() and _imperative().search(s)):
            return None
        known = self.known()
        low = s.lower()
        for slot, rx in _asks().items():
            if slot not in known or not rx or not rx.search(s):
                continue
            value = known[slot].lower()
            if slot == "phone":
                if known[slot] == "calling number" or value[-4:] in re.sub(r"\D", "", low) or "calling" in low:
                    continue
            elif slot in ("date", "time"):
                continue  # never flagged: "that day is full, which day instead?" is a legitimate second ask of a known slot
            elif value in low:
                continue
            return slot
        return None

    def repeat_correction(self, slots: Iterable[str]) -> str:
        known = self.known()
        return _repeat_note().format(
            slots=", ".join(sorted(set(slots))),
            known=", ".join(f"{k}={v}" for k, v in known.items()),
        )
