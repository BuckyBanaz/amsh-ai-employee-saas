import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.session import Base


class Usage(Base):
    __tablename__ = "usage_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id"))
    period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    api_calls: Mapped[int] = mapped_column(Integer, default=0)
    minutes_used: Mapped[float] = mapped_column(Float, default=0.0)
    storage_mb: Mapped[float] = mapped_column(Float, default=0.0)
    overage_policy: Mapped[str] = mapped_column(String(20), default="stop_at_limit")  # stop_at_limit | allow_overage | auto_purchase
