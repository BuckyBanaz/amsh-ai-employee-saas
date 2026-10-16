"""Public plan catalog for pricing screens (landing page, onboarding, the tenant billing page).

Only self-serve plans that are active and not quoted are returned; drafts, archived and enterprise (per-client) plans stay
private. No login is needed because pricing is public."""

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.server.database.models.plan import Plan
from backend.server.database.session import get_db
from backend.server.services import plans as catalog

router = APIRouter(prefix="/api/plans", tags=["plans"])


def _offered(db: Session):
    return db.scalars(
        select(Plan)
        .where(Plan.kind == "catalog", Plan.status == "active", Plan.custom_pricing.is_(False))
        .order_by(Plan.sort_order.asc(), Plan.price.asc())
    ).all()


@router.get("")
def list_public_plans(db: Session = Depends(get_db)) -> Dict[str, Any]:
    return {"items": [catalog.public_shape(p) for p in _offered(db)], "features": catalog.FEATURES, "quotas": catalog.QUOTAS}


@router.get("/{key}")
def get_public_plan(key: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    plan = next((p for p in _offered(db) if p.key.lower() == key.strip().lower()), None)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return catalog.public_shape(plan)
