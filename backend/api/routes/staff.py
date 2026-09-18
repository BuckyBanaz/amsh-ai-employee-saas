"""Onboarding "Staff" step: frontend/user/app/onboarding/staff/page.tsx."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.api.routes._shared import get_business_or_404, require_membership, require_owner_or_admin
from backend.auth.security import get_current_user
from backend.database.models.staff import Staff
from backend.database.models.service import Service
from backend.database.models.user import User
from backend.database.session import get_db

router = APIRouter(prefix="/api/onboarding/businesses/{business_id}/staff", tags=["staff"])


class StaffCreate(BaseModel):
    name: str
    role: str = "Doctor"
    specialty: str | None = None
    email: str | None = None
    phone: str | None = None
    service_ids: list[str] = []


class StaffUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    specialty: str | None = None
    email: str | None = None
    phone: str | None = None
    service_ids: list[str] | None = None


class StaffOut(BaseModel):
    id: str
    business_id: str
    name: str
    role: str
    specialty: str | None
    email: str | None
    phone: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.post("", response_model=StaffOut, status_code=status.HTTP_201_CREATED)
def create_staff(
    business_id: str,
    payload: StaffCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    
    payload_dict = payload.model_dump(exclude={"service_ids"})
    staff = Staff(business_id=business_id, **payload_dict)
    
    if payload.service_ids:
        services = db.query(Service).filter(
            Service.id.in_(payload.service_ids), 
            Service.business_id == business_id
        ).all()
        staff.services = services
        
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff


@router.get("", response_model=list[StaffOut])
def list_staff(business_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    return db.query(Staff).filter(Staff.business_id == business_id).order_by(Staff.created_at.asc()).all()


def _get_staff_or_404(business_id: str, staff_id: str, db: Session) -> Staff:
    staff = db.get(Staff, staff_id)
    if not staff or staff.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")
    return staff


@router.patch("/{staff_id}", response_model=StaffOut)
def update_staff(
    business_id: str,
    staff_id: str,
    payload: StaffUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    staff = _get_staff_or_404(business_id, staff_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(staff, field, value)
    db.commit()
    db.refresh(staff)
    return staff


@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_staff(
    business_id: str,
    staff_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    staff = _get_staff_or_404(business_id, staff_id, db)
    db.delete(staff)
    db.commit()
