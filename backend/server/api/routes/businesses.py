import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.server.api.routes._shared import require_owner_or_admin
from backend.server.auth.security import get_current_user
from backend.server.database.models.business import Business
from backend.server.database.models.user import User
from backend.server.database.session import get_db
from backend.server.services.audit import audit, client_ip

router = APIRouter(prefix="/api/onboarding/businesses", tags=["businesses"])

# The supported verticals are the reviewed definitions in backend/ai/workflows/definitions/ (DOCS/31): a business can only be
# created for one the AI can actually serve. "hospital" was a vertical before subtypes existed: it is the clinic vertical's
# "hospital" subtype now, accepted for existing API clients.
LEGACY_VERTICALS = {"hospital": ("clinic", "hospital")}
BUSINESS_TYPES = {"clinic": "healthcare", "education": "education", "salon": "beauty_personal_care", "wellness": "beauty_wellness"}


def allowed_verticals() -> set[str]:
    from backend.ai.workflows.registry import workflow_registry

    return set(workflow_registry().verticals)


def _validate_vertical(vertical: str) -> None:
    allowed = allowed_verticals()
    if vertical not in allowed and vertical not in LEGACY_VERTICALS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"vertical must be one of {sorted(allowed)}",
        )


def _normalize_subtype(vertical: str, subtype: str | None) -> str | None:
    """The subtype key for `subtype` (its key or display name). Healthcare also keeps older free-text values (the settings page
    stored names like "Dental Clinic"; they run the default clinic workflows). Any other vertical needs one of its subtypes."""
    from backend.ai.verticals.errors import UnknownVerticalError
    from backend.ai.workflows.registry import workflow_registry

    if subtype is None or not str(subtype).strip():
        return None
    text = str(subtype).strip()
    try:
        definition = workflow_registry().vertical(vertical)
    except UnknownVerticalError:
        return text
    for sub in definition.subtypes:
        if text.lower() in (sub.key, sub.name.lower()):
            return sub.key
    if not definition.workflow_runtime:
        return text
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=f"business_subtype must be one of {[s.key for s in definition.subtypes]}",
    )


def _validate_business_type(business_type: str | None, business_subtype: str | None) -> None:
    # Flexible validation to support config-driven verticals
    if business_type is not None and not business_type.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="business_type cannot be empty",
        )


class BusinessCreate(BaseModel):
    name: str
    vertical: str = "clinic"       # Maps directly to configs/{vertical}.yaml
    business_subtype: str | None = None  # a subtype key of the vertical (backend/ai/workflows/definitions)
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


PLATFORM_ONLY_FIELDS = {"plan", "status"}


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
    working_hours: dict | list | None = None
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
    working_hours: dict | list | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.post("", response_model=BusinessOut, status_code=status.HTTP_201_CREATED)
def create_business(payload: BusinessCreate, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _validate_vertical(payload.vertical)
    vertical, subtype = LEGACY_VERTICALS.get(payload.vertical, (payload.vertical, payload.business_subtype))
    subtype = _normalize_subtype(vertical, payload.business_subtype or subtype)
    business = Business(
        name=payload.name,
        vertical=vertical,
        business_type=BUSINESS_TYPES.get(vertical, "healthcare"),
        business_subtype=subtype,
        country=payload.country,
        website=payload.website,
        business_email=payload.business_email,
        business_phone=payload.business_phone,
        logo_url=payload.logo_url,
        city=payload.city,
        address=payload.address,
        postal_code=payload.postal_code,
        timezone=payload.timezone,
        currency=payload.currency,
        status="pending",
    )
    db.add(business)
    db.flush()

    # The creating user becomes this business's owner.
    current_user.business_id = business.id
    db.commit()
    db.refresh(business)
    audit(db, "business.created", current_user, business_id=business.id, target_type="business", target_id=business.id, ip=client_ip(request),
          meta={"name": business.name, "vertical": business.vertical, "country": business.country})
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
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")
    if current_user.scope != "platform" and current_user.business_id != business.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    updates = payload.model_dump(exclude_unset=True)
    if current_user.scope != "platform":
        require_owner_or_admin(business.id, current_user)
        # A clinic's plan and status change only through Billing (payment, trial, downgrade) or a platform admin
        locked = sorted(PLATFORM_ONLY_FIELDS & set(updates))
        if locked:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"{', '.join(locked)} can only be changed through Billing")
    if "business_type" in updates or "business_subtype" in updates:
        _validate_business_type(
            updates.get("business_type", business.business_type),
            updates.get("business_subtype", business.business_subtype),
        )
    if "business_subtype" in updates:
        updates["business_subtype"] = _normalize_subtype(business.vertical, updates["business_subtype"])

    for field, value in updates.items():
        setattr(business, field, value)
    db.commit()
    db.refresh(business)
    audit(db, "business.updated", current_user, business_id=business.id, target_type="business", target_id=business.id,
          ip=client_ip(request), meta={"fields": sorted(updates)})
    return business


# Must match the /static mount in main.py (backend/server/static).
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static", "uploads", "logos")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/{business_id}/logo")
def upload_business_logo(
    business_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")
    if current_user.scope != "platform" and current_user.business_id != business.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    ext = os.path.splitext(file.filename or "")[1] or ".png"
    filename = f"{business_id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(file.file.read())

    logo_url = f"/static/uploads/logos/{filename}"
    business.logo_url = logo_url
    db.commit()
    db.refresh(business)

    return {"logo_url": logo_url}


dashboard_router = APIRouter(prefix="/api/businesses", tags=["businesses"])
dashboard_router.add_api_route("/{business_id}", get_business, methods=["GET"], response_model=BusinessOut)
dashboard_router.add_api_route("/{business_id}", update_business, methods=["PATCH"], response_model=BusinessOut)
dashboard_router.add_api_route("/{business_id}/logo", upload_business_logo, methods=["POST"])

