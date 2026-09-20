"""
Clinic Write Operations.
Handles persisting confirmed appointments, patient records, and transactions into PostgreSQL.
"""

from datetime import datetime
import logging
import uuid
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session

from backend.server.database.models.transaction import Transaction
from backend.server.database.models.service import Service

logger = logging.getLogger(__name__)


class ClinicWriteOperations:
    """Persists patient appointments and updates database records."""

    @staticmethod
    def store_appointment(
        db: Session,
        business_id: str,
        patient_name: str,
        phone_number: str,
        service_name: str,
        preferred_date: str,
        preferred_time: str,
        doctor_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Stores confirmed appointment in PostgreSQL transactions/appointments table.
        """
        # Find matching service price if available
        service = db.query(Service).filter(
            Service.business_id == business_id,
            Service.title.ilike(f"%{service_name}%")
        ).first()

        amount = float(service.price) if (service and service.price) else 0.0
        booking_id = str(uuid.uuid4())

        metadata_dict = {
            "patient_name": patient_name,
            "phone_number": phone_number,
            "service_name": service_name,
            "preferred_date": preferred_date,
            "preferred_time": preferred_time,
            "doctor_name": doctor_name or "Assigned on arrival",
            "source": "ai_voice_receptionist",
            "booked_at": datetime.utcnow().isoformat()
        }

        transaction = Transaction(
            id=booking_id,
            business_id=business_id,
            type="appointment",
            amount=amount,
            status="confirmed",
            metadata_json=metadata_dict
        )

        try:
            db.add(transaction)
            db.commit()
            db.refresh(transaction)
            logger.info("Successfully stored appointment %s in PostgreSQL for patient %s", booking_id, patient_name)
            return {
                "success": True,
                "booking_id": booking_id,
                "status": "confirmed",
                "patient_name": patient_name,
                "service": service_name,
                "date": preferred_date,
                "time": preferred_time
            }
        except Exception as e:
            db.rollback()
            logger.error("Failed to store appointment in DB: %s", e)
            return {
                "success": False,
                "error": str(e),
                "booking_id": booking_id
            }
