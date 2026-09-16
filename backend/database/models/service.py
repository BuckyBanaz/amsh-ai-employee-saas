import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.session import Base


class Service(Base):
    """A bookable service/treatment offered by a business (onboarding
    "Services" step: frontend/user/app/onboarding/services/page.tsx)."""

    __tablename__ = "services"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id"))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    duration_minutes: Mapped[int] = mapped_column(default=30)
    price_amount: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    price_currency: Mapped[str] = mapped_column(String(3), default="USD")
    staff_id: Mapped[str | None] = mapped_column(ForeignKey("staff.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    business = relationship("Business", back_populates="services")
    staff_member = relationship("Staff", back_populates="services")
