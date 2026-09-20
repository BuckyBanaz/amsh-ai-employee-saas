"""
Clinic Read Operations.
Provides data retrieval for medical clinic staff and doctor schedules.
"""

from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from backend.server.database.models.staff import Staff
from backend.server.database.models.service import Service


class ClinicReadOperations:
    """Retrieves clinic doctors, specialties, and open slots from PostgreSQL."""

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
                "phone": s.phone
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
                "description": s.description
            }
            for s in services
        ]
