import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.session import Base


class Agent(Base):
    """An AI Receptionist instance assigned to one business."""

    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id"))
    name: Mapped[str] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default="active")  # active | paused | testing | error
    voice_provider: Mapped[str] = mapped_column(String(50), default="elevenlabs")
    voice_model: Mapped[str] = mapped_column(String(100), default="default")
    languages: Mapped[list] = mapped_column(JSON, default=list)
    greeting_message: Mapped[str] = mapped_column(String(1000), default="")
    config: Mapped[dict] = mapped_column(JSON, default=dict)  # behavior/call-handling/escalation, per verticals/schemas.py
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    business = relationship("Business", back_populates="agents")
