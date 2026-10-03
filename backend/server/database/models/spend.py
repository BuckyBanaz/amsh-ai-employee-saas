import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.server.database.session import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class UsageEvent(Base):
    """One metered use of a paid tool that nothing else records: today, LLM tokens. (Call minutes, speech characters and messages are
    read from the calls, transcripts and message log, so they are not copied here.) Cost is not stored: it is worked out from the
    rate card when the report runs, so correcting a price corrects the history too."""

    __tablename__ = "usage_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    business_id: Mapped[str | None] = mapped_column(ForeignKey("businesses.id"), nullable=True, index=True)  # null: not tied to a clinic
    tool: Mapped[str] = mapped_column(String(20), index=True)  # llm
    provider: Mapped[str] = mapped_column(String(80))  # groq, groq:<model>, gemini
    input_units: Mapped[int] = mapped_column(Integer, default=0)  # prompt tokens
    output_units: Mapped[int] = mapped_column(Integer, default=0)  # completion tokens
    estimated: Mapped[bool] = mapped_column(Boolean, default=False)  # true when counted from text length, not reported by the provider
    source: Mapped[str] = mapped_column(String(10), default="live")  # live | test (playground, previews)
    call_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)


class CostRate(Base):
    """A price the owner has set in the admin portal, overriding the built-in default for one rate-card key."""

    __tablename__ = "cost_rates"

    key: Mapped[str] = mapped_column(String(60), primary_key=True)
    price: Mapped[float] = mapped_column(Float)
    updated_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
