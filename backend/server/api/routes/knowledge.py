"""Onboarding "Knowledge" step: frontend/user/app/onboarding/knowledge/page.tsx
(three sections — uploaded documents, synced websites, manual FAQs — all
stored as KnowledgeDocument rows distinguished by doc_type), and the dashboard
Knowledge Base page (same routes under /api/businesses/{id}/knowledge).

Uploads and website syncs are validated straight away (type, size, safety, duplicates) and then processed in the
background: the response says "uploaded", and the row moves to "processing" and then "indexed" or "failed" (with the
reason in `error`). The pipeline itself lives in backend/ai/engine/rag (extractors, crawler, ingestion, index)."""

import hashlib
import re
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Response, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session, sessionmaker

from backend.ai.engine.rag import crawler, extractors, index, ingestion
from backend.server.api.routes._shared import get_business_or_404, require_membership, require_owner_or_admin
from backend.server.auth.security import get_current_user
from backend.server.common.config import get_settings
from backend.server.database.models.knowledge_base import KnowledgeChunk, KnowledgeDocument, KnowledgeRecord
from backend.server.database.models.user import User
from backend.server.database.session import get_db
from backend.server.services import quotas

router = APIRouter(prefix="/api/onboarding/businesses/{business_id}/knowledge", tags=["knowledge"])

DOC_TYPES = {"document", "website", "faq"}


class KnowledgeCreate(BaseModel):
    doc_type: str  # document | website | faq
    filename: str | None = None
    source_url: str | None = None
    question: str | None = None
    answer: str | None = None


class KnowledgeUpdate(BaseModel):
    status: str | None = None  # ignored: processing status is set by the pipeline, never by a client
    filename: str | None = None
    source_url: str | None = None
    question: str | None = None
    answer: str | None = None


class KnowledgeOut(BaseModel):
    id: str
    business_id: str
    doc_type: str
    status: str
    filename: str | None
    source_url: str | None
    question: str | None
    answer: str | None
    uploaded_at: datetime
    error: str | None = None
    meta: dict | None = None
    chunk_count: int = 0
    version: int = 1
    file_size: int | None = None
    mime_type: str | None = None
    updated_at: datetime | None = None
    indexed_at: datetime | None = None

    model_config = {"from_attributes": True}


class SyncUrlPayload(BaseModel):
    source_url: str
    max_pages: int | None = Field(default=None, ge=1, le=100)
    max_depth: int | None = Field(default=None, ge=0, le=4)


class KnowledgeQueryPayload(BaseModel):
    query: str
    top_k: int = 4


def _now():
    return datetime.now(timezone.utc)


def ensure_business_indexed(business_id: str, db: Session, force_reload: bool = False) -> int:
    """Loads the business's knowledge (documents, websites, FAQs, its profile and services) into the search index.
    Kept for existing callers; the index only rebuilds when the business's knowledge changed."""
    return index.load_index(db, business_id, force=force_reload)


def _session_factory(db: Session):
    return sessionmaker(bind=db.get_bind(), autoflush=False, expire_on_commit=False)


def _schedule(background: BackgroundTasks, db: Session, doc_id: str) -> None:
    background.add_task(ingestion.run_job, _session_factory(db), doc_id)


def _limit_in_flight(db: Session, business_id: str) -> None:
    """Rate limit: a business can have only a few uploads/crawls processing at once."""
    limit = get_settings().KB_MAX_PROCESSING_PER_BUSINESS
    busy = db.scalar(select(func.count(KnowledgeDocument.id)).where(
        KnowledgeDocument.business_id == business_id, KnowledgeDocument.status.in_(("uploaded", "processing")),
        KnowledgeDocument.doc_type != "faq")) or 0
    if busy >= limit:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail=f"{busy} knowledge sources are still processing. Wait for them to finish, then try again.")


def _validate_doc_type(payload: KnowledgeCreate) -> None:
    if payload.doc_type not in DOC_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"doc_type must be one of {sorted(DOC_TYPES)}",
        )
    if payload.doc_type == "document" and not payload.filename:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="filename is required for doc_type=document")
    if payload.doc_type == "website" and not payload.source_url:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="source_url is required for doc_type=website")
    if payload.doc_type == "faq" and not (payload.question and payload.answer):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="question and answer are required for doc_type=faq")
    if payload.doc_type == "faq" and (len(payload.question or "") > 500 or len(payload.answer or "") > 20000):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="FAQ question must be at most 500 characters and the answer at most 20,000.")


def _checked_url(url: str) -> str:
    normalized = crawler.normalize_url(url)
    if not normalized:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Enter a valid website address, like https://example.com.")
    if ingestion._fetcher_override is None:  # tests crawl through a fake fetcher and skip DNS
        try:
            crawler.check_url_safe(normalized)
        except crawler.CrawlError as e:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    if len(normalized) > 500:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="The website address is too long.")
    return normalized


def _start_crawl(db: Session, background: BackgroundTasks, business_id: str, url: str, max_pages=None, max_depth=None,
                 response: Response | None = None) -> KnowledgeDocument:
    """New website rows, or a re-crawl of the business's existing row for the same site (never a duplicate)."""
    normalized = _checked_url(url)
    url_hash = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
    entry = db.scalar(select(KnowledgeDocument).where(KnowledgeDocument.business_id == business_id, KnowledgeDocument.doc_type == "website",
                                                      KnowledgeDocument.content_hash == url_hash))
    if entry is None:  # rows saved before URLs were normalised
        for row in db.scalars(select(KnowledgeDocument).where(KnowledgeDocument.business_id == business_id, KnowledgeDocument.doc_type == "website")):
            if crawler.normalize_url(row.source_url or "") == normalized:
                entry = row
                break
    if entry is not None and entry.status in ("uploaded", "processing"):
        if response is not None:
            response.status_code = status.HTTP_200_OK
        return entry
    _limit_in_flight(db, business_id)
    options = {k: v for k, v in (("max_pages", max_pages), ("max_depth", max_depth)) if v is not None}
    if entry is None:
        quotas.enforce_add(db, get_business_or_404(business_id, db), "knowledge_docs")
        entry = KnowledgeDocument(business_id=business_id, doc_type="website", source_url=normalized, status="uploaded",
                                  question=f"Website: {normalized}", content_hash=url_hash, meta={"crawl_options": options})
        db.add(entry)
    else:
        if response is not None:
            response.status_code = status.HTTP_200_OK
        entry.status = "uploaded"
        entry.source_url = normalized
        entry.content_hash = url_hash
        entry.meta = {**(entry.meta or {}), "crawl_options": {**((entry.meta or {}).get("crawl_options") or {}), **options}}
        entry.updated_at = _now()
    db.commit()
    db.refresh(entry)
    _schedule(background, db, entry.id)
    return entry


@router.post("", response_model=KnowledgeOut, status_code=status.HTTP_201_CREATED)
def create_knowledge_entry(
    business_id: str,
    payload: KnowledgeCreate,
    background: BackgroundTasks,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    _validate_doc_type(payload)
    if payload.doc_type == "website":
        return _start_crawl(db, background, business_id, payload.source_url or "", response=response)
    if payload.doc_type == "document":
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="Documents are added by uploading the file (POST .../knowledge/upload-file).")
    quotas.enforce_add(db, get_business_or_404(business_id, db), "knowledge_docs")
    entry = KnowledgeDocument(
        business_id=business_id,
        doc_type="faq",
        status="indexed",
        question=payload.question.strip(),
        answer=payload.answer.strip(),
    )
    db.add(entry)
    db.flush()
    ingestion.reindex_faq(db, entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("", response_model=list[KnowledgeOut])
def list_knowledge_entries(
    business_id: str,
    doc_type: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    index.backfill(db, business_id)  # older rows get their chunks (or an honest "failed") before they are shown
    query = db.query(KnowledgeDocument).filter(KnowledgeDocument.business_id == business_id)
    if doc_type:
        query = query.filter(KnowledgeDocument.doc_type == doc_type)
    rows = query.order_by(KnowledgeDocument.uploaded_at.asc()).all()
    for row in rows:  # documents/websites show a preview, never the full extracted text, in lists
        if row.doc_type != "faq" and row.answer and len(row.answer) > ingestion.PREVIEW_CHARS + 1:
            db.expunge(row)
            row.answer = ingestion.preview(row.answer)
    return rows


def _get_entry_or_404(business_id: str, entry_id: str, db: Session) -> KnowledgeDocument:
    entry = db.get(KnowledgeDocument, entry_id)
    if not entry or entry.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge entry not found")
    return entry


@router.get("/{entry_id}", response_model=KnowledgeOut)
def get_knowledge_entry(
    business_id: str,
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    return _get_entry_or_404(business_id, entry_id, db)


@router.patch("/{entry_id}", response_model=KnowledgeOut)
def update_knowledge_entry(
    business_id: str,
    entry_id: str,
    payload: KnowledgeUpdate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    entry = _get_entry_or_404(business_id, entry_id, db)
    changes = payload.model_dump(exclude_unset=True)
    changes.pop("status", None)
    if entry.doc_type == "faq":
        if "question" in changes and changes["question"] is not None:
            entry.question = changes["question"].strip()[:500]
        if "answer" in changes and changes["answer"] is not None:
            entry.answer = changes["answer"].strip()[:20000]
        if not (entry.question and entry.answer):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="question and answer are required for doc_type=faq")
        entry.version = (entry.version or 1) + 1
        ingestion.reindex_faq(db, entry)
    elif entry.doc_type == "document":
        if changes.get("filename"):
            entry.filename = re.sub(r"[\\/]", "_", changes["filename"]).strip()[:255]
            entry.updated_at = _now()
    elif entry.doc_type == "website" and changes.get("source_url"):
        db.commit()
        return _start_crawl(db, background, business_id, changes["source_url"])
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_knowledge_entry(
    business_id: str,
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    entry = _get_entry_or_404(business_id, entry_id, db)
    db.query(KnowledgeChunk).filter(KnowledgeChunk.business_id == business_id, KnowledgeChunk.document_id == entry.id).delete(synchronize_session=False)
    db.query(KnowledgeRecord).filter(KnowledgeRecord.business_id == business_id, KnowledgeRecord.document_id == entry.id).delete(synchronize_session=False)
    db.delete(entry)
    db.commit()


# -----------------------------------------------------------------------------
# Document Upload (PDF/DOC/DOCX/TXT/CSV/XLS/XLSX), Website Sync & RAG Query Endpoints
# -----------------------------------------------------------------------------

async def _read_upload(file: UploadFile) -> tuple[str, bytes, str]:
    """(safe filename, bytes, kind): refuses unsupported, mismatched, empty and oversized files before anything is stored."""
    limit = get_settings().KB_MAX_FILE_MB * 1024 * 1024
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=f"The file is larger than the {get_settings().KB_MAX_FILE_MB} MB limit.")
    filename = re.sub(r"[\x00-\x1f]", "", (file.filename or "document.txt").replace("\\", "/").rsplit("/", 1)[-1]).strip()[:255] or "document.txt"
    try:
        kind = extractors.detect_kind(filename, data)
    except extractors.ExtractionError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    return filename, data, kind


@router.post("/upload-file", response_model=KnowledgeOut, status_code=status.HTTP_201_CREATED)
async def upload_knowledge_file(
    business_id: str,
    background: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a PDF, DOC, DOCX, TXT, CSV, XLS or XLSX file. It is validated now and indexed in the background."""
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    filename, data, kind = await _read_upload(file)
    digest = hashlib.sha256(data).hexdigest()
    existing = db.scalar(select(KnowledgeDocument).where(KnowledgeDocument.business_id == business_id, KnowledgeDocument.doc_type == "document",
                                                         KnowledgeDocument.content_hash == digest))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail=f"This file is already in your knowledge base as '{existing.filename}'. Use Replace to update a document.")
    _limit_in_flight(db, business_id)
    quotas.enforce_add(db, get_business_or_404(business_id, db), "knowledge_docs")
    entry = KnowledgeDocument(
        business_id=business_id,
        doc_type="document",
        filename=filename,
        status="uploaded",
        question=f"Document: {filename}",
        content_hash=digest,
        mime_type=extractors.MIME_TYPES.get(kind),
        file_size=len(data),
        file_data=data,
        meta={"kind": kind},
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    _schedule(background, db, entry.id)
    return entry


@router.post("/{entry_id}/replace", response_model=KnowledgeOut)
async def replace_knowledge_file(
    business_id: str,
    entry_id: str,
    background: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Replace a document with a new version. An identical file changes nothing (no re-indexing)."""
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    entry = _get_entry_or_404(business_id, entry_id, db)
    if entry.doc_type != "document":
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Only uploaded documents can be replaced with a file.")
    filename, data, kind = await _read_upload(file)
    digest = hashlib.sha256(data).hexdigest()
    if digest == entry.content_hash and entry.status == "indexed" and not entry.error:
        return entry
    clash = db.scalar(select(KnowledgeDocument).where(KnowledgeDocument.business_id == business_id, KnowledgeDocument.doc_type == "document",
                                                      KnowledgeDocument.content_hash == digest, KnowledgeDocument.id != entry.id))
    if clash is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"This file is already in your knowledge base as '{clash.filename}'.")
    _limit_in_flight(db, business_id)
    entry.filename = filename
    entry.question = f"Document: {filename}"
    entry.file_data = data
    entry.file_size = len(data)
    entry.mime_type = extractors.MIME_TYPES.get(kind)
    entry.content_hash = digest
    entry.version = (entry.version or 1) + 1
    entry.status = "uploaded"
    entry.error = None
    entry.meta = {**(entry.meta or {}), "kind": kind}
    entry.updated_at = _now()
    db.commit()
    db.refresh(entry)
    _schedule(background, db, entry.id)
    return entry


@router.post("/{entry_id}/reindex", response_model=KnowledgeOut)
def reindex_knowledge_entry(
    business_id: str,
    entry_id: str,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Process a source again: re-extract a document, re-crawl a website, re-chunk an FAQ."""
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    entry = _get_entry_or_404(business_id, entry_id, db)
    if entry.doc_type == "faq":
        ingestion.reindex_faq(db, entry)
        db.commit()
        db.refresh(entry)
        return entry
    if entry.doc_type == "website":
        return _start_crawl(db, background, business_id, entry.source_url or "")
    if entry.status in ("uploaded", "processing"):
        return entry
    has_file = db.scalar(select(KnowledgeDocument.id).where(KnowledgeDocument.id == entry.id, KnowledgeDocument.file_data.is_not(None)))
    if not has_file:
        if entry.content and not index.looks_binary(entry.content):  # saved before files were kept: re-chunk its text
            index.chunk_plain_document(db, entry, entry.content)
            entry.status, entry.error, entry.updated_at = "indexed", None, _now()
            db.commit()
            db.refresh(entry)
            return entry
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="The original file is not stored. Upload it again with Replace.")
    _limit_in_flight(db, business_id)
    entry.status = "uploaded"
    entry.updated_at = _now()
    db.commit()
    db.refresh(entry)
    _schedule(background, db, entry.id)
    return entry


@router.post("/reindex")
def reindex_all(
    business_id: str,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Re-process every document and FAQ of the business (e.g. to add embeddings after enabling them). Websites are
    re-crawled only on request, per site."""
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    queued = 0
    for entry in db.scalars(select(KnowledgeDocument).where(KnowledgeDocument.business_id == business_id)).all():
        if entry.doc_type == "faq":
            if entry.question and entry.answer:
                ingestion.reindex_faq(db, entry)
        elif entry.doc_type == "document" and entry.status not in ("uploaded", "processing"):
            if db.scalar(select(KnowledgeDocument.id).where(KnowledgeDocument.id == entry.id, KnowledgeDocument.file_data.is_not(None))):
                entry.status = "uploaded"
                entry.updated_at = _now()
                db.flush()
                _schedule(background, db, entry.id)
                queued += 1
    db.commit()
    return {"queued": queued}


class ColumnSetting(BaseModel):
    role: str | None = None  # course | country | category | year | fee | other | ignore (None: use the detected role)
    label: str | None = Field(default=None, max_length=60)
    aliases: dict[str, str] = Field(default_factory=dict)  # another name -> a value of this column


class TableSettings(BaseModel):
    columns: dict[str, ColumnSetting]


class TablesPayload(BaseModel):
    tables: dict[str, TableSettings]


def _table_rows(db: Session, entry: KnowledgeDocument) -> dict:
    rows: dict = {}
    for r in db.scalars(select(KnowledgeRecord).where(KnowledgeRecord.business_id == entry.business_id, KnowledgeRecord.document_id == entry.id)
                        .order_by(KnowledgeRecord.table_name, KnowledgeRecord.row_index)):
        rows.setdefault(r.table_name, []).append(r.data)
    return rows


def _profiles(db: Session, entry: KnowledgeDocument) -> dict:
    from backend.ai.engine.rag import structured

    column_map = (entry.meta or {}).get("column_map") or {}
    tables = [structured.profile(name, rows, column_map.get(name)) for name, rows in _table_rows(db, entry).items()]
    return {"document_id": entry.id, "filename": entry.filename, "roles": list(structured.ROLES), "tables": tables}


@router.get("/{entry_id}/tables")
def get_knowledge_tables(
    business_id: str,
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """The tables found in a document (spreadsheet sheets, CSV, DOCX/DOC tables): each column's detected role, the
    business's confirmed mapping, sample values, and validation issues."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    return _profiles(db, _get_entry_or_404(business_id, entry_id, db))


@router.put("/{entry_id}/tables")
def save_knowledge_tables(
    business_id: str,
    entry_id: str,
    payload: TablesPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Confirm or correct how a document's tables are read: column roles (Fee holds the answers, Ignore leaves a column
    out), labels, and other names for values. Takes effect on the next lookup; the file is not re-processed."""
    from backend.ai.engine.rag import structured

    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    entry = _get_entry_or_404(business_id, entry_id, db)
    tables = _table_rows(db, entry)
    column_map = dict((entry.meta or {}).get("column_map") or {})
    for name, settings in payload.tables.items():
        if name not in tables:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"No table named '{name}' in this document.")
        columns = list(dict.fromkeys(k for r in tables[name] for k in r))
        saved = {}
        for col, setting in settings.columns.items():
            if col not in columns:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"'{name}' has no column '{col}'.")
            if setting.role is not None and setting.role not in structured.ROLES:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Role must be one of {', '.join(structured.ROLES)}.")
            values = {structured.normalize(r.get(col, "")) for r in tables[name] if r.get(col)}
            aliases = {}
            for alias, value in list(setting.aliases.items())[:50]:
                alias, value = alias.strip()[:80], value.strip()[:80]
                if not alias:
                    continue
                if structured.normalize(value) not in values:
                    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                        detail=f"'{value}' is not a value of '{col}', so '{alias}' cannot point to it.")
                aliases[alias] = value
            item = {k: v for k, v in (("role", setting.role), ("label", (setting.label or "").strip() or None)) if v}
            if aliases:
                item["aliases"] = aliases
            if item:
                saved[col] = item
        column_map[name] = saved
    issues = [i for name, rows in tables.items() for i in structured.profile(name, rows, column_map.get(name))["issues"]]
    entry.meta = {**(entry.meta or {}), "column_map": column_map,
                  "table_issues": {"errors": sum(i["level"] == "error" for i in issues), "warnings": sum(i["level"] == "warning" for i in issues)}}
    entry.updated_at = _now()  # changes the index stamp: every process reloads the tables with the new mapping
    db.commit()
    db.refresh(entry)
    return _profiles(db, entry)


@router.post("/sync-url", response_model=KnowledgeOut, status_code=status.HTTP_201_CREATED)
def sync_knowledge_url(
    business_id: str,
    payload: SyncUrlPayload,
    background: BackgroundTasks,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Crawl a website (robots.txt, sitemap, internal links within the page/depth limits) in the background. Syncing a
    site the business already has re-crawls that entry instead of adding a duplicate."""
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    return _start_crawl(db, background, business_id, payload.source_url, payload.max_pages, payload.max_depth, response=response)


@router.post("/query")
def query_knowledge_base(
    business_id: str,
    payload: KnowledgeQueryPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Search the business's own knowledge base: ranked passages with their sources and confidence, plus an exact table
    match (fees, prices) when the question names table values."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    return index.search(db, business_id, payload.query, top_k=payload.top_k)


@router.post("/test-answer")
async def test_answer(
    business_id: str,
    payload: KnowledgeQueryPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Preview how the AI employee would answer from the knowledge base, before going live. Uses the same retrieval and
    grounding rules as calls and WhatsApp: no verified information means no answer, never a guess."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    from backend.ai.engine.rag.answering import grounded_answer

    return await grounded_answer(db, business_id, payload.query)


dashboard_router = APIRouter(prefix="/api/businesses/{business_id}/knowledge", tags=["knowledge"])
dashboard_router.add_api_route("", create_knowledge_entry, methods=["POST"], response_model=KnowledgeOut, status_code=status.HTTP_201_CREATED)
dashboard_router.add_api_route("", list_knowledge_entries, methods=["GET"], response_model=list[KnowledgeOut])
dashboard_router.add_api_route("/upload-file", upload_knowledge_file, methods=["POST"], response_model=KnowledgeOut, status_code=status.HTTP_201_CREATED)
dashboard_router.add_api_route("/sync-url", sync_knowledge_url, methods=["POST"], response_model=KnowledgeOut, status_code=status.HTTP_201_CREATED)
dashboard_router.add_api_route("/query", query_knowledge_base, methods=["POST"])
dashboard_router.add_api_route("/test-answer", test_answer, methods=["POST"])
dashboard_router.add_api_route("/reindex", reindex_all, methods=["POST"])
dashboard_router.add_api_route("/{entry_id}", get_knowledge_entry, methods=["GET"], response_model=KnowledgeOut)
dashboard_router.add_api_route("/{entry_id}", update_knowledge_entry, methods=["PATCH"], response_model=KnowledgeOut)
dashboard_router.add_api_route("/{entry_id}", delete_knowledge_entry, methods=["DELETE"], status_code=status.HTTP_204_NO_CONTENT)
dashboard_router.add_api_route("/{entry_id}/replace", replace_knowledge_file, methods=["POST"], response_model=KnowledgeOut)
dashboard_router.add_api_route("/{entry_id}/reindex", reindex_knowledge_entry, methods=["POST"], response_model=KnowledgeOut)
dashboard_router.add_api_route("/{entry_id}/tables", get_knowledge_tables, methods=["GET"])
dashboard_router.add_api_route("/{entry_id}/tables", save_knowledge_tables, methods=["PUT"])


def _scrape_website_text(url: str) -> str:
    """Scripts (backend/scripts/*rag*.py): crawl a site and return its text. Not used by the API."""
    result = crawler.crawl(url, max_pages=10, max_depth=1)
    return "\n\n".join(f"--- {p.url} ---\n{p.text}" for p in result.pages)
