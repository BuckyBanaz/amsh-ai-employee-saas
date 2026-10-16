import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.server.database.session import Base


class Plan(Base):
    """A subscription plan defined by the platform admin. The tenant app's pricing screens read the public ones
    (`GET /api/plans`); a business is on a plan when `Business.plan == Plan.key`."""

    __tablename__ = "plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key: Mapped[str] = mapped_column(String(40), unique=True, index=True)  # stable slug stored on the business, e.g. "starter"
    name: Mapped[str] = mapped_column(String(80))
    description: Mapped[str | None] = mapped_column(String(300), nullable=True)
    kind: Mapped[str] = mapped_column(String(20), default="catalog")  # catalog (self-serve) | enterprise (per client)
    client: Mapped[str | None] = mapped_column(String(120), nullable=True)  # enterprise plans name their client
    price: Mapped[float] = mapped_column(Float, default=0.0)  # per `cycle`
    cycle: Mapped[str] = mapped_column(String(10), default="monthly")  # monthly | yearly
    price_yearly: Mapped[float | None] = mapped_column(Float, nullable=True)  # optional yearly price beside a monthly one
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    custom_pricing: Mapped[bool] = mapped_column(Boolean, default=False)  # quoted per client, never shown publicly
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft | active | archived
    highlighted: Mapped[bool] = mapped_column(Boolean, default=False)  # "most popular" on pricing screens
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    quotas: Mapped[dict] = mapped_column(JSON, default=dict)  # null value = unlimited
    overage: Mapped[dict] = mapped_column(JSON, default=dict)
    features: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
