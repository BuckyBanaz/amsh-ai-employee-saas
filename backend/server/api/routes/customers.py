"""
Customers / Patients CRM API Routes.

A clinic's patient list is its saved patient records (added or edited by staff) plus everyone who booked, matched on the last
10 digits of the phone number. A patient who only exists through bookings has the id "ph_<digits>"; editing or removing them
saves a record. Removing hides the patient until they book again; their appointments and calls stay where they are.
"""

import re
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from backend.ai.capabilities.operations.clinic.read_operations import _format_transaction
from backend.server.api.routes._shared import get_business_or_404, require_membership
from backend.server.auth.security import get_current_user
from backend.server.database.models.call import Call
from backend.server.database.models.patient import Patient
from backend.server.database.models.transaction import Transaction
from backend.server.database.models.user import User
from backend.server.database.session import get_db
from backend.server.services.audit import audit, client_ip

router = APIRouter(prefix="/api/businesses/{business_id}/customers", tags=["customers"])

DERIVED_PREFIX = "ph_"
ACTIVE_WITHIN = timedelta(days=180)  # a patient with no visit, booking or record change for longer than this is "inactive"


class CustomerCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    phone_number: str = Field(min_length=1, max_length=30)
    email: Optional[str] = Field(default=None, max_length=255)
    notes: Optional[str] = Field(default=None, max_length=5000)


class CustomerUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    phone_number: Optional[str] = Field(default=None, min_length=1, max_length=30)
    email: Optional[str] = Field(default=None, max_length=255)
    notes: Optional[str] = Field(default=None, max_length=5000)


def phone_key(phone: Optional[str]) -> str:
    """Last 10 digits (the same rule the AI uses to recognise a returning patient). Empty when there are too few digits."""
    digits = re.sub(r"\D", "", phone or "")
    return digits[-10:] if len(digits) >= 7 else ""


def _aware(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _bookings_by_phone(db: Session, business_id: str) -> Dict[str, List[Dict[str, Any]]]:
    rows = db.scalars(
        select(Transaction)
        .where(Transaction.business_id == business_id, Transaction.type == "appointment")
        .order_by(desc(Transaction.created_at))
    ).all()
    grouped: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for tx in rows:
        item = _format_transaction(tx)
        key = phone_key(item["phone_number"])
        if key:
            item["_created"] = _aware(tx.created_at)
            grouped[key].append(item)
    return grouped


def _summarise(key: str, record: Optional[Patient], bookings: List[Dict[str, Any]], today: str, now: datetime) -> Dict[str, Any]:
    live = [b for b in bookings if (b.get("status") or "").lower() != "cancelled"]
    past = sorted((b["preferred_date"] for b in live if b.get("preferred_date") and b["preferred_date"] <= today), reverse=True)
    upcoming = sorted(b["preferred_date"] for b in live if b.get("preferred_date") and b["preferred_date"] > today)
    latest = bookings[0] if bookings else None  # newest first

    touched = [t for t in (
        _aware(record.updated_at) if record else None,
        latest["_created"] if latest else None,
    ) if t]
    last_activity = max(touched) if touched else None
    recent_visit = bool(past) and past[0] >= (now - ACTIVE_WITHIN).strftime("%Y-%m-%d")
    active = bool(upcoming) or recent_visit or bool(last_activity and now - last_activity <= ACTIVE_WITHIN)

    return {
        "id": record.id if record else f"{DERIVED_PREFIX}{key}",
        "saved": record is not None,
        "name": (record.name if record else None) or (latest["customer_name"] if latest else "Patient"),
        "phone_number": (record.phone_number if record else None) or (latest["phone_number"] if latest else ""),
        "email": record.email if record else None,
        "notes": record.notes if record else None,
        "total_bookings": len(live),
        "upcoming_bookings": len(upcoming),
        "last_visit": past[0] if past else None,
        "next_visit": upcoming[0] if upcoming else None,
        "status": "active" if active else "inactive",
        "created_at": (_aware(record.created_at).isoformat() if record and record.created_at else
                       (bookings[-1]["created_at"] if bookings else None)),
        "_sort": last_activity or datetime.min.replace(tzinfo=timezone.utc),
    }


def _visible(record: Optional[Patient], bookings: List[Dict[str, Any]]) -> bool:
    """A removed patient comes back when they book again after being removed."""
    if not record or not record.archived_at:
        return True
    archived = _aware(record.archived_at)
    return any(b["_created"] and b["_created"] > archived for b in bookings)


def _public(item: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in item.items() if not k.startswith("_")}


def _resolve(db: Session, business_id: str, patient_id: str) -> Tuple[str, Optional[Patient], List[Dict[str, Any]]]:
    """(phone key, saved record or None, bookings) for an id, or 404. Never crosses into another business."""
    if patient_id.startswith(DERIVED_PREFIX):
        key = patient_id[len(DERIVED_PREFIX):]
        if not key.isdigit():
            raise HTTPException(status_code=404, detail="Patient not found")
        record = db.scalar(select(Patient).where(Patient.business_id == business_id, Patient.phone_key == key))
    else:
        record = db.get(Patient, patient_id)
        if not record or record.business_id != business_id:
            raise HTTPException(status_code=404, detail="Patient not found")
        key = record.phone_key
    bookings = _bookings_by_phone(db, business_id).get(key, [])
    if not record and not bookings:
        raise HTTPException(status_code=404, detail="Patient not found")
    return key, record, bookings


def _materialise(db: Session, business_id: str, key: str, bookings: List[Dict[str, Any]]) -> Patient:
    """Save a record for a patient known only from bookings, so it can be edited or removed."""
    latest = bookings[0]
    record = Patient(business_id=business_id, phone_key=key, name=latest["customer_name"], phone_number=latest["phone_number"])
    db.add(record)
    db.flush()
    return record


@router.get("", response_model=List[Dict[str, Any]])
def list_customers(
    business_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """Every patient of this clinic, most recently active first, with real booking counts and visit dates."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    grouped = _bookings_by_phone(db, business_id)
    records = {p.phone_key: p for p in db.scalars(select(Patient).where(Patient.business_id == business_id)).all()}

    out = []
    for key in set(grouped) | set(records):
        record, bookings = records.get(key), grouped.get(key, [])
        if _visible(record, bookings):
            out.append(_summarise(key, record, bookings, today, now))
    out.sort(key=lambda p: p["_sort"], reverse=True)
    return [_public(p) for p in out]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=Dict[str, Any])
def create_customer(
    business_id: str,
    payload: CustomerCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Add a patient. One record per phone number: adding a removed patient brings them back with the new details."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    key = phone_key(payload.phone_number)
    if not key:
        raise HTTPException(status_code=422, detail="Enter a phone number with at least 7 digits.")
    now = datetime.now(timezone.utc)
    record = db.scalar(select(Patient).where(Patient.business_id == business_id, Patient.phone_key == key))
    if record and not record.archived_at:
        raise HTTPException(status_code=409, detail="A patient with this phone number already exists.")
    if not record:
        record = Patient(business_id=business_id, phone_key=key, created_at=now)
        db.add(record)
    record.name = payload.name.strip()
    record.phone_number = payload.phone_number.strip()
    record.email = (payload.email or "").strip() or None
    record.notes = (payload.notes or "").strip() or None
    record.archived_at = None
    record.updated_at = now
    db.commit()
    audit(db, "patient.created", current_user, business_id=business_id, target_type="patient", target_id=record.id, ip=client_ip(request))
    bookings = _bookings_by_phone(db, business_id).get(key, [])
    return _public(_summarise(key, record, bookings, now.strftime("%Y-%m-%d"), now))


@router.patch("/{patient_id}", response_model=Dict[str, Any])
def update_customer(
    business_id: str,
    patient_id: str,
    payload: CustomerUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Edit a patient's name, phone, email or notes. The phone can change only while no booking uses the old number."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    key, record, bookings = _resolve(db, business_id, patient_id)
    changes = payload.model_dump(exclude_unset=True)

    if "phone_number" in changes and changes["phone_number"] is not None:
        new_key = phone_key(changes["phone_number"])
        if not new_key:
            raise HTTPException(status_code=422, detail="Enter a phone number with at least 7 digits.")
        if new_key != key:
            if bookings:
                raise HTTPException(status_code=409, detail="This patient has appointments under the current number, so it cannot be changed. "
                                                            "Add the new number as a separate patient instead.")
            clash = db.scalar(select(Patient).where(Patient.business_id == business_id, Patient.phone_key == new_key))
            if clash or _bookings_by_phone(db, business_id).get(new_key):
                raise HTTPException(status_code=409, detail="Another patient already has this phone number.")
            key = new_key

    if not record:
        record = _materialise(db, business_id, key, bookings)
    now = datetime.now(timezone.utc)
    record.phone_key = key
    if changes.get("name") is not None:
        record.name = changes["name"].strip()
    if changes.get("phone_number") is not None:
        record.phone_number = changes["phone_number"].strip()
    if "email" in changes:
        record.email = (changes["email"] or "").strip() or None
    if "notes" in changes:
        record.notes = (changes["notes"] or "").strip() or None
    record.updated_at = now
    db.commit()
    audit(db, "patient.updated", current_user, business_id=business_id, target_type="patient", target_id=record.id,
          ip=client_ip(request), meta={"fields": sorted(changes)})
    return _public(_summarise(key, record, bookings, now.strftime("%Y-%m-%d"), now))


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    business_id: str,
    patient_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    """Remove a patient from the list. Appointments and calls are kept; the patient reappears if they book again."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    key, record, bookings = _resolve(db, business_id, patient_id)
    if not record:
        record = _materialise(db, business_id, key, bookings)
    now = datetime.now(timezone.utc)
    record.archived_at = now
    record.updated_at = now
    db.commit()
    audit(db, "patient.removed", current_user, business_id=business_id, target_type="patient", target_id=record.id, ip=client_ip(request))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{patient_id}/history", response_model=Dict[str, Any])
def customer_history(
    business_id: str,
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """This patient's appointments (newest first) and calls from their number, within this clinic only."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    key, record, bookings = _resolve(db, business_id, patient_id)
    now = datetime.now(timezone.utc)

    calls = []
    for c in db.scalars(select(Call).where(Call.business_id == business_id).order_by(desc(Call.started_at)).limit(2000)).all():
        if phone_key(c.caller_number) == key:
            calls.append({
                "id": c.id,
                "started_at": _aware(c.started_at).isoformat() if c.started_at else None,
                "duration_seconds": c.duration_seconds or 0,
                "outcome": c.outcome,
                "intent": c.intent,
                "summary": c.summary,
            })
            if len(calls) >= 100:
                break

    return {
        "patient": _public(_summarise(key, record, bookings, now.strftime("%Y-%m-%d"), now)),
        "appointments": [
            {k: b[k] for k in ("id", "status", "service_name", "doctor_name", "preferred_date", "preferred_time", "notes",
                               "channel", "channel_label", "created_at")}
            for b in bookings[:200]
        ],
        "calls": calls,
    }


patients_router = APIRouter(prefix="/api/businesses/{business_id}/patients", tags=["customers"])
patients_router.add_api_route("", list_customers, methods=["GET"], response_model=List[Dict[str, Any]])
