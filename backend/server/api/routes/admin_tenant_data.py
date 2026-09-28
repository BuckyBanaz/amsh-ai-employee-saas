"""Platform admin: read-only views of one business's data, for the admin portal's business detail page.

Every route is `/api/admin/tenants/{business_id}/...`, guarded by `require_platform_admin`, and returns only that business's rows.
Secrets never leave here: integration tokens and PINs are not returned, only which providers are connected.
"""

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.server.api.routes.calls import call_channel
from backend.server.auth.security import require_platform_admin
from backend.server.database.models.agent import Agent
from backend.server.database.models.audit_log import AuditLog
from backend.server.database.models.business import Business
from backend.server.database.models.call import Call
from backend.server.database.models.integration import Integration
from backend.server.database.models.knowledge_base import KnowledgeDocument
from backend.server.database.models.service import Service
from backend.server.database.models.transaction import Transaction
from backend.server.database.models.user import User
from backend.server.database.session import get_db

router = APIRouter(prefix="/api/admin/tenants/{business_id}", tags=["admin-tenant-data"], dependencies=[Depends(require_platform_admin)])

_SAFE_INTEGRATION_FIELDS = ("display_phone_number", "verified_name", "mode")  # nothing that works as a credential


def _iso(value: Any) -> Any:
    return value.isoformat() if value else None


def _business(db: Session, business_id: str) -> Business:
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")
    return business


@router.get("/users")
def tenant_users(business_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    _business(db, business_id)
    users = db.scalars(select(User).where(User.business_id == business_id).order_by(User.created_at.asc())).all()
    return {"items": [
        {"id": u.id, "name": u.name, "email": u.email, "role": u.role, "is_active": u.is_active,
         "email_verified": u.email_verified_at is not None, "last_active_at": _iso(u.last_active_at), "created_at": _iso(u.created_at)}
        for u in users
    ]}


@router.get("/agents")
def tenant_agents(business_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    _business(db, business_id)
    agents = db.scalars(select(Agent).where(Agent.business_id == business_id).order_by(Agent.created_at.asc())).all()
    items: List[Dict[str, Any]] = []
    for i, a in enumerate(agents):
        cfg = a.config or {}
        items.append({
            "id": a.id, "name": a.name, "status": a.status, "is_primary": i == 0,  # the oldest agent is the one that answers
            "voice_provider": a.voice_provider, "voice_model": a.voice_model, "primary_language": a.primary_language,
            "languages": a.languages or [], "greeting_message": a.greeting_message, "engine": cfg.get("engine"),
            "personality": cfg.get("personality"), "recording": (cfg.get("toggles") or {}).get("record") is not False,
            "transfer_phone": cfg.get("transfer_phone"), "created_at": _iso(a.created_at),
        })
    return {"items": items}


@router.get("/appointments")
def tenant_appointments(business_id: str, limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db)) -> Dict[str, Any]:
    _business(db, business_id)
    rows = db.scalars(
        select(Transaction).where(Transaction.business_id == business_id, Transaction.type == "appointment").order_by(Transaction.created_at.desc()).limit(limit)
    ).all()
    out = []
    for t in rows:
        d = t.details or {}
        out.append({
            "id": t.id, "patient": d.get("customer_name") or d.get("patient_name"), "phone": d.get("phone_number") or d.get("phone"),
            "service": d.get("service_name"), "doctor": d.get("doctor_name"), "date": d.get("preferred_date"), "time": d.get("preferred_time"),
            "status": t.status, "booked_on_call": t.call_id is not None, "created_at": _iso(t.created_at),
        })
    return {"items": out}


@router.get("/calls")
def tenant_calls(business_id: str, limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db)) -> Dict[str, Any]:
    _business(db, business_id)
    calls = db.scalars(select(Call).where(Call.business_id == business_id).order_by(Call.started_at.desc()).limit(limit)).all()
    return {"items": [
        {"id": c.id, "channel": call_channel(c.id), "caller_number": c.caller_number, "caller_name": c.caller_name, "intent": c.intent,
         "outcome": c.outcome, "sentiment": c.sentiment, "duration_seconds": c.duration_seconds, "summary": c.summary,
         "has_recording": bool(c.recording_url), "started_at": _iso(c.started_at)}
        for c in calls
    ]}


@router.get("/services")
def tenant_services(business_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    _business(db, business_id)
    rows = db.scalars(select(Service).where(Service.business_id == business_id).order_by(Service.created_at.asc())).all()
    return {"items": [{"id": s.id, "title": s.title, "duration_minutes": s.duration_minutes, "price": s.price_amount, "currency": s.price_currency} for s in rows]}


@router.get("/knowledge")
def tenant_knowledge(business_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    _business(db, business_id)
    rows = db.scalars(select(KnowledgeDocument).where(KnowledgeDocument.business_id == business_id).order_by(KnowledgeDocument.uploaded_at.desc())).all()
    return {"items": [
        {"id": k.id, "type": k.doc_type, "status": k.status, "title": k.filename or k.source_url or (k.question or "")[:80], "uploaded_at": _iso(k.uploaded_at)}
        for k in rows
    ]}


@router.get("/integrations")
def tenant_integrations(business_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    _business(db, business_id)
    rows = db.scalars(select(Integration).where(Integration.business_id == business_id)).all()
    return {"items": [
        {"id": i.id, "provider": i.provider, "status": i.status, "connected_at": _iso(i.connected_at),
         "details": {k: (i.config or {}).get(k) for k in _SAFE_INTEGRATION_FIELDS if (i.config or {}).get(k)}}
        for i in rows
    ]}


@router.get("/activity")
def tenant_activity(business_id: str, limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db)) -> Dict[str, Any]:
    _business(db, business_id)
    rows = db.scalars(select(AuditLog).where(AuditLog.business_id == business_id).order_by(AuditLog.created_at.desc()).limit(limit)).all()
    return {"items": [
        {"id": r.id, "at": _iso(r.created_at), "action": r.action, "actor": r.actor_email, "outcome": r.outcome, "target": f"{r.target_type or ''} {r.target_id or ''}".strip(), "details": r.meta or {}}
        for r in rows
    ]}
