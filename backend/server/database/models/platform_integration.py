import uuid
from datetime import datetime, timezone
from sqlalchemy import JSON, Boolean, DateTime, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.server.database.session import Base


class PlatformIntegration(Base):
    """Platform-level infrastructure integrations configured by the Superadmin.
    Powers telephony, AI models, voice TTS, system messaging, platform SMTP, and billing.
    """
    __tablename__ = "platform_integrations"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)  # twilio, groq, etc.
    name: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(50))  # Voice | AI | Messaging | Email | Payments
    status: Mapped[str] = mapped_column(String(20), default="Connected")  # Connected | Disconnected | API Error
    is_active_default: Mapped[bool] = mapped_column(Boolean, default=True)
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    latency_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    error_rate: Mapped[str] = mapped_column(String(20), default="0.0%")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
