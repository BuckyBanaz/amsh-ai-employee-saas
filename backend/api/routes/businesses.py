from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.auth.security import get_current_user
from backend.database.models.business import Business
from backend.database.models.user import User
from backend.database.session import get_db

router = APIRouter(prefix="/api/businesses", tags=["businesses"])


class BusinessCreate(BaseModel):
    name: str
    vertical: str = "clinic"
    country: str | None = None
    timezone: str = "UTC"


class BusinessUpdate(BaseModel):
    name: str | None = None
    timezone: str | None = None
    working_hours: dict | None = None
    status: str | None = None
    plan: str | None = None


class BusinessOut(BaseModel):
    id: str
    name: str
    vertical: str
    country: str | None
    timezone: str
    plan: str
    status: str
    working_hours: dict
    created_at: datetime

    model_config = {"from_attributes": True}


@router.post("", response_model=BusinessOut, status_code=status.HTTP_201_CREATED)
def create_business(payload: BusinessCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    business = Business(
        name=payload.name,
        vertical=payload.vertical,
        country=payload.country,
        timezone=payload.timezone,
        status="pending",
    )
    db.add(business)
    db.flush()

    # The creating user becomes this business's owner.
    current_user.business_id = business.id
    db.commit()
    db.refresh(business)
    return business


@router.get("", response_model=list[BusinessOut])
def list_businesses(
    status_filter: str | None = None,
    vertical: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Business)
    if current_user.scope != "platform":
        # Business-scoped users only ever see their own tenant.
        query = query.filter(Business.id == current_user.business_id)
    if status_filter:
        query = query.filter(Business.status == status_filter)
    if vertical:
        query = query.filter(Business.vertical == vertical)
    return query.order_by(Business.created_at.desc()).all()


@router.get("/{business_id}", response_model=BusinessOut)
def get_business(business_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")
    if current_user.scope != "platform" and current_user.business_id != business.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    return business


@router.patch("/{business_id}", response_model=BusinessOut)
def update_business(
    business_id: str,
    payload: BusinessUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")
    if current_user.scope != "platform" and current_user.business_id != business.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(business, field, value)
    db.commit()
    db.refresh(business)
    return business
