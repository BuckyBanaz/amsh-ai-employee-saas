"""Multi-vertical APIs (DOCS/31 §9). Every route needs a login; tenant routes are scoped to the caller's business and write
routes need an owner or admin (enquiry status: any member). Platform templates are read-only here.

  GET    /api/verticals                                   the catalogue: verticals, subtypes, onboarding steps, dashboard nav
  GET    /api/verticals/{key}                             one vertical, with its workflows (no tenant data, no secrets)

  GET    /api/businesses/{id}/vertical-config             this business's vertical, subtype, workflows, activation state
  PUT    /api/businesses/{id}/vertical-config             choose vertical (before activation) and subtype
  POST   /api/businesses/{id}/vertical-config/validate    readiness checks (errors block activation, warnings do not)
  POST   /api/businesses/{id}/vertical-config/activate    validate, then mark active

  GET|POST           /api/businesses/{id}/departments                  department directory (POST /from-template seeds it)
  PATCH|DELETE       /api/businesses/{id}/departments/{dept_id}
  GET|POST           /api/businesses/{id}/enquiries                    leads, callbacks, demo and support requests
  GET|PATCH          /api/businesses/{id}/enquiries/{enquiry_id}
  GET                /api/businesses/{id}/transfers                    transfer attempts and their real outcomes
  GET|POST           /api/businesses/{id}/resources                    rooms / stations / visit slots
  PATCH|DELETE       /api/businesses/{id}/resources/{resource_id}
"""

import hashlib
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from backend.ai.verticals.errors import UnknownVerticalError
from backend.ai.workflows.registry import workflow_registry
from backend.server.api.routes._shared import get_business_or_404, require_membership, require_owner_or_admin
from backend.server.auth.security import get_current_user
from backend.server.database.models.business import Business
from backend.server.database.models.user import User
from backend.server.database.models.vertical import Department, Enquiry, Resource, TransferAttempt
from backend.server.database.session import get_db
from backend.server.services import vertical_setup
from backend.server.services.audit import audit, client_ip

catalog_router = APIRouter(prefix="/api/verticals", tags=["verticals"])
router = APIRouter(prefix="/api/businesses/{business_id}", tags=["vertical-config"])

_SLUG = re.compile(r"^[a-z][a-z0-9_]{1,49}$")
_E164 = re.compile(r"^\+[1-9]\d{6,14}$")


def _vertical_out(key: str, with_workflows: bool = False) -> Dict[str, Any]:
    registry = workflow_registry()
    v = registry.vertical(key)
    out: Dict[str, Any] = {
        "key": v.key, "name": v.name, "status": v.status, "version": v.version, "description": v.description,
        "terminology": v.terminology.model_dump(), "safety": v.safety.model_dump(),
        "onboarding": [s.model_dump() for s in v.onboarding], "dashboard": [n.model_dump() for n in v.dashboard],
        "resources": [r.model_dump() for r in v.resources],
        "departments": [d.model_dump() for d in v.departments],
        "subtypes": [
            {"key": s.key, "name": s.name, "workflows": list(s.workflows), "departments": list(s.departments),
             "resources": list(s.resources), "differences": list(s.differences),
             "terminology": s.terminology.model_dump() if s.terminology else None}
            for s in v.subtypes
        ],
    }
    if with_workflows:
        out["workflows"] = [
            {"id": w.id, "version": w.version, "title": w.title, "status": w.status, "entry_intents": list(w.entry_intents),
             "slot_order": w.slot_order, "tools": list(w.tools), "booking_type": w.booking_type,
             "transfer_departments": list(w.transfer.departments), "steps": [{"id": s.id, "kind": s.kind} for s in w.steps]}
            for w in registry.workflows.values() if w.id.startswith(v.key + ".")
        ]
    return out


@catalog_router.get("")
def list_verticals(current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    registry = workflow_registry()
    return {"items": [_vertical_out(k) for k in registry.verticals]}


@catalog_router.get("/{key}")
def get_vertical(key: str, current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    try:
        return _vertical_out(key, with_workflows=True)
    except UnknownVerticalError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown vertical")


# ---- per-business configuration -------------------------------------------------------------------------------------------

class VerticalConfigIn(BaseModel):
    vertical: Optional[str] = Field(default=None, max_length=50)
    subtype: str = Field(min_length=1, max_length=50)


def _config_out(db: Session, business: Business) -> Dict[str, Any]:
    registry = workflow_registry()
    settings = dict(business.vertical_settings or {})
    try:
        v = registry.vertical(business.vertical)
    except UnknownVerticalError:
        return {"vertical": business.vertical, "subtype": business.business_subtype, "supported": False, "settings": settings,
                "workflows": [], "terminology": None, "dashboard": [], "onboarding": []}
    sub = v.subtype(business.business_subtype)
    workflows = registry.workflows_for(v.key, sub.key if sub else None)
    return {
        "vertical": v.key, "vertical_name": v.name, "subtype": sub.key if sub else None, "subtype_name": sub.name if sub else None,
        "supported": True, "status": settings.get("status") or ("active" if business.status == "active" and v.key == "clinic" else "draft"),
        "settings": settings, "terminology": (sub.terminology or v.terminology).model_dump() if sub else v.terminology.model_dump(),
        "dashboard": [n.model_dump() for n in v.dashboard], "onboarding": [s.model_dump() for s in v.onboarding],
        "resources": [r.model_dump() for r in v.resources],
        "workflows": [{"id": w.id, "title": w.title, "status": w.status, "version": w.version} for w in workflows],
        "tools": registry.tools_for(v.key, sub.key if sub else None),
        "suggested_departments": list(sub.departments) if sub else [],
    }


@router.get("/vertical-config")
def get_vertical_config(business_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    business = get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    return _config_out(db, business)


@router.put("/vertical-config")
def put_vertical_config(business_id: str, payload: VerticalConfigIn, request: Request, db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    business = get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    registry = workflow_registry()
    target = (payload.vertical or business.vertical or "").strip().lower()
    try:
        v = registry.vertical(target)
    except UnknownVerticalError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Unknown vertical {target!r}")
    sub = v.subtype(payload.subtype.strip().lower())
    if sub is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=f"{v.name} has no subtype {payload.subtype!r}; choose one of {[s.key for s in v.subtypes]}")
    settings = dict(business.vertical_settings or {})
    if target != business.vertical:
        # Changing industry after going live would reinterpret a working tenant's data: platform staff only.
        if settings.get("status") == "active" and current_user.scope != "platform":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The business type cannot be changed after activation. Contact support.")
        if business.vertical == "clinic" and current_user.scope != "platform" and _has_clinic_data(db, business_id):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This clinic already has patients or appointments: contact support to change its type.")
    before = {"vertical": business.vertical, "subtype": business.business_subtype}
    business.vertical, business.business_subtype = v.key, sub.key
    settings.update({"definition_version": v.version})
    if settings.get("status") == "active" and before["vertical"] != v.key:
        settings["status"] = "draft"
    business.vertical_settings = settings
    db.commit()
    audit(db, "business.vertical_configured", current_user, business_id=business_id, target_type="business", target_id=business_id,
          ip=client_ip(request), meta={"before": before, "after": {"vertical": v.key, "subtype": sub.key}})
    return _config_out(db, business)


def _has_clinic_data(db: Session, business_id: str) -> bool:
    from backend.server.database.models.patient import Patient
    from backend.server.database.models.transaction import Transaction

    return bool(db.query(Transaction.id).filter(Transaction.business_id == business_id, Transaction.type == "appointment").first()
                or db.query(Patient.id).filter(Patient.business_id == business_id).first())


@router.post("/vertical-config/validate")
def validate_vertical_config(business_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    business = get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    problems = vertical_setup.readiness(db, business)
    return {"ready": not any(p["level"] == "error" for p in problems), "problems": problems}


@router.post("/vertical-config/activate")
def activate_vertical_config(business_id: str, request: Request, db: Session = Depends(get_db),
                             current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    business = get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    problems = vertical_setup.readiness(db, business)
    errors = [p for p in problems if p["level"] == "error"]
    if errors:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"message": "Fix these before activating", "problems": problems})
    settings = dict(business.vertical_settings or {})
    settings.update({"status": "active", "activated_at": datetime.now(timezone.utc).isoformat(), "activated_by": current_user.id,
                     "definition_version": workflow_registry().vertical(business.vertical).version,
                     "warnings": [p["code"] for p in problems]})
    business.vertical_settings = settings
    db.commit()
    audit(db, "business.vertical_activated", current_user, business_id=business_id, target_type="business", target_id=business_id,
          ip=client_ip(request), meta={"vertical": business.vertical, "subtype": business.business_subtype, "warnings": settings["warnings"]})
    return {**_config_out(db, business), "problems": problems}


# ---- departments ----------------------------------------------------------------------------------------------------------

class DepartmentIn(BaseModel):
    key: Optional[str] = Field(default=None, max_length=50)
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    intents: Optional[List[str]] = None
    match: Optional[Dict[str, str]] = None
    transfer_phone: Optional[str] = Field(default=None, max_length=30)
    hours: Optional[Dict[str, Any]] = None
    priority: Optional[int] = Field(default=None, ge=0, le=100)
    fallback_key: Optional[str] = Field(default=None, max_length=50)
    timeout_seconds: Optional[int] = Field(default=None, ge=5, le=60)
    may_answer: Optional[bool] = None
    required_slots: Optional[List[str]] = None
    active: Optional[bool] = None

    @field_validator("transfer_phone")
    @classmethod
    def _e164(cls, value: Optional[str]) -> Optional[str]:
        if value in (None, ""):
            return None
        compact = re.sub(r"[\s().-]", "", value)
        if not _E164.match(compact):
            raise ValueError("Use the full international number, e.g. +14155550123")
        return compact

    @field_validator("intents", "required_slots")
    @classmethod
    def _slugs(cls, value: Optional[List[str]]) -> Optional[List[str]]:
        if value is None:
            return None
        cleaned = [re.sub(r"[^a-z0-9]+", "_", str(v).strip().lower()).strip("_") for v in value]
        if len(cleaned) > 30 or any(not _SLUG.match(c) for c in cleaned):
            raise ValueError("Each item must be a short lowercase word (letters, digits, underscores)")
        return list(dict.fromkeys(cleaned))


def _department_out(d: Department) -> Dict[str, Any]:
    return {"id": d.id, "key": d.key, "name": d.name, "intents": d.intents or [], "match": d.match or {}, "transfer_phone": d.transfer_phone,
            "hours": d.hours, "priority": d.priority, "fallback_key": d.fallback_key, "timeout_seconds": d.timeout_seconds,
            "may_answer": d.may_answer, "required_slots": d.required_slots or [], "active": d.active}


def _check_fallback_chain(db: Session, business_id: str, key: str, fallback: Optional[str]) -> None:
    if not fallback:
        return
    if fallback == key:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A department cannot fall back to itself")
    rows = {d.key: d.fallback_key for d in db.query(Department).filter(Department.business_id == business_id).all()}
    if fallback not in rows:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"No department {fallback!r} to fall back to")
    rows[key] = fallback
    seen, cur = set(), key
    while cur:
        if cur in seen:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="These fallbacks would form a loop")
        seen.add(cur)
        cur = rows.get(cur)


@router.get("/departments")
def list_departments(business_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    rows = db.query(Department).filter(Department.business_id == business_id).order_by(Department.priority.desc(), Department.name).all()
    return {"items": [_department_out(d) for d in rows]}


@router.post("/departments", status_code=status.HTTP_201_CREATED)
def create_department(business_id: str, payload: DepartmentIn, request: Request, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    key = re.sub(r"[^a-z0-9]+", "_", (payload.key or payload.name or "").strip().lower()).strip("_")
    if not _SLUG.match(key) or not payload.name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A department needs a name and a short key")
    if db.query(Department).filter_by(business_id=business_id, key=key).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"A department with key {key!r} already exists")
    _check_fallback_chain(db, business_id, key, payload.fallback_key)
    row = Department(business_id=business_id, key=key, name=payload.name.strip(), intents=payload.intents or [], match=payload.match or {},
                     transfer_phone=payload.transfer_phone, hours=payload.hours, priority=payload.priority if payload.priority is not None else 50,
                     fallback_key=payload.fallback_key or None, timeout_seconds=payload.timeout_seconds or 20,
                     may_answer=True if payload.may_answer is None else payload.may_answer, required_slots=payload.required_slots or [],
                     active=True if payload.active is None else payload.active)
    db.add(row)
    db.commit()
    audit(db, "department.created", current_user, business_id=business_id, target_type="department", target_id=row.id,
          ip=client_ip(request), meta={"key": key, "has_destination": bool(row.transfer_phone)})
    return _department_out(row)


@router.post("/departments/from-template", status_code=status.HTTP_201_CREATED)
def departments_from_template(business_id: str, request: Request, db: Session = Depends(get_db),
                              current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    """Create the subtype's suggested departments from the platform templates (no phone numbers: the business adds its own)."""
    business = get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    try:
        v = workflow_registry().vertical(business.vertical)
    except UnknownVerticalError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="This business type has no department templates")
    sub = v.subtype(business.business_subtype) or v.subtypes[0]
    existing = {d.key for d in db.query(Department).filter_by(business_id=business_id).all()}
    created = []
    for key in sub.departments:
        t = v.department(key)
        if t is None or key in existing:
            continue
        row = Department(business_id=business_id, key=t.key, name=t.name, intents=list(t.intents), match=dict(t.match), priority=t.priority,
                         fallback_key=t.default_fallback if (t.default_fallback in sub.departments) else None, may_answer=t.may_answer,
                         required_slots=list(t.required_slots), timeout_seconds=20, active=True)
        db.add(row)
        created.append(row)
    db.commit()
    if created:
        audit(db, "department.created_from_template", current_user, business_id=business_id, target_type="business", target_id=business_id,
              ip=client_ip(request), meta={"keys": [r.key for r in created]})
    return {"created": [_department_out(r) for r in created]}


@router.patch("/departments/{dept_id}")
def update_department(business_id: str, dept_id: str, payload: DepartmentIn, request: Request, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    row = db.get(Department, dept_id)
    if row is None or row.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    updates = payload.model_dump(exclude_unset=True)
    updates.pop("key", None)  # the key is the department's identity (routing, attempts): not renamed
    if "fallback_key" in updates:
        _check_fallback_chain(db, business_id, row.key, updates["fallback_key"])
    for field_name, value in updates.items():
        setattr(row, field_name, value if field_name != "fallback_key" else (value or None))
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    audit(db, "department.updated", current_user, business_id=business_id, target_type="department", target_id=row.id,
          ip=client_ip(request), meta={"fields": sorted(updates)})
    return _department_out(row)


@router.delete("/departments/{dept_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(business_id: str, dept_id: str, request: Request, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)) -> Response:
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    row = db.get(Department, dept_id)
    if row is None or row.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    if db.query(Department.id).filter(Department.business_id == business_id, Department.fallback_key == row.key).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Another department falls back to this one: change that first")
    key = row.key
    db.delete(row)
    db.commit()
    audit(db, "department.deleted", current_user, business_id=business_id, target_type="department", target_id=dept_id,
          ip=client_ip(request), meta={"key": key})
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---- enquiries ------------------------------------------------------------------------------------------------------------

class EnquiryIn(BaseModel):
    kind: Literal["enquiry", "admission", "callback", "demo_request", "support"] = "enquiry"
    contact_name: str = Field(min_length=1, max_length=255)
    contact_phone: str = Field(min_length=7, max_length=30)
    contact_email: Optional[str] = Field(default=None, max_length=255)
    topic: Optional[str] = Field(default=None, max_length=50)
    subject: Optional[str] = Field(default=None, max_length=255)
    department_key: Optional[str] = Field(default=None, max_length=50)
    details: Dict[str, str] = Field(default_factory=dict)
    notes: Optional[str] = Field(default=None, max_length=5000)
    idempotency_key: Optional[str] = Field(default=None, max_length=80)

    @field_validator("details")
    @classmethod
    def _small(cls, value: Dict[str, str]) -> Dict[str, str]:
        if len(value) > 20 or any(len(str(k)) > 50 or len(str(v)) > 255 for k, v in value.items()):
            raise ValueError("details: at most 20 short fields")
        return value


class EnquiryUpdate(BaseModel):
    status: Optional[Literal["new", "contacted", "closed"]] = None
    notes: Optional[str] = Field(default=None, max_length=5000)
    department_key: Optional[str] = Field(default=None, max_length=50)


def _enquiry_out(e: Enquiry) -> Dict[str, Any]:
    return {"id": e.id, "kind": e.kind, "source": e.source, "status": e.status, "topic": e.topic, "subject": e.subject,
            "contact_name": e.contact_name, "contact_phone": e.contact_phone, "contact_email": e.contact_email, "details": e.details or {},
            "department_key": e.department_key, "call_id": e.call_id, "workflow_id": e.workflow_id, "notes": e.notes,
            "follow_up_due_at": e.follow_up_due_at.isoformat() if e.follow_up_due_at else None,
            "created_at": e.created_at.isoformat() if e.created_at else None, "updated_at": e.updated_at.isoformat() if e.updated_at else None}


@router.get("/enquiries")
def list_enquiries(business_id: str, status_filter: Optional[str] = None, kind: Optional[str] = None, limit: int = 200,
                   db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    q = db.query(Enquiry).filter(Enquiry.business_id == business_id)
    if status_filter:
        q = q.filter(Enquiry.status == status_filter)
    if kind:
        q = q.filter(Enquiry.kind == kind)
    rows = q.order_by(Enquiry.created_at.desc()).limit(max(1, min(limit, 500))).all()
    counts = {s: db.query(Enquiry).filter(Enquiry.business_id == business_id, Enquiry.status == s).count() for s in ("new", "contacted", "closed")}
    return {"items": [_enquiry_out(e) for e in rows], "counts": counts}


@router.post("/enquiries", status_code=status.HTTP_201_CREATED)
def create_enquiry(business_id: str, payload: EnquiryIn, request: Request, response: Response, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    digits = re.sub(r"\D", "", payload.contact_phone)
    if len(digits) < 7:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Enter a full phone number")
    idem = payload.idempotency_key or "staff:" + hashlib.sha256(
        f"{payload.kind}|{digits[-10:]}|{(payload.subject or '').lower()}|{datetime.now(timezone.utc):%Y-%m-%d}".encode()).hexdigest()[:40]
    existing = db.query(Enquiry).filter_by(business_id=business_id, idempotency_key=idem).first()
    if existing is not None:  # a double submit returns the first one
        response.status_code = status.HTTP_200_OK
        return {**_enquiry_out(existing), "duplicate": True}
    row = Enquiry(business_id=business_id, source="staff", kind=payload.kind, topic=payload.topic, subject=payload.subject,
                  contact_name=payload.contact_name.strip(), contact_phone=payload.contact_phone.strip(), contact_phone_key=digits[-10:],
                  contact_email=payload.contact_email, department_key=payload.department_key, details=dict(payload.details),
                  notes=payload.notes, idempotency_key=idem)
    db.add(row)
    db.commit()
    audit(db, "enquiry.created", current_user, business_id=business_id, target_type="enquiry", target_id=row.id, ip=client_ip(request),
          meta={"kind": row.kind})
    return _enquiry_out(row)


@router.get("/enquiries/{enquiry_id}")
def get_enquiry(business_id: str, enquiry_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    row = db.get(Enquiry, enquiry_id)
    if row is None or row.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enquiry not found")
    transfers = db.query(TransferAttempt).filter(TransferAttempt.business_id == business_id, TransferAttempt.enquiry_id == row.id).all()
    return {**_enquiry_out(row), "transfers": [_transfer_out(t) for t in transfers]}


@router.patch("/enquiries/{enquiry_id}")
def update_enquiry(business_id: str, enquiry_id: str, payload: EnquiryUpdate, request: Request, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    row = db.get(Enquiry, enquiry_id)
    if row is None or row.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enquiry not found")
    updates = payload.model_dump(exclude_unset=True)
    before = row.status
    for field_name, value in updates.items():
        setattr(row, field_name, value)
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    audit(db, "enquiry.updated", current_user, business_id=business_id, target_type="enquiry", target_id=row.id, ip=client_ip(request),
          meta={"fields": sorted(updates), "status": {"from": before, "to": row.status}})
    return _enquiry_out(row)


# ---- transfers ------------------------------------------------------------------------------------------------------------

def _transfer_out(t: TransferAttempt) -> Dict[str, Any]:
    return {"id": t.id, "call_id": t.call_id, "department_key": t.department_key, "requested_key": t.requested_key,
            "destination_tail": t.destination_tail, "reason": t.reason, "status": t.status, "outcome_detail": t.outcome_detail,
            "enquiry_id": t.enquiry_id, "created_at": t.created_at.isoformat() if t.created_at else None,
            "finished_at": t.finished_at.isoformat() if t.finished_at else None}


@router.get("/transfers")
def list_transfers(business_id: str, limit: int = 200, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    rows = (db.query(TransferAttempt).filter(TransferAttempt.business_id == business_id)
            .order_by(TransferAttempt.created_at.desc()).limit(max(1, min(limit, 500))).all())
    by_status: Dict[str, int] = {}
    for t in rows:
        by_status[t.status] = by_status.get(t.status, 0) + 1
    return {"items": [_transfer_out(t) for t in rows], "by_status": by_status}


# ---- resources ------------------------------------------------------------------------------------------------------------

class ResourceIn(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    kind: Optional[str] = Field(default=None, max_length=30)
    capacity: Optional[int] = Field(default=None, ge=1, le=50)
    active: Optional[bool] = None


def _resource_out(r: Resource) -> Dict[str, Any]:
    return {"id": r.id, "name": r.name, "kind": r.kind, "capacity": r.capacity, "active": r.active}


def _check_kind(db: Session, business_id: str, kind: str) -> None:
    business = db.get(Business, business_id)
    try:
        allowed = {r.key for r in workflow_registry().vertical(business.vertical).resources if r.key != "staff"}
    except UnknownVerticalError:
        allowed = set()
    if kind not in allowed:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=f"This business type has no resource kind {kind!r}" + (f"; use one of {sorted(allowed)}" if allowed else ""))


@router.get("/resources")
def list_resources(business_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    return {"items": [_resource_out(r) for r in db.query(Resource).filter(Resource.business_id == business_id).order_by(Resource.name).all()]}


@router.post("/resources", status_code=status.HTTP_201_CREATED)
def create_resource(business_id: str, payload: ResourceIn, request: Request, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    if not payload.name or not payload.kind:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A resource needs a name and a kind")
    _check_kind(db, business_id, payload.kind)
    row = Resource(business_id=business_id, name=payload.name.strip(), kind=payload.kind, capacity=payload.capacity or 1,
                   active=True if payload.active is None else payload.active)
    db.add(row)
    db.commit()
    audit(db, "resource.created", current_user, business_id=business_id, target_type="resource", target_id=row.id, ip=client_ip(request),
          meta={"kind": row.kind})
    return _resource_out(row)


@router.patch("/resources/{resource_id}")
def update_resource(business_id: str, resource_id: str, payload: ResourceIn, request: Request, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    row = db.get(Resource, resource_id)
    if row is None or row.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    updates = payload.model_dump(exclude_unset=True)
    if "kind" in updates:
        _check_kind(db, business_id, updates["kind"])
    for field_name, value in updates.items():
        setattr(row, field_name, value)
    db.commit()
    audit(db, "resource.updated", current_user, business_id=business_id, target_type="resource", target_id=row.id, ip=client_ip(request),
          meta={"fields": sorted(updates)})
    return _resource_out(row)


@router.delete("/resources/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(business_id: str, resource_id: str, request: Request, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)) -> Response:
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    row = db.get(Resource, resource_id)
    if row is None or row.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    db.delete(row)
    db.commit()
    audit(db, "resource.deleted", current_user, business_id=business_id, target_type="resource", target_id=resource_id, ip=client_ip(request))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
