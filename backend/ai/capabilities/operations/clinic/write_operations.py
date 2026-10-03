"""
Clinic Write Operations.
Handles persisting confirmed appointments, patient records, and transactions into PostgreSQL.
"""

from datetime import datetime, timezone
import logging
import uuid
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session

from backend.server.common.channels import channel_of
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
        service_name: str = "General Consultation",
        preferred_date: str = "",
        preferred_time: str = "10:00 AM",
        doctor_name: Optional[str] = None,
        notes: Optional[str] = None,
        source: str = "manual_dashboard",
        call_id: Optional[str] = None,
        status: str = "confirmed",
    ) -> Dict[str, Any]:
        """
        Stores confirmed appointment in PostgreSQL transactions table.
        """
        # Find matching service price if available
        service = db.query(Service).filter(
            Service.business_id == business_id,
            Service.title.ilike(f"%{service_name}%")
        ).first()

        price_amount = float(service.price_amount) if (service and service.price_amount is not None) else None
        booking_id = str(uuid.uuid4())

        details_dict = {
            "customer_name": patient_name,
            "patient_name": patient_name,
            "phone_number": phone_number,
            "service_name": service_name,
            "preferred_date": preferred_date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "preferred_time": preferred_time,
            "doctor_name": doctor_name or "Duty Doctor",
            "notes": notes or "",
            "source": source,
            "channel": channel_of({"source": source}, call_id),
            "price_amount": price_amount,
            "booked_at": datetime.now(timezone.utc).isoformat(),
        }

        transaction = Transaction(
            id=booking_id,
            business_id=business_id,
            call_id=call_id,
            type="appointment",
            details=details_dict,
            status=status,
            created_at=datetime.now(timezone.utc),
        )

        try:
            db.add(transaction)
            db.commit()
            db.refresh(transaction)
            logger.info("Successfully stored appointment %s in PostgreSQL for %s", booking_id, patient_name)

            # Trigger Instant Confirmation SMS if phone provided and source is voice receptionist
            if phone_number and source == "ai_voice_receptionist":
                try:
                    from backend.server.database.models.business import Business
                    from backend.server.notifications.messenger import context_for, send_event_sync
                    biz = db.get(Business, business_id)
                    send_event_sync(
                        db, "booking.confirmed", business_id=business_id, phone=phone_number,
                        context=context_for("booking.confirmed", patient_name=patient_name, service=service_name, doctor=details_dict.get("doctor_name"),
                                            date=preferred_date, time=preferred_time, clinic_name=biz.name if biz else "Clinic", clinic_phone=(biz.business_phone if biz else None)),
                    )
                except Exception as sms_err:
                    logger.warning("Optional confirmation SMS skipped: %s", sms_err)

            return {
                "id": booking_id,
                "business_id": business_id,
                "call_id": call_id,
                "type": "appointment",
                "status": status,
                "customer_name": patient_name,
                "phone_number": phone_number,
                "service_name": service_name,
                "doctor_name": details_dict["doctor_name"],
                "preferred_date": details_dict["preferred_date"],
                "preferred_time": preferred_time,
                "notes": notes or "",
                "created_at": transaction.created_at.isoformat() if transaction.created_at else None,
                "details": details_dict,
            }
        except Exception as e:
            db.rollback()
            logger.error("Failed to store appointment in DB: %s", e)
            raise e

    @staticmethod
    def update_appointment(
        db: Session,
        business_id: str,
        appointment_id: str,
        updates: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Update appointment fields and status in PostgreSQL."""
        tx = db.query(Transaction).filter(
            Transaction.id == appointment_id,
            Transaction.business_id == business_id,
        ).first()

        if not tx:
            raise ValueError(f"Appointment {appointment_id} not found")

        current_details = dict(tx.details or {})

        # Update root status if provided
        if "status" in updates and updates["status"]:
            tx.status = updates["status"]

        # Map frontend/API field updates into details JSON
        field_mappings = [
            ("customer_name", "customer_name"),
            ("patient_name", "customer_name"),
            ("phone_number", "phone_number"),
            ("service_name", "service_name"),
            ("doctor_name", "doctor_name"),
            ("preferred_date", "preferred_date"),
            ("preferred_time", "preferred_time"),
            ("notes", "notes"),
        ]

        for source_key, target_key in field_mappings:
            if source_key in updates and updates[source_key] is not None:
                current_details[target_key] = updates[source_key]
                if target_key == "customer_name":
                    current_details["patient_name"] = updates[source_key]

        tx.details = current_details
        db.commit()
        db.refresh(tx)

        return {
            "id": tx.id,
            "business_id": tx.business_id,
            "call_id": tx.call_id,
            "type": tx.type,
            "status": tx.status,
            "customer_name": current_details.get("customer_name") or "Guest Patient",
            "phone_number": current_details.get("phone_number") or "",
            "service_name": current_details.get("service_name") or "General Consultation",
            "doctor_name": current_details.get("doctor_name") or "Duty Doctor",
            "preferred_date": current_details.get("preferred_date") or "",
            "preferred_time": current_details.get("preferred_time") or "10:00 AM",
            "notes": current_details.get("notes") or "",
            "created_at": tx.created_at.isoformat() if tx.created_at else None,
            "details": current_details,
        }

    @staticmethod
    def cancel_appointment(db: Session, business_id: str, appointment_id: str) -> Optional[Dict[str, Any]]:
        """Mark an appointment cancelled (kept for history, not deleted)."""
        return ClinicWriteOperations.update_appointment(db, business_id, appointment_id, {"status": "cancelled"})

    @staticmethod
    def reschedule_appointment(
        db: Session, business_id: str, appointment_id: str, date_iso: str, time_text: str
    ) -> Optional[Dict[str, Any]]:
        """Move an appointment to a new date and time (callers validate the slot first)."""
        return ClinicWriteOperations.update_appointment(
            db, business_id, appointment_id, {"preferred_date": date_iso, "preferred_time": time_text}
        )

    @staticmethod
    def delete_appointment(db: Session, business_id: str, appointment_id: str) -> bool:
        """Delete an appointment transaction."""
        tx = db.query(Transaction).filter(
            Transaction.id == appointment_id,
            Transaction.business_id == business_id,
        ).first()
        if not tx:
            return False
        db.delete(tx)
        db.commit()
        return True
