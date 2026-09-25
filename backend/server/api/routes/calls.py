"""
Calls & Transcripts API Routes.
Provides full history and transcripts of AI receptionist calls.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, joinedload

from backend.server.api.routes._shared import get_business_or_404, require_membership
from backend.server.auth.security import get_current_user
from backend.server.database.models.call import Call
from backend.server.database.models.message import Message
from backend.server.database.models.user import User
from backend.server.database.session import get_db

router = APIRouter(prefix="/api/businesses/{business_id}/calls", tags=["calls"])


def _format_call(call: Call, include_messages: bool = False) -> Dict[str, Any]:
    res = {
        "id": call.id,
        "business_id": call.business_id,
        "caller_number": call.caller_number,
        "caller_name": call.caller_name or "Unknown Caller",
        "intent": call.intent or "General Inquiry",
        "outcome": call.outcome or "resolved",
        "summary": call.summary or "Call completed.",
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
        raise HTTPException(status_code=404, detail="Call log not found")

    return _format_call(call, include_messages=True)
