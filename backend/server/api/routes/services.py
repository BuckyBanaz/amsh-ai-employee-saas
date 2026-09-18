"""Onboarding "Services" step: frontend/user/app/onboarding/services/page.tsx."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.server.api.routes._shared import get_business_or_404, require_membership, require_owner_or_admin
from backend.server.auth.security import get_current_user
from backend.server.database.models.service import Service
from backend.server.database.models.user import User
from backend.server.database.session import get_db

router = APIRouter(prefix="/api/onboarding/businesses/{business_id}/services", tags=["services"])


class ServiceCreate(BaseModel):
    title: str
    description: str | None = None
    duration_minutes: int = 30
    price_amount: float | None = None
    price_currency: str = "USD"


class ServiceUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    duration_minutes: int | None = None
    price_amount: float | None = None
    price_currency: str | None = None


class ServiceOut(BaseModel):
    id: str
    business_id: str
    title: str
    description: str | None
    duration_minutes: int
    price_amount: float | None
    price_currency: str
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
    for field, value in payload.model_dump(exclude_unset=True).items():
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
