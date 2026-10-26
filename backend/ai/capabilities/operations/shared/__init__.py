"""Booking operations shared by the non-healthcare verticals (DOCS/31).

An appointment is the same record in every vertical (a `transactions` row of type "appointment"), so salons, spas and education
visits reuse the clinic operations; only what genuinely differs is overridden here:
  BookingWriteOperations         no "Duty Doctor" stand-in when the caller had no preference
  ResourceAwareWriteOperations   a service with `resource_kind` (a treatment room) also needs one free resource of that kind:
                                 checked and assigned inside the booking's own transaction, the resource row locked meanwhile
"""

from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from backend.ai.capabilities.operations.clinic import ClinicWriteOperations
from backend.ai.capabilities.operations.clinic.slot_availability import BLOCKING_STATUSES
from backend.ai.engine.agent.datetime_utils import parse_time

ANY_STAFF = "Any available"


class BookingWriteOperations(ClinicWriteOperations):
    @staticmethod
    def store_appointment(db: Session, business_id: str, patient_name: str, phone_number: str, service_name: str = "",
                          preferred_date: str = "", preferred_time: str = "10:00 AM", doctor_name: Optional[str] = None,
                          **kwargs: Any) -> Dict[str, Any]:
        return ClinicWriteOperations.store_appointment(
            db, business_id, patient_name, phone_number, service_name, preferred_date, preferred_time,
            doctor_name or ANY_STAFF, **kwargs,
        )


def _service(db: Session, business_id: str, service_name: str):
    from backend.server.database.models.service import Service

    return (
        db.query(Service)
        .filter(Service.business_id == business_id, Service.title.ilike(service_name or ""))
        .first()
        or db.query(Service).filter(Service.business_id == business_id, Service.title.ilike(f"%{service_name or ''}%")).first()
    )


def free_resource(db: Session, business_id: str, service_name: str, date_iso: str, time_text: str,
                  ignore_booking: Optional[str] = None, prefer_id: Optional[str] = None) -> Any:
    """(needed, resource): whether the service needs a resource, and a free one for that start (None when all are taken).
    A resource is busy when a blocking booking holding it overlaps [start, start + duration)."""
    from backend.server.database.models.service import Service
    from backend.server.database.models.transaction import Transaction
    from backend.server.database.models.vertical import Resource

    service = _service(db, business_id, service_name)
    if service is None or not service.resource_kind:
        return False, None
    start_t = parse_time(time_text)
    if start_t is None:
        return True, None
    day = datetime.fromisoformat(date_iso[:10])
    start = datetime.combine(day.date(), start_t)
    end = start + timedelta(minutes=service.duration_minutes or 30)
    durations = {s.title.lower(): s.duration_minutes or 30 for s in db.query(Service).filter(Service.business_id == business_id).all()}
    resources = (
        db.query(Resource)
        .filter(Resource.business_id == business_id, Resource.kind == service.resource_kind, Resource.active.is_(True))
        .order_by(Resource.name)
        .with_for_update()  # Postgres: concurrent bookings for the same rooms wait here; SQLite ignores it
        .all()
    )
    resources.sort(key=lambda r: r.id != prefer_id)  # a session being moved keeps its room when that room is free
    bookings = (
        db.query(Transaction)
        .filter(Transaction.business_id == business_id, Transaction.type == "appointment", Transaction.status.in_(list(BLOCKING_STATUSES)))
        .all()
    )
    for resource in resources:
        holding = 0
        for b in bookings:
            d = b.details or {}
            if b.id == ignore_booking or d.get("resource_id") != resource.id or str(d.get("preferred_date", ""))[:10] != date_iso[:10]:
                continue
            t = parse_time(d.get("preferred_time"))
            if t is None:
                continue
            b_start = datetime.combine(day.date(), t)
            b_end = b_start + timedelta(minutes=durations.get(str(d.get("service_name") or "").lower(), 30))
            if b_start < end and start < b_end:
                holding += 1
        if holding < max(resource.capacity or 1, 1):
            return True, resource
    return True, None


class ResourceAwareWriteOperations(BookingWriteOperations):
    @staticmethod
    def resource_problem(db: Session, business_id: str, service_name: str, date_iso: str, time_text: str,
                         ignore_booking: Optional[str] = None) -> Optional[str]:
        """"no_room" when the service needs a resource and none is free at that time (not counting `ignore_booking`, the session
        being moved); None otherwise."""
        needed, resource = free_resource(db, business_id, service_name, date_iso, time_text, ignore_booking=ignore_booking)
        return "no_room" if needed and resource is None else None

    @staticmethod
    def reschedule_appointment(db: Session, business_id: str, appointment_id: str, date_iso: str, time_text: str) -> Optional[Dict[str, Any]]:
        """Move a session and its room together: its own room if free at the new time, else another free room of the kind."""
        from backend.server.database.models.transaction import Transaction

        tx = db.query(Transaction).filter(Transaction.id == appointment_id, Transaction.business_id == business_id,
                                          Transaction.type == "appointment").first()
        if tx is not None:
            details = dict(tx.details or {})
            needed, resource = free_resource(db, business_id, details.get("service_name") or "", date_iso, time_text,
                                             ignore_booking=appointment_id, prefer_id=details.get("resource_id"))
            if needed and resource is None:
                raise ValueError("no_room")  # the toolbox checks resource_problem first; this guards a race lost meanwhile
            if resource is not None:
                tx.details = {**details, "resource_id": resource.id, "resource_name": resource.name}  # same commit as the move
        return ClinicWriteOperations.update_appointment(db, business_id, appointment_id, {"preferred_date": date_iso, "preferred_time": time_text})

    @staticmethod
    def store_appointment(db: Session, business_id: str, patient_name: str, phone_number: str, service_name: str = "",
                          preferred_date: str = "", preferred_time: str = "10:00 AM", doctor_name: Optional[str] = None,
                          **kwargs: Any) -> Dict[str, Any]:
        needed, resource = free_resource(db, business_id, service_name, preferred_date, preferred_time)
        if needed and resource is None:
            raise ValueError("no_room")  # the toolbox checks resource_problem first; this guards a race lost meanwhile
        extra = dict(kwargs.pop("extra_details", None) or {})
        if resource is not None:
            extra.update({"resource_id": resource.id, "resource_name": resource.name})
        return BookingWriteOperations.store_appointment(
            db, business_id, patient_name, phone_number, service_name, preferred_date, preferred_time, doctor_name,
            extra_details=extra or None, **kwargs,
        )
