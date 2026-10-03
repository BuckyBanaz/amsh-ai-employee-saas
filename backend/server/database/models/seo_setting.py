from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.server.database.session import Base


class SeoSetting(Base):
    """Platform-wide SEO configuration edited in the admin portal. `key` is "global" (site defaults, robots, analytics, structured
    data) or "page:<path>" (one page's title, description, social image, canonical, noindex). Read by the public marketing site."""

    __tablename__ = "seo_settings"

    key: Mapped[str] = mapped_column(String(140), primary_key=True)
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
