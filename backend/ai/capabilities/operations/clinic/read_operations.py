"""
Clinic Read Operations.
Provides data retrieval for medical clinic staff, doctor schedules, and appointments.
"""

from typing import Any, Dict, List, Optional
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from backend.server.database.models.staff import Staff
from backend.server.database.models.service import Service
from backend.server.database.models.transaction import Transaction


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
        "preferred_date": details.get("preferred_date") or details.get("date") or (t.created_at.strftime("%Y-%m-%d") if t.created_at else ""),
        "preferred_time": details.get("preferred_time") or details.get("time") or "10:00 AM",
        "notes": details.get("notes") or "",
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "details": details,
    }


class ClinicReadOperations:
    """Retrieves clinic doctors, specialties, open slots, and appointments from PostgreSQL."""

    @staticmethod
    def get_doctors(db: Session, business_id: str) -> List[Dict[str, Any]]:
        """Fetch active doctors/practitioners for the clinic."""
        staff_members = db.query(Staff).filter(
            Staff.business_id == business_id
        ).all()
        return [
            {
                "id": str(s.id),
                "name": s.name,
                "role": s.role,
                "specialty": s.specialty,
                "phone": s.phone,
                "email": s.email,
            }
            for s in staff_members
        ]

    @staticmethod
    def get_services(db: Session, business_id: str) -> List[Dict[str, Any]]:
        """Fetch available treatments and prices for the clinic."""
        services = db.query(Service).filter(
            Service.business_id == business_id
        ).all()
        return [
            {
                "id": str(s.id),
                "title": s.title,
                "duration_minutes": s.duration_minutes,
                "price": float(s.price_amount) if s.price_amount is not None else None,
                "description": s.description,
            }
            for s in services
        ]

    @staticmethod
    def get_appointments(
        db: Session,
        business_id: str,
        date: Optional[str] = None,
        status: Optional[str] = None,
        doctor_name: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch appointments for a clinic with optional date, status, or doctor filter."""
        stmt = (
            select(Transaction)
            .where(Transaction.business_id == business_id, Transaction.type == "appointment")
            .order_by(desc(Transaction.created_at))
        )
        if status:
            stmt = stmt.where(Transaction.status == status)

        results = db.scalars(stmt).all()
        formatted = [_format_transaction(t) for t in results]

        if date:
            formatted = [item for item in formatted if item["preferred_date"] == date]

        if doctor_name and doctor_name.lower() != "all doctors":
            formatted = [
                item for item in formatted
                if doctor_name.lower() in (item.get("doctor_name") or "").lower()
            ]

        return formatted

    @staticmethod
    def get_appointment_by_id(
        db: Session,
        business_id: str,
        appointment_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Fetch single appointment transaction by ID."""
        tx = db.scalar(
            select(Transaction).where(
                Transaction.id == appointment_id,
                Transaction.business_id == business_id,
            )
        )
        if not tx:
            return None
        return _format_transaction(tx)
