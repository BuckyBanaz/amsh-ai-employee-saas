import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.server.database.session import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class MessageTemplate(Base):
    """The wording of one message (event x channel x language). `scope="platform"` rows are AMSh's defaults for everyone;
    `scope="business"` rows are one clinic's override. With no row at all, the built-in default in
    `services/message_templates.py` is used. See DOCS/24."""

    __tablename__ = "message_templates"
    __table_args__ = (Index("ix_message_templates_lookup", "scope", "business_id", "event_key", "channel", "language"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scope: Mapped[str] = mapped_column(String(10))  # platform | business
    business_id: Mapped[str | None] = mapped_column(ForeignKey("businesses.id"), nullable=True, index=True)  # null for platform rows
    event_key: Mapped[str] = mapped_column(String(60))
    channel: Mapped[str] = mapped_column(String(10))  # email | sms | whatsapp | push
    language: Mapped[str] = mapped_column(String(8), default="en")
    subject: Mapped[str | None] = mapped_column(String(200), nullable=True)  # email only
    body: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(10), default="draft")  # draft | active | archived
    whatsapp_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    meta_status: Mapped[str | None] = mapped_column(String(10), nullable=True)  # pending | approved | rejected (WhatsApp only)
    sms_template_id: Mapped[str | None] = mapped_column(String(64), nullable=True)  # regulator id (India DLT)
    version: Mapped[int] = mapped_column(Integer, default=1)
    history: Mapped[list] = mapped_column(JSON, default=list)  # previous versions, newest first, capped
    updated_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class MessageLog(Base):
    """One outgoing message and what happened to it. The recipient is stored as given and masked by the API."""

    __tablename__ = "message_log"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str | None] = mapped_column(ForeignKey("businesses.id"), nullable=True, index=True)  # null for platform messages
    event_key: Mapped[str] = mapped_column(String(60), index=True)
    channel: Mapped[str] = mapped_column(String(10))
    recipient: Mapped[str] = mapped_column(String(255))
    template_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    template_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(12), default="queued")  # queued | sent | delivered | read | failed
    provider: Mapped[str | None] = mapped_column(String(30), nullable=True)
    provider_message_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    error: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)


class MessagePreferences(Base):
    """A clinic's channel order, on/off switch per event and quiet hours (one row per business)."""

    __tablename__ = "message_preferences"

    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id"), primary_key=True)
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
