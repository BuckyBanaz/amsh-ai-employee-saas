"""
Calls & Transcripts API Routes.
Provides full history and transcripts of AI receptionist calls.
"""

import logging
import os
import re
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, joinedload

from backend.ai.realtime.twilio.call_control import redirect_call
from backend.ai.realtime.twilio.gateway import get_active_call_session
from backend.server.api.routes._shared import get_business_or_404, require_membership
from backend.server.auth.security import get_current_user
from backend.server.database.models.agent import Agent
from backend.server.database.models.business import Business
from backend.server.database.models.call import Call
from backend.server.database.models.message import Message
from backend.server.database.models.staff import Staff
from backend.server.database.models.transaction import Transaction
from backend.server.database.models.user import User
from backend.server.database.session import get_db
from backend.server.services.call_recorder import _toggle_on as recording_setting_on

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/businesses/{business_id}/calls", tags=["calls"])
# Recordings are played by an <audio> element, which cannot send an Authorization header, so playback uses an unguessable
# per-recording token in the URL (same idea as the provider recording links) instead of a login.
recordings_router = APIRouter(prefix="/api/recordings", tags=["recordings"])

# Where browser-call recordings live. backend/ is bind-mounted in Docker, so this survives container recreation.
RECORDINGS_DIR = Path(os.environ.get("RECORDINGS_DIR") or Path(__file__).resolve().parents[3] / "data" / "recordings")
MAX_RECORDING_BYTES = 30 * 1024 * 1024
_UPLOAD_TYPES = {"audio/webm": "webm", "video/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "mp4", "audio/x-m4a": "m4a",
                 "audio/wav": "wav", "audio/x-wav": "wav", "audio/mpeg": "mp3"}
_SERVE_TYPES = {"webm": "audio/webm", "ogg": "audio/ogg", "mp4": "audio/mp4", "m4a": "audio/mp4", "wav": "audio/wav", "mp3": "audio/mpeg"}
_SAFE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
# Calls made from the dashboard (AI Studio, Test Playground) carry these id prefixes. They are real rows so the transcript
# and recording can be replayed, but the API labels them so the dashboard can show "Test call" (and hide them).
_TEST_PREFIXES = ("studio_", "webcall_", "sim_", "test_call_")
_STALE_TEST_MINUTES = 10  # a playground tab that was closed never sends "hang up"
_STALE_LIVE_MINUTES = 90


def call_channel(call_id: str) -> str:
    """phone | whatsapp | playground, from the id prefix each channel uses."""
    if (call_id or "").startswith("wa_"):
        return "whatsapp"
    return "playground" if is_test_call(call_id) else "phone"


def is_test_call(call_id: str) -> bool:
    return (call_id or "").startswith(_TEST_PREFIXES)


def _close_stale_live_calls(db: Session, business_id: str) -> None:
    """Calls still marked live long after they started never got a hang-up signal (closed tab, dropped connection).
    Close them so the list is honest instead of showing "in progress" forever."""
    now = datetime.now(timezone.utc)
    changed = False
    closed: List[str] = []
    for call in db.scalars(select(Call).where(Call.business_id == business_id, Call.outcome == "live")).all():
        started = call.started_at
        if not started:
            continue
        started = started if started.tzinfo else started.replace(tzinfo=timezone.utc)
        limit = _STALE_TEST_MINUTES if is_test_call(call.id) else _STALE_LIVE_MINUTES
        if (now - started).total_seconds() > limit * 60:
            call.outcome = "resolved"
            call.ended_at = call.ended_at or now
            call.summary = call.summary or "Call ended without a hang-up signal."
            closed.append(call.id)
            changed = True
    if changed:
        db.commit()
        from backend.server.services.post_call import schedule

        for cid in closed:
            schedule(cid)


def _detect_language(call: Call) -> str:
    msg_texts = [getattr(msg, "text", "") or getattr(msg, "content", "") for msg in (call.messages or [])]
    full_text = " ".join(msg_texts) + " " + (call.summary or "")
    if re.search(r"[\u0900-\u097F]", full_text):
        return "Hindi / Hinglish"
    hinglish_words = {"apki", "karenge", "bataiye", "chahiye", "kripya", "dhanyawad", "namaste", "madad", "samay", "kijiye", "bhi", "hoga", "sakte", "mera", "meri", "hum"}
    words = set(re.findall(r"\w+", full_text.lower()))
    if len(words.intersection(hinglish_words)) >= 2:
        return "Hindi / Hinglish"
    return "English"


def _format_call(
    call: Call,
    include_messages: bool = False,
    db: Optional[Session] = None,
    biz: Optional[Business] = None,
    agent: Optional[Agent] = None,
) -> Dict[str, Any]:
    biz_name = getattr(biz, "name", None) if biz else None
    agent_name = getattr(agent, "name", None) if agent else None
    agent_role = getattr(agent, "role", "Clinic Receptionist") if agent else None

    if db:
        if not biz_name:
            b = db.get(Business, call.business_id)
            if b:
                biz_name = b.name
        if not agent_name:
            ag = None
            if call.agent_id:
                ag = db.get(Agent, call.agent_id)
            if not ag:
                ag = db.scalar(select(Agent).where(Agent.business_id == call.business_id).limit(1))
            if ag:
                agent_name = ag.name
                agent_role = getattr(ag, "role", None) or "Clinic Receptionist"

    # Determine real appointment info
    appointment_data = None
    if db:
        txn = db.scalar(select(Transaction).where(Transaction.call_id == call.id))
        if not txn and call.caller_number and call.caller_number.strip():
            raw_phone = re.sub(r"[^\d]", "", call.caller_number)
            if raw_phone:
                txns = db.scalars(
                    select(Transaction)
                    .where(Transaction.business_id == call.business_id)
                    .order_by(desc(Transaction.created_at))
                    .limit(10)
                ).all()
                for t in txns:
                    p = re.sub(r"[^\d]", "", str((t.details or {}).get("phone_number") or ""))
                    if p and (p in raw_phone or raw_phone in p):
                        txn = t
                        break
        if txn and txn.details:
            appointment_data = {
                "id": txn.id,
                "service_name": txn.details.get("service_name") or "General Consultation",
                "doctor_name": txn.details.get("doctor_name") or "Duty Doctor",
                "preferred_date": txn.details.get("preferred_date"),
                "preferred_time": txn.details.get("preferred_time"),
                "patient_name": txn.details.get("patient_name") or txn.details.get("customer_name") or call.caller_name or "Patient",
                "status": txn.status or "confirmed",
                "channel": txn.details.get("channel") or txn.details.get("source") or ("WhatsApp" if call_channel(call.id) == "whatsapp" else "Phone Call"),
            }

    # If call outcome is booked but no transaction row in DB yet (e.g. simulated call), extract from summary
    if not appointment_data and (call.outcome or "").lower() == "booked":
        s = call.summary or ""
        srv_match = re.search(r"(teeth whitening|dental consultation|dental cleaning|checkup|cleaning|root canal|consultation)", s, re.IGNORECASE)
        service_title = srv_match.group(0).title() if srv_match else "Consultation"
        time_match = re.search(r"(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?(?:, \d{4})?(?: at \d{1,2}(?::\d{2})? ?(?:AM|PM|am|pm))?)", s, re.IGNORECASE)
        appointment_data = {
            "id": f"app-{call.id[:8]}",
            "service_name": service_title,
            "doctor_name": "Duty Doctor",
            "preferred_date": time_match.group(0) if time_match else "Scheduled",
            "preferred_time": "",
            "patient_name": call.caller_name or "Patient",
            "status": "confirmed",
            "channel": "WhatsApp" if call_channel(call.id) == "whatsapp" else "Phone Call",
        }

    call_type = "Outbound (Test)" if is_test_call(call.id) else ("Outbound" if (call.id or "").startswith("out_") else "Inbound")
    detected_lang = _detect_language(call)

    res = {
        "id": call.id,
        "is_test": is_test_call(call.id),
        "sentiment": call.sentiment or "positive",
        "action_items": call.action_items or [],
        "channel": call_channel(call.id),
        "business_id": call.business_id,
        "business_name": biz_name or "Demo clinic",
        "agent_name": agent_name or "Sarah",
        "agent_role": agent_role or "Clinic Receptionist",
        "call_type": call_type,
        "language": detected_lang,
        "caller_number": call.caller_number,
        "caller_name": call.caller_name or "Unknown Caller",
        "intent": call.intent or ("Appointment Booking" if call.outcome == "booked" else ("Staff Transfer" if call.outcome == "transferred" else "General Inquiry")),
        "outcome": call.outcome or "resolved",
        "summary": call.summary,
        "analyzed": call.analyzed_at is not None,
        "duration_seconds": call.duration_seconds or 0,
        "latency_ms": call.latency_ms or 180,
        "recording_url": call.recording_url,
        "started_at": call.started_at.isoformat() if call.started_at else None,
        "ended_at": call.ended_at.isoformat() if call.ended_at else None,
        "appointment": appointment_data,
    }
    if include_messages:
        res["messages"] = [
            {
                "id": msg.id,
                "role": "assistant" if getattr(msg, "speaker", "") == "AI" else "user",
                "content": getattr(msg, "text", "") or getattr(msg, "content", ""),
                "sequence": msg.sequence,
                "created_at": msg.created_at.isoformat() if msg.created_at else None,
            }
            for msg in (call.messages or [])
        ]
    return res


@router.get("", response_model=List[Dict[str, Any]])
def list_calls(
    business_id: str,
    outcome: Optional[str] = Query(None, description="Filter by outcome: resolved, transferred, failed, live"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """List call history logs for a tenant business."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    _close_stale_live_calls(db, business_id)

    biz = db.get(Business, business_id)
    agent = db.scalar(select(Agent).where(Agent.business_id == business_id).limit(1))

    stmt = (
        select(Call)
        .where(Call.business_id == business_id)
        .order_by(desc(Call.started_at))
        .limit(limit)
    )
    if outcome:
        stmt = stmt.where(Call.outcome == outcome)

    calls = db.scalars(stmt).all()
    return [_format_call(c, include_messages=False, db=db, biz=biz, agent=agent) for c in calls]


@router.get("/{call_id}", response_model=Dict[str, Any])
def get_call_detail(
    business_id: str,
    call_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Get single call log with complete transcript messages."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)

    biz = db.get(Business, business_id)
    agent = db.scalar(select(Agent).where(Agent.business_id == business_id).limit(1))

    stmt = (
        select(Call)
        .options(joinedload(Call.messages))
        .where(Call.id == call_id, Call.business_id == business_id)
    )
    call = db.scalar(stmt)
    if not call:
        if call_id.startswith(("CA", "exotel_", "studio_", "sim_")):
            now_iso = datetime.now(timezone.utc).isoformat()
            return {
                "id": call_id,
                "is_test": True,
                "sentiment": "neutral",
                "action_items": [],
                "channel": "phone",
                "business_id": business_id,
                "business_name": getattr(biz, "name", "Demo clinic"),
                "agent_name": getattr(agent, "name", "Sarah"),
                "agent_role": getattr(agent, "role", "Clinic Receptionist"),
                "call_type": "Outbound (Test)",
                "language": "Hindi / Hinglish",
                "caller_number": "",
                "caller_name": "Connecting...",
                "intent": None,
                "outcome": "live",
                "summary": "Call dialing or connecting...",
                "analyzed": False,
                "duration_seconds": 0,
                "latency_ms": 180,
                "recording_url": None,
                "started_at": now_iso,
                "ended_at": None,
                "messages": [],
                "appointment": None,
            }
        raise HTTPException(status_code=404, detail="Call log not found")

    return _format_call(call, include_messages=True, db=db, biz=biz, agent=agent)


class CallUpdateRequest(BaseModel):
    outcome: Optional[str] = None
    summary: Optional[str] = None
    notes: Optional[str] = None
    action_items: Optional[List[str]] = None


@router.patch("/{call_id}")
def update_call(
    business_id: str,
    call_id: str,
    payload: CallUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Update call log status (e.g. resolve/unresolve) or attach staff notes."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    call = db.scalar(select(Call).where(Call.id == call_id, Call.business_id == business_id))
    if not call:
        raise HTTPException(status_code=404, detail="Call log not found")
    if payload.outcome is not None:
        call.outcome = payload.outcome
    if payload.summary is not None:
        call.summary = payload.summary
    if payload.notes is not None:
        items = list(call.action_items or [])
        items.append(f"Staff note: {payload.notes}")
        call.action_items = items
    if payload.action_items is not None:
        call.action_items = payload.action_items
    db.commit()
    db.refresh(call)

    biz = db.get(Business, business_id)
    agent = db.scalar(select(Agent).where(Agent.business_id == business_id).limit(1))
    return _format_call(call, include_messages=True, db=db, biz=biz, agent=agent)


@router.delete("/{call_id}")
def delete_call(
    business_id: str,
    call_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Permanently delete a call log and any associated audio recordings."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    call = db.scalar(select(Call).where(Call.id == call_id, Call.business_id == business_id))
    if not call:
        raise HTTPException(status_code=404, detail="Call log not found")
    _delete_recordings(call_id)
    db.delete(call)
    db.commit()
    return {"deleted": True, "call_id": call_id}


def _delete_recordings(call_id: str, keep: Optional[Path] = None) -> None:
    for old in RECORDINGS_DIR.glob(f"{call_id}__*"):
        if keep is None or old != keep:
            try:
                old.unlink()
            except OSError:
                logger.warning("Could not delete old recording %s", old)


@router.post("/{call_id}/recording")
async def upload_call_recording(
    business_id: str,
    call_id: str,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Attach an audio recording to a call (the dashboard playground uploads the recording of a browser call: caller mic
    plus the AI's voice). Respects the tenant's 'record calls' switch."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    call = db.scalar(select(Call).where(Call.id == call_id, Call.business_id == business_id))
    if not call:
        raise HTTPException(status_code=404, detail="Call log not found")
    if not _SAFE.match(call_id):
        raise HTTPException(status_code=400, detail="Unsupported call id")
    ext = _UPLOAD_TYPES.get((file.content_type or "").split(";")[0].strip().lower())
    if not ext:
        raise HTTPException(status_code=415, detail="Unsupported audio type")
    if not recording_setting_on(db, business_id, "record"):
        return {"stored": False, "reason": "Call recording is switched off for this agent"}
    data = await file.read(MAX_RECORDING_BYTES + 1)
    if len(data) > MAX_RECORDING_BYTES:
        raise HTTPException(status_code=413, detail="Recording is too large")
    if len(data) < 500:
        raise HTTPException(status_code=400, detail="Recording is empty")

    RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
    token = secrets.token_urlsafe(12)
    path = RECORDINGS_DIR / f"{call_id}__{token}.{ext}"
    path.write_bytes(data)
    _delete_recordings(call_id, keep=path)  # a re-upload replaces the earlier file
    call.recording_url = f"{str(request.base_url).rstrip('/')}/api/recordings/{call_id}/{token}"
    db.commit()
    return {"stored": True, "recording_url": call.recording_url, "bytes": len(data)}


@router.post("/{call_id}/end")
def end_simulated_call(
    business_id: str,
    call_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Close a call that is still marked live (the playground never told the server the tester hung up, so those calls sat
    at 'live, 0s' forever). Calls that already ended are left untouched."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    call = db.scalar(select(Call).where(Call.id == call_id, Call.business_id == business_id))
    if not call:
        if is_test_call(call_id):
            return {"ended": False, "reason": "Test call not persisted or already cleaned up"}
        raise HTTPException(status_code=404, detail="Call log not found")
    if call.outcome != "live":
        return {"ended": False, "outcome": call.outcome}
    now = datetime.now(timezone.utc)
    call.ended_at = now
    if call.started_at:
        started = call.started_at if call.started_at.tzinfo else call.started_at.replace(tzinfo=timezone.utc)
        call.duration_seconds = max(1, int((now - started).total_seconds()))
    call.outcome = "resolved"
    call.summary = call.summary or "Test call ended from the dashboard playground."
    db.commit()
    from backend.server.services.post_call import schedule

    schedule(call.id)
    return {"ended": True, "outcome": call.outcome, "duration_seconds": call.duration_seconds}


class CallTakeoverRequest(BaseModel):
    phone_number: Optional[str] = None


@router.post("/{call_id}/takeover")
async def takeover_call(
    business_id: str,
    call_id: str,
    payload: Optional[CallTakeoverRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Take over a live call: silences the AI receptionist, bridges caller to staff phone line, and logs the handoff."""
    biz = get_business_or_404(business_id, db)
    require_membership(business_id, current_user)

    call = db.scalar(select(Call).where(Call.id == call_id, Call.business_id == business_id))
    if not call:
        raise HTTPException(status_code=404, detail="Call log not found")

    # 1. Resolve destination phone number for the takeover
    agent = db.execute(select(Agent).where(Agent.business_id == business_id).order_by(Agent.created_at.asc())).scalars().first()
    agent_cfg = (agent.config or {}) if agent else {}
    target_phone = (payload.phone_number if payload and payload.phone_number else None)
    if not target_phone:
        target_phone = agent_cfg.get("transfer_phone")
    if not target_phone:
        staff_row = db.execute(select(Staff).where(Staff.business_id == business_id)).scalars().first()
        if staff_row and getattr(staff_row, "phone", None):
            target_phone = staff_row.phone
    if not target_phone and getattr(biz, "business_phone", None):
        target_phone = biz.business_phone
    if not target_phone:
        target_phone = getattr(current_user, "email", "Clinic Front Desk")

    # 2. Stop and silence active AI WebSocket session if active
    session = get_active_call_session(call_id)
    if session:
        session.should_close = True
        try:
            if session.agent_rt and session.agent_rt.engine:
                session.agent_rt.engine.request_stop()
        except Exception as e:
            logger.debug(f"[TAKEOVER] Engine stop error: {e}")

    # 3. If live telephony (Twilio), execute real live call transfer
    redirected = False
    if call_id.startswith("CA") and target_phone and target_phone.startswith("+"):
        twiml = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Response>'
            '<Say voice="Polly.Joanna">Connecting you to our clinic staff now, please stay on the line.</Say>'
            f'<Dial timeout="25" record="record-from-answer"><Number>{target_phone}</Number></Dial>'
            '</Response>'
        )
        redirected = await redirect_call(call_id, twiml)

    # 4. Update Call record outcome and summary
    call.outcome = "transferred"
    call.summary = f"Call taken over from dashboard by {current_user.email} and transferred to {target_phone}."
    db.commit()

    logger.info(f"[TAKEOVER] Call {call_id} handed off to staff {target_phone} (telephony redirected={redirected})")
    return {
        "success": True,
        "call_id": call_id,
        "transferred_to": target_phone,
        "telephony_redirected": redirected,
        "message": f"Call successfully taken over. Connecting caller to {target_phone}.",
    }


@recordings_router.get("/{call_id}/{token}")
def stream_recording(call_id: str, token: str) -> FileResponse:
    """Serve a stored recording (supports Range requests, so the player can seek)."""
    if not (_SAFE.match(call_id) and _SAFE.match(token)):
        raise HTTPException(status_code=404, detail="Recording not found")
    for path in RECORDINGS_DIR.glob(f"{call_id}__{token}.*"):
        return FileResponse(path, media_type=_SERVE_TYPES.get(path.suffix.lstrip("."), "application/octet-stream"),
                            headers={"Cache-Control": "private, max-age=3600"})
    raise HTTPException(status_code=404, detail="Recording not found")
