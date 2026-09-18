"""
Twilio WebSocket Gateway & Voice Simulator.
Handles bidirectional streaming audio over WebSocket for Twilio Media Streams
(mu-law 8kHz in/out <-> Deepgram Live STT <-> deterministic State Machine <->
Cartesia Sonic TTS, with <100ms VAD barge-in), and provides a direct test
endpoint for the UI Playground.
"""

import asyncio
import base64
import json
import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.ai.engine.conversation.state_machine import ConversationStateMachine
from backend.ai.llm.client import llm_client
from backend.ai.memory.session_memory import session_memory
from backend.ai.realtime.audio.mulaw import FRAME_DURATION_S, frame_stream
from backend.ai.realtime.barge_in.coordinator import BargeInCoordinator
from backend.ai.realtime.twilio.call_control import redirect_call
from backend.ai.realtime.vad.detector import SimpleVAD
from backend.ai.speech.stt.deepgram import DeepgramLiveConnection
from backend.ai.speech.tts.cartesia import cartesia_tts
from backend.ai.verticals.registry import registry as vertical_registry
from backend.server.database.models.business import Business
from backend.server.database.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["voice"])
vad = SimpleVAD()


class VoiceSimulateRequest(BaseModel):
    business_id: str
    caller_number: str = "+15550199999"
    user_transcript: str
    call_id: Optional[str] = None


class CallSession:
    """Per-call realtime state for one Twilio Media Stream WebSocket connection."""

    def __init__(self, websocket: WebSocket, business_id: str) -> None:
        self.websocket = websocket
        self.business_id = business_id
        self.stream_sid: Optional[str] = None
        self.call_id: Optional[str] = None
        self.caller_number = "+15550000000"
        self.state_machine: Optional[ConversationStateMachine] = None
        self.stt: Optional[DeepgramLiveConnection] = None
        self.barge_in = BargeInCoordinator()
        self._stt_task: Optional[asyncio.Task] = None
        self.should_close = False

    async def start(self, stream_sid: str, call_id: str, caller_number: str) -> None:
        self.stream_sid = stream_sid
        self.call_id = call_id
        if caller_number:
            self.caller_number = caller_number

        vertical_cfg = vertical_registry.get_vertical("clinic")
        self.state_machine = ConversationStateMachine(
            call_id=call_id,
            business_id=self.business_id,
            caller_number=self.caller_number,
            vertical_config=vertical_cfg,
        )
        session_memory.store_session(call_id, self.state_machine)
        greeting = self.state_machine.start_call()
        logger.info(f"[TWILIO WS] Started call {call_id} for business {self.business_id}")

        self.stt = DeepgramLiveConnection()
        if await self.stt.connect():
            self._stt_task = asyncio.create_task(self._consume_stt_events())
        else:
            logger.warning(f"[TWILIO WS] Live STT unavailable for call {call_id}")

        await self._speak_turn(greeting)

    async def handle_media(self, payload_b64: str) -> None:
        if self.stt:
            await self.stt.send_audio(base64.b64decode(payload_b64))
        # Fast energy-based VAD as a low-latency barge-in trigger, ahead of
        # Deepgram's SpeechStarted event which carries ~endpointing delay.
        if self.barge_in.is_speaking and vad.is_speech(payload_b64):
            await self.barge_in.handle_caller_speech(self.websocket, self.stream_sid)

    async def _consume_stt_events(self) -> None:
        assert self.stt is not None
        async for event in self.stt.events():
            if event["type"] == "speech_started":
                await self.barge_in.handle_caller_speech(self.websocket, self.stream_sid)
            elif event["type"] == "transcript" and event.get("is_final") and event.get("text", "").strip():
                await self._handle_transcript(event["text"])

    async def _handle_transcript(self, transcript: str) -> None:
        if not self.state_machine:
            return

        available_intents = [
            {"name": i.name, "description": i.description}
            for i in self.state_machine.vertical_config.intents
        ]
        extracted = await llm_client.extract_intent_and_slots(transcript, available_intents)
        result = await self.state_machine.process_user_turn(
            user_transcript=transcript,
            extracted_intent=extracted.get("intent"),
            extracted_slots=extracted.get("slots"),
        )

        bot_text = result.get("bot_response") or ""
        if bot_text:
            await self._speak_turn(bot_text)

        if result.get("should_transfer"):
            twiml = (result.get("tool_result") or {}).get("twiml")
            if twiml and self.call_id:
                await redirect_call(self.call_id, twiml)
            self.should_close = True
        elif result.get("should_hangup"):
            self.should_close = True

    async def _speak_turn(self, text: str) -> None:
        """Runs TTS playback as its own task so a barge-in can cancel just the
        playback without killing the STT consumer loop awaiting it."""
        speak_task = asyncio.create_task(self._stream_tts(text))
        self.barge_in.mark_speaking(speak_task)
        try:
            await speak_task
        except asyncio.CancelledError:
            logger.info(f"[TWILIO WS] Playback interrupted (barge-in) for call {self.call_id}")
        finally:
            self.barge_in.mark_done()

    async def _stream_tts(self, text: str) -> None:
        async for frame_b64 in frame_stream(cartesia_tts.stream_speech(text)):
            await self.websocket.send_text(
                json.dumps(
                    {
                        "event": "media",
                        "streamSid": self.stream_sid,
                        "media": {"payload": frame_b64},
                    }
                )
            )
            await asyncio.sleep(FRAME_DURATION_S)
        await self.websocket.send_text(
            json.dumps({"event": "mark", "streamSid": self.stream_sid, "mark": {"name": "turn_end"}})
        )

    async def stop(self) -> None:
        if self._stt_task:
            self._stt_task.cancel()
        if self.stt:
            await self.stt.close()
        if self.call_id:
            session_memory.remove_session(self.call_id)


@router.websocket("/media-stream/{business_id}")
async def twilio_media_stream(websocket: WebSocket, business_id: str) -> None:
    """Twilio Media Stream bidirectional WebSocket."""
    await websocket.accept()
    session = CallSession(websocket, business_id)

    try:
        while True:
            raw_msg = await websocket.receive_text()
            data = json.loads(raw_msg)
            event_type = data.get("event")

            if event_type == "connected":
                logger.info("[TWILIO WS] Connected")

            elif event_type == "start":
                start = data["start"]
                stream_sid = start["streamSid"]
                call_id = start.get("callSid", stream_sid)
                caller_number = start.get("customParameters", {}).get("caller_number", "")
                await session.start(stream_sid, call_id, caller_number)

            elif event_type == "media":
                await session.handle_media(data["media"]["payload"])
                if session.should_close:
                    break

            elif event_type == "stop":
                logger.info(f"[TWILIO WS] Call ended {session.call_id}")
                break

    except WebSocketDisconnect:
        logger.info(f"[TWILIO WS] Disconnected {session.call_id}")
    finally:
        await session.stop()


@router.post("/api/voice/simulate")
async def simulate_voice_turn(
    payload: VoiceSimulateRequest,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Simulates a voice conversation turn.
    Used by the user dashboard's TestPlaygroundModal and automated tests.
    """
    call_id = payload.call_id or f"sim_{payload.business_id[:8]}"
    state_machine = session_memory.get_session(call_id)

    if not state_machine:
        # Load business & vertical
        business = db.get(Business, payload.business_id)
        vertical_name = business.vertical if business else "clinic"
        vertical_cfg = vertical_registry.get_vertical(vertical_name)
        business_info = {
            "name": business.name if business else "Medical Center",
        }

        state_machine = ConversationStateMachine(
            call_id=call_id,
            business_id=payload.business_id,
            caller_number=payload.caller_number,
            vertical_config=vertical_cfg,
            business_info=business_info,
            db=db,
        )
        session_memory.store_session(call_id, state_machine)
        # Advance initial greeting
        state_machine.start_call()

    # Extract intent & slots via LLM
    available_intents = [
        {"name": i.name, "description": i.description}
        for i in state_machine.vertical_config.intents
    ]
    extracted = await llm_client.extract_intent_and_slots(
        payload.user_transcript,
        available_intents,
    )

    # Process through deterministic state machine
    result = await state_machine.process_user_turn(
        user_transcript=payload.user_transcript,
        extracted_intent=extracted.get("intent"),
        extracted_slots=extracted.get("slots"),
    )

    return {
        "call_id": call_id,
        "state": result["state"],
        "bot_response": result["bot_response"],
        "collected_slots": state_machine.collected_slots,
        "tool_result": result.get("tool_result"),
        "should_hangup": result.get("should_hangup", False),
        "should_transfer": result.get("should_transfer", False),
        "transfer_target": result.get("transfer_target"),
    }
