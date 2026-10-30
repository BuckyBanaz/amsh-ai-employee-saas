import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, Index, Integer, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.server.database.session import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class KnowledgeDocument(Base):
    """One entry in a business's AI knowledge base. Covers all three sources
    from the onboarding "Knowledge" step: an uploaded file, a synced website,
    or a manual FAQ.

    Lifecycle (`status`): uploaded -> processing -> indexed | failed. A document is only "indexed" once its chunks are in
    knowledge_chunks; a failed one carries the reason in `error`. Legacy rows used "pending" for "uploaded"."""

    __tablename__ = "knowledge_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id"), index=True)
    doc_type: Mapped[str] = mapped_column(String(50), default="faq")  # document | website | faq
    status: Mapped[str] = mapped_column(String(20), default="uploaded")  # uploaded | processing | indexed | failed
    filename: Mapped[str | None] = mapped_column(String(255), nullable=True)  # doc_type == "document"
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)  # doc_type == "website"
    question: Mapped[str | None] = mapped_column(String(500), nullable=True)  # doc_type == "faq"
    answer: Mapped[str | None] = mapped_column(Text, nullable=True)  # faq: the answer; document/website: a short preview
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    # Full extracted text (documents, websites). Kept so the business's documents can be re-chunked without re-uploading.
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    # sha256 of the uploaded bytes (documents) or of the normalised URL (websites): duplicate uploads are refused and an
    # unchanged replacement is not re-indexed.
    content_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # The original upload, so a document can be re-extracted (parser fixes, a failed run) without asking for it again.
    # Deferred: listing documents never loads the bytes.
    file_data: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True, deferred=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)  # why the last processing run failed (shown to the user)
    # Processing details: pages/sheets/rows for files, the crawl summary for websites, warnings, embedding coverage.
    meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    version: Mapped[int] = mapped_column(Integer, default=1)  # +1 on every replacement or content change
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=_now)
    indexed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class KnowledgeChunk(Base):
    """A retrievable passage of a knowledge document. Every row carries its business_id, and every query filters on it:
    one business can never retrieve another's chunks."""

    __tablename__ = "knowledge_chunks"
    __table_args__ = (Index("ix_knowledge_chunks_business_document", "business_id", "document_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id"), index=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("knowledge_documents.id", ondelete="CASCADE"))
    chunk_index: Mapped[int] = mapped_column(Integer, default=0)
    text: Mapped[str] = mapped_column(Text)
    # Where the passage came from: {"page": 3} | {"sheet": "Fees", "rows": [2, 40]} | {"url": "...", "heading": "..."}.
    meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    text_hash: Mapped[str] = mapped_column(String(64))  # duplicate passages across documents are indexed once
    embedding: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)  # float32 vector, None when not embedded
    embedding_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class KnowledgeRecord(Base):
    """One row of a table found in a knowledge document (a spreadsheet or CSV row, a DOCX table row), kept as
    column -> value so fees and other structured facts are looked up exactly instead of by text similarity."""

    __tablename__ = "knowledge_records"
    __table_args__ = (Index("ix_knowledge_records_business_document", "business_id", "document_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id"), index=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("knowledge_documents.id", ondelete="CASCADE"))
    table_name: Mapped[str] = mapped_column(String(255))  # sheet name, or "Table 2" for a DOCX table
    row_index: Mapped[int] = mapped_column(Integer)  # 1-based row in the source table (header excluded)
    data: Mapped[dict] = mapped_column(JSON)  # {"Course": "B.Tech CSE", "Country": "Nepal", "Tuition Fee": "180000"}
