"""Background processing of knowledge documents: extract -> chunk -> (embed) -> store, with an honest status.

A job moves a document from "uploaded" to "processing" to "indexed" or "failed". New chunks and table records replace the
old ones in one transaction, so a search sees either the previous version or the new one, never a mix. When a re-index of
a document that was already indexed fails (a site is down, a replacement file is damaged), the previous chunks stay in use
and the document says so in `error`; a document that never indexed becomes "failed" with the reason.

Jobs run in the API process (FastAPI background tasks, a small thread pool), at most `MAX_CONCURRENT` at a time across
the process so a burst of large uploads cannot exhaust memory. Interrupted jobs (a restart mid-way) are picked up again
at startup by `resume_pending`."""

from __future__ import annotations

import logging
import threading
from datetime import datetime, timezone
from typing import Callable, List, Optional

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from backend.ai.engine.rag import crawler, extractors
from backend.ai.engine.rag.embeddings import get_embedder, to_bytes
from backend.ai.engine.rag.index import chunk_plain_document, chunker, faq_text, injection_flags, text_hash

logger = logging.getLogger(__name__)

MAX_CONCURRENT = 2
_slots = threading.BoundedSemaphore(MAX_CONCURRENT)
PREVIEW_CHARS = 400


def _now():
    return datetime.now(timezone.utc)


def _settings():
    from backend.server.common.config import get_settings

    return get_settings()


def preview(text: str) -> str:
    text = " ".join((text or "").split())
    return text[:PREVIEW_CHARS] + ("…" if len(text) > PREVIEW_CHARS else "")


# ------------------------------------------------------------------------------------------------------- chunk builders

def _document_pieces(doc, ex: extractors.Extracted):
    """(chunks [(text, meta)], records [(table_name, row_index, data)], full text) for an extracted file."""
    chunks, records, texts = [], [], []
    for sec in ex.sections:
        texts.append(sec.text)
        for piece in chunker.split(sec.text):
            chunks.append((piece, dict(sec.meta)))
    for table in ex.tables:
        title = f"{doc.filename} › {table.name}" + (f" — {table.caption}" if table.caption else "")
        rows_text = []
        for n, row in enumerate(table.rows, start=1):
            data = {h: v for h, v in zip(table.header, row) if v}
            if data:
                records.append((table.name[:255], n, data))
                rows_text.append("; ".join(f"{k}: {v}" for k, v in data.items()))
        texts.append(title + "\n" + "\n".join(rows_text))
        for piece, meta in chunker.chunk_table(table.header, table.rows, title):
            chunks.append((piece, {"sheet": table.name, "heading": table.caption or table.name, **meta}))
    return chunks, records, "\n\n".join(texts)


def _website_pieces(result: crawler.CrawlResult):
    chunks, texts = [], []
    for page in result.pages:
        texts.append(f"--- {page.title or page.url} ({page.url}) ---\n{page.text}")
        for piece in chunker.split(page.text):
            chunks.append((piece, {"url": page.url, "heading": page.title}))
    return chunks, [], "\n\n".join(texts)


# ------------------------------------------------------------------------------------------------------------ the job

def _store(db: Session, doc, chunks, records, embed_prefix: str) -> dict:
    """Replaces the document's chunks and records (embedding them when an embedder is configured)."""
    from backend.server.database.models.knowledge_base import KnowledgeChunk, KnowledgeRecord

    embedder = get_embedder()
    vectors: List = [None] * len(chunks)
    if embedder is not None and chunks:
        vectors = embedder.embed_documents([f"{embed_prefix}\n{(m.get('heading') or '')}\n{t}".strip() for t, m in chunks])
    db.query(KnowledgeChunk).filter(KnowledgeChunk.business_id == doc.business_id, KnowledgeChunk.document_id == doc.id).delete(synchronize_session=False)
    db.query(KnowledgeRecord).filter(KnowledgeRecord.business_id == doc.business_id, KnowledgeRecord.document_id == doc.id).delete(synchronize_session=False)
    now = _now()
    for n, ((text, meta), vec) in enumerate(zip(chunks, vectors)):
        db.add(KnowledgeChunk(business_id=doc.business_id, document_id=doc.id, chunk_index=n, text=text, meta=meta,
                              text_hash=text_hash(text), embedding=to_bytes(vec), embedding_model=embedder.model if vec is not None else None,
                              created_at=now))
    for table_name, row_index, data in records:
        db.add(KnowledgeRecord(business_id=doc.business_id, document_id=doc.id, table_name=table_name, row_index=row_index, data=data))
    embedded = sum(v is not None for v in vectors)
    return {"chunks": len(chunks), "records": len(records), "embedded": embedded,
            "embedding_model": embedder.model if embedder is not None and embedded else None}


def process(db: Session, doc_id: str) -> None:
    """Processes one document now (in the caller's thread). Never raises: the outcome is written to the document."""
    from backend.server.database.models.knowledge_base import KnowledgeDocument

    doc = db.get(KnowledgeDocument, doc_id)
    if doc is None:
        return
    had_chunks = (doc.chunk_count or 0) > 0
    doc.status = "processing"
    doc.updated_at = _now()
    db.commit()
    s = _settings()
    meta: dict = {}
    warnings: List[str] = []
    try:
        if doc.doc_type == "document":
            data = doc.file_data
            if not data:
                raise extractors.ExtractionError("The original file is no longer stored. Upload it again.")
            ex = extractors.extract(doc.filename or "document", data, extractors.Limits(max_bytes=s.KB_MAX_FILE_MB * 1024 * 1024))
            chunks, records, content = _document_pieces(doc, ex)
            warnings += ex.warnings
            meta.update({"kind": ex.kind, **ex.meta})
            prefix = doc.filename or ""
        elif doc.doc_type == "website":
            opts = (doc.meta or {}).get("crawl_options") or {}
            max_pages = max(1, min(int(opts.get("max_pages") or s.KB_CRAWL_MAX_PAGES), s.KB_CRAWL_PAGE_CAP))
            max_depth = max(0, min(int(opts.get("max_depth") if opts.get("max_depth") is not None else s.KB_CRAWL_MAX_DEPTH), 4))
            result = crawler.crawl(doc.source_url or "", max_pages=max_pages, max_depth=max_depth, fetcher=_fetcher_override)
            meta["crawl"] = result.summary()
            meta["crawl_options"] = {"max_pages": max_pages, "max_depth": max_depth}
            if not result.pages:
                reasons = "; ".join(f"{f['url']}: {f['reason']}" for f in (result.failed or result.skipped)[:3])
                raise crawler.CrawlError(f"No page could be read from this website{': ' + reasons if reasons else ''}.")
            if result.failed:
                warnings.append(f"{len(result.failed)} page(s) could not be fetched.")
            chunks, records, content = _website_pieces(result)
            prefix = doc.source_url or ""
        else:  # faq
            content = faq_text(doc)
            chunks, records, prefix = [(t, {}) for t in chunker.split(content)], [], ""
        if not chunks:
            raise extractors.ExtractionError("No readable text was found.")
        flags = injection_flags(content)
        if flags:
            warnings.append("Some text reads like instructions to the AI; it is treated as plain information and never followed.")
            meta["injection_flags"] = flags
        stats = _store(db, doc, chunks, records, prefix)
        if _embedder_configured() and stats["embedded"] < stats["chunks"]:
            warnings.append("Semantic embeddings were unavailable for some passages; keyword search still covers them. Re-index later to add them.")
        meta.update(stats)
        meta["warnings"] = warnings
        meta["chars"] = len(content)
        doc.content = content
        if doc.doc_type != "faq":
            doc.answer = preview(content)
        doc.meta = {**(doc.meta or {}), **meta}
        doc.chunk_count = stats["chunks"]
        doc.status = "indexed"
        doc.error = None
        doc.indexed_at = doc.updated_at = _now()
        db.commit()
    except (extractors.ExtractionError, crawler.CrawlError) as e:
        db.rollback()
        _fail(db, doc_id, str(e), had_chunks, meta)
    except Exception as e:  # unexpected: log it, tell the user plainly
        db.rollback()
        logger.exception("knowledge document %s failed to process", doc_id)
        _fail(db, doc_id, f"Processing failed unexpectedly ({type(e).__name__}). Try re-indexing; contact support if it keeps failing.", had_chunks, meta)


def _fail(db: Session, doc_id: str, message: str, had_chunks: bool, meta: dict) -> None:
    from backend.server.database.models.knowledge_base import KnowledgeDocument

    doc = db.get(KnowledgeDocument, doc_id)
    if doc is None:
        return
    doc.updated_at = _now()
    doc.meta = {**(doc.meta or {}), **{k: v for k, v in meta.items() if k in ("crawl", "crawl_options", "kind")}, "last_error": message}
    if had_chunks:
        doc.status = "indexed"
        doc.error = f"The last update failed, so the previous version is still being used: {message}"
    else:
        doc.status = "failed"
        doc.error = message
    db.commit()


def _embedder_configured() -> bool:
    return get_embedder() is not None


_fetcher_override: Optional[crawler.Fetcher] = None


def set_fetcher(fetcher: Optional[crawler.Fetcher]) -> None:
    """Tests: crawl through this fetcher instead of the network."""
    global _fetcher_override
    _fetcher_override = fetcher


def run_job(session_factory: Callable[[], Session], doc_id: str) -> None:
    """Background-task entry point: one document, in its own session, within the concurrency limit."""
    with _slots:
        db = session_factory()
        try:
            process(db, doc_id)
        finally:
            db.close()


def reindex_faq(db: Session, doc) -> None:
    """FAQs are small: (re)chunk them inline so they are searchable the moment they are saved."""
    chunk_plain_document(db, doc, faq_text(doc))
    doc.status = "indexed"
    doc.error = None
    doc.updated_at = _now()


def resume_pending(session_factory: Callable[[], Session]) -> int:
    """Startup: documents left "uploaded" or "processing" by a restart are processed again, one at a time."""
    from backend.server.database.models.knowledge_base import KnowledgeDocument

    db = session_factory()
    try:
        ids = list(db.scalars(select(KnowledgeDocument.id).where(
            KnowledgeDocument.status.in_(("uploaded", "processing")),
            or_(KnowledgeDocument.file_data.is_not(None),
                (KnowledgeDocument.doc_type == "website") & KnowledgeDocument.content.is_(None)),
        )))
    finally:
        db.close()
    for doc_id in ids:
        run_job(session_factory, doc_id)
    return len(ids)
