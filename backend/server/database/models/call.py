import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.server.database.session import Base


class Call(Base):
    __tablename__ = "calls"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id"))
    agent_id: Mapped[str | None] = mapped_column(ForeignKey("agents.id"), nullable=True)
    caller_number: Mapped[str] = mapped_column(String(30))
    caller_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    intent: Mapped[str | None] = mapped_column(String(100), nullable=True)
    outcome: Mapped[str] = mapped_column(String(20), default="live")  # live | resolved | transferred | failed
    summary: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    engine: Mapped[str | None] = mapped_column(String(100), nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    recording_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    taken_over_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    messages = relationship("Message", back_populates="call", cascade="all, delete-orphan", order_by="Message.sequence")
