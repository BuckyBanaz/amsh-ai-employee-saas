import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.server.database.session import Base


class Message(Base):
    """One transcript turn — a call's turns, or a non-voice conversation's turns."""

    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    call_id: Mapped[str] = mapped_column(ForeignKey("calls.id"))
    sequence: Mapped[int] = mapped_column(Integer, default=0)
    speaker: Mapped[str] = mapped_column(String(10))  # "AI" | "User"
    text: Mapped[str] = mapped_column(String(4000))
    sentiment: Mapped[str | None] = mapped_column(String(20), nullable=True)  # Positive | Neutral | Negative
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    call = relationship("Call", back_populates="messages")
