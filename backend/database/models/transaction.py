import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.session import Base


class Transaction(Base):
    """Generic wrapper per the PRD — an appointment/order/reservation depending
    on vertical. Vertical-specific fields stay in `details` (JSON), validated
    by that vertical's config schema, so this table never needs new columns
    for a new vertical (spec §20)."""

    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id"))
    call_id: Mapped[str | None] = mapped_column(ForeignKey("calls.id"), nullable=True)
    type: Mapped[str] = mapped_column(String(30), default="appointment")  # appointment | order | reservation | status_check
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # confirmed | cancelled | pending
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
