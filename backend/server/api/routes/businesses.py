from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.server.auth.security import get_current_user
from backend.server.database.models.business import Business
from backend.server.database.models.user import User
from backend.server.database.session import get_db

router = APIRouter(prefix="/api/onboarding/businesses", tags=["businesses"])

# MVP is healthcare-only. business_type will grow more entries in later phases;
# each maps to its own allowed business_subtype set.
BUSINESS_SUBTYPES: dict[str, set[str]] = {
    "healthcare": {"hospital", "clinic", "medical_center"},
}


def _validate_business_type(business_type: str, business_subtype: str | None) -> None:
    if business_type not in BUSINESS_SUBTYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"business_type must be one of {sorted(BUSINESS_SUBTYPES)}",
        )
    allowed = BUSINESS_SUBTYPES[business_type]
    if business_subtype is not None and business_subtype not in allowed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"business_subtype for '{business_type}' must be one of {sorted(allowed)}",
        )


class BusinessCreate(BaseModel):
    name: str
    vertical: str = "clinic"
    business_type: str = "healthcare"
    business_subtype: str | None = None
    country: str | None = None
    website: str | None = None
    business_email: str | None = None
    business_phone: str | None = None
    logo_url: str | None = None
    city: str | None = None
    address: str | None = None
    postal_code: str | None = None
    timezone: str = "UTC"
    currency: str = "USD"


class BusinessUpdate(BaseModel):
    name: str | None = None
    business_type: str | None = None
    business_subtype: str | None = None
    country: str | None = None
    website: str | None = None
    business_email: str | None = None
    business_phone: str | None = None
    logo_url: str | None = None
    city: str | None = None
    address: str | None = None
    postal_code: str | None = None
    timezone: str | None = None
    currency: str | None = None
    working_hours: dict | None = None
    status: str | None = None
    plan: str | None = None


class BusinessOut(BaseModel):
    id: str
    name: str
    vertical: str
    business_type: str
    business_subtype: str | None
    country: str | None
    website: str | None
    business_email: str | None
    business_phone: str | None
    logo_url: str | None
    city: str | None
    address: str | None
    postal_code: str | None
    timezone: str
    currency: str
    plan: str
    status: str
    working_hours: dict
    created_at: datetime

    model_config = {"from_attributes": True}


@router.post("", response_model=BusinessOut, status_code=status.HTTP_201_CREATED)
def create_business(payload: BusinessCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _validate_business_type(payload.business_type, payload.business_subtype)
    business = Business(
        name=payload.name,
        vertical=payload.vertical,
        business_type=payload.business_type,
        business_subtype=payload.business_subtype,
        country=payload.country,
        website=payload.website,
        business_email=payload.business_email,
        business_phone=payload.business_phone,
        logo_url=payload.logo_url,
        city=payload.city,
        address=payload.address,
        postal_code=payload.postal_code,
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

    updates = payload.model_dump(exclude_unset=True)
    if "business_type" in updates or "business_subtype" in updates:
        _validate_business_type(
            updates.get("business_type", business.business_type),
            updates.get("business_subtype", business.business_subtype),
        )

    for field, value in updates.items():
        setattr(business, field, value)
    db.commit()
    db.refresh(business)
    return business
