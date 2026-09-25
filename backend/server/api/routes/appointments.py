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

from backend.ai.capabilities.operations.clinic import ClinicReadOperations, ClinicWriteOperations
from backend.server.api.routes._shared import get_business_or_404, require_membership
from backend.server.auth.security import get_current_user
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


@router.get("", response_model=List[Dict[str, Any]])
def list_appointments(
    business_id: str,
    date: Optional[str] = Query(None, description="Filter by YYYY-MM-DD"),
    status: Optional[str] = Query(None, description="Filter by status: confirmed, pending, cancelled"),
    doctor_name: Optional[str] = Query(None, description="Filter by doctor name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """List all appointments for a business with optional filtering using ClinicReadOperations."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    return ClinicReadOperations.get_appointments(
        db=db,
        business_id=business_id,
        date=date,
        status=status,
        doctor_name=doctor_name,
    )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=Dict[str, Any])
def create_appointment(
    business_id: str,
    payload: AppointmentCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Create a new manual appointment booking using ClinicWriteOperations."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    return ClinicWriteOperations.store_appointment(
        db=db,
        business_id=business_id,
        patient_name=payload.customer_name,
        phone_number=payload.phone_number,
        service_name=payload.service_name or "General Consultation",
        preferred_date=payload.preferred_date,
        preferred_time=payload.preferred_time or "10:00 AM",
        doctor_name=payload.doctor_name,
        notes=payload.notes,
        source="manual_dashboard",
        status=payload.status or "confirmed",
    )


@router.get("/{appointment_id}", response_model=Dict[str, Any])
def get_appointment(
    business_id: str,
    appointment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Get single appointment by ID using ClinicReadOperations."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    appointment = ClinicReadOperations.get_appointment_by_id(db, business_id, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment


@router.patch("/{appointment_id}", response_model=Dict[str, Any])
def update_appointment(
    business_id: str,
    appointment_id: str,
    payload: AppointmentUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Update appointment details or status using ClinicWriteOperations."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    try:
        return ClinicWriteOperations.update_appointment(
            db=db,
            business_id=business_id,
            appointment_id=appointment_id,
            updates=payload.model_dump(exclude_unset=True),
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="Appointment not found")


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(
    business_id: str,
    appointment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete an appointment using ClinicWriteOperations."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    success = ClinicWriteOperations.delete_appointment(db, business_id, appointment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return None

