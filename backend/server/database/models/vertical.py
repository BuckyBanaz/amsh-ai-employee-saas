"""Tenant data for the multi-vertical workflows (DOCS/31). Every row carries `business_id` and every API reads it tenant-scoped.

  Department       a human team a call can be routed to, with the tenant's own validated destination, hours and fallback
  TransferAttempt  one attempt to connect a caller to a department: what was tried and how it actually ended
  Enquiry          a lead / follow-up the AI captured (admission enquiry, callback, demo request, support request)
  WorkflowRun      the persisted state of one workflow on one call, so a later turn or a reconnect resumes it
  Resource         a capacity-limited thing a booking holds besides a person: a treatment room, a station, a visit slot

Appointments stay `transactions` rows of type "appointment" and customers stay `patients` rows (the table name is historical):
nothing here duplicates them.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from backend.server.database.session import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _id() -> str:
    return str(uuid.uuid4())


class Department(Base):
    __tablename__ = "departments"
    __table_args__ = (UniqueConstraint("business_id", "key", name="uq_department_business_key"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id"), index=True)
    key: Mapped[str] = mapped_column(String(50))  # stable id, e.g. "international_admissions" (a template key or the tenant's own)
    name: Mapped[str] = mapped_column(String(120))
    intents: Mapped[list] = mapped_column(JSON, default=list)  # what it handles; routing matches the caller's intent against these
    match: Mapped[dict] = mapped_column(JSON, default=dict)  # caller context that must also hold, e.g. {"applicant_type": "international"}
    transfer_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)  # E.164; validated on save. None = cannot transfer
    hours: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # same shape as Business.working_hours; None = the business's hours
    priority: Mapped[int] = mapped_column(Integer, default=50)
    fallback_key: Mapped[str | None] = mapped_column(String(50), nullable=True)  # tried when this one is closed / unreachable
    timeout_seconds: Mapped[int] = mapped_column(Integer, default=20)
    may_answer: Mapped[bool] = mapped_column(Boolean, default=True)  # the AI may answer this topic itself before offering a transfer
    required_slots: Mapped[list] = mapped_column(JSON, default=list)  # gathered before transferring
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class TransferAttempt(Base):
    __tablename__ = "transfer_attempts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id"), index=True)
    call_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)  # provider call SID / internal call id
    department_key: Mapped[str] = mapped_column(String(50))
    requested_key: Mapped[str | None] = mapped_column(String(50), nullable=True)  # what was asked for, when a fallback was used
    destination_tail: Mapped[str | None] = mapped_column(String(8), nullable=True)  # last 4 digits only: the full number is config, not log
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # initiated -> completed | no_answer | busy | failed | canceled  (provider result); closed / no_destination (never dialled)
    status: Mapped[str] = mapped_column(String(20), default="initiated")
    outcome_detail: Mapped[str | None] = mapped_column(String(255), nullable=True)
    enquiry_id: Mapped[str | None] = mapped_column(String(36), nullable=True)  # the callback task created when nobody was reached
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Enquiry(Base):
    __tablename__ = "enquiries"
    __table_args__ = (UniqueConstraint("business_id", "idempotency_key", name="uq_enquiry_idempotency"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id"), index=True)
    call_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    source: Mapped[str] = mapped_column(String(20), default="ai")  # ai | staff
    workflow_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    kind: Mapped[str] = mapped_column(String(30), default="enquiry")  # enquiry | admission | callback | demo_request | support
    topic: Mapped[str | None] = mapped_column(String(50), nullable=True)
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)  # course / programme / product of interest
    contact_name: Mapped[str] = mapped_column(String(255))
    contact_phone: Mapped[str] = mapped_column(String(30))
    contact_phone_key: Mapped[str] = mapped_column(String(20), index=True)  # last 10 digits, for duplicate detection
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    details: Mapped[dict] = mapped_column(JSON, default=dict)  # applicant_type, study_level, grade, batch_preference, notes...
    department_key: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="new")  # new | contacted | closed
    idempotency_key: Mapped[str] = mapped_column(String(80))
    follow_up_due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"
    __table_args__ = (UniqueConstraint("business_id", "conversation_id", "workflow_id", name="uq_workflow_run"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id"), index=True)
    conversation_id: Mapped[str] = mapped_column(String(80))  # call id (voice) or chat conversation id
    workflow_id: Mapped[str] = mapped_column(String(80))
    workflow_version: Mapped[str] = mapped_column(String(20))
    state: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20), default="active")  # active | completed | failed
    outcome: Mapped[str | None] = mapped_column(String(50), nullable=True)
    slots: Mapped[dict] = mapped_column(JSON, default=dict)  # values gathered so far (never shown to other callers)
    visits: Mapped[dict] = mapped_column(JSON, default=dict)  # step id -> times entered (loops are bounded)
    history: Mapped[list] = mapped_column(JSON, default=list)  # [{"from", "to", "why"}], the audit trail of transitions
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Resource(Base):
    __tablename__ = "resources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    kind: Mapped[str] = mapped_column(String(30), default="room")  # room | station | campus | equipment (vertical's resource kinds)
    capacity: Mapped[int] = mapped_column(Integer, default=1)  # bookings it can hold at the same time
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
