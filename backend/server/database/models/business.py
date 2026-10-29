import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.server.database.session import Base


class Business(Base):
    """A tenant. `vertical` selects which config (backend/ai/verticals/configs/*.yaml)
    drives this business's AI Receptionist — never branch code on this value
    directly."""

    __tablename__ = "businesses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255))
    vertical: Mapped[str] = mapped_column(String(50), default="clinic")
    # Business classification shown in onboarding/admin UI. MVP is healthcare-only.
    business_type: Mapped[str] = mapped_column(String(50), default="healthcare")
    business_subtype: Mapped[str | None] = mapped_column(String(50), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    business_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    business_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    postal_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    timezone: Mapped[str] = mapped_column(String(50), default="UTC")
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    working_hours: Mapped[dict] = mapped_column(JSON, default=dict)
    plan: Mapped[str] = mapped_column(String(50), default="starter")
    status: Mapped[str] = mapped_column(String(20), default="pending")  # active | trial | paused | suspended | pending
    # How long the plan lasts (backend/server/billing/entitlement.py): calls are refused after the end plus a grace period.
    trial_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    billing_cycle: Mapped[str | None] = mapped_column(String(20), nullable=True)  # monthly | yearly | manual (no end)
    config_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Per-business workflow configuration (DOCS/31): {"status": "draft"|"active", "definition_version", "activated_at",
    # "activated_by", "validation": [...]}. Departments, resources and the catalogue live in their own tables.
    vertical_settings: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    users = relationship("User", back_populates="business", cascade="all, delete-orphan")
    agents = relationship("Agent", back_populates="business", cascade="all, delete-orphan")
    services = relationship("Service", back_populates="business", cascade="all, delete-orphan")
    staff = relationship("Staff", back_populates="business", cascade="all, delete-orphan")
