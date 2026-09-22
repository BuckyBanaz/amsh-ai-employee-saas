"""
Appointments / Transactions API Routes.
Provides full CRUD for clinic patient bookings and table reservations.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from backend.server.api.routes._shared import get_business_or_404, require_membership
from backend.server.auth.security import get_current_user
from backend.server.database.models.transaction import Transaction
from backend.server.database.models.user import User
from backend.server.database.session import get_db

router = APIRouter(prefix="/api/businesses/{business_id}/appointments", tags=["appointments"])


class AppointmentCreateRequest(BaseModel):
    customer_name: str
    phone_number: str
    service_name: Optional[str] = "General Checkup"
    doctor_name: Optional[str] = None
    preferred_date: str  # YYYY-MM-DD
    preferred_time: str  # e.g. "10:00 AM"
    status: Optional[str] = "confirmed"
    notes: Optional[str] = None


class AppointmentUpdateRequest(BaseModel):
    customer_name: Optional[str] = None
    phone_number: Optional[str] = None
    service_name: Optional[str] = None
    doctor_name: Optional[str] = None
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None
    status: Optional[str] = None  # confirmed | cancelled | pending | completed
    notes: Optional[str] = None


def _format_transaction(t: Transaction) -> Dict[str, Any]:
    details = t.details or {}
    return {
        "id": t.id,
        "business_id": t.business_id,
        "call_id": t.call_id,
        "type": t.type,
        "status": t.status,
        "customer_name": details.get("customer_name") or details.get("patient_name") or "Guest Patient",
        "phone_number": details.get("phone_number") or details.get("phone") or "",
        "service_name": details.get("service_name") or details.get("treatment") or "General Consultation",
        "doctor_name": details.get("doctor_name") or details.get("provider") or "Duty Doctor",
        "preferred_date": details.get("preferred_date") or details.get("date") or t.created_at.strftime("%Y-%m-%d"),
        "preferred_time": details.get("preferred_time") or details.get("time") or "10:00 AM",
        "notes": details.get("notes") or "",
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "details": details,
    }


@router.get("", response_model=List[Dict[str, Any]])
def list_appointments(
    business_id: str,
    date: Optional[str] = Query(None, description="Filter by YYYY-MM-DD"),
    status: Optional[str] = Query(None, description="Filter by status: confirmed, pending, cancelled"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """List all appointments for a business with optional filtering."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    stmt = select(Transaction).where(Transaction.business_id == business_id).order_by(desc(Transaction.created_at))
    
    if status:
        stmt = stmt.where(Transaction.status == status)

    results = db.scalars(stmt).all()
    formatted = [_format_transaction(t) for t in results]

    if date:
        formatted = [item for item in formatted if item["preferred_date"] == date]

    return formatted


@router.post("", status_code=status.HTTP_201_CREATED, response_model=Dict[str, Any])
def create_appointment(
    business_id: str,
    payload: AppointmentCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Create a new manual appointment booking."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    tx_details = {
        "customer_name": payload.customer_name,
        "phone_number": payload.phone_number,
        "service_name": payload.service_name,
        "doctor_name": payload.doctor_name,
        "preferred_date": payload.preferred_date,
        "preferred_time": payload.preferred_time,
        "notes": payload.notes,
    }
    
    new_tx = Transaction(
        id=str(uuid.uuid4()),
        business_id=business_id,
        type="appointment",
        details=tx_details,
        status=payload.status or "confirmed",
        created_at=datetime.now(timezone.utc),
    )
    db.add(new_tx)
    db.commit()
    db.refresh(new_tx)
    return _format_transaction(new_tx)


@router.get("/{appointment_id}", response_model=Dict[str, Any])
def get_appointment(
    business_id: str,
    appointment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Get single appointment by ID."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    tx = db.scalar(
        select(Transaction).where(Transaction.id == appointment_id, Transaction.business_id == business_id)
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return _format_transaction(tx)


@router.patch("/{appointment_id}", response_model=Dict[str, Any])
def update_appointment(
    business_id: str,
    appointment_id: str,
    payload: AppointmentUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Update appointment details or status."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    tx = db.scalar(
        select(Transaction).where(Transaction.id == appointment_id, Transaction.business_id == business_id)
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Appointment not found")

    details = dict(tx.details or {})
    if payload.customer_name is not None:
        details["customer_name"] = payload.customer_name
    if payload.phone_number is not None:
        details["phone_number"] = payload.phone_number
    if payload.service_name is not None:
        details["service_name"] = payload.service_name
    if payload.doctor_name is not None:
        details["doctor_name"] = payload.doctor_name
    if payload.preferred_date is not None:
        details["preferred_date"] = payload.preferred_date
    if payload.preferred_time is not None:
        details["preferred_time"] = payload.preferred_time
    if payload.notes is not None:
        details["notes"] = payload.notes

    tx.details = details
    if payload.status is not None:
        tx.status = payload.status

    db.commit()
    db.refresh(tx)
    return _format_transaction(tx)


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(
    business_id: str,
    appointment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete an appointment."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    tx = db.scalar(
        select(Transaction).where(Transaction.id == appointment_id, Transaction.business_id == business_id)
    )
    if tx:
        db.delete(tx)
        db.commit()
    return None
