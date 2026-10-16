"""Platform admin: plan catalog management. Guarded by `require_platform_admin`.

    GET    /api/admin/plans/meta      feature and quota definitions for the editor
    GET    /api/admin/plans           every plan with its subscriber count
    POST   /api/admin/plans           create
    GET    /api/admin/plans/{id}
    PATCH  /api/admin/plans/{id}      update (the key never changes)
    DELETE /api/admin/plans/{id}      only a plan nobody is on; otherwise archive it instead
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.server.auth.security import require_platform_admin
from backend.server.database.models.plan import Plan
from backend.server.database.models.user import User
from backend.server.database.session import get_db
from backend.server.services import plans as catalog
from backend.server.services.audit import audit, client_ip

router = APIRouter(prefix="/api/admin/plans", tags=["admin-plans"])


class PlanBody(BaseModel):
    key: Optional[str] = None  # create only; derived from the name when omitted
    name: Optional[str] = None
    description: Optional[str] = None
    kind: Optional[Literal["catalog", "enterprise"]] = None
    client: Optional[str] = None
    price: Optional[float] = None
    cycle: Optional[Literal["monthly", "yearly"]] = None
    price_yearly: Optional[float] = None
    currency: Optional[str] = None
    custom_pricing: Optional[bool] = None
    status: Optional[Literal["draft", "active", "archived"]] = None
    highlighted: Optional[bool] = None
    sort_order: Optional[int] = None
    quotas: Optional[Dict[str, Optional[float]]] = None
    overage: Optional[Dict[str, float]] = None
    features: Optional[List[str]] = None


def _bad(err: catalog.PlanError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))


def _current(plan: Plan) -> Dict[str, Any]:
    return {c: getattr(plan, c) for c in ("name", "description", "kind", "client", "price", "cycle", "price_yearly", "currency", "custom_pricing", "status", "highlighted", "sort_order", "quotas", "overage", "features")}


@router.get("/meta")
def plan_meta(admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    return {"features": catalog.FEATURES, "quotas": catalog.QUOTAS, "overage": catalog.OVERAGE_KEYS, "currencies": list(catalog.CURRENCIES)}


@router.get("")
def list_plans(db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    counts = catalog.subscribers_by_plan(db)
    plans = db.scalars(select(Plan).order_by(Plan.sort_order.asc(), Plan.created_at.asc())).all()
    return {"items": [catalog.admin_shape(p, counts.get(p.key.lower(), 0)) for p in plans]}


@router.get("/{plan_id}")
def get_plan(plan_id: str, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    plan = db.get(Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return catalog.admin_shape(plan, catalog.subscribers_by_plan(db).get(plan.key.lower(), 0))


@router.post("", status_code=status.HTTP_201_CREATED)
def create_plan(body: PlanBody, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    fields = body.model_dump(exclude_unset=True)
    fields.setdefault("key", catalog.slugify(str(fields.get("name") or "")))
    try:
        clean = catalog.validate(fields, db)
    except catalog.PlanError as e:
        raise _bad(e)
    plan = Plan(**clean)
    db.add(plan)
    db.commit()
    audit(db, "admin.plan_created", admin, target_type="plan", target_id=plan.id, ip=client_ip(request), meta={"key": plan.key, "name": plan.name})
    return catalog.admin_shape(plan, 0)


@router.patch("/{plan_id}")
def update_plan(plan_id: str, body: PlanBody, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    plan = db.get(Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    changes = body.model_dump(exclude_unset=True)
    changes.pop("key", None)  # the key is what businesses point at, so it never changes
    if not changes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nothing to change")
    before = _current(plan)
    try:
        clean = catalog.validate({**before, **changes}, db, existing=plan)
    except catalog.PlanError as e:
        raise _bad(e)
    subscribers = catalog.subscribers_by_plan(db).get(plan.key.lower(), 0)
    # Archiving or drafting a plan with subscribers is allowed: they keep it, it just stops being offered to new customers.
    for field, value in clean.items():
        setattr(plan, field, value)
    plan.updated_at = datetime.now(timezone.utc)
    db.commit()
    audit(db, "admin.plan_updated", admin, target_type="plan", target_id=plan.id, ip=client_ip(request),
          meta={"key": plan.key, "changed": sorted(k for k in clean if clean[k] != before.get(k))})
    return catalog.admin_shape(plan, subscribers)


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(plan_id: str, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> None:
    plan = db.get(Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    subscribers = catalog.subscribers_by_plan(db).get(plan.key.lower(), 0)
    if subscribers:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"{subscribers} business(es) are on this plan. Archive it instead, or move them to another plan first.")
    key, name = plan.key, plan.name
    db.delete(plan)
    db.commit()
    audit(db, "admin.plan_deleted", admin, target_type="plan", target_id=plan_id, ip=client_ip(request), meta={"key": key, "name": name})
