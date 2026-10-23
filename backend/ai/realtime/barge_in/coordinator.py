"""
Barge-In Coordinator.
Tracks whether the AI is currently audible on a call and, when the caller
starts talking over it, cancels the in-flight TTS task and tells Twilio to
flush its outbound audio buffer immediately (<100ms target).

"Audible" is not the same as "still sending". The gateway pushes TTS frames
to Twilio about 4x faster than real time, so the send task finishes while
Twilio still has seconds of audio queued. The coordinator therefore also
tracks the estimated end of playback (`playback_until`, advanced 20 ms per
frame sent) and ends it early when Twilio echoes our latest `mark` (Twilio
echoes a mark once all audio sent before it has played, or immediately after
a `clear`).
"""

import asyncio
import json
import logging
import time
from typing import Any, Callable, Dict, Optional

from fastapi import WebSocket

from backend.ai.realtime.call_tunnels.plivo_tunnel import plivo_clear_audio_message

logger = logging.getLogger(__name__)


class BargeInCoordinator:
    """Per-call barge-in state. One instance per WebSocket connection."""

    def __init__(self, clock: Callable[[], float] = time.monotonic) -> None:
        self._speaking_task: Optional[asyncio.Task] = None
        self._clock = clock
        self.playback_until = 0.0  # monotonic time the audio already handed to Twilio should finish playing
        self.generation = 0  # +1 on every barge-in; lets a multi-sentence turn notice it was interrupted between sentences
        self._mark_seq = 0
        self._last_mark: Optional[str] = None
        # mark -> when its audio should finish playing with zero network delay (playback_until when it was sent). The echo's
        # lateness against that is the outbound delay the caller hears (tunnel + carrier + jitter buffer), which the turn
        # latency report cannot see: it stops at "frame sent".
        self._mark_due: Dict[str, float] = {}

    @property
    def is_speaking(self) -> bool:
        """True while frames are being sent OR previously sent audio is still playing at the caller's end."""
        sending = self._speaking_task is not None and not self._speaking_task.done()
        return sending or self._clock() < self.playback_until

    def mark_speaking(self, task: asyncio.Task) -> None:
        self._speaking_task = task

    def mark_done(self) -> None:
        self._speaking_task = None  # playback may continue; see playback_until

    def audio_sent(self, seconds: float) -> None:
        """Account for `seconds` of audio just sent: it plays after whatever is already queued."""
        self.playback_until = max(self.playback_until, self._clock()) + seconds

    def next_mark(self) -> str:
        """A unique mark name to send after a sentence's audio; its echo means everything up to it has played."""
        self._mark_seq += 1
        self._last_mark = f"turn_end:{self._mark_seq}"
        self._mark_due[self._last_mark] = self.playback_until
        while len(self._mark_due) > 32:  # a provider that never echoes must not grow this
            self._mark_due.pop(next(iter(self._mark_due)))
        return self._last_mark

    def on_mark(self, name: Optional[str]) -> Optional[float]:
        """Twilio/Plivo echoed a mark. Only the latest one proves the queue is empty; older ones are ignored.
        Returns how many seconds later than zero-delay playback the echo came (None for an unknown or cleared mark)."""
        due = self._mark_due.pop(name, None) if name else None
        if name and name == self._last_mark:
            self.playback_until = min(self.playback_until, self._clock())
        return None if due is None else self._clock() - due

    async def handle_caller_speech(self, websocket: WebSocket, stream_sid: Optional[str], pcm: bool = False, provider: str = "twilio") -> Optional[Dict[str, Any]]:
        """Called when STT/VAD detects the caller has started talking. Only
        acts if the AI is audible — otherwise this is just normal caller
        speech with nothing to interrupt. Returns what was cancelled (for the barge-in diagnostics), or None."""
        if not self.is_speaking:
            return None

        self.generation += 1
        self.playback_until = 0.0
        self._mark_due.clear()  # a clear makes the provider echo pending marks at once: not a playout measurement
        task = self._speaking_task
        self._speaking_task = None
        result: Dict[str, Any] = {"generation": self.generation, "tts_task_cancelled": bool(task and not task.done()), "clear_sent": False}
        if task:
            task.cancel()

        try:
            if provider == "plivo" and stream_sid:
                clear_text = plivo_clear_audio_message(stream_sid)
            else:
                clear_msg = {"event": "clear"}
                if pcm:
                    clear_msg["stream_sid"] = stream_sid
                else:
                    clear_msg["streamSid"] = stream_sid
                clear_text = json.dumps(clear_msg)
            await websocket.send_text(clear_text)
            result["clear_sent"] = True
            logger.info("[BARGE-IN] Cleared telephony audio buffer")
        except Exception as e:
            logger.warning(f"[BARGE-IN] Failed to send clear event: {e}")
        return result
