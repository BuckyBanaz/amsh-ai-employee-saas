import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.server.database.session import Base


class KnowledgeDocument(Base):
    """One entry in a business's AI knowledge base. Covers all three sources
    from the onboarding "Knowledge" step: an uploaded file, a synced website,
    or a manual FAQ."""

    __tablename__ = "knowledge_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id"))
    doc_type: Mapped[str] = mapped_column(String(50), default="faq")  # document | website | faq
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | processing | indexed | failed
    filename: Mapped[str | None] = mapped_column(String(255), nullable=True)  # doc_type == "document"
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)  # doc_type == "website"
    question: Mapped[str | None] = mapped_column(String(500), nullable=True)  # doc_type == "faq"
    answer: Mapped[str | None] = mapped_column(Text, nullable=True)  # doc_type == "faq"
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
