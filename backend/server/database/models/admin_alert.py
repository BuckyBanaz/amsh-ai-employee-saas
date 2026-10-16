from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.server.database.session import Base


class AdminAlertState(Base):
    """One platform admin's view of the alerts feed: when they last opened it (everything newer is unread) and which kinds of
    alert they muted. The alerts themselves are not stored: they are read from the audit trail."""

    __tablename__ = "admin_alert_state"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    muted: Mapped[list] = mapped_column(JSON, default=list)  # categories, e.g. ["logins"]
