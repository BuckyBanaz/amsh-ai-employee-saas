import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.session import Base


class Staff(Base):
    """A clinical/roster team member shown to patients (onboarding "Staff"
    step: frontend/user/app/onboarding/staff/page.tsx). Distinct from `User` —
    a Staff entry is a directory listing (doctor, specialty, contact info),
    not necessarily a login account. A Staff member who also needs to log in
    is invited separately via POST /api/businesses/{id}/users."""

    __tablename__ = "staff"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id"))
    name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), default="Doctor")
    specialty: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    business = relationship("Business", back_populates="staff")
    services = relationship("Service", back_populates="staff_member")
