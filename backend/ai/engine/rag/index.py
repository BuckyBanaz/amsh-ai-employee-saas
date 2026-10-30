"""The one knowledge-base index every vertical uses: chunks persisted in knowledge_chunks, plus the business's own profile
and services, loaded into the in-memory BusinessVectorStore per business.

The in-memory copy is a cache keyed by a stamp read from the database on every search (chunk count and newest chunk,
document count and newest change, a hash of the profile/services text). Any upload, re-index or delete changes the stamp,
so every API process sees it on its next search: a deleted document is never retrieved again, and nothing is re-indexed
when nothing changed.

Retrieved text is the business's documents, i.e. untrusted input: `sanitize_snippet` neutralises instruction-like lines
before they reach the model, and the agent is told to treat snippets as reference data only."""

from __future__ import annotations

import hashlib
import logging
import re
import time
from datetime import datetime, timezone
from types import SimpleNamespace
from typing import Dict, List, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.ai.engine.rag import languages, structured
from backend.ai.engine.rag.chunker import SemanticChunker
from backend.ai.engine.rag.embeddings import from_bytes, get_embedder
from backend.ai.engine.rag.vector_store import global_vector_store

logger = logging.getLogger(__name__)

chunker = SemanticChunker(chunk_size=900, min_chunk_size=200, overlap=120)
_tables_cache: Dict[str, tuple] = {}  # business_id -> (stamp, tables)

# ------------------------------------------------------------------------------------------------------------- safety

_INJECTION = re.compile(
    r"(ignore|disregard|forget|override)\s+(all\s+|any\s+|the\s+)?(previous|prior|above|earlier|system)\s+(instructions?|prompts?|rules?|messages?)"
    r"|you\s+are\s+now\s+|new\s+instructions?\s*:|^\s*(system|assistant|developer)\s*:|<\|[^>]*\|>|\[/?(inst|system)\]"
    r"|act\s+as\s+(an?\s+)?(admin|developer|system)|reveal\s+(your|the)\s+(system\s+)?prompt",
    re.I | re.M,
)


def injection_flags(text: str) -> int:
    return len(_INJECTION.findall(text or ""))


def sanitize_snippet(text: str) -> str:
    """Business documents are data, never instructions: drop instruction-like phrases and chat-role markers."""
    return _INJECTION.sub("[removed]", text or "")


def text_hash(text: str) -> str:
    return hashlib.sha256(re.sub(r"\s+", " ", text.strip().lower()).encode("utf-8")).hexdigest()


def looks_binary(text: str) -> bool:
    """Text produced by the old parser decoding a PDF/DOCX's raw bytes (garbage that must not be indexed)."""
    sample = (text or "")[:5000]
    if not sample:
        return False
    if sample.lstrip().startswith(("%PDF-", "PK\x03\x04")) or "endobj" in sample or "[Content_Types].xml" in sample:
        return True
    bad = sum(1 for ch in sample if ch == "�" or (ord(ch) < 32 and ch not in "\n\r\t"))
    return bad / len(sample) > 0.05


# ------------------------------------------------------------------------------------------------------ source labels

def source_label(doc, meta: Optional[dict] = None) -> str:
    meta = meta or {}
    if doc.doc_type == "faq":
        q = (doc.question or "FAQ").strip()
        return f"FAQ: {q[:60]}{'…' if len(q) > 60 else ''}"
    if doc.doc_type == "website":
        return meta.get("url") or doc.source_url or "Website"
    name = doc.filename or "Document"
    if meta.get("page"):
        return f"{name} (page {meta['page']})"
    if meta.get("sheet"):
        return f"{name} › {meta['sheet']}"
    return name


# -------------------------------------------------------------------------------------------------- synthetic sources

def profile_chunks(db: Session, business_id: str) -> List[dict]:
    """The business's own profile and services, indexed alongside its documents (always current: read from the DB)."""
    from backend.server.database.models.business import Business
    from backend.server.database.models.service import Service

    biz = db.get(Business, business_id)
    if not biz:
        return []
    noun = "Clinic" if (biz.vertical or "clinic") == "clinic" else "Business"
    lines = [f"{noun} name: {biz.name}"]
    if biz.business_type or biz.vertical:
        lines.append(f"Category: {biz.business_type or ''} ({biz.vertical or ''})".replace("()", "").strip())
    if biz.business_phone:
        lines.append(f"Phone number: {biz.business_phone}")
    loc = [p for p in (biz.address, biz.city, biz.postal_code, biz.country) if p]
    if loc:
        lines.append(f"Location / address: {', '.join(loc)}")
    if biz.working_hours:
        if isinstance(biz.working_hours, dict):
            def _fmt(v):
                if isinstance(v, list):
                    return ", ".join(f"{s.get('start')}-{s.get('end')}" if isinstance(s, dict) else str(s) for s in v) or "closed"
                return str(v)
            lines.append("Working hours / timings: " + "; ".join(f"{d}: {_fmt(v)}" for d, v in biz.working_hours.items()))
        else:
            lines.append(f"Working hours: {biz.working_hours}")
    if biz.website:
        lines.append(f"Website: {biz.website}")
    out = [{"chunk_id": "business_profile", "source_id": "business_profile", "source_name": f"{noun} profile: {biz.name}",
            "text": "\n".join(lines), "meta": {"kind": "profile"}}]

    services = db.query(Service).filter(Service.business_id == business_id).all()
    if services:
        def price(s):
            return f"{s.price_currency} {s.price_amount}" if s.price_amount is not None else "price on request"
        catalog = [f"Services offered at {biz.name}:"] + [
            f"- {s.title} ({price(s)}, duration {s.duration_minutes} min){' - ' + s.description if s.description else ''}" for s in services]
        for n, text in enumerate(chunker.split("\n".join(catalog))):
            out.append({"chunk_id": f"services_catalog_{n}", "source_id": "services_catalog", "source_name": "Services & pricing",
                        "text": text, "meta": {"kind": "services"}})
        for s in services:
            text = f"Service: {s.title}\nPrice / fee: {price(s)}\nDuration: {s.duration_minutes} minutes"
            if s.description:
                text += f"\nDescription: {s.description}"
            out.append({"chunk_id": f"service_{s.id}", "source_id": f"service_{s.id}", "source_name": f"Service: {s.title}",
                        "text": text, "meta": {"kind": "service"}})
    return out


# ------------------------------------------------------------------------------------------------------------ backfill

def chunk_plain_document(db: Session, doc, text: str) -> int:
    """(Re)builds a document's chunks from plain text (FAQs, legacy rows). Replaces any existing chunks."""
    from backend.server.database.models.knowledge_base import KnowledgeChunk

    db.query(KnowledgeChunk).filter(KnowledgeChunk.business_id == doc.business_id, KnowledgeChunk.document_id == doc.id).delete(synchronize_session=False)
    pieces = chunker.split(text)
    for n, piece in enumerate(pieces):
        db.add(KnowledgeChunk(business_id=doc.business_id, document_id=doc.id, chunk_index=n, text=piece, meta={},
                              text_hash=text_hash(piece)))
    doc.chunk_count = len(pieces)
    doc.indexed_at = datetime.now(timezone.utc)
    return len(pieces)


def faq_text(doc) -> str:
    return f"Q: {(doc.question or '').strip()}\nA: {(doc.answer or '').strip()}"


def backfill(db: Session, business_id: str) -> int:
    """Chunks rows that have text but no chunks yet: FAQs, and documents/websites saved before chunks were persisted.
    Rows still waiting for their upload to be processed (file_data present) are left to the ingestion job."""
    from backend.server.database.models.knowledge_base import KnowledgeDocument

    rows = db.scalars(select(KnowledgeDocument).where(
        KnowledgeDocument.business_id == business_id,
        KnowledgeDocument.chunk_count == 0,
        KnowledgeDocument.status.in_(("uploaded", "pending", "indexed")),
        KnowledgeDocument.file_data.is_(None),
    )).all()
    done = 0
    for doc in rows:
        if doc.doc_type == "faq":
            if not (doc.question and doc.answer):
                continue
            chunk_plain_document(db, doc, faq_text(doc))
            doc.status = "indexed"
        else:
            text = doc.content or ""
            if doc.doc_type == "website" and doc.source_url and text.strip() == f"Website content for {doc.source_url}. Status: Active.":
                text = ""  # the old crawler's placeholder when nothing was fetched
            if not text.strip() or looks_binary(text) or text.strip() in ("Document uploaded and indexed.",):
                doc.status = "failed"
                doc.error = ("This file was saved by an older version that could not read it. Upload it again."
                             if doc.doc_type == "document" else "No content was fetched from this website. Sync it again.")
                continue
            chunk_plain_document(db, doc, text)
            doc.status = "indexed"
        done += 1
    if done or rows:
        db.commit()
    return done


# ---------------------------------------------------------------------------------------------------------- the index

def _stamp(db: Session, business_id: str, synthetic: List[dict]) -> tuple:
    from backend.server.database.models.knowledge_base import KnowledgeChunk, KnowledgeDocument

    c_count, c_max = db.execute(select(func.count(KnowledgeChunk.id), func.max(KnowledgeChunk.created_at))
                                .where(KnowledgeChunk.business_id == business_id)).one()
    d_count, d_max = db.execute(select(func.count(KnowledgeDocument.id), func.max(KnowledgeDocument.updated_at))
                                .where(KnowledgeDocument.business_id == business_id)).one()
    syn = hashlib.sha1("\x1e".join(c["text"] for c in synthetic).encode("utf-8")).hexdigest()
    return (c_count, str(c_max), d_count, str(d_max), syn)


def load_index(db: Session, business_id: str, force: bool = False):
    """The business's in-memory index, rebuilt only when its stamp changed. Returns the number of indexed chunks."""
    from backend.server.database.models.knowledge_base import KnowledgeChunk, KnowledgeDocument

    backfill(db, business_id)
    synthetic = profile_chunks(db, business_id)
    stamp = _stamp(db, business_id, synthetic)
    if not force and global_vector_store.stamp(business_id) == stamp:
        return len(global_vector_store._stores.get(business_id, []))
    rows = db.execute(
        select(KnowledgeChunk.id, KnowledgeChunk.document_id, KnowledgeChunk.text, KnowledgeChunk.meta, KnowledgeChunk.text_hash,
               KnowledgeChunk.embedding, KnowledgeChunk.embedding_model, KnowledgeDocument.doc_type, KnowledgeDocument.filename,
               KnowledgeDocument.source_url, KnowledgeDocument.question, KnowledgeDocument.updated_at)
        .join(KnowledgeDocument, KnowledgeDocument.id == KnowledgeChunk.document_id)
        .where(KnowledgeChunk.business_id == business_id, KnowledgeDocument.business_id == business_id)
        .order_by(KnowledgeDocument.updated_at.desc(), KnowledgeChunk.chunk_index)
    ).all()
    seen_hashes = set()
    items = list(synthetic)
    for r in rows:
        if r.text_hash in seen_hashes:  # the same passage in two documents is indexed once (the newest document wins)
            continue
        seen_hashes.add(r.text_hash)
        meta = r.meta or {}
        doc_view = SimpleNamespace(doc_type=r.doc_type, filename=r.filename, source_url=r.source_url, question=r.question)
        items.append({
            "chunk_id": r.id, "source_id": r.document_id, "source_name": source_label(doc_view, meta), "heading": meta.get("heading"),
            "text": r.text, "meta": meta, "embedding": from_bytes(r.embedding), "embedding_model": r.embedding_model,
            "updated_at": r.updated_at.date().isoformat() if r.updated_at else None,
        })
    global_vector_store.replace_business(business_id, items, stamp)
    _tables_cache.pop(business_id, None)
    return len(items)


def _tables(db: Session, business_id: str):
    from backend.server.database.models.knowledge_base import KnowledgeDocument, KnowledgeRecord

    stamp = global_vector_store.stamp(business_id)
    cached = _tables_cache.get(business_id)
    if cached and cached[0] == stamp:
        return cached[1]
    rows = db.execute(
        select(KnowledgeRecord.document_id, KnowledgeRecord.table_name, KnowledgeRecord.data, KnowledgeDocument.filename)
        .join(KnowledgeDocument, KnowledgeDocument.id == KnowledgeRecord.document_id)
        .where(KnowledgeRecord.business_id == business_id, KnowledgeDocument.business_id == business_id)
        .order_by(KnowledgeRecord.document_id, KnowledgeRecord.table_name, KnowledgeRecord.row_index)
    ).all()
    metas = db.execute(select(KnowledgeDocument.id, KnowledgeDocument.meta).where(
        KnowledgeDocument.business_id == business_id, KnowledgeDocument.doc_type == "document")).all()
    mappings = {(doc_id, table): cols for doc_id, meta in metas for table, cols in ((meta or {}).get("column_map") or {}).items()}
    tables = structured.build_tables([{"document_id": r.document_id, "table_name": r.table_name, "data": r.data, "source": r.filename}
                                      for r in rows], mappings)
    _tables_cache[business_id] = (stamp, tables)
    return tables


def _merge(lists: List[List[dict]], top_k: int) -> List[dict]:
    """Results of several phrasings of one question: each passage once, with its best score."""
    best: Dict[str, dict] = {}
    for results in lists:
        for r in results:
            if r["chunk_id"] not in best or r["score"] > best[r["chunk_id"]]["score"]:
                best[r["chunk_id"]] = r
    return sorted(best.values(), key=lambda r: r["score"], reverse=True)[:top_k]


_STATUS_RANK = {"exact": 3, "ambiguous": 2, "no_match": 1}


def search(db: Session, business_id: str, query: str, top_k: int = 4, hints: Optional[List[str]] = None) -> dict:
    """Retrieval for one business: ranked passages with sources, plus an exact table lookup when the question names table
    values. Never touches any other business's data.

    Any of the agent's languages: the question is searched as asked (same-language documents) and with its known words in
    English (an English fee sheet answering a Hindi, Arabic or Dutch question). Only when that finds nothing, and the
    question is not English, it is translated once (languages.translate_query; short timeout, cached) and searched again.

    `hints`: the caller's earlier answers kept by the workflow (country, academic year, ...); they fill table columns the
    question does not name (structured.lookup), never the passage ranking."""
    started = time.perf_counter()
    load_index(db, business_id)
    query = (query or "").strip()[:500]
    top_k = max(1, min(int(top_k or 4), 10))
    qvec = None
    idx = global_vector_store._indexes.get(business_id)
    if query and idx is not None and idx.matrix is not None:
        embedder = get_embedder()
        if embedder is not None and embedder.model == idx.embedding_model:
            qvec = embedder.embed_query(query)  # multilingual model: the original wording is enough
    phrasings = [query]
    english = languages.to_english(query) if query else ""
    if english and english != " ".join(languages.words(query)):
        phrasings.append(english)
    lists = [global_vector_store.search(business_id, q, top_k=top_k, query_vector=qvec if n == 0 else None) for n, q in enumerate(phrasings)]
    results = _merge(lists, top_k)
    tables = _tables(db, business_id) if query else []
    table = structured.lookup(tables, query, hints=hints) if query else None
    mode = "hybrid" if qvec is not None else "keyword"
    language = languages.guess_language(query) if query else "en"
    if query and not results and (table is None or table["status"] == "no_match") and language != "en":
        translated = languages.translate_query(query)
        if translated and translated.lower() != query.lower():
            results = global_vector_store.search(business_id, translated, top_k=top_k)
            alt = structured.lookup(tables, translated, hints=hints)
            if alt and (table is None or _STATUS_RANK[alt["status"]] > _STATUS_RANK[table["status"]]):
                table = alt
            mode += "+translated"
    for r in results:
        r["text"] = sanitize_snippet(r["text"])
    if table and table["status"] == "exact":
        confidence = "high"
    elif results:
        confidence = results[0]["confidence"]
    elif table:
        confidence = "medium"
    else:
        confidence = "none"
    return {
        "business_id": business_id,
        "query": query,
        "language": language,
        "latency_ms": round((time.perf_counter() - started) * 1000.0, 2),
        "match_count": len(results),
        "mode": mode,
        "confidence": confidence,
        "results": results,
        "structured": table,
    }
