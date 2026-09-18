"""
Twilio WebSocket Gateway & Voice Simulator.
Handles bidirectional streaming audio over WebSocket for Twilio Media Streams,
and provides a direct test endpoint for the UI Playground.
"""

import json
import logging
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.ai.engine.conversation.state_machine import ConversationStateMachine
from backend.ai.llm.client import llm_client
from backend.ai.memory.session_memory import session_memory
from backend.ai.realtime.vad.detector import SimpleVAD
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


@router.websocket("/media-stream/{business_id}")
async def twilio_media_stream(websocket: WebSocket, business_id: str) -> None:
    """Twilio Media Stream bidirectional WebSocket."""
    await websocket.accept()
    stream_sid: Optional[str] = None
    call_id: Optional[str] = None
    state_machine: Optional[ConversationStateMachine] = None

    try:
        while True:
            raw_msg = await websocket.receive_text()
            data = json.loads(raw_msg)
            event_type = data.get("event")

            if event_type == "connected":
                logger.info("[TWILIO WS] Connected")

            elif event_type == "start":
                stream_sid = data["start"]["streamSid"]
                call_id = data["start"].get("callSid", stream_sid)
                logger.info(f"[TWILIO WS] Started call {call_id} for business {business_id}")

                # Resolve vertical
                vertical_cfg = vertical_registry.get_vertical("clinic")
                state_machine = ConversationStateMachine(
                    call_id=call_id,
                    business_id=business_id,
                    caller_number="+15550000000",
                    vertical_config=vertical_cfg,
                )
                session_memory.store_session(call_id, state_machine)
                greeting = state_machine.start_call()
                logger.info(f"[TWILIO WS] AI Greeting: {greeting}")

            elif event_type == "media":
                payload = data["media"]["payload"]
                if vad.is_speech(payload):
                    # Speech detected - barge-in trigger (stop playing prior audio)
                    clear_msg = {"event": "clear", "streamSid": stream_sid}
                    await websocket.send_text(json.dumps(clear_msg))

            elif event_type == "stop":
                logger.info(f"[TWILIO WS] Call ended {call_id}")
                if call_id:
                    session_memory.remove_session(call_id)
                break

    except WebSocketDisconnect:
        logger.info(f"[TWILIO WS] Disconnected {call_id}")
        if call_id:
            session_memory.remove_session(call_id)


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
