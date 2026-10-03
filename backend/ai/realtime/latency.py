"""Per-turn voice latency instrumentation.

One `TurnLatency` per caller utterance. The gateway creates it when Deepgram delivers a final transcript and puts it in a
ContextVar; every layer below (agent loop, LLM backend, TTS client, telephony sender) calls `mark()` without any API
change, because asyncio tasks copy the context they were created in. When the turn ends the gateway calls `report()`,
which logs one structured JSON line (`[LATENCY] {...}`, easy to grep / ship to a log pipeline) and a readable table.

All times are milliseconds from the turn's origin: the caller's estimated end of speech when Deepgram gave word timings,
otherwise the moment the final transcript arrived. Only the first occurrence of each mark is kept; repeated events
(several tool calls, several LLM rounds) are also kept in order in `timeline`.
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
        }
        tools = [(n, ms, d) for n, ms, d in self.timeline if n in ("tool_start", "tool_end")]
        if tools:
            out["tools"] = tools
        attempts = [d.get("provider") for n, _, d in self.timeline if n == "llm_request_start"]
        if attempts:
            # One entry per LLM request: tool rounds, guard retries and provider fallbacks (429 -> next provider) all
            # show up here, and each one costs a full time-to-first-token.
            out["llm_rounds"] = len(attempts)
            out["llm_attempts"] = attempts
        out["perceived_ms"] = self.ms("first_audio_sent_to_telephony")
        out.update(self.info)
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
