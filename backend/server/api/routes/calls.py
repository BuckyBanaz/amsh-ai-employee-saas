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
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, joinedload

from backend.server.api.routes._shared import get_business_or_404, require_membership
from backend.server.auth.security import get_current_user
from backend.server.database.models.call import Call
from backend.server.database.models.message import Message
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


def _format_call(call: Call, include_messages: bool = False) -> Dict[str, Any]:
    res = {
        "id": call.id,
        "is_test": is_test_call(call.id),
        "sentiment": call.sentiment,
        "action_items": call.action_items or [],
        "channel": call_channel(call.id),
        "business_id": call.business_id,
        "caller_number": call.caller_number,
        "caller_name": call.caller_name or "Unknown Caller",
        "intent": call.intent,  # null until the call has been analysed (a few seconds after it ends)
        "outcome": call.outcome or "resolved",
        "summary": call.summary,
        "analyzed": call.analyzed_at is not None,
        "duration_seconds": call.duration_seconds or 0,
        "latency_ms": call.latency_ms or 180,
        "recording_url": call.recording_url,
        "started_at": call.started_at.isoformat() if call.started_at else None,
        "ended_at": call.ended_at.isoformat() if call.ended_at else None,
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
    stmt = (
        select(Call)
        .where(Call.business_id == business_id)
        .order_by(desc(Call.started_at))
        .limit(limit)
    )
    if outcome:
        stmt = stmt.where(Call.outcome == outcome)

    calls = db.scalars(stmt).all()
    return [_format_call(c) for c in calls]


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
            }
        raise HTTPException(status_code=404, detail="Call log not found")

    return _format_call(call, include_messages=True)


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


@recordings_router.get("/{call_id}/{token}")
def stream_recording(call_id: str, token: str) -> FileResponse:
    """Serve a stored recording (supports Range requests, so the player can seek)."""
    if not (_SAFE.match(call_id) and _SAFE.match(token)):
        raise HTTPException(status_code=404, detail="Recording not found")
    for path in RECORDINGS_DIR.glob(f"{call_id}__{token}.*"):
        return FileResponse(path, media_type=_SERVE_TYPES.get(path.suffix.lstrip("."), "application/octet-stream"),
                            headers={"Cache-Control": "private, max-age=3600"})
    raise HTTPException(status_code=404, detail="Recording not found")
