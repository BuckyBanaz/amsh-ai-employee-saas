"""Platform admin: create and permanently delete a business (tenant) from the admin portal.

A clinic normally signs itself up in the tenant app; this is for staff who set a business up on its behalf. Both actions are
guarded by `require_platform_admin` and written to the audit log.

Create: one call makes the business and its owner login, optionally on a chosen plan (catalog or enterprise).
Delete: PERMANENT. It is reached only through an explicit, previewed, name-confirmed request: `GET .../delete-preview` shows what
would go (nothing is touched), and `DELETE` refuses unless `confirm` equals the business's exact name. There is no undo, so the
admin portal offers Suspend (reversible) first. Never call either from a read endpoint or on startup.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.server.api.routes.businesses import ALLOWED_VERTICALS
from backend.server.auth.security import hash_password, require_platform_admin
from backend.server.database.models.audit_log import AuditLog
from backend.server.database.models.business import Business
from backend.server.database.models.call import Call
from backend.server.database.models.message import Message
from backend.server.database.models.phone_number import PhoneNumber
from backend.server.database.models.service import Service, staff_services
from backend.server.database.models.staff import Staff
from backend.server.database.models.user import User
from backend.server.database.session import Base, get_db
from backend.server.services.audit import audit, client_ip
from backend.server.services.number_routing import assignment_conflict, number_key
from backend.server.services.plans import find_by_key

router = APIRouter(prefix="/api/admin/tenants", tags=["admin-tenants-manage"])


class OwnerIn(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class TenantCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    vertical: str = "clinic"
    business_type: Optional[str] = None
    business_subtype: Optional[str] = None
    country: Optional[str] = None
    website: Optional[str] = None
    business_email: Optional[str] = None
    business_phone: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None
    timezone: str = "UTC"
    currency: str = Field(default="USD", min_length=3, max_length=3)
    working_hours: Optional[Dict[str, Any]] = None
    plan: Optional[str] = None  # a plan key, catalog or enterprise
    status: Literal["active", "paused", "suspended", "pending"] = "active"
    owner: OwnerIn


@router.post("", status_code=status.HTTP_201_CREATED)
def create_tenant(payload: TenantCreate, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    if payload.vertical not in ALLOWED_VERTICALS:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"vertical must be one of {sorted(ALLOWED_VERTICALS)}")
    email = payload.owner.email.lower()
    if db.scalar(select(User.id).where(func.lower(User.email) == email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That owner email is already registered")
    plan_key = None
    if payload.plan:
        plan = find_by_key(db, payload.plan.strip().lower())
        if not plan:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown plan '{payload.plan}'")
        plan_key = plan.key

    fields = payload.model_dump(exclude={"owner", "plan", "working_hours", "business_type"})
    business = Business(**fields)
    if payload.business_type:
        business.business_type = payload.business_type
    if payload.working_hours is not None:
        business.working_hours = payload.working_hours
    if plan_key:
        business.plan = plan_key
    db.add(business)
    db.flush()
    owner = User(
        name=payload.owner.name,
        email=email,
        hashed_password=hash_password(payload.owner.password),
        scope="business",
        role="owner",
        business_id=business.id,
        email_verified_at=datetime.now(timezone.utc),  # staff vouched for this address
    )
    db.add(owner)
    db.commit()
    audit(db, "admin.tenant_created", admin, business_id=business.id, target_type="business", target_id=business.id, ip=client_ip(request),
          meta={"name": business.name, "vertical": business.vertical, "plan": business.plan, "status": business.status, "owner_email": email})
    return {"id": business.id, "name": business.name, "plan": business.plan, "status": business.status, "owner": {"id": owner.id, "email": owner.email}}


# ---- Permanent delete ---------------------------------------------------------------------------------------------------

def _business_tables():
    """Every table that carries a `business_id` (child tables first), found from the models so a new table is never forgotten."""
    return [t for t in reversed(Base.metadata.sorted_tables) if "business_id" in t.c and t.name != "businesses"]


def _get_business(db: Session, business_id: str) -> Business:
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")
    return business


@router.get("/{business_id}/delete-preview")
def delete_preview(business_id: str, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    """What a permanent delete would remove. Touches nothing."""
    business = _get_business(db, business_id)
    counts: Dict[str, int] = {}
    for table in _business_tables():
        n = db.scalar(select(func.count()).select_from(table).where(table.c.business_id == business_id)) or 0
        if n:
            counts[table.name] = int(n)
    return {
        "id": business.id, "name": business.name, "status": business.status, "plan": business.plan,
        "counts": counts, "total_rows": sum(counts.values()),
        "confirm_with": business.name,
        "suggestion": "Suspend the business instead if you may need it again: a suspended business can be reactivated, a deleted one cannot.",
    }


class DeleteRequest(BaseModel):
    confirm: str = ""  # must equal the business's exact name


@router.delete("/{business_id}")
def delete_tenant(business_id: str, payload: DeleteRequest, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    business = _get_business(db, business_id)
    if payload.confirm.strip() != business.name.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Type the business's exact name to confirm. Nothing was deleted.")
    name, deleted = business.name, 0
    try:
        # Rows that point at this business's rows without carrying business_id themselves
        call_ids = db.scalars(select(Call.id).where(Call.business_id == business_id)).all()
        if call_ids:
            db.execute(delete(Message).where(Message.call_id.in_(call_ids)))
        staff_ids = db.scalars(select(Staff.id).where(Staff.business_id == business_id)).all()
        service_ids = db.scalars(select(Service.id).where(Service.business_id == business_id)).all()
        conds = ([staff_services.c.staff_id.in_(staff_ids)] if staff_ids else []) + ([staff_services.c.service_id.in_(service_ids)] if service_ids else [])
        if conds:
            db.execute(delete(staff_services).where(or_(*conds)))
        user_ids = db.scalars(select(User.id).where(User.business_id == business_id)).all()
        if user_ids:  # keep other businesses' and platform audit rows, just forget who these users were
            db.execute(update(AuditLog).where(AuditLog.actor_user_id.in_(user_ids)).values(actor_user_id=None))
            db.execute(update(Call).where(Call.taken_over_by_user_id.in_(user_ids)).values(taken_over_by_user_id=None))
        for table in _business_tables():
            deleted += db.execute(delete(table).where(table.c.business_id == business_id)).rowcount or 0
        db.execute(delete(Business).where(Business.id == business_id))  # its users go with it (rows carrying business_id above)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Something still refers to this business, so nothing was deleted. Suspend it instead.") from exc
    audit(db, "admin.tenant_deleted", admin, target_type="business", target_id=business_id, ip=client_ip(request), meta={"name": name, "rows_deleted": deleted})
    return {"deleted": True, "id": business_id, "name": name, "rows_deleted": deleted}


# ---- Phone numbers (what routes a call to this business) ----------------------------------------------------------------

class NumberAssign(BaseModel):
    number: str = Field(min_length=7, max_length=30)  # the line callers dial (ours, or the clinic's own in "dedicated" mode)
    mode: Literal["forwarding", "dedicated"] = "dedicated"
    forwarded_from: Optional[str] = Field(default=None, max_length=30)  # the clinic's published line when it forwards to `number`
    status: Literal["active", "pending"] = "active"


def _number_out(pn: PhoneNumber) -> Dict[str, Any]:
    return {"id": pn.id, "number": pn.number, "mode": pn.mode, "forwarded_from": pn.forwarded_from, "status": pn.status}


@router.post("/{business_id}/numbers", status_code=status.HTTP_201_CREATED)
def assign_number(business_id: str, payload: NumberAssign, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    """Route calls on this number to this business. Refused when it would make routing ambiguous (the number, or the line it is
    forwarded from, already belongs to any assignment)."""
    _get_business(db, business_id)
    number, forwarded_from = payload.number.strip(), (payload.forwarded_from or "").strip() or None
    if not number_key(number) or (forwarded_from and not number_key(forwarded_from)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a full phone number")
    conflict = assignment_conflict(db, number, forwarded_from)
    if conflict:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=conflict)
    pn = PhoneNumber(business_id=business_id, number=number, mode=payload.mode, forwarded_from=forwarded_from, status=payload.status)
    db.add(pn)
    db.commit()
    audit(db, "admin.number_assigned", admin, target_type="business", target_id=business_id, ip=client_ip(request), meta=_number_out(pn))
    return _number_out(pn)


@router.delete("/{business_id}/numbers/{number_id}")
def remove_number(business_id: str, number_id: str, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    pn = db.get(PhoneNumber, number_id)
    if not pn or pn.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Number not found")
    out = _number_out(pn)
    db.delete(pn)
    db.commit()
    audit(db, "admin.number_removed", admin, target_type="business", target_id=business_id, ip=client_ip(request), meta=out)
    return {"removed": True, **out}


# ---- WhatsApp (what routes WhatsApp messages to this business) --------------------------------------

class WhatsappAssign(BaseModel):
    phone_number_id: str = Field(min_length=5, max_length=50)
    access_token: str = Field(min_length=10)
    waba_id: Optional[str] = Field(default=None, max_length=50)
    display_phone_number: Optional[str] = None
    verified_name: Optional[str] = None


@router.post("/{business_id}/whatsapp", status_code=status.HTTP_201_CREATED)
def assign_whatsapp(
    business_id: str,
    payload: WhatsappAssign,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
) -> Dict[str, Any]:
    """Route WhatsApp messages on this phone_number_id to this business. Refused when phone_number_id
    already belongs to any active connected business."""
    from backend.server.database.models.integration import Integration
    from backend.server.auth.crypto import CryptoManager

    _get_business(db, business_id)
    phone_number_id = payload.phone_number_id.strip()

    # Check for conflict
    existing = (
        db.query(Integration)
        .filter(
            Integration.provider == "whatsapp",
            Integration.status == "connected",
            Integration.business_id != business_id,
        )
        .all()
    )
    for ext in existing:
        if str((ext.config or {}).get("phone_number_id")) == phone_number_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"WhatsApp phone number ID {phone_number_id} is already connected to another business",
            )

    integration = (
        db.query(Integration)
        .filter(Integration.business_id == business_id, Integration.provider == "whatsapp")
        .first()
    )
    if not integration:
        integration = Integration(business_id=business_id, provider="whatsapp")
        db.add(integration)

    integration.status = "connected"
    integration.config = {
        **(integration.config or {}),
        "phone_number_id": phone_number_id,
        "waba_id": payload.waba_id,
        "access_token": CryptoManager.encrypt(payload.access_token),
        "display_phone_number": payload.display_phone_number,
        "verified_name": payload.verified_name,
        "mode": "admin_assigned",
    }
    integration.connected_at = datetime.utcnow()
    db.commit()

    meta = {
        "phone_number_id": phone_number_id,
        "waba_id": payload.waba_id,
        "display_phone_number": payload.display_phone_number,
    }
    audit(db, "admin.whatsapp_assigned", admin, target_type="business", target_id=business_id, ip=client_ip(request), meta=meta)
    return {"connected": True, "business_id": business_id, **meta}


@router.delete("/{business_id}/whatsapp")
def remove_whatsapp(
    business_id: str,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
) -> Dict[str, Any]:
    from backend.server.database.models.integration import Integration

    _get_business(db, business_id)
    integration = (
        db.query(Integration)
        .filter(Integration.business_id == business_id, Integration.provider == "whatsapp")
        .first()
    )
    if not integration or integration.status != "connected":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No connected WhatsApp integration found for this business")

    phone_number_id = (integration.config or {}).get("phone_number_id")
    integration.status = "disconnected"
    integration.connected_at = None
    db.commit()

    audit(db, "admin.whatsapp_removed", admin, target_type="business", target_id=business_id, ip=client_ip(request), meta={"phone_number_id": phone_number_id})
    return {"removed": True, "business_id": business_id, "phone_number_id": phone_number_id}
