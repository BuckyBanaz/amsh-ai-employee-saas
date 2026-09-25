"""
Customers / Patients CRM API Routes.
Provides patient registry extracted from appointments and call transactions.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from backend.server.api.routes._shared import get_business_or_404, require_membership
from backend.server.auth.security import get_current_user
from backend.server.database.models.transaction import Transaction
from backend.server.database.models.user import User
from backend.server.database.session import get_db

router = APIRouter(prefix="/api/businesses/{business_id}/customers", tags=["customers"])


class CustomerCreateRequest(BaseModel):
    name: str
    phone_number: str
    email: Optional[str] = None
    notes: Optional[str] = None


@router.get("", response_model=List[Dict[str, Any]])
def list_customers(
    business_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """List unique patients / customers registered or derived from bookings."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    txs = db.scalars(
        select(Transaction)
        .where(Transaction.business_id == business_id)
        .order_by(desc(Transaction.created_at))
    ).all()

    seen_phones = set()
    customers = []

    for tx in txs:
        details = tx.details or {}
        phone = details.get("phone_number") or details.get("phone") or ""
        name = details.get("customer_name") or details.get("patient_name") or "Guest Patient"

        if phone and phone not in seen_phones:
            seen_phones.add(phone)
            customers.append({
                "id": f"cust_{tx.id[:8]}",
                "name": name,
                "phone_number": phone,
                "total_bookings": 1,
                "last_visit": tx.created_at.strftime("%Y-%m-%d") if tx.created_at else None,
                "status": "active",
            })

    return customers


@router.post("", status_code=status.HTTP_201_CREATED, response_model=Dict[str, Any])
def create_customer(
    business_id: str,
    payload: CustomerCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Manually register a new patient/customer."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    new_tx = Transaction(
        id=str(uuid.uuid4()),
        business_id=business_id,
        type="appointment",
        details={
            "customer_name": payload.name,
            "phone_number": payload.phone_number,
            "email": payload.email,
            "notes": payload.notes,
        },
        status="confirmed",
        created_at=datetime.now(timezone.utc),
    )
    db.add(new_tx)
    db.commit()
    db.refresh(new_tx)

    return {
        "id": f"cust_{new_tx.id[:8]}",
        "name": payload.name,
        "phone_number": payload.phone_number,
        "total_bookings": 1,
        "last_visit": new_tx.created_at.strftime("%Y-%m-%d"),
        "status": "active",
    }


patients_router = APIRouter(prefix="/api/businesses/{business_id}/patients", tags=["customers"])
patients_router.add_api_route("", list_customers, methods=["GET"], response_model=List[Dict[str, Any]])
