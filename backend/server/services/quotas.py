"""Plan quotas: what a clinic's plan allows and what it has used this month.

A plan's quotas (admin portal > Billing > plans) are numbers, `None` meaning unlimited. Usage is counted from the clinic's own rows:
    seats        users of the clinic, including invited people who have not joined yet (they hold a seat)
    knowledge_docs   knowledge-base entries
    voice_minutes    talk time of this calendar month's calls (UTC month), from `calls.duration_seconds`
    messages         messages sent this month through the message system (`message_log`)

Resource limits that are plain counts (seats, knowledge documents) are enforced when the clinic tries to add one more. Voice minutes and
messages are reported, and only stop service when the server setting ENFORCE_VOICE_QUOTA is on: cutting off a clinic's phone line
mid-month is a business decision (overage billing is not built yet), so it is off until the owner chooses.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.server.database.models.business import Business
from backend.server.database.models.call import Call
from backend.server.database.models.knowledge_base import KnowledgeDocument
from backend.server.database.models.message_template import MessageLog
from backend.server.database.models.user import User
from backend.server.services import plans as catalog

NEAR = 0.8  # "close to the limit" from 80%
TRACKED = ("voice_minutes", "messages", "seats", "knowledge_docs")


def _month_start(now: datetime) -> datetime:
    return now.astimezone(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def limits(db: Session, business: Business) -> Dict[str, Optional[float]]:
    plan = catalog.find_by_key(db, business.plan)
    return dict((plan.quotas or {}) if plan else {})  # no matching plan: nothing is limited


def used(db: Session, business: Business, now: Optional[datetime] = None) -> Dict[str, float]:
    start = _month_start(now or datetime.now(timezone.utc))
    seconds = db.scalar(select(func.coalesce(func.sum(Call.duration_seconds), 0)).where(Call.business_id == business.id, Call.started_at >= start)) or 0
    return {
        "voice_minutes": round(seconds / 60, 1),
        "messages": db.scalar(select(func.count()).select_from(MessageLog).where(MessageLog.business_id == business.id, MessageLog.status != "failed", MessageLog.created_at >= start)) or 0,
        "seats": db.scalar(select(func.count()).select_from(User).where(User.business_id == business.id)) or 0,
        "knowledge_docs": db.scalar(select(func.count()).select_from(KnowledgeDocument).where(KnowledgeDocument.business_id == business.id)) or 0,
    }


def status_for(db: Session, business: Business, now: Optional[datetime] = None) -> List[Dict[str, Any]]:
    lim, use = limits(db, business), used(db, business, now)
    meta = {q["key"]: q for q in catalog.QUOTAS}
    out = []
    for key in TRACKED:
        limit = lim.get(key)
        n = use[key]
        pct = None if not limit else round(n / limit * 100)
        state = "unlimited" if limit is None else "over" if n >= limit else "near" if n >= limit * NEAR else "ok"
        out.append({"key": key, "label": meta[key]["label"], "unit": meta[key]["unit"], "used": n, "limit": limit, "percent": pct, "state": state})
    return out


def enforce_add(db: Session, business: Business, key: str, adding: int = 1) -> None:
    """Refuse (HTTP 402) when adding `adding` more of a counted resource would pass the plan's limit."""
    limit = limits(db, business).get(key)
    if limit is None:
        return
    if used(db, business)[key] + adding > limit:
        label = next(q["label"].lower() for q in catalog.QUOTAS if q["key"] == key)
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=f"Your plan includes {int(limit)} {label}. Upgrade your plan to add more.")


def voice_allowed(db: Session, business: Business, enforce: bool, now: Optional[datetime] = None) -> bool:
    """False only when enforcement is on and this month's minutes are used up."""
    limit = limits(db, business).get("voice_minutes")
    if not enforce or limit is None:
        return True
    return used(db, business, now)["voice_minutes"] < limit
