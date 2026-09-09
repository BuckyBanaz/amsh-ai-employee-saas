import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.session import Base


class PhoneNumber(Base):
    """The number a caller actually dials to reach this business's AI.

    Two modes, both need this row:
    - "forwarding": the business keeps its own existing number and forwards
      calls to `number` (a Twilio number we provisioned). `forwarded_from`
      holds the business's original number for reference/support.
    - "dedicated": the business hands out `number` directly as the AI's own
      line — no forwarding involved.

    MVP starts everyone on "forwarding" (cheaper, zero porting friction);
    "dedicated" is an upgrade path, not required at launch.
    """

    __tablename__ = "phone_numbers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id"))
    number: Mapped[str] = mapped_column(String(30), unique=True)  # E.164, e.g. +15550182947 — the Twilio number
    mode: Mapped[str] = mapped_column(String(20), default="forwarding")  # "forwarding" | "dedicated"
    forwarded_from: Mapped[str | None] = mapped_column(String(30), nullable=True)  # business's original number, if forwarding
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | active | failed
    provisioned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
