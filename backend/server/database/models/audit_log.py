import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.server.database.session import Base


class AuditLog(Base):
    """Who did what to what. Written for security-relevant actions (logins, password changes, team changes, billing, admin
    actions) and read by the admin portal's Audit and Security pages."""

    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    actor_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    actor_email: Mapped[str | None] = mapped_column(String(255), nullable=True)  # kept even if the user is later deleted
    business_id: Mapped[str | None] = mapped_column(ForeignKey("businesses.id"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(80), index=True)  # e.g. "auth.login", "auth.password_changed", "team.invited"
    target_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    target_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    outcome: Mapped[str] = mapped_column(String(20), default="success")  # success | failure
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)
