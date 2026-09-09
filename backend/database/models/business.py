import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.session import Base


class Business(Base):
    """A tenant. `vertical` selects which config (backend/verticals/configs/*.yaml)
    drives this business's AI Receptionist — never branch code on this value
    directly (spec §20)."""

    __tablename__ = "businesses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255))
    vertical: Mapped[str] = mapped_column(String(50), default="clinic")
    country: Mapped[str | None] = mapped_column(String(2), nullable=True)
    timezone: Mapped[str] = mapped_column(String(50), default="UTC")
    working_hours: Mapped[dict] = mapped_column(JSON, default=dict)
    plan: Mapped[str] = mapped_column(String(50), default="starter")
    status: Mapped[str] = mapped_column(String(20), default="pending")  # active | paused | suspended | pending
    config_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    users = relationship("User", back_populates="business", cascade="all, delete-orphan")
    agents = relationship("Agent", back_populates="business", cascade="all, delete-orphan")
