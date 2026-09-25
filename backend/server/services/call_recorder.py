"""
Call & Conversation Persistence Service.
Handles saving live telephony call sessions, speech turns, transcripts, sentiments,
and recording playback URLs to PostgreSQL.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from backend.server.database.session import SessionLocal
from backend.server.database.models.agent import Agent
from backend.server.database.models.call import Call
from backend.server.database.models.message import Message

logger = logging.getLogger(__name__)


def record_call_start(
    call_id: str,
    business_id: str,
    caller_number: str,
    caller_name: Optional[str] = None,
    greeting: Optional[str] = None,
) -> Optional[Call]:
    """
    Persist initial Call record when a caller connects via Exotel, Twilio, or simulator.
    Also stores the opening greeting message as sequence 0.
    """
    try:
        with SessionLocal() as db:
            existing = db.get(Call, call_id)
            if existing:
                return existing

            agent = db.execute(
                select(Agent).where(Agent.business_id == business_id)
            ).scalars().first()
            agent_id = agent.id if agent else None

            call = Call(
                id=call_id,
                business_id=business_id,
                agent_id=agent_id,
                caller_number=caller_number or "Anonymous",
                caller_name=caller_name,
                outcome="live",
                started_at=datetime.now(timezone.utc),
            )
            db.add(call)

            if greeting:
                msg = Message(
                    id=str(uuid.uuid4()),
                    call_id=call_id,
                    speaker="AI",
                    text=greeting,
                    sequence=0,
                    created_at=datetime.now(timezone.utc),
                )
                db.add(msg)

            db.commit()
            logger.info(f"[CALL RECORDER] Call {call_id} registered for business {business_id}")
            return call
    except Exception as e:
        logger.error(f"[CALL RECORDER] Failed to record call start for {call_id}: {e}")
        return None


def record_call_turn(
    call_id: str,
    user_transcript: str,
    bot_response: str,
    turn_sequence: int = 1,
    sentiment: Optional[str] = None,
) -> None:
    """
    Save user speech transcript and AI receptionist response to the messages table.
    """
    try:
        with SessionLocal() as db:
            call = db.get(Call, call_id)
            if not call:
                logger.warning(f"[CALL RECORDER] Call {call_id} not found when saving turn")
                return

            now = datetime.now(timezone.utc)
            if user_transcript and user_transcript.strip():
                user_msg = Message(
                    id=str(uuid.uuid4()),
                    call_id=call_id,
                    speaker="User",
                    text=user_transcript.strip(),
                    sequence=max(1, turn_sequence * 2 - 1),
                    sentiment=sentiment,
                    created_at=now,
                )
                db.add(user_msg)

            if bot_response and bot_response.strip():
                ai_msg = Message(
                    id=str(uuid.uuid4()),
                    call_id=call_id,
                    speaker="AI",
                    text=bot_response.strip(),
                    sequence=max(2, turn_sequence * 2),
                    created_at=now,
                )
                db.add(ai_msg)

            db.commit()
            logger.info(f"[CALL RECORDER] Turn {turn_sequence} saved for call {call_id}")
    except Exception as e:
        logger.error(f"[CALL RECORDER] Failed to record turn for {call_id}: {e}")


def record_call_end(
    call_id: str,
    outcome: Optional[str] = None,
    summary: Optional[str] = None,
    intent: Optional[str] = None,
    duration_seconds: Optional[int] = None,
    recording_url: Optional[str] = None,
    caller_name: Optional[str] = None,
) -> None:
    """
    Update call record on hangup/completion with duration, final outcome,
    collected customer details, and audio recording URL.
    """
    try:
        with SessionLocal() as db:
            call = db.get(Call, call_id)
            if not call:
                logger.warning(f"[CALL RECORDER] Call {call_id} not found when saving end")
                return

            call.ended_at = datetime.now(timezone.utc)
            if duration_seconds is not None and duration_seconds > 0:
                call.duration_seconds = duration_seconds
            elif call.started_at:
                call.duration_seconds = max(1, int((call.ended_at - call.started_at).total_seconds()))

            if outcome:
                call.outcome = outcome
            elif call.outcome == "live":
                call.outcome = "resolved"

            if summary:
                call.summary = summary
            if intent:
                call.intent = intent
            if recording_url:
                call.recording_url = recording_url
            if caller_name and not call.caller_name:
                call.caller_name = caller_name

            db.commit()
            logger.info(f"[CALL RECORDER] Call {call_id} ended (outcome={call.outcome}, duration={call.duration_seconds}s)")
    except Exception as e:
        logger.error(f"[CALL RECORDER] Failed to record call end for {call_id}: {e}")


def update_call_recording_webhook(
    call_id: str,
    recording_url: Optional[str] = None,
    duration_seconds: Optional[int] = None,
    status: Optional[str] = None,
) -> bool:
    """
    Update call recording URL and duration when telephony providers (Exotel / Twilio)
    send their post-call status / recording webhook.
    """
    if not call_id:
        return False

    try:
        with SessionLocal() as db:
            call = db.get(Call, call_id)
            if not call:
                # Fallback: search by CallSid suffix in case of prefix variations
                call = db.query(Call).filter(Call.id.contains(call_id[-16:])).first()

            if not call:
                logger.warning(f"[CALL RECORDER] No call record found for webhook callback {call_id}")
                return False

            if recording_url:
                call.recording_url = recording_url
            if duration_seconds is not None and duration_seconds > 0:
                call.duration_seconds = duration_seconds
            if status:
                status_lower = status.lower()
                if "complete" in status_lower or status_lower == "resolved":
                    call.outcome = "resolved"
                elif "transfer" in status_lower:
                    call.outcome = "transferred"
                elif any(s in status_lower for s in ("fail", "cancel", "busy", "no-answer")):
                    call.outcome = "failed"

            db.commit()
            logger.info(f"[CALL RECORDER] Webhook updated call {call.id} with recording: {recording_url}")
            return True
    except Exception as e:
        logger.error(f"[CALL RECORDER] Error updating recording webhook for {call_id}: {e}")
        return False
