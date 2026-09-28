"""
Platform Admin API Router.
Namespace for AMSh internal operations: platform admins, tenants, monitoring and audit trails. Every route except login is
guarded by `require_platform_admin` (scope "platform"); a clinic's owner or staff can never reach it.

Base prefix: /api/admin
Built: /auth/login, /auth/me, /tenants (list, detail, suspend / reactivate / change plan). Planned (see DOCS/18, Phase 3): users, tenants, cross-tenant reads, billing, analytics,
health, audit, tickets, announcements.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from backend.server.api.routes.auth import LoginRequest, TOO_MANY_ATTEMPTS, TokenOut, UserOut, login_locked
from backend.server.auth.security import create_access_token, require_platform_admin, verify_password
from backend.server.database.models.agent import Agent
from backend.server.database.models.business import Business
from backend.server.database.models.call import Call
from backend.server.database.models.plan import Plan
from backend.server.database.models.transaction import Transaction
from backend.server.database.models.user import User
from backend.server.database.session import get_db
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
