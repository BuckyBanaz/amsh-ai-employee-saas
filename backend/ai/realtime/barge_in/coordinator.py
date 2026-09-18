"""
Barge-In Coordinator.
Tracks whether the AI is currently speaking on a call and, when the caller
starts talking during playback, cancels the in-flight TTS task and tells
Twilio to flush its outbound audio buffer immediately (<100ms target).
"""

import asyncio
import json
import logging
from typing import Optional

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class BargeInCoordinator:
    """Per-call barge-in state. One instance per WebSocket connection."""

    def __init__(self) -> None:
        self._speaking_task: Optional[asyncio.Task] = None

    @property
    def is_speaking(self) -> bool:
        return self._speaking_task is not None and not self._speaking_task.done()

    def mark_speaking(self, task: asyncio.Task) -> None:
        self._speaking_task = task

    def mark_done(self) -> None:
        self._speaking_task = None

    async def handle_caller_speech(self, websocket: WebSocket, stream_sid: Optional[str]) -> None:
        """Called when STT/VAD detects the caller has started talking. Only
        acts if the AI is mid-utterance — otherwise this is just normal
        caller speech with nothing to interrupt."""
        if not self.is_speaking:
            return

        task = self._speaking_task
        self._speaking_task = None
        if task:
            task.cancel()

        try:
            await websocket.send_text(json.dumps({"event": "clear", "streamSid": stream_sid}))
            logger.info("[BARGE-IN] Cleared Twilio audio buffer")
        except Exception as e:
            logger.warning(f"[BARGE-IN] Failed to send clear event: {e}")
