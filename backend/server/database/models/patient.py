import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from backend.server.database.session import Base


class Patient(Base):
    """A clinic's saved patient record. Patients are also derived from bookings (by phone), so a row exists only when staff
    added the patient, edited them, or removed them from the list (`archived_at`). `phone_key` is the number's last 10 digits,
    so "+91 98765 43210", "098765 43210" and "9876543210" are the same patient."""

    __tablename__ = "patients"
    __table_args__ = (UniqueConstraint("business_id", "phone_key", name="uq_patient_business_phone"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id"), index=True)
    phone_key: Mapped[str] = mapped_column(String(20))
    name: Mapped[str] = mapped_column(String(255))
    phone_number: Mapped[str] = mapped_column(String(30))
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
