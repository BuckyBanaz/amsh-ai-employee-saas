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
from typing import Any, Dict, Iterable, List, Optional, Set

from backend.ai.engine.agent.datetime_utils import dates_in, parse_time
from backend.ai.engine.agent.hindi import normalize
from backend.ai.engine.agent.progress import _INTENT as BOOKING_INTENT
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

# --- what a sentence of ours is asking for ------------------------------------------------------------------------
_ASKS = {
    "name": re.compile(r"\b(?:your|ur)\s+(?:full\s+|good\s+)?name\b|\bmay\s+i\s+(?:have|get|know)\b.*\bname\b|\bwho\s+am\s+i\s+speaking|आपका\s+(?:पूरा\s+|शुभ\s+)?नाम|अपना\s+(?:पूरा\s+)?नाम|नाम\s+(?:बता|क्या|कहिए)|\baapka\s+(?:poora\s+)?naam|\bapna\s+(?:poora\s+)?naam|\bnaam\s+(?:bata|kya)", re.IGNORECASE),
    "phone": re.compile(r"\b(?:phone|mobile|contact|cell)\s*(?:number|no)\b|\bnumber\b.*\b(?:you|your|aap)\b|फ़?ोन\s*नंबर|मोबाइल\s*नंबर|संपर्क\s*नंबर|\b(?:phone|mobile)\s+(?:number|no)\b|\bnumber\s+(?:bata|de)", re.IGNORECASE),
    "service": re.compile(r"\bwhich\s+(?:service|treatment|kind|type)\b|\bwhat\s+(?:service|treatment|kind|type)\b|\bwhat\b.*\b(?:visit|appointment)\s+for\b|कौन\s*सी\s+(?:सर्विस|सेवा)|किस\s+(?:सर्विस|सेवा|काम)|\bkaun\s*si\s+service\b|\bkis\s+(?:service|liye)\b", re.IGNORECASE),
    "date": re.compile(r"\bwhich\s+(?:day|date)\b|\bwhat\s+(?:day|date)\b|\bwhen\s+would\s+you\b|\bkis\s+din\b|\bkaun\s*se\s+din\b|कौन\s*से\s+दिन|किस\s+(?:दिन|तारीख)|कब\s+आना", re.IGNORECASE),
    "time": re.compile(r"\bwhat\s+time\b|\bwhich\s+time\b|\bpreferred\s+time\b|\bkis\s+time\b|\bkitne\s+baje\b|कितने\s+बजे|किस\s+समय|कौन\s*सा\s+समय", re.IGNORECASE),
}
_IMPERATIVE = re.compile(r"बता\s+दीजिए|बता\s+दीजिये|बता\s+दें|बता\s+दो|bata\s+dijiye|bata\s+dein|bata\s+do|बताइए|बताएं|बताईये|बताइये|दीजिए|दीजिये|कहिए|batayiye|bataiye|bataye|batao|dijiye|please\s+(?:tell|share|give|provide)|let\s+me\s+know", re.IGNORECASE)

# Words that carry no meaning for "is this the same question again" ("please tell me your name" == "name?").
_FLUFF = {
    "please", "kindly", "kripya", "कृपया", "your", "ur", "आपका", "अपना", "आप", "आपके", "aapka", "apna", "aap", "you", "the", "a", "an",
    "can", "could", "would", "may", "i", "me", "ji", "जी", "बताइए", "बताएं", "बताइये", "बताईये", "bataiye", "batayiye", "bataye",
    "batao", "tell", "share", "provide", "give", "kahiye", "कहिए", "है", "hai", "kya", "क्या", "to", "so", "and", "also", "full", "poora", "पूरा",
    "what", "is", "are", "do", "does", "may", "have", "get", "know", "sure", "okay", "ok", "great", "thanks", "thank", "got", "it",
}
_WORD = re.compile(r"[\wऀ-ॿ]+", re.UNICODE)


def _controller_note() -> str:
    return load_prompts("engine_notes")["controller_note"]


def _multi_note() -> str:
    return load_prompts("engine_notes")["multi_note"]


# A caller who is only buying time ("ruko...", "wait", "ek second", "hmm"): answer with a nod, never with the questionnaire.
_HESITATION_START = {
    "ruko", "ruk", "rukiye", "rukiyega", "ruko", "wait", "hold", "hmm", "hmmm", "um", "umm", "uh", "uhh", "ek", "one", "just", "let",
    "thehro", "ठहरो", "रुको", "रुकिए", "रुकिये", "रुकिएगा", "एक", "हम्म", "उम्म", "अरे", "सोचने",
}
_HESITATION_EXTRA = {"a", "on", "me", "think", "moment", "the", "bit", "hang", "give", "thoda", "थोड़ा", "ठहर", "sochne", "do", "दो"}
_HESITATION_FILLER = {"मेरे", "को", "ना", "मतलब", "वो", "वह", "यार", "ji", "जी", "zara", "ज़रा", "जरा", "please", "plz", "मुझे", "अच्छा", "तो", "ek", "second", "sec", "minute", "min", "moment", "सेकंड", "मिनट", "पल", "bas", "बस", "mere", "ko", "na", "matlab", "yaar"}


def content_words(text: str) -> Set[str]:
    return {w for w in (m.lower() for m in _WORD.findall(text or "")) if w not in _FLUFF}


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
        allowed = _HESITATION_START | _HESITATION_FILLER | _HESITATION_EXTRA
        if not all(w in allowed for w in words):  # "just wanted to ask about timings" is a real question, not a pause
            return False
        roman = normalize(utterance)
        return not (BOOKING_INTENT.search(utterance) or BOOKING_INTENT.search(roman) or self._service_in(roman) or self._name_in(utterance))

    # ------------------------------------------------------------------ one question per turn
    def slots_asked(self, sentence: str) -> Set[str]:
        """Every slot this sentence asks the caller for ("your full name and phone number?" -> {name, phone})."""
        s = sentence or ""
        if "?" not in s and "？" not in s and not _IMPERATIVE.search(s):
            return set()
        return {slot for slot, rx in _ASKS.items() if rx.search(s)}

    def multi_correction(self, slots: Iterable[str]) -> str:
        return _multi_note().format(slots=", ".join(sorted(set(slots))))

    # ------------------------------------------------------------------ repeated questions
    def repeat_ask(self, sentence: str) -> Optional[str]:
        """The slot this sentence asks the caller for again, if the caller already gave it. A sentence that says the known value
        back to the caller ("Is your name Rohan?") is a confirmation, not a repeat."""
        s = sentence or ""
        if "?" not in s and "？" not in s and not _IMPERATIVE.search(s):
            return None
        known = self.known()
        low = s.lower()
        for slot, rx in _ASKS.items():
            if slot not in known or not rx.search(s):
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
