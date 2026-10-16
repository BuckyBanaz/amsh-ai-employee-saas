"""
Barge-in monitor: decides from inbound audio energy when the caller is talking over the AI, and records why it did or
did not interrupt, so a missed interruption can be explained from the logs.

Why it calibrates per call. A fixed RMS threshold (1400) never fired on a real Indian mobile line: the caller's speech
there measured median ~300 / p90 ~1100-1300, longest run above 1400 was 11 frames (15 were required), so every
interruption waited for Deepgram's interim words. Levels differ per line, handset and network, so the threshold is
derived from this call's own audio:

* caller level: inbound frames while the AI is silent (the caller answering normally), above a fixed noise floor;
* echo level:   inbound frames while the AI is audible but barge-in is still blocked (greeting, grace window), i.e. what
                our own voice sounds like when it leaks back. Higher echo raises the threshold: it can never be lowered
                into the echo.

Until both are known the old fixed threshold applies, so behaviour only changes once the call has measured itself.
A sliding window ("10 of the last 20 frames") replaces "20 frames in a row": real speech dips between syllables, and a
single quiet frame used to reset the count. Language-independent: energy only, no words.
"""

import json
import logging
import time
from collections import deque
from typing import Any, Callable, Deque, Dict, Optional

logger = logging.getLogger(__name__)

DEFAULT_THRESHOLD = 1400  # the old fixed value; used until this call has measured caller and echo levels
FLOOR = 150  # absolute minimum: the measured line noise was ~6, so 150 is far above silence
CALLER_FRACTION = 0.5  # threshold = half the caller's typical (p75) speech level...
ECHO_MARGIN = 2.5  # ...but at least 2.5x the loudest typical echo of our own voice
WINDOW_FRAMES = 20  # 400 ms of 20 ms frames
NEED_FRAMES = 10  # loud frames within the window that count as the caller talking
MIN_CALLER_SAMPLES = 25  # 0.5 s of caller speech before the caller level is trusted
MIN_ECHO_SAMPLES = 25  # 0.5 s of blocked playback before the echo level is trusted


def _pct(values, p: float) -> float:
    s = sorted(values)
    return float(s[min(len(s) - 1, int(p * len(s)))]) if s else 0.0


class BargeInMonitor:
    def __init__(self, call_id: Optional[str] = None, clock: Callable[[], float] = time.monotonic) -> None:
        self.call_id = call_id
        self._clock = clock
        self._caller: Deque[int] = deque(maxlen=1500)  # last 30 s of the caller's own voiced frames
        self._echo: Deque[int] = deque(maxlen=1500)
        self._window: Deque[bool] = deque(maxlen=WINDOW_FRAMES)
        self._was_audible = False
        self._stats: Dict[str, Any] = {}
        self._reset_stats()

    # ------------------------------------------------------------------ calibration
    def threshold(self) -> int:
        if len(self._caller) < MIN_CALLER_SAMPLES or len(self._echo) < MIN_ECHO_SAMPLES:
            return DEFAULT_THRESHOLD
        t = max(CALLER_FRACTION * _pct(self._caller, 0.75), ECHO_MARGIN * _pct(self._echo, 0.9), FLOOR)
        return int(min(t, DEFAULT_THRESHOLD))

    # ------------------------------------------------------------------ per frame
    def frame(self, rms: int, audible: bool, blocked: Optional[str]) -> bool:
        """One inbound 20 ms frame. `audible`: our audio is playing at the caller's end. `blocked`: why barge-in is not
        allowed right now ("greeting", "grace") or None. Returns True when the caller is talking over us."""
        if not audible:
            if self._was_audible:
                self.response_end("played_out")
            if rms > FLOOR:
                self._caller.append(rms)
            self._window.clear()
            return False
        self._was_audible = True
        st = self._stats
        st["frames"] += 1
        if blocked:
            self._echo.append(rms)
            st["blocked"][blocked] = st["blocked"].get(blocked, 0) + 1
            self._window.clear()
            return False
        t = self.threshold()
        loud = rms > t
        self._window.append(loud)
        if loud:
            st["loud_frames"] += 1
            if st["first_loud_at"] is None:
                st["first_loud_at"] = self._clock()
        count = sum(self._window)
        st["max_window"] = max(st["max_window"], count)
        st["threshold"] = t
        if count >= NEED_FRAMES:
            self._window.clear()
            return True
        return False

    # ------------------------------------------------------------------ events
    def words(self, blocked: Optional[str]) -> None:
        """Deepgram heard words while we were audible (interim or final)."""
        st = self._stats
        st["words_events"] += 1
        if blocked:
            st["words_blocked"][blocked] = st["words_blocked"].get(blocked, 0) + 1

    def fired(self, path: str, result: Optional[Dict[str, Any]] = None, turn: Optional[int] = None, generation: Optional[int] = None) -> Dict[str, Any]:
        """A barge-in happened (`path`: "vad" or "words"). Logs the response summary and starts a new one."""
        st = self._stats
        st["barge_in"] = path
        if st["first_loud_at"] is not None:
            st["reaction_ms"] = round((self._clock() - st["first_loud_at"]) * 1000)
        st["cancel"] = result or {}
        return self.response_end("interrupted", turn=turn, generation=generation)

    def response_end(self, how: str, turn: Optional[int] = None, generation: Optional[int] = None) -> Dict[str, Any]:
        st = self._stats
        summary = {
            "call_id": self.call_id, "turn": turn, "generation": generation, "end": how,
            "playback_ms": st["frames"] * 20, "threshold": st["threshold"] or self.threshold(),
            "caller_p75": round(_pct(self._caller, 0.75)) if self._caller else None,
            "echo_p90": round(_pct(self._echo, 0.9)) if self._echo else None,
            "loud_ms": st["loud_frames"] * 20, "max_window": st["max_window"], "need": NEED_FRAMES,
            "blocked_ms": {k: v * 20 for k, v in st["blocked"].items()},
            "words_events": st["words_events"], "words_blocked": st["words_blocked"],
            "barge_in": st["barge_in"], "reaction_ms": st.get("reaction_ms"), "cancel": st.get("cancel"),
        }
        if st["frames"]:
            logger.info("[BARGE-IN DIAG] %s", json.dumps(summary))
        self._was_audible = False
        self._window.clear()
        self._reset_stats()
        return summary

    def _reset_stats(self) -> None:
        self._stats = {"frames": 0, "loud_frames": 0, "max_window": 0, "first_loud_at": None, "threshold": 0,
                       "blocked": {}, "words_events": 0, "words_blocked": {}, "barge_in": None}
