"""Onboarding "Services" step: frontend/user/app/onboarding/services/page.tsx."""

from datetime import datetime
from typing import Dict, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.server.api.routes._shared import get_business_or_404, require_membership, require_owner_or_admin
from backend.server.auth.security import get_current_user
from backend.server.database.models.service import Service
from backend.server.database.models.user import User
from backend.server.database.session import get_db
from backend.server.services.service_suggestions import suggestions_for

router = APIRouter(prefix="/api/onboarding/businesses/{business_id}/services", tags=["services"])


# What a catalogue item is (DOCS/31): "service" is bookable (every clinic item); "course" is answered and enquired about, never
# booked; "visit" / "counselling" / "demo_class" are education bookings; "package" a wellness bundle.
ServiceKind = Literal["service", "course", "visit", "counselling", "demo_class", "package"]


class ServiceCreate(BaseModel):
    title: str
    description: str | None = None
    duration_minutes: int = 30
    price_amount: float | None = None
    price_currency: str = "USD"
    kind: ServiceKind = "service"
    attributes: Dict[str, str] = Field(default_factory=dict, max_length=20)  # level, intake, deadline, mode, eligibility...
    resource_kind: str | None = Field(default=None, max_length=30)  # a booking also holds a free resource of this kind (a room)


class ServiceUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    duration_minutes: int | None = None
    price_amount: float | None = None
    price_currency: str | None = None
    kind: ServiceKind | None = None
    attributes: Dict[str, str] | None = Field(default=None, max_length=20)
    resource_kind: str | None = Field(default=None, max_length=30)


def _check_resource_kind(db: Session, business_id: str, kind: str | None) -> None:
    """A service can only need a resource kind its vertical defines (not "staff": people are booked as staff)."""
    if not kind:
        return
    from backend.ai.verticals.errors import UnknownVerticalError
    from backend.ai.workflows.registry import workflow_registry
    from backend.server.database.models.business import Business

    business = db.get(Business, business_id)
    try:
        allowed = {r.key for r in workflow_registry().vertical(business.vertical).resources if r.key != "staff"}
    except UnknownVerticalError:
        allowed = set()
    if kind not in allowed:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"resource_kind must be one of {sorted(allowed)}")


class ServiceOut(BaseModel):
    id: str
    business_id: str
    title: str
    description: str | None
    duration_minutes: int
    price_amount: float | None
    price_currency: str
    kind: str = "service"
    attributes: Dict[str, str] | None = None
    resource_kind: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.post("", response_model=ServiceOut, status_code=status.HTTP_201_CREATED)
def create_service(
    business_id: str,
    payload: ServiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    _check_resource_kind(db, business_id, payload.resource_kind)
    service = Service(business_id=business_id, **payload.model_dump())
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@router.get("", response_model=list[ServiceOut])
def list_services(business_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    return db.query(Service).filter(Service.business_id == business_id).order_by(Service.created_at.asc()).all()


def _get_service_or_404(business_id: str, service_id: str, db: Session) -> Service:
    service = db.get(Service, service_id)
    if not service or service.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    return service


@router.patch("/{service_id}", response_model=ServiceOut)
def update_service(
    business_id: str,
    service_id: str,
    payload: ServiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    service = _get_service_or_404(business_id, service_id, db)
    updates = payload.model_dump(exclude_unset=True)
    if "resource_kind" in updates:
        _check_resource_kind(db, business_id, updates["resource_kind"])
    for field, value in updates.items():
        setattr(service, field, value)
    db.commit()
    db.refresh(service)
    return service


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service(
    business_id: str,
    service_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    service = _get_service_or_404(business_id, service_id, db)
    db.delete(service)
    db.commit()


async def service_suggestions(business_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Services the business's crawled website mentions that are not in its Services list (suggestions only; the owner adds
    them, so the AI receptionist can book them)."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    return await suggestions_for(business_id, db)


dashboard_router = APIRouter(prefix="/api/businesses/{business_id}/services", tags=["services"])
dashboard_router.add_api_route("", create_service, methods=["POST"], response_model=ServiceOut, status_code=status.HTTP_201_CREATED)
dashboard_router.add_api_route("", list_services, methods=["GET"], response_model=list[ServiceOut])
dashboard_router.add_api_route("/suggestions", service_suggestions, methods=["GET"])
dashboard_router.add_api_route("/{service_id}", update_service, methods=["PATCH"], response_model=ServiceOut)
dashboard_router.add_api_route("/{service_id}", delete_service, methods=["DELETE"], status_code=status.HTTP_204_NO_CONTENT)
