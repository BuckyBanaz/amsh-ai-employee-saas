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

from backend.ai.engine.conversation.state_machine import ConversationStateMachine, load_agent_settings, load_business_context, load_tone
from backend.ai.llm.client import llm_client
from backend.ai.memory.session_memory import session_memory
from backend.ai.realtime.audio.mulaw import FRAME_BYTES, FRAME_DURATION_S, PCM_FRAME_BYTES, frame_stream
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

    def __init__(self, websocket: WebSocket, business_id: str, pcm: bool = False) -> None:
        # pcm=True: Exotel (linear PCM16 8kHz). False: Twilio (mulaw 8kHz).
        self.pcm = pcm
        self.websocket = websocket
        self.business_id = business_id
        self.stream_sid: Optional[str] = None
        self.call_id: Optional[str] = None
        self.caller_number = "+15550000000"
        self.state_machine: Optional[ConversationStateMachine] = None
        self.stt: Optional[DeepgramLiveConnection] = None
        self.barge_in = BargeInCoordinator()
        self._stt_task: Optional[asyncio.Task] = None
        self._stt_connect_task: Optional[asyncio.Task] = None
        self.should_close = False
        self.seen_media = False
        self.agent_settings: dict = {}

    async def start(self, stream_sid: str, call_id: str, caller_number: str) -> None:
        self.stream_sid = stream_sid
        self.call_id = call_id
        if caller_number:
            self.caller_number = caller_number

        vertical_cfg = vertical_registry.get_vertical("clinic")
        try:
            business_name, services = await asyncio.to_thread(load_business_context, self.business_id)
            self.agent_settings = await asyncio.to_thread(load_agent_settings, self.business_id)
        except Exception as e:
            logger.warning(f"[WS GATEWAY] Could not load business context: {e}")
            business_name, services, self.agent_settings = None, [], {}
        tone = self.agent_settings.get("tone")
        self.state_machine = ConversationStateMachine(
            call_id=call_id,
            business_id=self.business_id,
            caller_number=self.caller_number,
            vertical_config=vertical_cfg,
            business_info={"name": business_name or "Our Office"},
            services=services,
            tone=tone,
            language=self.agent_settings.get("language"),
        )
        session_memory.store_session(call_id, self.state_machine)
        greeting = self.state_machine.start_call(self.agent_settings.get("greeting"))
        print(f"\n==================== [CALL STARTED] ====================", flush=True)
        print(f"📞 CALL SID: {call_id} | Business: {self.business_id} | Caller: {self.caller_number}", flush=True)
        print(f"🤖 AI GREETING: \"{greeting}\"", flush=True)
        print(f"========================================================\n", flush=True)
        logger.info(f"[TWILIO WS] Started call {call_id} for business {self.business_id}")

        # Connect STT in the background with country-aware accent recognition
        stt_lang = self.agent_settings.get("stt_language") or (
            "en-IN" if (self.pcm or self.caller_number.startswith("+91")) else ("en-US" if self.caller_number.startswith("+1") else "en-IN")
        )
        logger.info("[CALL INIT] Initializing Deepgram STT with dialect/accent: %s", stt_lang)
        self.stt = DeepgramLiveConnection(
            encoding="linear16" if self.pcm else "mulaw",
            language=stt_lang
        )
        self._stt_connect_task = asyncio.create_task(self._connect_stt(call_id))

        await self._speak_turn(greeting)

    async def _connect_stt(self, call_id: str) -> None:
        assert self.stt is not None
        if await self.stt.connect():
            self._stt_task = asyncio.create_task(self._consume_stt_events())
        else:
            logger.warning(f"[TWILIO WS] Live STT unavailable for call {call_id}")

    async def handle_media(self, payload_b64: str) -> None:
        if self.stt:
            await self.stt.send_audio(base64.b64decode(payload_b64))
        # Fast energy-based VAD as a low-latency barge-in trigger, ahead of
        # Deepgram's SpeechStarted event which carries ~endpointing delay.
        if self.barge_in.is_speaking and vad.is_speech(payload_b64, pcm=self.pcm):
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

        print(f"\n==================== [LIVE CALL] ====================", flush=True)
        print(f"📞 CALL SID: {self.call_id}", flush=True)
        print(f"👤 USER SPOKE: \"{transcript}\"", flush=True)

        available_intents = [
            {"name": i.name, "description": i.description}
            for i in self.state_machine.vertical_config.intents
        ]
        current_intent = self.state_machine.current_intent.name if self.state_machine.current_intent else None
        last_asked_slot = getattr(self.state_machine, "last_asked_slot", None)
        
        extracted = await llm_client.extract_intent_and_slots(
            transcript, 
            available_intents, 
            self.state_machine.services,
            current_intent=current_intent,
            missing_slot=last_asked_slot
        )
        print(f"🧠 EXTRACTED INTENT: {extracted.get('intent')} | SLOTS: {extracted.get('slots')}", flush=True)

        result = await self.state_machine.process_user_turn(
            user_transcript=transcript,
            extracted_intent=extracted.get("intent"),
            extracted_slots=extracted.get("slots"),
        )

        bot_text = result.get("bot_response") or ""
        print(f"🤖 AI RECEPTIONIST: \"{bot_text}\"", flush=True)
        print(f"=====================================================\n", flush=True)

        if bot_text:
            await self._speak_turn(bot_text)

        if result.get("should_transfer"):
            twiml = (result.get("tool_result") or {}).get("twiml")
            if twiml and self.call_id:
                print(f"🔄 TRANSFERRING CALL {self.call_id}...", flush=True)
                await redirect_call(self.call_id, twiml)
            self.should_close = True
        elif result.get("should_hangup"):
            print(f"📴 HANGING UP CALL {self.call_id}...", flush=True)
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
        voice_id = self.agent_settings.get("voice_id")
        language = self.agent_settings.get("tts_language")
        if self.pcm:
            audio = cartesia_tts.stream_speech(
                text, voice_id=voice_id, encoding="pcm_s16le", sample_rate=8000, language=language
            )
            frames = frame_stream(audio, PCM_FRAME_BYTES)
        else:
            frames = frame_stream(cartesia_tts.stream_speech(text, voice_id=voice_id, language=language), FRAME_BYTES)
        sent = 0
        async for frame_b64 in frames:
            sent += 1
            await self.websocket.send_text(
                json.dumps(
                    {
                        "event": "media",
                        "streamSid": self.stream_sid,
                        "stream_sid": self.stream_sid,
                        "media": {"payload": frame_b64},
                    }
                )
            )
            # Yield to event loop without sleeping 20ms to keep telephony jitter buffer full
            await asyncio.sleep(0.005)
        logger.info(f"[TTS OUT] call={self.call_id} frames={sent} text={text[:40]!r}")
        await self.websocket.send_text(
            json.dumps({
                "event": "mark",
                "streamSid": self.stream_sid,
                "stream_sid": self.stream_sid,
                "mark": {"name": "turn_end"}
            })
        )

    async def stop(self) -> None:
        if self._stt_connect_task:
            self._stt_connect_task.cancel()
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
    session = CallSession(websocket, business_id, pcm=websocket.query_params.get("codec") == "pcm")

    try:
        while True:
            raw_msg = await websocket.receive_text()
            data = json.loads(raw_msg)
            event_type = data.get("event") or data.get("type")
            # Log every non-media frame in full (start/stop/mark/etc.) and the first media frame,
            # so we can see exactly what the provider sends and why it disconnects.
            if event_type not in ("media", "audio") or not session.seen_media:
                print(f"[WS RAW] {raw_msg[:500]}", flush=True)
                if event_type in ("media", "audio"):
                    session.seen_media = True

            if event_type in ("connected", "connect"):
                logger.info(f"[WS GATEWAY] Connection established")

            elif event_type in ("start", "session_start", "init"):
                start = data.get("start") or data
                stream_sid = start.get("streamSid") or start.get("stream_sid") or start.get("stream_id") or "STREAM_LIVE"
                call_id = start.get("callSid") or start.get("call_sid") or start.get("call_id") or stream_sid
                custom_params = start.get("customParameters") or start.get("custom_params") or {}
                caller_number = custom_params.get("caller_number") or custom_params.get("from") or data.get("from") or ""
                # Exotel drops URL query params and echoes them in the start event instead;
                # its Voicebot stream is 8kHz linear PCM16 (128kbps).
                media_format = start.get("media_format") or {}
                if custom_params.get("codec") == "pcm" or media_format.get("bit_rate") == "128kbps":
                    session.pcm = True
                await session.start(stream_sid, call_id, caller_number)

            elif event_type in ("media", "audio"):
                media_payload = (data.get("media") or {}).get("payload") or data.get("payload") or data.get("data")
                if media_payload:
                    await session.handle_media(media_payload)
                if session.should_close:
                    break

            elif event_type in ("stop", "closed", "hangup"):
                logger.info(f"[WS GATEWAY] Call ended {session.call_id}")
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
            services=[s.title for s in business.services] if business else [],
            tone=load_tone(payload.business_id),
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
        state_machine.services,
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
