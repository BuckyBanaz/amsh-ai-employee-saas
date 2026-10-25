"""Per-turn voice latency instrumentation.

One `TurnLatency` per caller utterance. The gateway creates it when Deepgram delivers a final transcript and puts it in a
ContextVar; every layer below (agent loop, LLM backend, TTS client, telephony sender) calls `mark()` without any API
change, because asyncio tasks copy the context they were created in. When the turn ends the gateway calls `report()`,
which logs one structured JSON line (`[LATENCY] {...}`, easy to grep / ship to a log pipeline) and a readable table.

All times are milliseconds from the turn's origin: the caller's estimated end of speech when Deepgram gave word timings,
otherwise the moment the final transcript arrived. Marks from before the origin (the caller's speech start, the first
interim transcript) are negative. Only the first occurrence of each mark is kept; repeated events (several tool calls,
several LLM rounds, one TTS request per sentence) are also kept in order in `timeline`.

Turn 0 is the call's opening (recording notice + greeting), measured from the moment the call's media stream was accepted.
"Sent" marks are when audio was handed to the telephony socket, not when the caller heard it; what was actually played is
known only from the provider's mark echo ([PLAYOUT] log). Nothing here carries transcript text, audio, or caller details.
"""

import asyncio
import contextvars
import json
import logging
import time
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("backend.latency")

# Order of the readable report. Marks not reached in a turn are simply absent.
STAGES = (
    "call_accepted",  # turn 0 only
    "greeting_start",  # turn 0 only (after the recording notice, if any)
    "caller_speech_start",  # Deepgram SpeechStarted for this utterance
    "stt_first_interim",  # first transcript event (interim or final) for this utterance
    "speech_end",
    "deepgram_final",
    "llm_request_start",
    "llm_first_token",
    "llm_first_content",
    "llm_first_chunk",
    "tool_start",
    "tool_end",
    "tts_request_start",
    "tts_first_audio",
    "first_audio_sent_to_telephony",
    "barge_in_detected",
    "playback_clear_sent",
    "llm_stop_requested",
    "tts_cancel_sent",
    "turn_end",
)


class TurnLatency:
    def __init__(self, call_id: Optional[str], turn: int, origin: Optional[float] = None, clock=time.monotonic) -> None:
        self.call_id = call_id
        self.turn = turn
        self._clock = clock
        self.origin = origin if origin is not None else clock()
        self.marks: Dict[str, float] = {}
        self.timeline: List[Tuple[str, float, Dict[str, Any]]] = []
        self.info: Dict[str, Any] = {}
        self.closed = False

    def mark(self, name: str, at: Optional[float] = None, **data: Any) -> None:
        if self.closed:
            return
        ms = ((at if at is not None else self._clock()) - self.origin) * 1000.0
        self.marks.setdefault(name, ms)
        self.timeline.append((name, round(ms, 1), data))

    def ms(self, name: str) -> Optional[float]:
        v = self.marks.get(name)
        return None if v is None else round(v, 1)

    def summary(self) -> Dict[str, Any]:
        def gap(a: str, b: str) -> Optional[float]:
            x, y = self.marks.get(a), self.marks.get(b)
            return None if x is None or y is None else round(y - x, 1)

        out: Dict[str, Any] = {"call_id": self.call_id, "turn": self.turn}
        out["marks_ms"] = {k: self.ms(k) for k in STAGES if k in self.marks}
        # The derived stage costs that make the bottleneck obvious.
        out["stages_ms"] = {
            "stt_endpointing": gap("speech_end", "deepgram_final"),
            "pre_llm_processing": gap("deepgram_final", "llm_request_start"),
            "llm_ttft_any": gap("llm_request_start", "llm_first_token"),  # includes hidden reasoning tokens
            "llm_reasoning": gap("llm_first_token", "llm_first_content"),  # >0 means a reasoning model thought first
            "llm_first_content_to_chunk": gap("llm_first_content", "llm_first_chunk"),
            "chunk_to_tts_request": gap("llm_first_chunk", "tts_request_start"),
            "tts_ttfb": gap("tts_request_start", "tts_first_audio"),
            "tts_to_telephony": gap("tts_first_audio", "first_audio_sent_to_telephony"),
            "stt_interim_to_final": gap("stt_first_interim", "deepgram_final"),
            "llm_first_token_to_first_sentence": gap("llm_first_token", "llm_first_chunk"),
            "end_of_turn_to_first_audio_sent": gap("deepgram_final", "first_audio_sent_to_telephony"),
            "greeting_to_first_audio_sent": self._after("greeting_start", "first_audio_sent_to_telephony"),
            "barge_in_to_clear_sent": gap("barge_in_detected", "playback_clear_sent"),
            "barge_in_to_turn_end": gap("barge_in_detected", "turn_end"),  # the interrupted turn's model/tools have stopped
        }
        tools = [(n, ms, d) for n, ms, d in self.timeline if n in ("tool_start", "tool_end")]
        if tools:
            out["tools"] = tools
        if sentences := self.sentences():
            out["sentences"] = sentences
        attempts = [d.get("provider") for n, _, d in self.timeline if n == "llm_request_start"]
        if attempts:
            # One entry per LLM request: tool rounds, guard retries and provider fallbacks (429 -> next provider) all
            # show up here, and each one costs a full time-to-first-token.
            out["llm_rounds"] = len(attempts)
            out["llm_attempts"] = attempts
        out["perceived_ms"] = self.ms("first_audio_sent_to_telephony")
        out.update(self.info)
        return out

    def _after(self, a: str, b: str) -> Optional[float]:
        """ms from mark `a` to the first `b` that came after it (the notice's audio precedes the greeting's in turn 0)."""
        start = self.marks.get(a)
        if start is None:
            return None
        later = [ms for name, ms, _ in self.timeline if name == b and ms >= start]
        return round(later[0] - start, 1) if later else None

    def sentences(self) -> List[Dict[str, Any]]:
        """One entry per spoken sentence, in order (sentences are synthesised one at a time): when its TTS was requested,
        its first audio arrived (cached or not) and its first frame was sent. `queued_ms` is how much earlier audio was
        still queued for playback when that frame was sent; negative means the caller had about that much silence first
        (an estimate from frames sent, not from playback)."""
        out: List[Dict[str, Any]] = []
        for name, ms, data in self.timeline:
            if name == "tts_request_start":
                out.append({"tts_request_ms": ms, "chars": data.get("chars")})
            elif out and name == "tts_first_audio" and "tts_first_audio_ms" not in out[-1]:
                out[-1]["tts_first_audio_ms"] = ms
                out[-1]["cached"] = bool(data.get("cached"))
            elif out and name == "first_audio_sent_to_telephony" and "first_sent_ms" not in out[-1]:
                out[-1]["first_sent_ms"] = ms
                if data.get("queued_ms") is not None:
                    out[-1]["queued_ms"] = data["queued_ms"]
        return out

    def report(self) -> Dict[str, Any]:
        """Log once and freeze (late marks from a drained stream must not change a reported turn)."""
        self.mark("turn_end")
        self.closed = True
        s = self.summary()
        logger.info("[LATENCY] %s", json.dumps(s, default=str))
        lines = [f"⏱  LATENCY call={self.call_id} turn={self.turn}"]
        for k in STAGES:
            if k in self.marks:
                lines.append(f"   {k:<32}{self.ms(k):>9.0f} ms")
        if s.get("perceived_ms") is not None:
            lines.append(f"   {'TOTAL perceived (to first audio)':<32}{s['perceived_ms']:>9.0f} ms")
        print("\n".join(lines), flush=True)
        return s


_current: contextvars.ContextVar[Optional[TurnLatency]] = contextvars.ContextVar("voice_turn_latency", default=None)


def start_turn(tracker: Optional[TurnLatency]) -> contextvars.Token:
    return _current.set(tracker)


def end_turn(token: contextvars.Token) -> None:
    _current.reset(token)


def current() -> Optional[TurnLatency]:
    return _current.get()


def mark(name: str, **data: Any) -> None:
    """Record `name` on the current turn, if any. Free when no turn is being measured (dashboard, tests, WhatsApp)."""
    tracker = _current.get()
    if tracker is not None:
        tracker.mark(name, **data)


def create_detached_task(coro: Any) -> "asyncio.Task":
    """create_task() for background work (shadow mode, connection warm-ups) that must not add marks to the live turn.
    The task is created inside a copied context whose tracker is cleared (works on Python < 3.11, which lacks the
    `context=` argument)."""
    ctx = contextvars.copy_context()

    def _spawn() -> "asyncio.Task":
        _current.set(None)
        return asyncio.get_running_loop().create_task(coro)

    return ctx.run(_spawn)


def create_measured_task(coro: Any, tracker: Optional[TurnLatency]) -> "asyncio.Task":
    """create_task() whose marks go to `tracker` (the call's opening), without making it the creator's current turn."""
    ctx = contextvars.copy_context()

    def _spawn() -> "asyncio.Task":
        _current.set(tracker)
        return asyncio.get_running_loop().create_task(coro)

    return ctx.run(_spawn)
