import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.server.database.session import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class SupportTicket(Base):
    """A clinic's request for help. Created by a business user (or by AMSh staff on their behalf), worked by AMSh staff."""

    __tablename__ = "support_tickets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    number: Mapped[int] = mapped_column(Integer, index=True)  # human-friendly "#1042"
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id"), index=True)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    subject: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(20), default="other")  # billing | technical | ai_quality | telephony | account | other
    priority: Mapped[str] = mapped_column(String(10), default="normal")  # low | normal | high | urgent
    status: Mapped[str] = mapped_column(String(12), default="open", index=True)  # open | in_progress | waiting | resolved | closed
    assignee_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    first_response_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class TicketMessage(Base):
    __tablename__ = "ticket_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_id: Mapped[str] = mapped_column(ForeignKey("support_tickets.id"), index=True)
    author_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    author_name: Mapped[str] = mapped_column(String(255))
    from_staff: Mapped[bool] = mapped_column(Boolean, default=False)
    internal: Mapped[bool] = mapped_column(Boolean, default=False)  # a staff-only note the clinic never sees
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Announcement(Base):
    """A notice from AMSh to clinics, shown as a banner in the user dashboard while it is published and inside its dates."""

    __tablename__ = "announcements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str] = mapped_column(Text, default="")
    level: Mapped[str] = mapped_column(String(10), default="info")  # info | feature | warning | critical
    status: Mapped[str] = mapped_column(String(10), default="draft", index=True)  # draft | published | archived
    audience: Mapped[dict] = mapped_column(JSON, default=dict)  # {"plans": ["growth"], "business_ids": ["..."]}; empty = every clinic
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
