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
import re
import time
from typing import Any, Dict, Optional, Tuple

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.ai.engine.conversation.state_machine import ConversationStateMachine, load_agent_settings, load_business_context, load_tone
from backend.ai.engine.conversation.i18n import normalize_language
from backend.ai.engine.conversation.states import CallState
from backend.ai.engine.conversation.nlu import ConversationalNLU
from backend.ai.engine.agent.runtime import AgentRuntime, get_sim_runtime, store_sim_runtime
from backend.ai.llm.client import llm_client
from backend.ai.memory.session_memory import session_memory
from backend.ai.realtime import latency
from backend.ai.realtime.audio.mulaw import FRAME_BYTES, FRAME_DURATION_S, PCM_FRAME_BYTES, frame_stream
from backend.ai.realtime.barge_in.coordinator import BargeInCoordinator
from backend.ai.realtime.twilio.call_control import redirect_call
from backend.server.services.call_recorder import (
    record_call_start,
    record_call_turn,
    record_call_end,
    load_call_turns,
)
from backend.ai.realtime.vad.detector import SimpleVAD
from backend.ai.speech.stt.deepgram import DeepgramLiveConnection
from backend.ai.speech.tts.cartesia import cartesia_tts
from backend.ai.speech.tts.voice_profile import detect_tts_language
from backend.ai.verticals.registry import registry as vertical_registry
from backend.server.database.models.business import Business
from backend.server.database.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["voice"])
vad = SimpleVAD()

_WATCHDOG_LINES = {
    "en": {
        "still_there": "Are you still there?",
        "goodbye": "I haven't heard anything, so I'll end the call now. Feel free to call back anytime. Goodbye!",
        "limit": "I'm sorry, we've reached the maximum time for this call. Please call back if you need anything else. Goodbye!",
    },
    "hi": {
        "still_there": "Kya aap wahan hain?",
        "goodbye": "Mujhe kuch sunai nahi diya, isliye main call band kar rahi hoon. Aap kabhi bhi dobara call kar sakte hain. Namaste!",
        "limit": "Maaf kijiye, is call ka maximum samay poora ho gaya hai. Zarurat ho toh dobara call kijiye. Namaste!",
    },
}


class VoiceSimulateRequest(BaseModel):
    business_id: str
    caller_number: str = "+15550199999"
    user_transcript: str
    call_id: Optional[str] = None
    voice_id: Optional[str] = None  # the voice the playground user picked (persona gender and audio prefetch follow it)


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
        # LLM agent engine (DOCS/16). None = legacy state machine only. Set per tenant / via CONVERSATION_ENGINE.
        self.agent_rt: Optional[AgentRuntime] = None
        self._bg_tasks: set = set()
        # Call Handling tab limits (silence timeout, max duration), enforced by _watchdog().
        self.call_started = time.monotonic()
        self.last_activity = time.monotonic()
        self._silence_prompted = False
        self._busy = False
        self._watchdog_task: Optional[asyncio.Task] = None
        self._turn_no = 0  # numbering for the per-turn [LATENCY] log
        self._last_warm = 0.0  # monotonic time provider connections were last warmed (see _warm_providers)

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
            business_info={
                "name": business_name or "Our Office",
                "agent_name": self.agent_settings.get("name", "Aura"),
            },
            services=services,
            tone=tone,
            language=self.agent_settings.get("language"),
        )
        session_memory.store_session(call_id, self.state_machine)
        greeting = self.state_machine.start_call(self.agent_settings.get("greeting"))
        try:
            self.agent_rt = await AgentRuntime.create(
                self.business_id, call_id, self.caller_number, vertical_cfg, greeting, self.agent_settings.get("language")
            )
        except Exception as e:  # the agent is optional: any setup failure keeps the call on the legacy engine
            logger.warning(f"[AGENT] init failed, using state machine: {e}")
            self.agent_rt = None
        if self.agent_rt:
            print(f"🧪 CONVERSATION ENGINE: {self.agent_rt.mode}", flush=True)
        print(f"\n==================== [CALL STARTED] ====================", flush=True)
        print(f"📞 CALL SID: {call_id} | Business: {self.business_id} | Caller: {self.caller_number}", flush=True)
        print(f"🤖 AI GREETING: \"{greeting}\"", flush=True)
        print(f"========================================================\n", flush=True)
        logger.info(f"[TWILIO WS] Started call {call_id} for business {self.business_id}")

        await asyncio.to_thread(
            record_call_start,
            call_id=call_id,
            business_id=self.business_id,
            caller_number=self.caller_number,
            greeting=greeting,
        )

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
        self._watchdog_task = asyncio.create_task(self._watchdog())
        self._warm_providers(force=True)  # LLM connection opens while the greeting plays, not on the first turn

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
                # LATENCY: the caller is talking, so the LLM/TTS requests are a second or two away. Make sure their
                # pooled HTTPS connections are open now instead of paying TCP+TLS after the caller stops.
                self._warm_providers()
            elif event["type"] == "transcript" and event.get("is_final") and event.get("text", "").strip():
                self._busy = True  # we are thinking/answering: the watchdog must not call this silence
                tracker = self._new_turn_tracker(event)
                token = latency.start_turn(tracker)
                try:
                    await self._handle_transcript(event["text"])
                finally:
                    latency.end_turn(token)
                    try:
                        tracker.report()
                    except Exception as e:  # measurement must never break a call
                        logger.debug("latency report failed: %s", e)
                    self._busy = False
                    self.last_activity = time.monotonic()

    def _new_turn_tracker(self, event: Dict[str, Any]) -> latency.TurnLatency:
        """Per-utterance latency tracker. Origin = the caller's estimated end of speech (Deepgram word timing), clamped to
        the moment the final transcript arrived; without word timings the origin is the transcript arrival itself."""
        self._turn_no += 1
        received = event.get("received_at") or time.monotonic()
        speech_end = event.get("speech_end_at")
        if speech_end is not None:
            speech_end = min(speech_end, received)
        tracker = latency.TurnLatency(self.call_id, self._turn_no, origin=speech_end if speech_end is not None else received)
        if speech_end is not None:
            tracker.mark("speech_end", at=speech_end)
        tracker.mark("deepgram_final", at=received)
        tracker.info.update({
            "engine": self.agent_rt.mode if self.agent_rt else "state_machine",
            "transcript_words": len(event.get("text", "").split()),
            "speech_final": event.get("speech_final"),
        })
        return tracker

    def _warm_providers(self, force: bool = False) -> None:
        """Fire-and-forget keep-warm requests to Groq and Cartesia, at most every 20 s. Each provider client keeps its
        connection pooled for PROVIDER_KEEPALIVE_SECONDS; this covers servers that close idle connections sooner."""
        now = time.monotonic()
        if not force and now - self._last_warm < 20.0:
            return
        self._last_warm = now
        for coro in (llm_client.warm(), cartesia_tts.warm()):
            task = latency.create_detached_task(coro)
            self._bg_tasks.add(task)
            task.add_done_callback(self._bg_tasks.discard)

    async def _handle_transcript(self, transcript: str) -> None:
        if not self.state_machine:
            return

        print(f"\n==================== [LIVE CALL] ====================", flush=True)
        print(f"📞 CALL SID: {self.call_id}", flush=True)
        print(f"👤 USER SPOKE: \"{transcript}\"", flush=True)
        self.last_activity = time.monotonic()  # the caller is talking: reset the silence clock
        self._silence_prompted = False

        if self.agent_rt and self.agent_rt.mode == "llm_agent" and await self._handle_agent_turn(transcript):
            return

        available_intents = [
            {"name": i.name, "description": i.description}
            for i in self.state_machine.vertical_config.intents
        ]
        current_intent = self.state_machine.current_intent.name if self.state_machine.current_intent else None
        last_asked_slot = getattr(self.state_machine, "last_asked_slot", None)
        
        recent_turns = [
            {"role": "user", "content": t.user_transcript}
            for t in self.state_machine.turns[-3:]
        ]

        latency.mark("nlu_start")  # legacy engine: one NLU LLM call before the state machine replies
        nlu_result = await ConversationalNLU.analyze_turn(
            user_utterance=transcript,
            available_intents=available_intents,
            available_services=self.state_machine.services,
            agent_name=self.state_machine.agent_name,
            business_name=self.state_machine.business_info.get("name", "our clinic"),
            current_intent=current_intent,
            collected_slots=self.state_machine.collected_slots,
            missing_slot=last_asked_slot,
            recent_turns=recent_turns,
        )
        latency.mark("nlu_end")
        print(f"🧠 NLU CATEGORY: {nlu_result.category.value} | INTENT: {nlu_result.intent} | CONF: {nlu_result.confidence} | SLOTS: {nlu_result.slots}", flush=True)

        result = await self.state_machine.process_user_turn(
            user_transcript=transcript,
            extracted_intent=nlu_result.intent,
            extracted_slots=nlu_result.slots,
            nlu_category=nlu_result.category.value,
            confidence=nlu_result.confidence,
            is_correction=nlu_result.is_correction,
            overridden_slot=nlu_result.overridden_slot,
            is_ambiguous=nlu_result.is_ambiguous,
        )

        bot_text = result.get("bot_response") or ""
        print(f"🤖 AI RECEPTIONIST: \"{bot_text}\"", flush=True)
        print(f"=====================================================\n", flush=True)

        if self.agent_rt and self.agent_rt.mode == "shadow":  # silent comparison; never spoken, never writes
            # Detached context: the silent agent's LLM calls must not show up in this live turn's latency numbers.
            task = latency.create_detached_task(self.agent_rt.shadow(self.call_id or "", transcript, bot_text))
            self._bg_tasks.add(task)
            task.add_done_callback(self._bg_tasks.discard)

        if bot_text:
            await self._speak_turn(bot_text)

        await asyncio.to_thread(
            record_call_turn,
            call_id=self.call_id,
            user_transcript=transcript,
            bot_response=bot_text,
            turn_sequence=self.state_machine.sequence,
        )

        if result.get("should_transfer"):
            twiml = (result.get("tool_result") or {}).get("twiml")
            if twiml and self.call_id:
                print(f"🔄 TRANSFERRING CALL {self.call_id}...", flush=True)
                await redirect_call(self.call_id, twiml)
            self.should_close = True
        elif result.get("should_hangup"):
            print(f"📴 HANGING UP CALL {self.call_id}...", flush=True)
            self.should_close = True

    async def _handle_agent_turn(self, transcript: str) -> bool:
        """LLM-agent turn: sentences are spoken as the model finishes them. Returns False if the agent could not
        answer (LLM down), so the caller falls back to the legacy state machine for this turn."""
        rt = self.agent_rt
        assert rt is not None and self.state_machine is not None
        try:
            run = await rt.run_turn(transcript, self._speak_turn)
        except Exception as e:
            logger.warning(f"[AGENT] turn failed, falling back to state machine: {e}")
            return False
        turn = run.turn
        tracker = latency.current()
        if tracker is not None:
            tracker.info.update({"interrupted": run.interrupted, "llm": turn.provider})
        if turn.degraded and not run.spoken_any:
            logger.warning(f"[AGENT] LLM unavailable ({turn.error}); using state machine for this turn")
            return False

        tools = [t.get("tool") for t in turn.tools]
        print(f"🤖 AI RECEPTIONIST (agent): \"{turn.reply}\" | tools={tools} | {turn.latency_ms}ms (first sentence {turn.first_sentence_ms}ms) | llm={turn.provider}", flush=True)
        print(f"=====================================================\n", flush=True)

        self.state_machine.sequence += 1  # keeps sequences unique even if a later turn falls back to the legacy path
        for call in rt.engine.toolbox.calls:  # feed the call summary (caller name) recorded when the call ends
            name = (call.get("args") or {}).get("patient_name")
            if name:
                self.state_machine.collected_slots["patient_name"] = name
        await asyncio.to_thread(
            record_call_turn,
            call_id=self.call_id,
            user_transcript=transcript,
            bot_response=turn.reply,
            turn_sequence=self.state_machine.sequence,
        )
        if turn.transferred:
            self.state_machine.current_state = CallState.ESCALATED
            if turn.transfer_twiml and self.call_id:
                print(f"🔄 TRANSFERRING CALL {self.call_id}...", flush=True)
                await redirect_call(self.call_id, turn.transfer_twiml)
            self.should_close = True
        elif turn.hangup:
            print(f"📴 HANGING UP CALL {self.call_id}...", flush=True)
            self.should_close = True
        return True

    async def _speak_turn(self, text: str, emotion: Optional[str] = None) -> bool:
        """Runs TTS playback as its own task so a barge-in can cancel just the
        playback without killing the STT consumer loop awaiting it.
        Returns False if the caller interrupted (barge-in), True if it played to the end."""
        speak_task = asyncio.create_task(self._stream_tts(text, emotion))
        self.barge_in.mark_speaking(speak_task)
        try:
            await speak_task
            return True
        except asyncio.CancelledError:
            logger.info(f"[TWILIO WS] Playback interrupted (barge-in) for call {self.call_id}")
            return False
        finally:
            self.barge_in.mark_done()
            self.last_activity = time.monotonic()  # silence is measured from the end of our own speech

    async def _watchdog(self) -> None:
        """Enforces the Call Handling tab: after `silence_timeout_seconds` of quiet ask "are you still there?",
        after another timeout say goodbye; after `max_duration_minutes` wrap the call up politely."""
        silence = int(self.agent_settings.get("silence_timeout_seconds") or 0)
        limit = int(self.agent_settings.get("max_duration_minutes") or 0) * 60
        if not silence and not limit:
            return
        lang = normalize_language(self.agent_settings.get("language"))
        say = _WATCHDOG_LINES.get(lang, _WATCHDOG_LINES["en"])
        try:
            while not self.should_close:
                await asyncio.sleep(1)
                if self.barge_in.is_speaking or self._busy:
                    continue
                now = time.monotonic()
                if limit and now - self.call_started > limit:
                    await self._speak_turn(say["limit"])
                    self.should_close = True
                    return
                if silence and now - self.last_activity > silence:
                    if not self._silence_prompted:
                        self._silence_prompted = True
                        await self._speak_turn(say["still_there"])
                    else:
                        await self._speak_turn(say["goodbye"])
                        self.should_close = True
                        return
        except asyncio.CancelledError:
            pass

    async def _stream_tts(self, text: str, emotion: Optional[str] = None) -> None:
        voice_id = self.agent_settings.get("voice_id")
        # The owner's explicit TTS language wins; otherwise pick per sentence so Hindi words are pronounced as Hindi.
        language = self.agent_settings.get("tts_language") or detect_tts_language(text)
        speed = self.agent_settings.get("tts_speed")  # Voice tab speed / personality default
        emotion = emotion or self.agent_settings.get("tts_emotion")  # the sentence's own emotion wins over the Voice-tab default
        if self.pcm:
            audio = cartesia_tts.stream_speech(
                text, voice_id=voice_id, encoding="pcm_s16le", sample_rate=8000, language=language,
                speed=speed, emotion=emotion,
            )
            frames = frame_stream(audio, PCM_FRAME_BYTES)
        else:
            frames = frame_stream(
                cartesia_tts.stream_speech(text, voice_id=voice_id, language=language, speed=speed, emotion=emotion),
                FRAME_BYTES,
            )
        sent = 0
        async for frame_b64 in frames:
            sent += 1
            # LATENCY: frames go out as soon as TTS bytes arrive (no whole-sentence buffering). Mark the first one.
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
            if sent == 1:
                latency.mark("first_audio_sent_to_telephony", chars=len(text))
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
        if self._watchdog_task:
            self._watchdog_task.cancel()
        if self._stt_connect_task:
            self._stt_connect_task.cancel()
        if self._stt_task:
            self._stt_task.cancel()
        if self.stt:
            await self.stt.close()
        if self.call_id and self.state_machine:
            try:
                intent_name = self.state_machine.current_intent.name if self.state_machine.current_intent else None
                slots = self.state_machine.collected_slots or {}
                caller_name = slots.get("patient_name") or slots.get("customer_name")
                outcome = "transferred" if self.state_machine.current_state == CallState.ESCALATED else "resolved"
                summary = (
                    f"AI Receptionist assisted {caller_name or self.caller_number}. "
                    f"Intent: {intent_name or 'Inquiry'}. Outcome: {outcome}."
                )
                await asyncio.to_thread(
                    record_call_end,
                    call_id=self.call_id,
                    outcome=outcome,
                    summary=summary,
                    intent=intent_name,
                    caller_name=caller_name,
                )
            except Exception as e:
                logger.error(f"[WS GATEWAY] Failed to persist call end for {self.call_id}: {e}")
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


async def _ensure_sim_session(payload: VoiceSimulateRequest, db: Session) -> Tuple[str, ConversationStateMachine]:
    """The playground's per-call state: the legacy state machine (always, it also records the call) and, when the tenant
    uses the LLM agent, an agent runtime."""
    call_id = payload.call_id or f"sim_{payload.business_id[:8]}"
    state_machine = session_memory.get_session(call_id)

    if not state_machine:
        # Load business & vertical
        business = db.get(Business, payload.business_id)
        vertical_name = business.vertical if business else "clinic"
        vertical_cfg = vertical_registry.get_vertical(vertical_name)
        agent_settings = load_agent_settings(payload.business_id)
        business_info = {
            "name": business.name if business else "Medical Center",
            "agent_name": agent_settings.get("name", "Aura"),
        }

        state_machine = ConversationStateMachine(
            call_id=call_id,
            business_id=payload.business_id,
            caller_number=payload.caller_number,
            vertical_config=vertical_cfg,
            business_info=business_info,
            db=db,
            services=[s.title for s in business.services] if business else [],
            tone=agent_settings.get("tone") or load_tone(payload.business_id),
            language=agent_settings.get("language"),
        )
        session_memory.store_session(call_id, state_machine)
        # Advance initial greeting
        initial_greeting = state_machine.start_call(agent_settings.get("greeting"))
        record_call_start(
            call_id=call_id,
            business_id=payload.business_id,
            caller_number=payload.caller_number,
            greeting=initial_greeting,
        )
        if business:
            rt = await AgentRuntime.create(
                payload.business_id, call_id, payload.caller_number, vertical_cfg, initial_greeting,
                agent_settings.get("language"), voice_id=payload.voice_id,  # persona gender follows the voice being previewed
            )
            # A server restart (code reload) drops in-memory sessions mid-call: pick the conversation back up from what was saved.
            prior = load_call_turns(call_id)
            if prior:
                state_machine.sequence = len(prior)
                if rt and rt.mode == "llm_agent":
                    rt.engine.restore(prior)
                logger.info(f"[SIM] Resumed call {call_id} with {len(prior)} earlier turn(s)")
            if rt and rt.mode == "llm_agent":  # the playground previews the agent; shadow only applies to live calls
                store_sim_runtime(call_id, rt)
    return call_id, state_machine


_STT_LANGUAGE = {"hi": "hi-IN", "en": "en-IN"}
_prefetch_tasks: set = set()


def _prefetch_tts(text: str, voice_id: Optional[str], emotion: Optional[str] = None, tts_text: Optional[str] = None) -> None:
    """Start synthesising a sentence the moment it exists. The browser asks for the same audio a moment later and joins
    this request (see CartesiaTTS.generate_preview_audio), so speech can start while the model is still writing."""
    if not (voice_id and text.strip() and cartesia_tts.is_configured()):
        return
    snippet = (tts_text or text)[:250]  # the playground requests text.slice(0, 250); the cache key must match exactly
    task = asyncio.create_task(
        cartesia_tts.generate_preview_audio(snippet, voice_id, emotion=emotion, language=detect_tts_language(snippet))
    )
    _prefetch_tasks.add(task)  # keep a reference so the task is not garbage collected mid-flight
    task.add_done_callback(_prefetch_tasks.discard)


def _finish_agent_turn(call_id: str, state_machine: ConversationStateMachine, payload: VoiceSimulateRequest, agent_turn: Any) -> Dict[str, Any]:
    """Persist an LLM-agent turn and build the response payload shared by /simulate and /simulate/stream."""
    state_machine.sequence += 1
    record_call_turn(
        call_id=call_id,
        user_transcript=payload.user_transcript,
        bot_response=agent_turn.reply,
        turn_sequence=state_machine.sequence,
    )
    if agent_turn.transferred:
        state_machine.current_state = CallState.ESCALATED
    if agent_turn.hangup or agent_turn.transferred:
        record_call_end(
            call_id=call_id,
            outcome="transferred" if agent_turn.transferred else "resolved",
            summary="Playground simulation (LLM agent)",
            intent=None,
            caller_name=None,
        )
    sim_rt = get_sim_runtime(call_id)
    pref = sim_rt.engine.language_pref if sim_rt else None
    return {
        "call_id": call_id,
        "state": state_machine.current_state.value,
        "bot_response": agent_turn.reply,
        "collected_slots": state_machine.collected_slots,
        "tool_result": None,
        "should_hangup": agent_turn.hangup,
        "should_transfer": agent_turn.transferred,
        "transfer_target": None,
        "llm_provider": agent_turn.provider,  # which model answered (groq / groq:<model> / gemini), for debugging
        "latency_ms": agent_turn.latency_ms,
        "first_sentence_ms": agent_turn.first_sentence_ms,
        # When the caller asked to switch language, tell the browser which speech-recognition language to listen in.
        "stt_language": _STT_LANGUAGE.get(pref) if pref else None,
    }


async def _legacy_turn(payload: VoiceSimulateRequest, call_id: str, state_machine: ConversationStateMachine) -> Dict[str, Any]:
    """One turn through the legacy NLU + state machine (tenants not on the agent, or the LLM being unavailable)."""
    # Extract intent, category & slots via Conversational NLU
    available_intents = [
        {"name": i.name, "description": i.description}
        for i in state_machine.vertical_config.intents
    ]
    current_intent = state_machine.current_intent.name if state_machine.current_intent else None
    last_asked_slot = getattr(state_machine, "last_asked_slot", None)

    recent_turns = [
        {"role": "user", "content": t.user_transcript}
        for t in state_machine.turns[-3:]
    ]

    nlu_result = await ConversationalNLU.analyze_turn(
        user_utterance=payload.user_transcript,
        available_intents=available_intents,
        available_services=state_machine.services,
        agent_name=state_machine.agent_name,
        business_name=state_machine.business_info.get("name", "our clinic"),
        current_intent=current_intent,
        collected_slots=state_machine.collected_slots,
        missing_slot=last_asked_slot,
        recent_turns=recent_turns,
    )

    # Process through deterministic state machine
    result = await state_machine.process_user_turn(
        user_transcript=payload.user_transcript,
        extracted_intent=nlu_result.intent,
        extracted_slots=nlu_result.slots,
        nlu_category=nlu_result.category.value,
        confidence=nlu_result.confidence,
        is_correction=nlu_result.is_correction,
        overridden_slot=nlu_result.overridden_slot,
        is_ambiguous=nlu_result.is_ambiguous,
    )

    bot_resp = result.get("bot_response") or ""
    record_call_turn(
        call_id=call_id,
        user_transcript=payload.user_transcript,
        bot_response=bot_resp,
        turn_sequence=state_machine.sequence,
    )

    if result.get("should_hangup") or result.get("should_transfer"):
        intent_name = state_machine.current_intent.name if state_machine.current_intent else None
        slots = state_machine.collected_slots or {}
        caller_name = slots.get("patient_name") or slots.get("customer_name")
        outcome = "transferred" if result.get("should_transfer") else "resolved"
        record_call_end(
            call_id=call_id,
            outcome=outcome,
            summary=f"Playground simulation: {intent_name or 'General Discussion'}",
            intent=intent_name,
            caller_name=caller_name,
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


@router.post("/api/voice/simulate")
async def simulate_voice_turn(
    payload: VoiceSimulateRequest,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Simulates a voice conversation turn.
    Used by the user dashboard's TestPlaygroundModal and automated tests.
    """
    call_id, state_machine = await _ensure_sim_session(payload, db)
    sim_rt = get_sim_runtime(call_id)
    if sim_rt:
        agent_turn = await sim_rt.engine.turn(payload.user_transcript)
        if not agent_turn.degraded:
            return _finish_agent_turn(call_id, state_machine, payload, agent_turn)
    return await _legacy_turn(payload, call_id, state_machine)


def _ndjson(obj: Dict[str, Any]) -> bytes:
    return (json.dumps(obj, ensure_ascii=False) + "\n").encode("utf-8")


def speech_chunks(sentence: str, soft_limit: int = 90, min_piece: int = 28) -> list:
    """Split a long sentence at a comma / danda / 'and' so audio for the first piece is ready sooner (synthesis time
    grows with length: ~1.2 s for 170 characters vs ~0.4 s for 60). Short sentences are returned untouched."""
    text = sentence.strip()
    if len(text) <= soft_limit:
        return [text] if text else []
    pieces, rest = [], text
    while len(rest) > soft_limit:
        cut = -1
        for m in re.finditer(r"[,;:।]\s+|\s+(?:and|aur|or|but|lekin|par|और|लेकिन)\s+", rest[: soft_limit + 25]):
            if m.end() >= min_piece:
                cut = m.end() if rest[m.start()] in ",;:।" else m.start()
                if m.end() >= soft_limit - 25:
                    break
        if cut < min_piece:
            break
        pieces.append(rest[:cut].strip())
        rest = rest[cut:].strip()
    if rest:
        pieces.append(rest)
    return pieces


@router.post("/api/voice/simulate/stream")
async def simulate_voice_turn_stream(
    payload: VoiceSimulateRequest,
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """Same turn as /simulate, but as newline-delimited JSON: one {"type":"sentence"} event the moment each sentence is
    ready (its audio is already being synthesised), then a final {"type":"done", ...same payload as /simulate}. The
    browser can start speaking the first sentence while the model is still writing the rest."""
    call_id, state_machine = await _ensure_sim_session(payload, db)
    sim_rt = get_sim_runtime(call_id)

    async def events() -> Any:
        sent_any = False
        final = None
        if sim_rt:
            voice = payload.voice_id or sim_rt.profile.voice_id or cartesia_tts.voice_id
            try:
                async for ev in sim_rt.engine.turn_events(payload.user_transcript, stream=True):
                    if ev["type"] == "sentence":
                        for n, piece in enumerate(speech_chunks(ev["text"])):  # long sentences are cut so the first audio is ready sooner
                            sent_any = True
                            emotion = ev.get("emotion")
                            spoken = f"[laughter] {piece}" if ev.get("tts_text") and n == 0 else None  # a laugh opens the sentence
                            _prefetch_tts(piece, voice, emotion, spoken)
                            out = {"type": "sentence", "text": piece}
                            if emotion:
                                out["emotion"] = emotion
                            if spoken:
                                out["tts_text"] = spoken
                            yield _ndjson(out)
                    elif ev["type"] == "done":
                        final = ev["turn"]
            except Exception as e:  # never leave the browser waiting on a broken stream
                logger.warning(f"[SIM STREAM] agent turn failed: {e}")
            if final is not None and (not final.degraded or sent_any):
                yield _ndjson({"type": "done", **_finish_agent_turn(call_id, state_machine, payload, final)})
                return
        # Legacy engine tenants, or the LLM was unavailable before anything was said: one sentence, same protocol.
        result = await _legacy_turn(payload, call_id, state_machine)
        yield _ndjson({"type": "sentence", "text": result["bot_response"]})
        yield _ndjson({"type": "done", **result})

    return StreamingResponse(events(), media_type="application/x-ndjson", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
