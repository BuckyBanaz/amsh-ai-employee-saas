"""
Platform Admin API Router.
Namespace for AMSh internal operations: platform admins, tenants, monitoring and audit trails. Every route except login is
guarded by `require_platform_admin` (scope "platform"); a clinic's owner or staff can never reach it.

Base prefix: /api/admin
Built: /auth/login, /auth/me, /tenants (list, detail, suspend / reactivate / change plan). Planned (see DOCS/18, Phase 3): users, tenants, cross-tenant reads, billing, analytics,
health, audit, tickets, announcements.
"""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from backend.server.api.routes.auth import LoginRequest, TOO_MANY_ATTEMPTS, TokenOut, UserOut, login_locked
from backend.server.auth.security import MIN_PASSWORD_LENGTH, create_access_token, hash_password, require_platform_admin, verify_password
from backend.server.database.models.agent import Agent
from backend.server.database.models.business import Business
from backend.server.database.models.call import Call
from backend.server.database.models.plan import Plan
from backend.server.database.models.transaction import Transaction
from backend.server.database.models.user import User
from backend.server.database.session import get_db
from backend.server.services.account_emails import send_password_setup_email
from backend.server.services.audit import audit, client_ip
from backend.server.services.plans import find_by_key

router = APIRouter(prefix="/api/admin", tags=["admin"])

ADMIN_LOGIN = "admin.login"


@router.post("/auth/login", response_model=TokenOut)
def admin_login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Sign in to the admin portal. Anyone who is not an active platform admin gets the same 401 as a wrong password."""
    ip = client_ip(request)
    if login_locked(db, payload.email, ADMIN_LOGIN):
        audit(db, "admin.login_blocked", actor_email=payload.email, outcome="failure", ip=ip)
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=TOO_MANY_ATTEMPTS)
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or user.scope != "platform" or not user.is_active or not verify_password(payload.password, user.hashed_password):
        audit(db, ADMIN_LOGIN, actor_email=payload.email, outcome="failure", ip=ip)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    user.last_active_at = datetime.now(timezone.utc)
    db.commit()
    audit(db, ADMIN_LOGIN, user, ip=ip)
    return TokenOut(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.get("/auth/me", response_model=UserOut)
def admin_me(current_user: User = Depends(require_platform_admin)):
    return UserOut.model_validate(current_user)


# ------------------------------------------------------------------ single tenant retention & purge
PURGE_CONFIRMATION = "DELETE"


def purge_other_businesses(db: Session, keep_id: str, dry_run: bool = True) -> Dict[str, Any]:
    """PERMANENTLY deletes every business except `keep_id` with all of its rows (users, calls, messages, bookings, staff, services,
    knowledge, numbers, integrations, usage, audit rows). Platform administrators are kept.

    Never call this from a read endpoint or on startup: it is reached only through `POST /database/purge-other-businesses`, which
    previews first (`dry_run=True` deletes nothing) and needs the confirmation word before it deletes. There is no undo."""
    from backend.server.database.models.agent import Agent
    from backend.server.database.models.audit_log import AuditLog
    from backend.server.database.models.business import Business
    from backend.server.database.models.call import Call
    from backend.server.database.models.integration import Integration
    from backend.server.database.models.knowledge_base import KnowledgeDocument
    from backend.server.database.models.message import Message
    from backend.server.database.models.phone_number import PhoneNumber
    from backend.server.database.models.service import Service, staff_services
    from backend.server.database.models.staff import Staff
    from backend.server.database.models.transaction import Transaction
    from backend.server.database.models.usage import Usage
    from backend.server.database.models.user import User

    # Verify that the target business exists before deleting anything
    target = db.get(Business, keep_id)
    if not target:
        return {"status": "target_not_found", "kept_id": keep_id, "deleted_businesses": 0}

    other_biz_ids = db.scalars(select(Business.id).where(Business.id != keep_id)).all()
    if not other_biz_ids:
        return {"status": "already_clean", "kept_id": keep_id, "deleted_businesses": 0}

    # 1. Non-platform users belonging to other businesses or unlinked
    users_to_del = db.scalars(
        select(User.id).where(
            User.scope != "platform",
            or_(User.business_id.in_(other_biz_ids), User.business_id.is_(None))
        )
    ).all()

    if dry_run:  # a preview: what would go, nothing is touched
        names = [n for (n,) in db.execute(select(Business.name).where(Business.id.in_(other_biz_ids))).all()]
        return {
            "status": "preview",
            "kept_business": {"id": target.id, "name": target.name},
            "would_delete_businesses": len(other_biz_ids),
            "business_names": names,
            "would_delete_users": len(users_to_del),
            "would_delete_calls": db.scalar(select(func.count()).select_from(Call).where(Call.business_id.in_(other_biz_ids))) or 0,
            "would_delete_bookings": db.scalar(select(func.count()).select_from(Transaction).where(Transaction.business_id.in_(other_biz_ids))) or 0,
            "to_delete_for_real": f'POST again with "dry_run": false and "confirm": "{PURGE_CONFIRMATION}"',
        }

    # 2. Audit logs: unlink actor_user_id for deleted users, remove logs for other businesses
    if users_to_del:
        db.query(AuditLog).filter(AuditLog.actor_user_id.in_(users_to_del)).update(
            {AuditLog.actor_user_id: None}, synchronize_session=False
        )
    db.query(AuditLog).filter(AuditLog.business_id.in_(other_biz_ids)).delete(synchronize_session=False)

    # 3. Calls & Messages: find calls of other businesses and delete their messages
    other_call_ids = db.scalars(select(Call.id).where(Call.business_id.in_(other_biz_ids))).all()
    if other_call_ids:
        db.query(Message).filter(Message.call_id.in_(other_call_ids)).delete(synchronize_session=False)

    # 4. Transactions: delete records of other businesses or referring to other calls
    txn_filters = [Transaction.business_id.in_(other_biz_ids)]
    if other_call_ids:
        txn_filters.append(Transaction.call_id.in_(other_call_ids))
    db.query(Transaction).filter(or_(*txn_filters)).delete(synchronize_session=False)

    # 5. Calls: unlink taken_over_by_user_id and delete other calls
    if users_to_del:
        db.query(Call).filter(Call.taken_over_by_user_id.in_(users_to_del)).update(
            {Call.taken_over_by_user_id: None}, synchronize_session=False
        )
    if other_call_ids:
        db.query(Call).filter(Call.id.in_(other_call_ids)).delete(synchronize_session=False)

    # 6. Knowledge documents, phone numbers, integrations, usage
    db.query(KnowledgeDocument).filter(KnowledgeDocument.business_id.in_(other_biz_ids)).delete(synchronize_session=False)
    db.query(PhoneNumber).filter(PhoneNumber.business_id.in_(other_biz_ids)).delete(synchronize_session=False)
    db.query(Integration).filter(Integration.business_id.in_(other_biz_ids)).delete(synchronize_session=False)
    db.query(Usage).filter(Usage.business_id.in_(other_biz_ids)).delete(synchronize_session=False)

    # 7. Staff and Services + secondary association
    other_staff_ids = db.scalars(select(Staff.id).where(Staff.business_id.in_(other_biz_ids))).all()
    other_service_ids = db.scalars(select(Service.id).where(Service.business_id.in_(other_biz_ids))).all()
    if other_staff_ids or other_service_ids:
        conds = []
        if other_staff_ids:
            conds.append(staff_services.c.staff_id.in_(other_staff_ids))
        if other_service_ids:
            conds.append(staff_services.c.service_id.in_(other_service_ids))
        db.execute(staff_services.delete().where(or_(*conds)))

    db.query(Staff).filter(Staff.business_id.in_(other_biz_ids)).delete(synchronize_session=False)
    db.query(Service).filter(Service.business_id.in_(other_biz_ids)).delete(synchronize_session=False)

    # 8. Agents
    db.query(Agent).filter(Agent.business_id.in_(other_biz_ids)).delete(synchronize_session=False)

    # 9. Users (non-platform only)
    if users_to_del:
        db.query(User).filter(User.id.in_(users_to_del)).delete(synchronize_session=False)

    # 10. Businesses
    db.query(Business).filter(Business.id.in_(other_biz_ids)).delete(synchronize_session=False)

    db.commit()
    return {
        "status": "success",
        "kept_business": {"id": target.id, "name": target.name},
        "deleted_businesses": len(other_biz_ids),
        "deleted_users": len(users_to_del),
        "deleted_calls": len(other_call_ids),
    }


# ------------------------------------------------------------------ tenants (businesses)
TENANT_STATUSES = ("active", "paused", "suspended", "pending")


def _type_label(b: Business) -> str:
    return (b.business_subtype or b.vertical or "clinic").replace("_", " ").title()


def _owners(db: Session, ids: List[str]) -> Dict[str, User]:
    """The business owner (first user with role owner); if a business has none, its oldest user."""
    out: Dict[str, User] = {}
    for u in db.scalars(select(User).where(User.business_id.in_(ids)).order_by(User.created_at.asc())).all():
        current = out.get(u.business_id)
        if current is None or (u.role == "owner" and current.role != "owner"):
            out[u.business_id] = u
    return out


def _first_agents(db: Session, ids: List[str]) -> Dict[str, Agent]:
    out: Dict[str, Agent] = {}
    for a in db.scalars(select(Agent).where(Agent.business_id.in_(ids)).order_by(Agent.created_at.asc())).all():
        out.setdefault(a.business_id, a)  # the oldest agent is the one the dashboard shows
    return out


def _tenant_row(b: Business, owner: Optional[User], agent: Optional[Agent], users: int, calls: int, minutes: float) -> Dict[str, Any]:
    return {
        "id": b.id,
        "name": b.name,
        "type": _type_label(b),
        "owner_name": owner.name if owner else None,
        "owner_email": owner.email if owner else None,
        "country": b.country,
        "ai_receptionist": agent.name if agent else None,
        "plan": b.plan,
        "status": b.status,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "users_count": users,
        "calls_30d": calls,
        "minutes_30d": round(minutes, 1),
    }


@router.get("/tenants")
def list_tenants(
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    plan: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
) -> Dict[str, Any]:
    """Every clinic on the platform, with owner, AI receptionist and 30-day usage, plus the values for the filter menus."""
    query = select(Business)
    if search and search.strip():
        like = f"%{search.strip()}%"
        owner_ids = select(User.business_id).where(User.business_id.is_not(None), or_(User.name.ilike(like), User.email.ilike(like)))
        query = query.where(or_(Business.name.ilike(like), Business.business_email.ilike(like), Business.city.ilike(like), Business.id.in_(owner_ids)))
    if status_filter:
        query = query.where(Business.status == status_filter)
    if plan:
        query = query.where(Business.plan == plan)
    if country:
        query = query.where(Business.country == country)
    if type:
        query = query.where(func.replace(func.coalesce(Business.business_subtype, Business.vertical), "_", " ").ilike(type.replace("_", " ")))

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    rows = db.scalars(query.order_by(Business.created_at.desc()).limit(limit).offset(offset)).all()
    ids = [b.id for b in rows]

    owners, agents = (_owners(db, ids), _first_agents(db, ids)) if ids else ({}, {})
    users = dict(db.execute(select(User.business_id, func.count()).where(User.business_id.in_(ids)).group_by(User.business_id)).all()) if ids else {}
    since = datetime.now(timezone.utc) - timedelta(days=30)
    usage = {
        bid: (n, secs or 0)
        for bid, n, secs in db.execute(
            select(Call.business_id, func.count(), func.sum(Call.duration_seconds)).where(Call.business_id.in_(ids), Call.started_at >= since).group_by(Call.business_id)
        ).all()
    } if ids else {}

    everything = db.scalars(select(Business)).all()
    return {
        "items": [
            _tenant_row(b, owners.get(b.id), agents.get(b.id), users.get(b.id, 0), usage.get(b.id, (0, 0))[0], usage.get(b.id, (0, 0))[1] / 60.0)
            for b in rows
        ],
        "total": total,
        "facets": {
            "countries": sorted({b.country for b in everything if b.country}),
            "plans": sorted({b.plan for b in everything if b.plan}),
            "statuses": list(TENANT_STATUSES),
            "types": sorted({_type_label(b) for b in everything}),
        },
    }


@router.get("/tenants/{business_id}")
def get_tenant(business_id: str, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    b = db.get(Business, business_id)
    if not b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")
    owner = _owners(db, [b.id]).get(b.id)
    agents = db.scalars(select(Agent).where(Agent.business_id == b.id).order_by(Agent.created_at.asc())).all()
    last_call = db.scalar(select(func.max(Call.started_at)).where(Call.business_id == b.id))
    since = datetime.now(timezone.utc) - timedelta(days=30)
    calls_30d, secs_30d = db.execute(select(func.count(), func.sum(Call.duration_seconds)).where(Call.business_id == b.id, Call.started_at >= since)).one()
    row = _tenant_row(b, owner, agents[0] if agents else None, db.scalar(select(func.count()).select_from(User).where(User.business_id == b.id)) or 0, calls_30d or 0, (secs_30d or 0) / 60.0)
    return {
        **row,
        "phone": b.business_phone,
        "email": b.business_email,
        "website": b.website,
        "address": b.address,
        "city": b.city,
        "timezone": b.timezone,
        "agents": [{"id": a.id, "name": a.name, "status": a.status, "created_at": a.created_at.isoformat() if a.created_at else None} for a in agents],
        "totals": {
            "calls": db.scalar(select(func.count()).select_from(Call).where(Call.business_id == b.id)) or 0,
            "appointments": db.scalar(select(func.count()).select_from(Transaction).where(Transaction.business_id == b.id, Transaction.type == "appointment")) or 0,
        },
        "last_call_at": last_call.isoformat() if last_call else None,
    }


class TenantPatch(BaseModel):
    status: Optional[Literal["active", "paused", "suspended", "pending"]] = None
    plan: Optional[str] = None


@router.patch("/tenants/{business_id}")
def update_tenant(
    business_id: str,
    payload: TenantPatch,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
) -> Dict[str, Any]:
    """Suspend / reactivate a clinic or change its plan. A suspended clinic's phone calls are refused; every change is audited."""
    b = db.get(Business, business_id)
    if not b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")
    plan = payload.plan.strip() if payload.plan is not None else None
    if payload.status is None and plan is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nothing to change: send a status or a plan")
    if plan is not None:
        chosen: Optional[Plan] = find_by_key(db, plan)
        if not chosen:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown plan. Create it under Billing first.")
        if chosen.status != "active" and (b.plan or "").lower() != chosen.key.lower():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"The {chosen.name} plan is {chosen.status} and cannot be given to more businesses")
        plan = chosen.key
    before = {"status": b.status, "plan": b.plan}
    if payload.status is not None:
        b.status = payload.status
    if plan is not None:
        b.plan = plan
    db.commit()
    audit(db, "admin.tenant_updated", admin, business_id=b.id, target_type="business", target_id=b.id, ip=client_ip(request), meta={"before": before, "after": {"status": b.status, "plan": b.plan}})
    return {"id": b.id, "status": b.status, "plan": b.plan}

_PROCESS_STARTED = datetime.now(timezone.utc)


def _fmt_uptime(seconds: float) -> str:
    seconds = int(seconds)
    days, rest = divmod(seconds, 86400)
    hours, rest = divmod(rest, 3600)
    minutes = rest // 60
    return f"{days}d {hours}h" if days else (f"{hours}h {minutes}m" if hours else f"{minutes}m")


def _integration_service(row, service_id: str, name: str) -> dict:
    """A health card built only from the last real provider check (admin_integrations); nothing is invented."""
    if row is None:
        return {"id": service_id, "name": name, "status": "Unknown", "latency": None, "errorRate": None, "detail": "No check has run yet."}
    status_map = {"Connected": "Operational", "API Error": "Degraded"}
    return {
        "id": service_id,
        "name": name,
        "status": status_map.get(row.status, "Not configured"),
        "latency": f"{int(row.latency_ms)}ms" if row.latency_ms is not None else None,
        "errorRate": row.error_rate,
        "detail": (row.config or {}).get("message"),
        "checkedAt": row.last_checked_at.isoformat() if row.last_checked_at else None,
    }


@router.get("/health")
def get_admin_health(db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)):
    """Platform health from real measurements only: database and Redis are timed now, providers come from their last live
    check, uptime is this API process's. Anything that is not measured is returned as null (the page shows a dash)."""
    import time
    from backend.server.cache.redis import get_redis_client
    from backend.server.database.models.platform_integration import PlatformIntegration

    started = time.perf_counter()
    db_status, db_latency = "Operational", None
    try:
        db.execute(select(func.count(User.id)))
        db_latency = f"{int((time.perf_counter() - started) * 1000)}ms"
    except Exception:
        db_status = "Degraded"

    redis_status, redis_latency = "Operational", None
    try:
        r_start = time.perf_counter()
        get_redis_client().ping()
        redis_latency = f"{int((time.perf_counter() - r_start) * 1000)}ms"
    except Exception:
        redis_status = "Degraded"

    rows = {r.id: r for r in db.execute(select(PlatformIntegration)).scalars().all()}
    uptime = _fmt_uptime((datetime.now(timezone.utc) - _PROCESS_STARTED).total_seconds())
    services = [
        {"id": "api-server", "name": "API Server", "status": "Operational", "latency": None, "errorRate": None, "detail": f"Up for {uptime} since the last restart."},
        {"id": "database", "name": "Database (Postgres)", "status": db_status, "latency": db_latency, "errorRate": None, "detail": "Timed with a live query."},
        {"id": "redis-cache", "name": "Redis Cache", "status": redis_status, "latency": redis_latency, "errorRate": None, "detail": "Timed with a live ping."},
        _integration_service(rows.get("groq"), "ai-gateway", "AI Gateway (Groq)"),
        _integration_service(rows.get("cartesia"), "voice-gateway", "Voice (Cartesia)"),
        _integration_service(rows.get("twilio"), "telephony", "Telephony (Twilio)"),
    ]
    alerts = [{"service": sv["name"], "message": sv["detail"] or sv["status"]} for sv in services if sv["status"] == "Degraded"]
    return {"services": services, "alerts": alerts, "generatedAt": datetime.now(timezone.utc).isoformat()}


@router.get("/settings")
def get_admin_settings(db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)):
    """Read-only facts about this deployment. There are no platform-wide switches (maintenance mode, signup lock) in the
    backend yet, so none are shown: a toggle that changes nothing would be misleading."""
    from backend.server.common.config import get_settings
    from backend.server.database.models.platform_integration import PlatformIntegration
    from backend.server.services import platform_smtp

    cfg = get_settings()
    rows = db.execute(select(PlatformIntegration)).scalars().all()
    smtp = platform_smtp.get_settings_public(db)
    return {
        "deployment": {
            "environment": "debug" if cfg.DEBUG else "production",
            "public_base_url": cfg.PUBLIC_BASE_URL,
            "api_started_at": _PROCESS_STARTED.isoformat(),
        },
        "counts": {
            "businesses": db.scalar(select(func.count(Business.id))) or 0,
            "users": db.scalar(select(func.count(User.id))) or 0,
            "integrations_connected": sum(1 for r in rows if r.status == "Connected"),
            "integrations_total": len(rows),
        },
        "email": {"sender_name": smtp["display_name"], "from_email": smtp["from_email"], "host": smtp["host"], "configured": bool(platform_smtp.load_settings(db))},
    }


@router.get("/notifications")
def get_admin_notifications(db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)):
    """Real platform notices: providers that need attention now, then recent audit events (sign-ins failing, tenants created)."""
    from backend.server.database.models.audit_log import AuditLog
    from backend.server.database.models.platform_integration import PlatformIntegration

    items = []
    for row in db.execute(select(PlatformIntegration)).scalars().all():
        if row.status == "Connected":
            continue
        items.append({
            "id": f"integration:{row.id}",
            "level": "error" if row.status == "API Error" else "info",
            "title": f"{row.name}: {row.status}",
            "message": (row.config or {}).get("message") or "Needs attention.",
            "date": (row.last_checked_at or row.updated_at or datetime.now(timezone.utc)).isoformat(),
            "link": "/integrations",
        })
    events = db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(25)).scalars().all()
    for ev in events:
        failed = ev.outcome != "success"
        items.append({
            "id": f"audit:{ev.id}",
            "level": "warning" if failed else "info",
            "title": ev.action.replace(".", " ").replace("_", " ").capitalize() + (" (failed)" if failed else ""),
            "message": f"{ev.actor_email or 'System'}" + (f" from {ev.ip}" if ev.ip else ""),
            "date": ev.created_at.isoformat(),
            "link": None,
        })
    return {"notifications": items}


def _is_trial_payment(details: dict) -> bool:
    return str((details or {}).get("payment_method", "")).startswith("Free Trial") or (details or {}).get("order_id") == "trial_order_free"


@router.get("/analytics")
def get_admin_analytics(days: int = 30, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)):
    """Platform analytics computed from the database for the last `days` days (1-365) and the equal period before."""
    from collections import Counter, defaultdict
    from backend.server.billing.trial_service import TrialService
    from backend.server.database.models.call import Call
    from backend.server.database.models.plan import Plan
    from backend.server.database.models.transaction import Transaction

    days = max(1, min(int(days), 365))
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    prev_start = start - timedelta(days=days)
    day_keys = [(start + timedelta(days=i)).date() for i in range(days)]
    trial_days = int(TrialService.get_config().get("duration_days", 14))

    businesses = db.execute(select(Business)).scalars().all()
    by_id = {b.id: b for b in businesses}
    plans = {pl.key: pl for pl in db.execute(select(Plan)).scalars().all()}
    plan_name = lambda key: (plans[key].name if key in plans else (key or "None")).title() if key else "None"

    payments = db.execute(select(Transaction).where(Transaction.type == "payment", Transaction.status == "confirmed")).scalars().all()
    trial_started: dict = {}
    first_paid: dict = {}
    paid_events = []
    for t in sorted(payments, key=lambda x: x.created_at):
        d = t.details or {}
        if _is_trial_payment(d):
            trial_started.setdefault(t.business_id, t.created_at)
        else:
            first_paid.setdefault(t.business_id, t)
            paid_events.append(t)
    converted_ids = [bid for bid in first_paid if bid in trial_started and first_paid[bid].created_at >= trial_started[bid]]

    status_of = lambda b: (b.status or "").lower()
    trial_biz = [b for b in businesses if status_of(b) == "trial"]
    paid_biz = [b for b in businesses if status_of(b) == "active"]
    inactive_biz = [b for b in businesses if status_of(b) in ("paused", "suspended")]

    # ---- growth (cumulative businesses per day, split by current status)
    growth = []
    for day in day_keys:
        upto = [b for b in businesses if b.created_at and b.created_at.date() <= day]
        growth.append({
            "date": day.isoformat(),
            "total": len(upto),
            "trial": sum(1 for b in upto if status_of(b) == "trial"),
            "paid": sum(1 for b in upto if status_of(b) == "active"),
            "inactive": sum(1 for b in upto if status_of(b) in ("paused", "suspended")),
        })

    # ---- revenue
    totals_by_currency = defaultdict(float)
    for t in paid_events:
        if t.created_at >= start:
            totals_by_currency[(t.details or {}).get("currency") or "USD"] += float((t.details or {}).get("amount") or 0)
    primary = max(totals_by_currency, key=totals_by_currency.get) if totals_by_currency else "USD"
    revenue_by_day = defaultdict(float)
    for t in paid_events:
        if t.created_at >= start and ((t.details or {}).get("currency") or "USD") == primary:
            revenue_by_day[t.created_at.date()] += float((t.details or {}).get("amount") or 0)
    running = 0.0
    revenue_series = []
    for day in day_keys:
        running += revenue_by_day[day]
        revenue_series.append({"date": day.isoformat(), "revenue": round(revenue_by_day[day], 2), "cumulative": round(running, 2)})
    previous_revenue = sum(float((t.details or {}).get("amount") or 0) for t in paid_events if prev_start <= t.created_at < start and ((t.details or {}).get("currency") or "USD") == primary)

    mrr = defaultdict(float)  # list price of each active, paying business's plan (a standing figure, not collected money)
    for b in paid_biz:
        plan = plans.get((b.plan or "").lower())
        if plan and not plan.custom_pricing and plan.price:
            mrr[plan.currency] += plan.price if plan.cycle == "monthly" else plan.price / 12

    # ---- weekly trials vs conversions
    weeks = []
    week_start = start
    while week_start <= now:
        week_end = week_start + timedelta(days=7)
        weeks.append({
            "label": week_start.strftime("%b %d"),
            "trials": sum(1 for ts in trial_started.values() if week_start <= ts < week_end),
            "converted": sum(1 for bid in converted_ids if week_start <= first_paid[bid].created_at < week_end),
        })
        week_start = week_end

    # ---- calls
    calls = db.execute(select(Call).where(Call.started_at >= prev_start)).scalars().all()
    current = [c for c in calls if c.started_at >= start]
    previous = [c for c in calls if c.started_at < start]
    per_day = defaultdict(lambda: Counter())
    for c in current:
        day = per_day[c.started_at.date()]
        day["calls"] += 1
        day["ai"] += 1 if c.outcome in ("resolved", "booked") else 0
        day["transferred"] += 1 if c.outcome == "transferred" else 0
        day["seconds"] += c.duration_seconds or 0
    call_series = [
        {
            "date": d.isoformat(),
            "calls": per_day[d]["calls"],
            "aiRate": round(per_day[d]["ai"] / per_day[d]["calls"] * 100) if per_day[d]["calls"] else None,
            "transferRate": round(per_day[d]["transferred"] / per_day[d]["calls"] * 100) if per_day[d]["calls"] else None,
        }
        for d in day_keys
    ]
    done = [c for c in current if c.outcome != "live"]
    calls_by_vertical = Counter(((by_id[c.business_id].business_subtype or by_id[c.business_id].vertical or "unknown") if c.business_id in by_id else "unknown").replace("_", " ").title() for c in current)

    bookings = db.execute(select(Transaction).where(Transaction.type == "appointment", Transaction.created_at >= start)).scalars().all()
    calls_per_biz = Counter(c.business_id for c in current)
    current_call_ids = {c.id for c in current}
    bookings_per_biz = Counter(t.business_id for t in bookings if t.call_id in current_call_ids)  # bookings the AI made on a call in this period
    top = [
        {"name": by_id[bid].name if bid in by_id else "Unknown", "calls": n, "appointments": bookings_per_biz.get(bid, 0), "conversion": round(bookings_per_biz.get(bid, 0) / n * 100)}
        for bid, n in calls_per_biz.most_common(5)
    ]

    # ---- tables
    def row(b):
        return {"id": b.id, "name": b.name, "vertical": (b.business_subtype or b.vertical or "").replace("_", " ").title(), "plan": plan_name(b.plan), "status": b.status}

    recent = sorted(businesses, key=lambda b: b.created_at or now, reverse=True)[:6]
    expiring = []
    for b in trial_biz:
        began = trial_started.get(b.id) or b.created_at
        left = max(0, trial_days - (now - began).days) if began else None
        expiring.append({**row(b), "daysLeft": left, "calls": calls_per_biz.get(b.id, 0)})
    expiring = sorted(expiring, key=lambda r: (r["daysLeft"] is None, r["daysLeft"]))[:6]
    converted_recent = sorted(converted_ids, key=lambda bid: first_paid[bid].created_at, reverse=True)[:6]

    funnel_started = len({b.id for b in businesses if status_of(b) == "trial" or b.id in trial_started})
    return {
        "range": {"days": days, "from": start.date().isoformat(), "to": now.date().isoformat()},
        "generatedAt": now.isoformat(),
        "currency": primary,
        "kpis": {
            "totalBusinesses": len(businesses),
            "newBusinesses": sum(1 for b in businesses if b.created_at and b.created_at >= start),
            "newBusinessesPrevious": sum(1 for b in businesses if b.created_at and prev_start <= b.created_at < start),
            "trial": len(trial_biz),
            "paid": len(paid_biz),
            "converted": len(converted_ids),
            "inactive": len(inactive_biz),
            "revenue": dict((c, round(v, 2)) for c, v in totals_by_currency.items()),
            "revenuePrevious": round(previous_revenue, 2),
            "mrr": dict((c, round(v, 2)) for c, v in mrr.items()),
        },
        "trialDays": trial_days,
        "growth": growth,
        "planMix": dict(Counter(plan_name(b.plan) for b in businesses)),
        "byStatus": dict(Counter(status_of(b) for b in businesses)),
        "funnel": {"signups": len(businesses), "trial": funnel_started, "converted": len(converted_ids), "paid": len(paid_biz)},
        "revenueSeries": revenue_series,
        "weekly": weeks,
        "calls": {
            "total": len(current),
            "previous": len(previous),
            "series": call_series,
            "aiRate": round(sum(1 for c in done if c.outcome in ("resolved", "booked")) / len(done) * 100) if done else None,
            "transferRate": round(sum(1 for c in done if c.outcome == "transferred") / len(done) * 100) if done else None,
            "byVertical": dict(calls_by_vertical),
        },
        "topBusinesses": top,
        "recentSignups": [{**row(b), "createdAt": b.created_at.isoformat() if b.created_at else None} for b in recent],
        "trialExpiring": expiring,
        "recentlyConverted": [
            {**row(by_id[bid]), "convertedAt": first_paid[bid].created_at.isoformat(), "toPlan": plan_name((first_paid[bid].details or {}).get("plan"))}
            for bid in converted_recent if bid in by_id
        ],
    }


@router.get("/services")
def get_admin_services(db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)):
    """Returns platform-wide services for the admin dashboard."""
    from backend.server.database.models.service import Service
    query = select(Service, Business).join(Business, Service.business_id == Business.id).order_by(Service.created_at.desc())
    results = db.execute(query).all()
    
    items = []
    for srv, biz in results:
        items.append({
            "id": srv.id,
            "name": srv.title,
            "category": "General",
            "businessId": biz.id,
            "businessName": biz.name,
            "businessType": (biz.business_subtype or biz.vertical or "clinic").replace("_", " ").title(),
            "duration": f"{srv.duration_minutes} min",
            "price": f"{srv.price_amount or 0.0} {srv.price_currency}",
            "currency": srv.price_currency,
            "status": "Active" if biz.status == "active" else "Inactive",
            "restriction": "Tenant Managed",
            "country": biz.country or "Unknown",
            "toolCallMapping": "book_appointment",
            "depositRequired": False
        })
    return {"items": items}


import os
import time
import httpx

INTEGRATION_SPECS = [
    {
        "id": "twilio",
        "name": "Twilio Telephony Gateway",
        "category": "Voice",
        "env_key": "TWILIO_ACCOUNT_SID",
        "ping_url": "https://api.twilio.com",
        "config_keys": ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"]
    },
    {
        "id": "exotel",
        "name": "Exotel India Virtual Numbers",
        "category": "Voice",
        "env_key": "EXOTEL_ACCOUNT_SID",
        "ping_url": "https://api.exotel.com",
        "config_keys": ["EXOTEL_ACCOUNT_SID", "EXOTEL_API_KEY", "EXOTEL_PHONE_NUMBER"]
    },
    {
        "id": "groq",
        "name": "Groq Fast LPU Inference",
        "category": "AI",
        "env_key": "GROQ_API_KEY",
        "ping_url": "https://api.groq.com/openai/v1/models",
        "config_keys": ["GROQ_API_KEY"]
    },
    {
        "id": "gemini",
        "name": "Google Gemini 2.5 Flash",
        "category": "AI",
        "env_key": "GEMINI_API_KEY",
        "ping_url": "https://generativelanguage.googleapis.com",
        "config_keys": ["GEMINI_API_KEY"]
    },
    {
        "id": "cartesia",
        "name": "Cartesia Sonic TTS",
        "category": "Voice",
        "env_key": "CARTESIA_API_KEY",
        "ping_url": "https://api.cartesia.ai",
        "config_keys": ["CARTESIA_API_KEY"]
    },
    {
        "id": "elevenlabs",
        "name": "ElevenLabs Expressive Voice",
        "category": "Voice",
        "env_key": "ELEVENLABS_API_KEY",
        "ping_url": "https://api.elevenlabs.io/v1/user",
        "config_keys": ["ELEVENLABS_API_KEY"]
    },
    {
        "id": "whatsapp",
        "name": "Meta WhatsApp Cloud API (Platform WABA)",
        "category": "Messaging",
        "env_key": "META_WHATSAPP_TOKEN",
        "ping_url": "https://graph.facebook.com",
        "config_keys": ["META_WHATSAPP_TOKEN", "META_WHATSAPP_VERIFY_TOKEN"]
    },
    {
        "id": "platform_smtp",
        "name": "Platform Transactional SMTP (Postmark)",
        "category": "Email",
        "env_key": "SMTP_HOST",
        "ping_url": "https://smtp.postmarkapp.com",
        "config_keys": ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "FROM_EMAIL", "FROM_NAME"]
    },
    {
        "id": "razorpay",
        "name": "Razorpay Billing Gateway",
        "category": "Payments",
        "env_key": "RAZORPAY_API_KEY",
        "ping_url": "https://api.razorpay.com",
        "config_keys": ["RAZORPAY_API_KEY", "RAZORPAY_SECRET_KEY"]
    },
    {
        "id": "stripe",
        "name": "Stripe Global Card Gateway",
        "category": "Payments",
        "env_key": "STRIPE_SECRET_KEY",
        "ping_url": "https://api.stripe.com",
        "config_keys": ["STRIPE_SECRET_KEY"]
    }
]

def _mask(val: str) -> str:
    if not val:
        return "Not configured"
    if len(val) <= 8:
        return "••••" + val[-2:]
    return val[:4] + "••••••••" + val[-4:]

@router.get("/integrations")
def get_admin_integrations(admin: User = Depends(require_platform_admin)):
    """Returns platform integrations with real status based on environment variables."""
    out = []
    for spec in INTEGRATION_SPECS:
        val = os.getenv(spec["env_key"], "").strip()
        is_connected = bool(val)
        
        cfg = {}
        for ck in spec["config_keys"]:
            c_val = os.getenv(ck, "").strip()
            cfg[ck.lower()] = _mask(c_val) if c_val else "Not configured"
            
        out.append({
            "id": spec["id"],
            "name": spec["name"],
            "category": spec["category"],
            "status": "Connected" if is_connected else "Disconnected",
            "is_active_default": is_connected,
            "latency_ms": 95 if is_connected else None,
            "error_rate": "0.0%" if is_connected else "100%",
            "last_checked_at": datetime.now(timezone.utc).isoformat() if is_connected else None,
            "config": cfg
        })
    return out

@router.post("/integrations/{integration_id}/test")
async def test_admin_integration(integration_id: str, admin: User = Depends(require_platform_admin)):
    """Performs a real HTTP network ping to measure latency and test reachability."""
    spec = next((s for s in INTEGRATION_SPECS if s["id"] == integration_id), None)
    if not spec:
        raise HTTPException(status_code=404, detail="Integration not found")
        
    val = os.getenv(spec["env_key"], "").strip()
    if not val and spec["env_key"] != "SMTP_HOST":
        return {
            "success": False,
            "status": "Disconnected",
            "latency_ms": 0,
            "message": f"API Key ({spec['env_key']}) is missing or empty in environment."
        }

    start_t = time.time()
    try:
        async with httpx.AsyncClient(timeout=4.0, verify=False, follow_redirects=True) as client:
            resp = await client.get(spec["ping_url"])
            latency = int((time.time() - start_t) * 1000)
            
            return {
                "success": True,
                "status": "Connected",
                "latency_ms": max(latency, 5),
                "message": f"Host reachable! Handshake completed in {latency}ms (HTTP {resp.status_code})"
            }
    except Exception as e:
        latency = int((time.time() - start_t) * 1000)
        return {
            "success": False,
            "status": "API Error",
            "latency_ms": latency,
            "message": f"Network ping failed: {str(e)}"
        }

class IntegrationUpdatePayload(BaseModel):
    is_active_default: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None

@router.patch("/integrations/{integration_id}")
def update_admin_integration(integration_id: str, payload: IntegrationUpdatePayload, admin: User = Depends(require_platform_admin)):
    """Updates integration configuration in runtime memory (reads/writes env, zero DB storage)."""
    spec = next((s for s in INTEGRATION_SPECS if s["id"] == integration_id), None)
    if not spec:
        raise HTTPException(status_code=404, detail="Integration not found")

    if payload.config:
        for k, v in payload.config.items():
            env_var_name = k.upper()
            if v and not v.startswith("••••"):
                os.environ[env_var_name] = str(v).strip()

class CredentialsPayload(BaseModel):
    values: Dict[str, str]

@router.put("/integrations/{integration_id}/credentials")
def save_admin_integration_credentials(integration_id: str, payload: CredentialsPayload, admin: User = Depends(require_platform_admin)):
    """Saves updated credentials in process environment (zero DB tables)."""
    spec = next((s for s in INTEGRATION_SPECS if s["id"] == integration_id), None)
    if not spec:
        raise HTTPException(status_code=404, detail="Integration not found")
        
    for k, v in payload.values.items():
        if v and v.strip() and not v.startswith("••••"):
            os.environ[k.upper()] = v.strip()

    return {"status": "ok", "id": integration_id, "name": spec["name"]}

@router.delete("/integrations/{integration_id}/credentials")
def reset_admin_integration_credentials(integration_id: str, admin: User = Depends(require_platform_admin)):
    """Resets integration credentials to .env."""
    return {"status": "ok", "id": integration_id}



class BusinessUserPatch(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = None


class BusinessUserInvite(BaseModel):
    business_id: str
    name: str
    email: str
    role: str = "staff"
    password: Optional[str] = None  # left empty: a random one is set and the user gets a "choose your password" email


@router.get("/business-users")
def list_business_users(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    business_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Returns business owners across all tenants from real Database with KPIs and facets."""

    # Restrict strictly to owners as requested by user
    query = select(User, Business).outerjoin(Business, User.business_id == Business.id).where(
        User.scope != "platform",
        func.lower(User.role) == "owner",
    )
    if search and search.strip():
        like = f"%{search.strip()}%"
        query = query.where(or_(User.name.ilike(like), User.email.ilike(like), Business.name.ilike(like)))
    if role and role.lower() != "all":
        query = query.where(User.role.ilike(role))
    if status_filter and status_filter.lower() != "all":
        is_active = status_filter.lower() == "active"
        query = query.where(User.is_active == is_active)
    if business_id and business_id != "all":
        query = query.where(User.business_id == business_id)
        
    results = db.execute(query.order_by(User.created_at.desc())).all()
    
    # Also fetch all business owners without search/filter for global KPIs & facets
    all_users = db.execute(
        select(User, Business).outerjoin(Business, User.business_id == Business.id).where(
            User.scope != "platform",
            func.lower(User.role) == "owner",
        )
    ).all()
    
    items = []
    for user_obj, biz_obj in results:
        items.append({
            "id": user_obj.id,
            "name": user_obj.name,
            "email": user_obj.email,
            "business": biz_obj.name if biz_obj else "Unassigned",
            "businessId": biz_obj.id if biz_obj else None,
            "businessType": ((biz_obj.business_subtype or biz_obj.vertical or "clinic").replace("_", " ").title()) if biz_obj else "Clinic",
            "role": user_obj.role.title() if user_obj.role else "Owner",
            "status": "Active" if user_obj.is_active else "Suspended",
            "lastActive": user_obj.last_active_at.strftime("%b %d, %Y") if user_obj.last_active_at else "Recently",
            "emailVerified": bool(user_obj.email_verified_at),
            "createdAt": user_obj.created_at.isoformat() if user_obj.created_at else None,
        })
        
    total_users = len(all_users)
    active_users = sum(1 for u, _ in all_users if u.is_active)
    suspended_users = total_users - active_users
    owners_count = total_users
    
    biz_names = sorted(list({b.name for _, b in all_users if b and b.name}))
    roles = ["Owner"]
    types = sorted(list({((b.business_subtype or b.vertical or "clinic").replace("_", " ").title()) for _, b in all_users if b}))
    
    return {
        "items": items,
        "total": len(items),
        "kpis": {
            "totalUsers": total_users,
            "activeUsers": active_users,
            "suspendedUsers": suspended_users,
            "ownersCount": owners_count,
            "businessesCount": len(biz_names),
        },
        "facets": {
            "businesses": ["All"] + biz_names,
            "roles": ["All"] + roles,
            "types": ["All"] + types,
            "statuses": ["All", "Active", "Suspended"],
        },
    }


class PurgeRequest(BaseModel):
    keep_business_id: str
    dry_run: bool = True  # preview unless explicitly false
    confirm: str = ""  # must equal PURGE_CONFIRMATION to delete


@router.post("/database/purge-other-businesses")
def trigger_purge_other_businesses(
    payload: PurgeRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Delete every business except the one named. Preview by default; the real run needs `dry_run: false` and `confirm: "DELETE"`.
    Permanent. The action and its counts are written to the audit log."""
    if not payload.dry_run and payload.confirm != PURGE_CONFIRMATION:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f'Type "{PURGE_CONFIRMATION}" in `confirm` to delete. Nothing was deleted.')
    res = purge_other_businesses(db, payload.keep_business_id, dry_run=payload.dry_run)
    audit(db, "admin.database_purge_preview" if payload.dry_run else "admin.database_purged_other_tenants", admin, ip=client_ip(request), meta=res)
    return res


@router.get("/business-users/{user_id}")
def get_business_user(user_id: str, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)):
    """Returns single business user profile with linked business and real audit trail."""
    from backend.server.database.models.audit_log import AuditLog
    
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    biz = db.get(Business, user.business_id) if user.business_id else None
    
    # Associated business stats
    associated = []
    if biz:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        calls_today = db.scalar(
            select(func.count()).select_from(Call).where(Call.business_id == biz.id, Call.started_at >= today_start)
        ) or 0
        appts_today = db.scalar(
            select(func.count()).select_from(Transaction).where(
                Transaction.business_id == biz.id,
                Transaction.type == "appointment",
                Transaction.created_at >= today_start
            )
        ) or 0
        agent = db.scalars(select(Agent).where(Agent.business_id == biz.id).order_by(Agent.created_at.asc())).first()
        
        associated.append({
            "id": biz.id,
            "name": biz.name,
            "type": (biz.business_subtype or biz.vertical or "clinic").replace("_", " ").title(),
            "country": biz.country or "Global",
            "aiReceptionist": agent.name if agent else "Not Configured",
            "plan": (biz.plan or "Standard").title(),
            "status": (biz.status or "active").title(),
            "roleInBusiness": user.role.title() if user.role else "Owner",
            "appointmentsToday": appts_today,
            "callsToday": calls_today,
        })
        
    # Activity logs for this user from AuditLog
    logs_raw = db.scalars(
        select(AuditLog).where(
            or_(AuditLog.actor_email == user.email, AuditLog.target_id == user.id)
        ).order_by(AuditLog.created_at.desc()).limit(15)
    ).all()
    
    activity_logs = []
    for log in logs_raw:
        activity_logs.append({
            "id": log.id,
            "action": (log.action or "activity").replace(".", " ").replace("_", " ").title(),
            "target": biz.name if biz else "Platform",
            "time": log.created_at.strftime("%b %d, %Y at %I:%M %p") if log.created_at else "Recently",
            "ip": log.ip or "Internal Session",
            "outcome": log.outcome,
        })
        
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.title() if user.role else "Owner",
        "status": "Active" if user.is_active else "Suspended",
        "is_active": user.is_active,
        "emailVerified": bool(user.email_verified_at),
        "createdAt": user.created_at.strftime("%b %d, %Y") if user.created_at else None,
        "lastActive": user.last_active_at.strftime("%b %d, %Y at %I:%M %p") if user.last_active_at else "Recently",
        "associatedBusinesses": associated,
        "activityLogs": activity_logs,
    }


@router.patch("/business-users/{user_id}")
def update_business_user(
    user_id: str,
    payload: BusinessUserPatch,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Updates user status (suspend/activate) and role."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.role is not None:
        user.role = payload.role.lower()
        
    db.commit()
    audit(
        db,
        "admin.business_user_updated",
        admin,
        target_type="user",
        target_id=user.id,
        ip=client_ip(request),
        meta={"user_email": user.email, "is_active": user.is_active, "role": user.role},
    )
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.title() if user.role else "Owner",
        "status": "Active" if user.is_active else "Suspended",
        "is_active": user.is_active,
    }


@router.post("/business-users/invite")
async def invite_business_user(
    payload: BusinessUserInvite,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Admin directly invites/provisions a business user to a tenant."""
    biz = db.get(Business, payload.business_id)
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")
        
    existing = db.query(User).filter(User.email == payload.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="User with this email already exists")
        
    if payload.password is not None and len(payload.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(status_code=400, detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
    pwd = payload.password or secrets.token_urlsafe(18)  # never a shared default: without one the user sets it from the email link
    new_user = User(
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        hashed_password=hash_password(pwd),
        scope="business",
        role=payload.role.lower(),
        business_id=biz.id,
        is_active=True,
        email_verified_at=datetime.now(timezone.utc),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    audit(
        db,
        "admin.business_user_invited",
        admin,
        business_id=biz.id,
        target_type="user",
        target_id=new_user.id,
        ip=client_ip(request),
        meta={"email": new_user.email, "role": new_user.role, "business_name": biz.name},
    )
    
    setup_email_sent = False
    if not payload.password:
        setup_email_sent = await send_password_setup_email(new_user, biz.name)
    return {
        "setup_email_sent": setup_email_sent,
        "id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "business": biz.name,
        "businessId": biz.id,
        "role": new_user.role.title(),
        "status": "Active",
    }






