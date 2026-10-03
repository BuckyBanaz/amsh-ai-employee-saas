"""LLM receptionist loop.

  caller text -> [safety gate: emergencies/human requests, no LLM] -> LLM (+tools, max 3 rounds) -> reply

The LLM writes every reply and decides when to call tools; the toolbox/validator decide what actually happens.
`stream=True` yields complete sentences as soon as they exist so TTS can start before the model finishes."""

import asyncio
import json
import logging
import re
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, AsyncIterator, Callable, Dict, List, Optional, Tuple

from backend.ai.capabilities.skills.emotional_tone import Sentiment, detect_sentiment
from backend.ai.engine.agent.facts import DEFAULT_TRIGGERS, disabled_capabilities
from backend.ai.engine.agent.grounding import CLAIM_NOTE, GUARD_NOTE, is_reasoning_leak, unbacked_claim, ungrounded
from backend.ai.capabilities.rules.safety_emergency import EmergencyRule
from backend.ai.engine.agent.emotion import EmotionState, parse_cues, tts_text
from backend.ai.engine.agent.fillers import choose_backchannel, wait_text
from backend.ai.engine.agent.language_layer import LanguageLayer
from backend.ai.lexicon import language_pack
from backend.ai.verticals.context import resolve_business_context
from backend.ai.engine.agent.progress import booking_note
from backend.ai.engine.agent.hindi import has_devanagari, hindi_escalation, looks_english, match_speaker_gender, normalize as normalize_hindi, requested_language
from backend.ai.engine.agent.validator import is_affirmative
from backend.ai.engine.agent.llm_backend import ChatBackend, LLMUnavailable
from backend.ai.engine.agent.prompt_builder import build_system_prompt
from backend.ai.engine.agent.toolbox import TOOL_SCHEMAS, AgentToolbox
from backend.ai.engine.agent.validator import ActionGate, BusinessFacts
from backend.ai.engine.agent.datetime_utils import local_now
from backend.ai.engine.conversation.i18n import language_code
from backend.ai.engine.conversation.i18n import t
from backend.ai.engine.guardrails.safety import SafetyGuardrails
from backend.ai.realtime import latency
from backend.ai.verticals.schemas import VerticalConfig

logger = logging.getLogger(__name__)

MAX_TOOL_ROUNDS = 3
# Tools safe to run side by side when the model asks for several in one round ("tomorrow or Friday?"). Only pure reads
# qualify: lookup_appointment assigns A1/A2 refs on the gate and search_knowledge may (re)build the index, so they stay
# sequential.
PARALLEL_SAFE_TOOLS = frozenset({"check_availability"})
MAX_HISTORY_TURNS = 8

_FALLBACK = {
    "en": "I'm sorry, I'm having trouble right now. Could you say that again, or would you like me to connect you to the front desk?",
    "hi": "Maaf kijiye, mujhe abhi thodi dikkat aa rahi hai. Kya aap dobara bol sakte hain, ya main aapko front desk se connect kar doon?",
}
_NO_TRANSFER = {
    "en": "I'm sorry, I can't connect you right now. Can I take a message for the front desk?",
    "hi": "Maaf kijiye, abhi main aapko connect nahi kar pa rahi hoon. Kya main front desk ke liye message le loon?",
}
_DEVANAGARI_NOTE = (
    "The caller's latest message is speech-to-text in Devanagari, which often writes English words phonetically "
    "(टुमारो = tomorrow, अपॉइंटमेंट = appointment). They are speaking Hindi/Hinglish: reply in Hindi written in Devanagari, "
    "keeping names and everyday English words (appointment, doctor, clinic) as they are. Do not switch to English."
)
_NUMBER_OFFER = re.compile(
    r"\b(?:same|this|current|calling\s+from)\s+(?:phone\s+|whatsapp\s+)?number\b|\b(?:calling|messaging|chatting)\s+from\b|\bisi\s+number\b|\bis\s+number\s+(?:pe|par)\b|इसी\s+नंबर|इस\s+नंबर",
    re.IGNORECASE,
)
_SAME_NUMBER = re.compile(
    r"\b(?:same|this|yahi|isi|is)\s+(?:whatsapp\s+)?number\b|\bcalling\s+from\b|इसी\s+नंबर|यही\s+नंबर|\bsame\s+wala\b", re.IGNORECASE
)
_ENGLISH_FILLER = re.compile(
    r"\s*(?:sure|great|okay|ok|alright|perfect|awesome|absolutely|got it|of course|no problem|right|cool|nice)[!.,\s]*", re.IGNORECASE
)
_EMOJI = re.compile("[\U0001F000-\U0001FAFF\u2600-\u27BF\uFE0F\u200d]")
_NO_REGREET_NOTE = (
    "You already started answering this turn before that correction; do not greet or acknowledge again "
    "(no new \"Sure\"/\"Got it\"/\"Right\"), just continue with the corrected content."
)
_LANGUAGE_RETRY_NOTE = (
    "Your draft reply was in English, but the caller is speaking Hindi. Write the whole reply again in Hindi (Devanagari if "
    "they wrote Devanagari), keeping only names and everyday English words like appointment or doctor. Do not switch to English."
)
_LANGUAGE_NOTE = {
    "hi": "The caller asked you to speak Hindi. Reply in Hindi for the rest of the call, even when their next message contains English words or names, until they ask for another language. Use Devanagari if they write Devanagari, otherwise Roman Hinglish.",
    "en": "The caller asked you to speak English. Reply in English for the rest of the call, even when their next message is transcribed in another script, until they ask for another language.",
}
def _scripted(table: Dict[str, str], key: str, language: str) -> str:
    """A fixed line the engine speaks itself (apology, transfer...). The base table has English and Hindi; every other language
    reads it from its pack (`strings.<key>`), so a new language needs no code; with neither, English."""
    code = (language or "en").split("-")[0].lower()
    return table.get(code) or (language_pack(code).get("strings") or {}).get(key) or table["en"]


def _language_note(code: str) -> str:
    """The system note for a language the caller asked for. Hindi and English keep their tuned notes; any other language is
    built from its pack (name + style guidance), or just its name when it has no pack."""
    if code in _LANGUAGE_NOTE:
        return _LANGUAGE_NOTE[code]
    pack = language_pack(code)
    name = pack.get("name") or code
    note = (f"The caller asked you to speak {name}. Reply in {name} for the rest of the call, even when their next message is transcribed "
            "in another script or contains words from another language, until they ask for another language.")
    style = pack.get("style") or (f"Speak {name} the way a native speaker does on the phone: real everyday filler words, acknowledgements and "
                                 "politeness forms of that language (never translate English fillers word for word).")
    return f"{note} {style}"


_HINDI_EMERGENCY_MSG = {
    True: "Yeh emergency lag rahi hai. Main aapko turant emergency coordinator se connect kar rahi hoon. Agar aap khatre mein hain toh abhi emergency services ko call kijiye.",
    False: "This sounds like an emergency. I am transferring you to an emergency care coordinator immediately. If you are in immediate danger, please dial emergency services right now.",
}
_BILLING = re.compile(r"\b(refunds?|billing|invoice|charged\s+twice|overcharg\w*|chargeback|dispute|bill\s+(?:is\s+)?wrong)\b", re.IGNORECASE)
_BILLING_MSG = {
    "en": "Billing and refunds are handled by our front desk team. Let me connect you right away.",
    "hi": "Billing aur refund front desk team dekhti hai. Main abhi aapko connect karti hoon.",
}
_FRUSTRATED_MSG = {
    "en": "I'm really sorry about the trouble. Let me connect you to someone at our front desk right away.",
    "hi": "Takleef ke liye mujhe bahut khed hai. Main abhi aapko front desk se connect karti hoon.",
}
_UNSURE_CLAIM = {
    "en": "Let me just double-check that with you first. Could you confirm the details once more?",
    "hi": "Ek baar main aapse details dobara confirm kar loon. Kya aap phir se bata sakte hain?",
}
_UNSURE_TIMES = {
    "en": "Let me make sure I give you the right time. Which day would suit you?",
    "hi": "Main sahi samay bataungi. Aapko kaunsa din theek rahega?",
}
_ABBREVIATIONS = {"dr", "mr", "mrs", "ms", "st", "no", "vs"}


@dataclass
class AgentTurn:
    reply: str
    transferred: bool = False
    hangup: bool = False
    transfer_twiml: Optional[str] = None
    tools: List[Dict[str, Any]] = field(default_factory=list)
    latency_ms: int = 0
    first_sentence_ms: Optional[int] = None
    degraded: bool = False  # LLM unavailable this turn; the caller can fall back to another engine
    error: Optional[str] = None
    provider: Optional[str] = None  # which LLM answered this turn (groq / gemini)
    language_mode: str = "english"  # english | hindi | hinglish (the session's mode after this turn)


class SentenceSplitter:
    """Cuts streamed text into speakable sentences (handles 'Dr.' and Hindi danda).

    LATENCY: with `early=True` the *first* piece of a reply may be released at a clause boundary (", " / "; " / ": " /
    " - ") instead of waiting for the sentence's full stop, so TTS starts while the model is still writing the rest:
    "Sure, I can help you with that appointment, | what's your name?" speaks the first clause ~one clause sooner.
    Only one early cut per splitter (one per LLM round): after that, audio is already playing and whole sentences sound
    more natural. An early cut is refused when it would weaken a guard or sound wrong:
      - fewer than `min_words` words (no choppy "Sure," / "Okay," TTS calls);
      - any digit or time word: invented-time grounding must see the whole sentence ("at 10, 11 or 2 PM");
      - the piece opens like a question: OneQuestion must still be able to hold / replace a question."""

    _END = re.compile(r"([.!?।])(\s+|(?=[A-Z]))")  # also splits glued sentences like "book?Sure thing!"
    _CLAUSE = re.compile(r"(?:[,;:]|\s[-–—])\s+")
    _NUMERIC = re.compile(
        r"\d|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|noon|midnight|o'?clock|am|pm|a\.m|p\.m|"
        r"half|quarter|baje|dedh|dhai|saade|sava|paune)\b|बजे",
        re.IGNORECASE,
    )
    _QUESTION_START = re.compile(
        r"^\W*(?:\[[^\]]*\]\s*)*(?:what|which|when|where|who|whom|whose|why|how|would|could|can|shall|should|may|do|does|did|"
        r"is|are|was|were|will|have|has|kya|kab|kaun|kis|kahan|kaise|kitn)\b",
        re.IGNORECASE,
    )

    def __init__(self, early: bool = False, min_words: int = 4) -> None:
        self.buf = ""
        self.early = early
        self.min_words = min_words
        self._emitted = False  # early cuts only apply before anything was emitted by this splitter

    def feed(self, delta: str) -> List[str]:
        self.buf += delta
        out: List[str] = []
        pos = 0
        for m in self._END.finditer(self.buf):
            head = self.buf[pos : m.end(1)]
            last_word = re.findall(r"[A-Za-z]+", head)[-1:] or [""]
            if m[1] == "." and last_word[0].lower() in _ABBREVIATIONS:
                continue
            out.append(head.strip())
            pos = m.end()
        self.buf = self.buf[pos:]
        if self.early and not self._emitted and not out:
            out.extend(self._early_clause())
        out = [s for s in out if s]
        if out:
            self._emitted = True
        return out

    def _early_clause(self) -> List[str]:
        """The first clause at the head of the buffer that is long enough and safe, or nothing (keep waiting)."""
        cut = None
        for m in self._CLAUSE.finditer(self.buf):
            head = self.buf[: m.start() + 1].strip() if self.buf[m.start()] in ",;:" else self.buf[: m.start()].strip()
            if len(head.split()) < self.min_words:
                continue
            if self._NUMERIC.search(head) or self._QUESTION_START.search(head):
                return []  # the sentence carries a time/number or is a question: wait for the full sentence
            cut = (head, m.end())
            break  # the first clause that is long enough: speak as early as possible
        if not cut:
            return []
        head, end = cut
        self.buf = self.buf[end:]
        return [head]

    def flush(self) -> List[str]:
        rest, self.buf = self.buf.strip(), ""
        return [rest] if rest else []


class OneQuestion:
    """A phone receptionist asks one question at a time. Models sometimes emit a draft question and then a
    rephrased one in the same reply ("What service?" ... "Sure! Which service are you after?"): keep only the last.
    Statements are spoken immediately; the latest question is held and spoken last (a question ends a turn)."""

    def __init__(self) -> None:
        self.held: Optional[str] = None

    def feed(self, sentence: str) -> List[str]:
        if sentence.rstrip().endswith("?"):
            self.held = sentence  # replaces any earlier question in this reply
            return []
        return [sentence]

    def flush(self) -> List[str]:
        out = [self.held] if self.held else []
        self.held = None
        return out


_ZERO_WIDTH = re.compile("[​‌‍⁠﻿]")


def clean_for_speech(text: str) -> str:
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
    if _ZERO_WIDTH.search(text):
        # A model glitch (seen on gpt-oss after a rate-limit fallback): "Your <zero-width burst> … … Your appointment…".
        # `\s` does not match zero-width spaces, so strip them, then the stray ellipses and the restarted first word.
        text = _ZERO_WIDTH.sub("", text)
        text = re.sub(r"(?:\s*(?:…|\.{3}))+(?=\s|$)", "", text)
        text = re.sub(r"\b(\w+)(?:\s+\1\b)+", r"\1", text, flags=re.IGNORECASE)
    text = _EMOJI.sub("", text)  # a voice would read them out or stumble
    text = re.sub(r"[*#`_~]+", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    # Some models leak their reasoning into the reply ("... We need to respond confirming."): never speak that.
    sentences = re.split(r"(?<=[.!?…।])\s+", text)
    return " ".join(s for s in sentences if not is_reasoning_leak(s)).strip()


class AgentEngine:
    def __init__(
        self,
        business_id: str,
        caller_number: str,
        call_id: Optional[str],
        facts: BusinessFacts,
        vertical_config: VerticalConfig,
        backend: ChatBackend,
        db_factory: Callable[[], Any],
        agent_name: str = "Aura",
        language: str = "en",
        tone: Optional[str] = None,
        gender: Optional[str] = None,
        now_fn: Optional[Callable[[], datetime]] = None,
        dry_run: bool = False,
        instructions: Optional[str] = None,
        small_talk: bool = True,
        require_confirmation: bool = True,
        capabilities: Optional[Dict[str, bool]] = None,
        triggers: Optional[Dict[str, bool]] = None,
        transfer_phone: Optional[str] = None,
        languages: Optional[List[str]] = None,
        auto_detect_language: bool = True,
        channel: str = "voice",
        fillers: bool = False,
        accent: Optional[str] = None,
        early_chunking: bool = False,
    ) -> None:
        self.early_chunking = early_chunking  # streamed turns may release a safe first clause to TTS (SentenceSplitter)
        self.triggers = {**DEFAULT_TRIGGERS, **(triggers or {})}  # Escalation tab checklist
        self.frustrated_turns = 0
        self.language_pref: Optional[str] = None  # set when the caller asks to switch language
        # The authoritative runtime context: vertical, language, accent, region (from the country), timezone. Five independent
        # dimensions; raises MissingContextError rather than defaulting. Everything regional below reads it.
        self.context = resolve_business_context(facts, vertical_config, language, languages, auto_detect_language, accent)
        # Language conversation layer (engine/agent/language_layer.py): on by the tenant's LANGUAGE settings, never by region, and
        # inert for callers speaking another language. Booking, tools and state never depend on it.
        self.lang = LanguageLayer(enabled=self.context.policies.hindi_hinglish_layer)
        self.gender = gender
        self.fillers_on = fillers  # natural fillers ("hmm...", "one moment..."): spoken calls only, see agent/fillers.py
        self._last_filler_turn = -99
        self._wait_spoken = False
        self._ack_used: set = set()  # acknowledgement words ("sure", "got it"...) already said this turn, see _speech
        self.channel = channel  # "voice" (phone call, playground) or "chat" (WhatsApp text)
        self.emotion = EmotionState()  # the caller's mood and how the voice should react (agent/emotion.py)
        self._mood_note: Optional[str] = None
        self._cues: Dict[str, Tuple[Optional[str], bool]] = {}  # sentence -> (cue, laugh) the model asked for
        self._carry: Optional[Tuple[Optional[str], bool]] = None  # a cue that arrived alone, for the next sentence
        self._reply_started = False
        self._raw_said: List[str] = []  # caller utterances as heard (the toolbox keeps a Roman version for the guards)
        self.auto_detect_language = auto_detect_language
        self._devanagari_turn = False  # the caller's latest message is in Devanagari (speech-to-text output)
        self.facts = facts
        self.vertical_config = vertical_config
        self.backend = backend
        self.agent_name = agent_name
        self.language = language_code(language)
        self.dry_run = dry_run
        self.now_fn = now_fn or (lambda: local_now(facts.timezone))
        self.gate = ActionGate()
        disabled_tools, disabled_notes = disabled_capabilities(capabilities or {})
        self.tools = [s for s in TOOL_SCHEMAS if s["function"]["name"] not in disabled_tools]  # owner's switches
        self.toolbox = AgentToolbox(
            business_id, caller_number, call_id, facts, db_factory, self.gate, self.now_fn, dry_run,
            require_confirmation=require_confirmation, disabled_tools=disabled_tools, transfer_phone=transfer_phone,
        )
        self.toolbox.channel = channel
        self._system = build_system_prompt(
            facts, agent_name, self.now_fn(), caller_number, tone, gender,
            instructions=instructions, small_talk=small_talk, require_confirmation=require_confirmation, disabled=disabled_notes,
            primary_language=language, languages=languages, auto_detect_language=auto_detect_language, triggers=self.triggers,
            channel=channel, context=self.context,
        )
        if channel == "chat":  # a text chat has no call to transfer or hang up
            self.toolbox.disabled_tools |= {"transfer_to_human", "end_call"}
            self.tools = [s for s in self.tools if s["function"]["name"] not in self.toolbox.disabled_tools]
        self._turns: List[List[Dict[str, Any]]] = []  # one message group per caller turn (keeps tool pairs intact)
        self.ended = False

    # ------------------------------------------------------------------ public API
    def greeting(self, override: Optional[str] = None) -> str:
        text = override or t(self.language, "greeting", business_name=self.facts.name)
        self._turns.append([{"role": "assistant", "content": text}])
        return text

    def set_patient_context(self, text: str) -> None:
        """Add what the clinic's own records say about THIS caller (see rules/patient_privacy.py) to the system prompt."""
        if text:
            self._system = self._system + "\n" + text

    def restore(self, turns: List[Tuple[str, str]]) -> None:
        """Rebuild the conversation from (caller, agent) pairs saved earlier, after the server restarted mid-call (a code
        reload drops in-memory sessions). Brings back what the model remembers, the language the caller asked for and the
        words the booking guards check against. A half-finished confirmation is not restored: the agent simply asks again."""
        for said, replied in turns:
            self._turns.append([{"role": "user", "content": said}, {"role": "assistant", "content": replied}])
            roman = normalize_hindi(said)
            self.toolbox.said.append(roman)
            self._raw_said.append(said)
            self.toolbox.last_utterance = roman
            self.toolbox.last_assistant = replied
            self.gate.turn += 1
            asked = requested_language(said) or requested_language(roman)
            if asked:
                self.language_pref = asked
            self.lang.observe(said, roman, asked, self.auto_detect_language)

    async def turn(self, utterance: str) -> AgentTurn:
        final: Optional[AgentTurn] = None
        async for event in self.turn_events(utterance, stream=False):
            if event["type"] == "done":
                final = event["turn"]
        assert final is not None
        return final

    async def turn_events(self, utterance: str, stream: bool = True) -> AsyncIterator[Dict[str, Any]]:
        """Yields {"type": "sentence", "text"} as replies form, then {"type": "done", "turn": AgentTurn}."""
        started = time.perf_counter()
        self.gate.turn += 1
        self._mood_note = self.emotion.hear(utterance)
        self._reply_started = False
        self._wait_spoken = False
        self._ack_used = set()
        asked = requested_language(utterance) or requested_language(normalize_hindi(utterance))
        if asked:
            self.language_pref = asked  # remembered for the rest of the call, until they ask for another language
        roman = normalize_hindi(utterance)  # Devanagari -> Roman approximation, used by the code-side guards only
        self._devanagari_turn = has_devanagari(utterance)
        self.lang.observe(utterance, roman, asked, self.auto_detect_language)
        # The calling number may be used only once the caller agrees: they say "same number", or say yes to our offer.
        if _SAME_NUMBER.search(roman) or (is_affirmative(roman) and self._offered_calling_number()):
            self.toolbox.caller_number_ok = True
        self.toolbox.last_utterance = roman
        self.toolbox.said.append(roman)
        self._raw_said.append(utterance)
        first_ms: Optional[int] = None
        spoken: List[str] = []
        group: List[Dict[str, Any]] = [{"role": "user", "content": utterance}]

        def elapsed() -> int:
            return int((time.perf_counter() - started) * 1000)

        # 1. Deterministic safety gate: emergencies and "I want a human" never wait for the LLM.
        # Which triggers fire is the owner's Escalation-tab checklist. Emergencies always fire (patient safety).
        escalated, esc_msg, target = SafetyGuardrails.check_escalation(utterance, self.vertical_config)
        if not escalated and (hindi := hindi_escalation(utterance)):  # Hindi / Devanagari cues the English rules miss
            escalated, target = True, hindi
            esc_msg = _HINDI_EMERGENCY_MSG[self.language == "hi"] if hindi == "emergency" else None
        if not escalated and (emergency := EmergencyRule.evaluate(utterance, self.context.emergency_numbers))[0]:  # capabilities/rules: English + Hindi, whole phrases
            escalated, target = True, "emergency"
            esc_msg = _HINDI_EMERGENCY_MSG[self.language == "hi"] if has_devanagari(utterance) else emergency[1]
        transfers_on = "transfer_to_human" not in self.toolbox.disabled_tools
        if escalated and (target or "front_desk") != "emergency" and not (transfers_on and self.triggers["human_request"]):
            escalated = False  # trigger off or transfers off: a human request goes to the LLM, which will decline
        if not escalated and transfers_on and self.triggers["complex_billing"] and _BILLING.search(utterance):
            escalated, target = True, "front_desk"
            esc_msg = _scripted(_BILLING_MSG, "billing", self.active_language)
        if not escalated and transfers_on and self.triggers["frustration"]:
            self.frustrated_turns = self.frustrated_turns + 1 if detect_sentiment(utterance) == Sentiment.FRUSTRATED else 0
            if self.frustrated_turns >= 2:  # same rule as the legacy engine: two upset turns in a row
                escalated, target = True, "front_desk"
                esc_msg = _scripted(_FRUSTRATED_MSG, "frustrated", self.active_language)
        if escalated:
            department = target or "front_desk"
            if self.dry_run or self.channel == "chat":  # chat: reply with the message, nothing to redirect
                self.toolbox.pending = {"type": "transfer", "department": department, "twiml": None, "dry_run": True}
                result: Dict[str, Any] = {"ok": True}
            else:
                result = await self.toolbox.transfer(department, f"Safety escalation: {utterance}")
            reply = esc_msg or t(self.active_language, "transfer_generic")
            if not result.get("ok") and department != "emergency":
                reply = _scripted(_NO_TRANSFER, "no_transfer", self.active_language)
            group.append({"role": "assistant", "content": reply})
            self._commit(group)
            yield {"type": "sentence", "text": reply}
            yield {"type": "done", "turn": self._result(reply, started, tools=[{"tool": "transfer_to_human", "via": "safety_gate"}], first_ms=elapsed())}
            return

        # 2. LLM + tool rounds
        degraded = False
        error: Optional[str] = None
        reply = ""
        guard_notes: List[str] = []  # one-shot corrections after the grounding guard blocked an invented time
        round_no = 0
        lang_state = {"retried": False}  # the wrong-language guard corrects once per turn, then lets the reply through
        try:
            while round_no <= MAX_TOOL_ROUNDS:
                use_tools = round_no < MAX_TOOL_ROUNDS
                messages = self._messages(group) + [{"role": "system", "content": n} for n in guard_notes]
                tools = self.tools if use_tools else []
                content, calls = "", []
                invented: List[str] = []

                def check(sentence: str) -> bool:
                    """True if speakable. Records an invented time, or a claim that an action is done which no tool
                    has confirmed (stored as 'claim:<kind>' in the same list, so the retry logic below is shared)."""
                    if not lang_state["retried"] and self._expects_hindi() and looks_english(sentence):
                        invented.append("lang:hi")
                        return False
                    bad = ungrounded(sentence, messages_for_guard())
                    claim = unbacked_claim(sentence, self.toolbox.succeeded)
                    invented.extend(bad)
                    if claim:
                        invented.append(f"claim:{claim}")
                    return not bad and not claim

                def messages_for_guard() -> List[Dict[str, Any]]:
                    return self._messages(group)

                one_q = OneQuestion()
                splitter = SentenceSplitter(early=self.early_chunking and stream)

                if stream:
                    event_stream = self.backend.chat_stream(messages, tools)
                    try:
                        async for ev in event_stream:
                            if ev["type"] == "text":
                                for sentence in splitter.feed(ev["delta"]):
                                    sentence = self._speech(sentence)
                                    if not sentence:
                                        continue
                                    if not check(sentence):
                                        break
                                    sentence = self._dedupe_ack(sentence)
                                    if not sentence:
                                        continue
                                    for out in one_q.feed(sentence):
                                        first_ms = first_ms if first_ms is not None else elapsed()
                                        event = self._sentence_event(out)
                                        spoken.append(event["text"])
                                        yield event
                                if invented:
                                    break
                            else:
                                content, calls = ev["content"] or "", ev["tool_calls"]
                    finally:
                        close = getattr(event_stream, "aclose", None)
                        if close and invented:
                            await close()
                    tail = [] if invented else splitter.flush()
                else:
                    resp = await self.backend.chat(messages, tools)
                    content, calls = resp["content"] or "", resp["tool_calls"]
                    text = self._speech(content)
                    tail = [] if (calls or not text) else splitter.feed(text + " ") + splitter.flush()

                for sentence in tail:
                    sentence = self._speech(sentence)
                    if not sentence:
                        continue
                    if not check(sentence):
                        break
                    sentence = self._dedupe_ack(sentence)
                    if not sentence:
                        continue
                    for out in one_q.feed(sentence):
                        first_ms = first_ms if first_ms is not None else elapsed()
                        event = self._sentence_event(out)
                        spoken.append(event["text"])
                        yield event
                if not invented:
                    for out in one_q.flush():  # a trailing question is released once nothing newer replaces it
                        first_ms = first_ms if first_ms is not None else elapsed()
                        event = self._sentence_event(out)
                        spoken.append(event["text"])
                        yield event

                if invented and all(x == "lang:hi" for x in invented):
                    logger.warning("Guard blocked an English reply to a Hindi-speaking caller")
                    lang_state["retried"] = True
                    if spoken:
                        guard_notes.append(_NO_REGREET_NOTE)
                    guard_notes.append(_LANGUAGE_RETRY_NOTE)
                    continue
                invented[:] = [x for x in invented if x != "lang:hi"]
                if invented:
                    times = sorted({x for x in invented if not x.startswith("claim:")})
                    claimed = sorted({x[6:] for x in invented if x.startswith("claim:")})
                    logger.warning("Guard blocked a reply: invented time(s)=%s unbacked claim(s)=%s", times, claimed)
                    if guard_notes:  # the model repeated the mistake after a correction: say something safe instead
                        table = _UNSURE_CLAIM if claimed else _UNSURE_TIMES
                        safe = _scripted(table, "unsure_claim" if claimed else "unsure_times", self.active_language)
                        first_ms = first_ms if first_ms is not None else elapsed()
                        spoken.append(safe)
                        yield {"type": "sentence", "text": safe}
                        reply = " ".join(spoken)
                        break
                    notes = []
                    if times:
                        notes.append(GUARD_NOTE.format(times=", ".join(times)))
                    if claimed:
                        notes.append(CLAIM_NOTE.format(kinds="/".join({"book": "booked or confirmed", "cancel": "cancelled", "reschedule": "rescheduled"}[k] for k in claimed)))
                    if spoken:
                        notes.append(_NO_REGREET_NOTE)
                    guard_notes.append(" ".join(notes))
                    continue  # same round: regenerate with the correction; nothing wrong was spoken

                if calls and use_tools:
                    if self.fillers_on and not spoken and not any(c["name"] in ("end_call", "transfer_to_human") for c in calls):
                        # Say something now: the next model call takes a moment and silence sounds like a dropped call.
                        wait = wait_text(self._devanagari_turn or self.language_pref == "hi" or self.lang.active, language=self._pack_language())
                        first_ms = first_ms if first_ms is not None else elapsed()
                        spoken.append(wait)
                        self._wait_spoken = True
                        yield {"type": "sentence", "text": wait, "filler": True}
                    group.append(
                        {
                            "role": "assistant",
                            "content": content or None,
                            "tool_calls": [
                                {"id": c["id"], "type": "function", "function": {"name": c["name"], "arguments": c["arguments"]},
                                 **({"extra_content": c["extra_content"]} if c.get("extra_content") else {})}  # Gemini 3 thought_signature
                                for c in calls
                            ],
                        }
                    )
                    for c, result in zip(calls, await self._run_tools(calls)):
                        group.append({"role": "tool", "tool_call_id": c["id"], "content": json.dumps(result, default=str)})
                    round_no += 1
                    continue

                reply = " ".join(spoken)
                break
        except LLMUnavailable as e:
            logger.warning("Agent LLM unavailable: %s", e)
            degraded, error = True, str(e)[:160]

        if not reply.strip():
            reply = _scripted(_FALLBACK, "fallback", self.active_language)
            first_ms = first_ms if first_ms is not None else elapsed()
            if not spoken and not degraded:  # when degraded the caller decides (e.g. fall back to another engine)
                yield {"type": "sentence", "text": reply}
        group.append({"role": "assistant", "content": reply})
        self._commit(group)
        yield {"type": "done", "turn": self._result(reply, started, tools=list(self.toolbox.calls), first_ms=first_ms, degraded=degraded, error=error)}

    # ------------------------------------------------------------------ internals
    async def _run_tools(self, calls: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Execute one round's tool calls. LATENCY: when every call in the round is a pure availability read they run
        concurrently (each uses its own DB session in a worker thread), so checking two days costs one DB round trip
        of wall time. Anything that writes or changes call state (booking, cancel, transfer, end_call) keeps the
        original strict order, because the confirmation gate and idempotency checks depend on it."""
        async def one(c: Dict[str, Any]) -> Dict[str, Any]:
            latency.mark("tool_start", tool=c["name"])
            try:
                return await self.toolbox.execute(c["name"], c["arguments"])
            finally:
                latency.mark("tool_end", tool=c["name"])

        if len(calls) > 1 and all(c["name"] in PARALLEL_SAFE_TOOLS for c in calls):
            return list(await asyncio.gather(*(one(c) for c in calls)))
        return [await one(c) for c in calls]

    def _offered_calling_number(self) -> bool:
        """Did our last reply propose using the number the caller is calling from?"""
        last = self.toolbox.last_assistant or ""
        digits = re.sub(r"\D", "", last)
        tail = re.sub(r"\D", "", self.toolbox.caller_number or "")[-6:]
        return bool(_NUMBER_OFFER.search(last) or (tail and tail in digits))

    def _speech(self, text: str) -> str:
        """Cleaned text that is safe to speak, with Hindi first-person verb endings matched to the agent's gender. In a
        Hindi conversation a bare English interjection ("Sure!", "Great!") is dropped: it sounds like a different person."""
        text, cue, laugh = parse_cues(text)  # [warm] / [laugh] tags never reach the caller's ears or the transcript
        if self._carry and text.strip():
            cue, laugh = cue or self._carry[0], laugh or self._carry[1]
            self._carry = None
        out = match_speaker_gender(clean_for_speech(text), self.gender)
        if not out or (_ENGLISH_FILLER.fullmatch(out) and self._expects_hindi()):
            if cue or laugh:
                self._carry = (cue, laugh)
            return ""
        if cue or laugh:
            self._cues[out] = (cue, laugh)
        return out

    def _dedupe_ack(self, sentence: str) -> str:
        """A retry (the guard rejected a sentence and the model regenerated the round from scratch, or a new tool round
        started) tends to open with the same acknowledgement again ("Sure!", "Got it"). Only the first one per turn is
        kept; a repeat is stripped so the caller does not hear "Sure... Sure!... Got it..." stacked up. Called once per
        real sentence, after `_speech` and the grounding guard, so re-processing the same text twice (the non-streaming
        path runs `_speech` once on the whole reply, then again per split sentence) cannot double-count a word as used."""
        m = _ENGLISH_FILLER.match(sentence)
        if not m:
            return sentence
        key = re.sub(r"[^a-z]", "", m.group(0).lower())
        if key not in self._ack_used:
            self._ack_used.add(key)
            return sentence
        rest = sentence[m.end():].lstrip()
        cue = self._cues.pop(sentence, None)
        if rest and cue:
            self._cues[rest] = cue
        return rest

    def _sentence_event(self, sentence: str) -> Dict[str, Any]:
        """The sentence event for the voice layer: the words, plus how to say them (emotion, and a real laugh)."""
        cue, laugh = self._cues.pop(sentence, (None, False))
        emotion, laugh = self.emotion.direct(cue, laugh, first_in_reply=not self._reply_started)
        self._reply_started_before = self._reply_started
        self._reply_started = True
        if self.fillers_on and not self._reply_started_before and not self._wait_spoken:
            sound = choose_backchannel(
                self._raw_said[-1] if self._raw_said else "", sentence, self.emotion.mood, self.emotion.turn, self._last_filler_turn, self.emotion.turn,
                language=self._pack_language(),
            )
            if sound:
                sentence = f"{sound} {sentence}"
                self._last_filler_turn = self.emotion.turn
        event: Dict[str, Any] = {"type": "sentence", "text": sentence}
        if emotion:
            event["emotion"] = emotion
        if laugh:
            event["tts_text"] = tts_text(sentence, True)
        return event

    @property
    def active_language(self) -> str:
        """The language the agent speaks right now: what the caller asked for, else the tenant's primary language (/ai settings)."""
        return (self.language_pref or self.language or "en").split("-")[0].lower()

    def _pack_language(self) -> Optional[str]:
        """The active language when it is something other than Hindi/English (those keep their sentence-based handling)."""
        active = self.active_language
        return None if active in ("hi", "en") else active

    def _expects_hindi(self) -> bool:
        """The caller asked for Hindi, or is speaking Devanagari (speech-to-text output) and has not asked for English."""
        return self.language_pref == "hi" or (self._devanagari_turn and self.auto_detect_language and self.language_pref != "en")

    def _messages(self, group: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        history = [m for g in self._turns[-MAX_HISTORY_TURNS:] for m in g]
        messages = [{"role": "system", "content": self._system}, *history, *group]
        # Notes go last so the static prompt prefix stays identical between turns (better for provider prompt caching).
        if layer_note := self.lang.note(str(group[0].get("content") or ""), self.toolbox.last_assistant):
            messages.append({"role": "system", "content": layer_note})
        if self.language_pref:
            messages.append({"role": "system", "content": _language_note(self.language_pref)})
        elif self._devanagari_turn and self.auto_detect_language:
            messages.append({"role": "system", "content": _DEVANAGARI_NOTE})
        if self._mood_note:
            messages.append({"role": "system", "content": self._mood_note})
        if note := booking_note(self._raw_said, self.toolbox.succeeded, self.now_fn().date()):
            messages.append({"role": "system", "content": note})  # a half-finished booking must survive small talk
        return messages

    def _commit(self, group: List[Dict[str, Any]]) -> None:
        self._turns.append(group)
        last = group[-1]
        if last.get("role") == "assistant" and last.get("content"):
            self.toolbox.last_assistant = last["content"]  # what a caller's next "yes" would be agreeing to

    def _result(self, reply: str, started: float, tools: List[Dict[str, Any]], first_ms: Optional[int], degraded: bool = False, error: Optional[str] = None) -> AgentTurn:
        pending = self.toolbox.pending or {}
        if pending.get("type") == "hangup":
            self.ended = True
        return AgentTurn(
            reply=reply,
            transferred=pending.get("type") == "transfer",
            hangup=pending.get("type") == "hangup",
            transfer_twiml=pending.get("twiml"),
            tools=tools,
            latency_ms=int((time.perf_counter() - started) * 1000),
            first_sentence_ms=first_ms,
            degraded=degraded,
            error=error,
            provider=getattr(self.backend, "last_provider", None) or getattr(self.backend, "provider", None),
            language_mode=self.lang.mode.value,
        )
