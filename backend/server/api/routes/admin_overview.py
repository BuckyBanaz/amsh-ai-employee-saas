"""Platform admin: the dashboard's numbers, all computed from the database and the running server (nothing is estimated
without saying so).

    GET /api/admin/overview

Calls are counted without playground test calls (ids `studio_`, `webcall_`, `sim_`, `test_call_`): those are people trying
the product, not patient traffic. Revenue is an ESTIMATE from the plan prices of active businesses, because payments are not
recorded yet; the response says so.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy import case, func, not_, or_, select, text
from sqlalchemy.orm import Session

from backend.server.auth.security import require_platform_admin
from backend.server.common.config import get_settings
from backend.server.database.models.agent import Agent
from backend.server.database.models.audit_log import AuditLog
from backend.server.database.models.business import Business
from backend.server.database.models.call import Call
from backend.server.database.models.plan import Plan
from backend.server.database.models.transaction import Transaction
from backend.server.database.models.user import User
from backend.server.database.session import get_db

router = APIRouter(prefix="/api/admin", tags=["admin-overview"])

_TEST_PREFIXES = ("studio_", "webcall_", "sim_", "test_call_")


def _real_calls():
    """SQL condition: a call from a patient (phone or WhatsApp), not a playground test."""
    return not_(or_(*[Call.id.like(f"{p}%") for p in _TEST_PREFIXES]))


def _health(db: Session) -> List[Dict[str, str]]:
    from backend.server.common.warmup import state as warmup_state

    settings = get_settings()

    def item(name: str, configured: bool, ready: Optional[bool], detail: str = "") -> Dict[str, str]:
        if not configured:
            return {"name": name, "status": "not_configured", "detail": detail or "Not configured"}
        if ready is None:
            return {"name": name, "status": "operational", "detail": detail}
        return {"name": name, "status": "operational" if ready else "degraded", "detail": detail if ready else "Did not respond at start-up"}

    try:
        db.execute(text("select 1"))
        database = item("Database", True, True)
    except Exception:
        database = item("Database", True, False)
    return [
        item("API", True, None),
        database,
        item("Redis (sessions and cache)", True, warmup_state.redis_ready),
        item("Speech-to-text (Deepgram)", bool(settings.DEEPGRAM_API_KEY), warmup_state.deepgram_ready),
        item("Text-to-speech (Cartesia)", bool(settings.CARTESIA_API_KEY), warmup_state.tts_ready),
        item("AI model (Groq)", bool(settings.GROQ_API_KEY), warmup_state.groq_ready),
        item("Knowledge search (Qdrant)", True, warmup_state.qdrant_ready),
        item("Email (Resend)", bool(settings.RESEND_API_KEY), None),
        item("SMS (Twilio / Exotel)", bool(settings.TWILIO_ACCOUNT_SID or settings.EXOTEL_ACCOUNT_SID), None),
        item("Payments (Razorpay)", bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET), None),
    ]


@router.get("/overview")
def overview(db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    day, prev_day, month, week = now - timedelta(hours=24), now - timedelta(hours=48), now - timedelta(days=30), now - timedelta(days=7)

    businesses = db.scalars(select(Business)).all()
    by_status: Dict[str, int] = {}
    for b in businesses:
        by_status[b.status] = by_status.get(b.status, 0) + 1
    with_ai = db.scalar(select(func.count(func.distinct(Agent.business_id)))) or 0
    new_7d = sum(1 for b in businesses if b.created_at and (b.created_at if b.created_at.tzinfo else b.created_at.replace(tzinfo=timezone.utc)) >= week)

    real = _real_calls()

    def calls_between(start: datetime, end: datetime) -> int:
        return db.scalar(select(func.count()).select_from(Call).where(real, Call.started_at >= start, Call.started_at < end)) or 0

    calls_30d, secs_30d = db.execute(select(func.count(), func.sum(Call.duration_seconds)).where(real, Call.started_at >= month)).one()
    finished = db.execute(
        select(func.count(), func.sum(case((Call.outcome == "resolved", 1), else_=0))).where(real, Call.started_at >= month, Call.outcome != "live")
    ).one()
    finished_count, resolved_count = finished[0] or 0, int(finished[1] or 0)

    def booked_between(start: datetime, end: datetime) -> int:
        return db.scalar(select(func.count()).select_from(Transaction).where(Transaction.type == "appointment", Transaction.created_at >= start, Transaction.created_at < end)) or 0

    # Estimated monthly revenue: the plan price of every active business, yearly plans spread over 12 months.
    plans = {p.key.lower(): p for p in db.scalars(select(Plan)).all()}
    revenue: Dict[str, float] = {}
    paying = 0
    for b in businesses:
        plan = plans.get((b.plan or "").lower())
        if b.status != "active" or not plan or not plan.price or plan.price <= 0:
            continue
        paying += 1
        monthly = plan.price if plan.cycle == "monthly" else plan.price / 12.0
        revenue[plan.currency] = round(revenue.get(plan.currency, 0.0) + monthly, 2)

    # Busiest active businesses over the last 30 days.
    call_counts = {bid: n for bid, n in db.execute(select(Call.business_id, func.count()).where(real, Call.started_at >= month).group_by(Call.business_id)).all()}
    appt_counts = {bid: n for bid, n in db.execute(select(Transaction.business_id, func.count()).where(Transaction.type == "appointment", Transaction.created_at >= month).group_by(Transaction.business_id)).all()}
    agents: Dict[str, Agent] = {}
    for a in db.scalars(select(Agent).order_by(Agent.created_at.asc())).all():
        agents.setdefault(a.business_id, a)
    active = sorted((b for b in businesses if b.status == "active"), key=lambda b: (-call_counts.get(b.id, 0), b.name))[:8]
    top = [
        {"id": b.id, "name": b.name, "type": (b.business_subtype or b.vertical or "clinic").replace("_", " ").title(), "country": b.country,
         "ai_status": agents[b.id].status if b.id in agents else None, "ai_name": agents[b.id].name if b.id in agents else None,
         "calls_30d": call_counts.get(b.id, 0), "appointments_30d": appt_counts.get(b.id, 0), "plan": b.plan, "status": b.status}
        for b in active
    ]

    activity = db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(8)).all()

    return {
        "generated_at": now.isoformat(),
        "tenants": {"total": len(businesses), "active": by_status.get("active", 0), "pending": by_status.get("pending", 0),
                    "paused": by_status.get("paused", 0), "suspended": by_status.get("suspended", 0), "new_7d": new_7d, "with_ai": with_ai},
        "calls": {"last_24h": calls_between(day, now), "previous_24h": calls_between(prev_day, day), "last_30d": calls_30d or 0,
                  "minutes_30d": round((secs_30d or 0) / 60.0, 1),
                  "resolution_rate_30d": round(100.0 * resolved_count / finished_count, 1) if finished_count else None, "resolution_sample": finished_count},
        "appointments": {"booked_24h": booked_between(day, now), "previous_24h": booked_between(prev_day, day), "booked_30d": booked_between(month, now)},
        "revenue": {"monthly_estimate": revenue, "paying_businesses": paying,
                    "basis": "Estimated from the plan prices of active businesses. Payments are not recorded yet."},
        "top_businesses": top,
        "recent_activity": [{"at": r.created_at.isoformat() if r.created_at else None, "action": r.action, "actor": r.actor_email, "outcome": r.outcome} for r in activity],
        "health": _health(db),
    }
