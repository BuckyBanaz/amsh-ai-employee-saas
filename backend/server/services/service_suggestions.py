"""Services the business's own website mentions that are missing from its Services list.

The AI receptionist can only book what is in the Services list (the booking validator refuses anything else), but it also
answers from the crawled website. When the two disagree the caller hears about "Gum Care", picks it, and the booking is
refused (live call CA7bb473994c). The dashboard shows these suggestions so the owner can add them; nothing is added
automatically.

Language-independent: the model reads the website in whatever language it is written and names services in that language;
code only checks that every suggestion quotes the website verbatim (anything it cannot find in the text is dropped, so a
service the model "knows" but the site never mentions cannot appear) and that it is not already in the list.
"""

import hashlib
import json
import logging
import re
import unicodedata
from collections import OrderedDict
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from backend.ai.prompts import load_prompts
from backend.server.database.models.knowledge_base import KnowledgeDocument
from backend.server.database.models.service import Service

logger = logging.getLogger(__name__)

_CACHE: "OrderedDict[str, List[Dict[str, str]]]" = OrderedDict()  # website text hash -> grounded services (LLM runs once per text)
_CACHE_ENTRIES = 200


def _norm(text: str) -> str:
    """Case-, accent-form- and whitespace-insensitive form for matching quotes and titles, in any script."""
    text = unicodedata.normalize("NFKC", text or "").casefold()
    return re.sub(r"[\W_]+", " ", text).strip()


def _parse(content: str) -> List[Dict[str, Any]]:
    start, end = (content or "").find("{"), (content or "").rfind("}")
    if start < 0 or end <= start:
        return []
    try:
        data = json.loads(content[start : end + 1])
    except ValueError:
        return []
    items = data.get("services") if isinstance(data, dict) else None
    return [i for i in items if isinstance(i, dict)] if isinstance(items, list) else []


def ground(items: List[Dict[str, Any]], text: str) -> List[Dict[str, str]]:
    """Keep only services whose quote really is in the website text; one entry per title."""
    haystack = _norm(text)
    out: List[Dict[str, str]] = []
    seen = set()
    for item in items:
        title = " ".join(str(item.get("title") or "").split())[:120]
        quote = " ".join(str(item.get("quote") or "").split())
        key = _norm(title)
        if not key or key in seen or not quote or _norm(quote) not in haystack:
            continue
        seen.add(key)
        out.append({"title": title, "description": " ".join(str(item.get("description") or "").split())[:300], "quote": quote[:200]})
    return out


def missing_from(catalog: List[str], found: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Suggestions not already in the Services list (same name, or one name containing the other)."""
    have = [_norm(t) for t in catalog if _norm(t)]
    return [f for f in found if not any(n == _norm(f["title"]) or n in _norm(f["title"]) or _norm(f["title"]) in n for n in have)]


async def _extract(text: str, backend: Any = None) -> List[Dict[str, str]]:
    pack = load_prompts("service_extraction")
    text = text[: int(pack["max_text_chars"])]
    key = hashlib.sha256(text.encode("utf-8")).hexdigest()
    if key in _CACHE:
        _CACHE.move_to_end(key)
        return _CACHE[key]
    if backend is None:
        from backend.ai.engine.agent.llm_backend import build_chat_backend

        backend = build_chat_backend(temperature=0.1, max_tokens=1500)  # up to 20 services as JSON; 400 cut the list mid-way
    result = await backend.chat(
        [{"role": "system", "content": pack["system"]}, {"role": "user", "content": pack["user"].replace("{text}", text)}], []
    )
    found = ground(_parse(result.get("content") or ""), text)
    _CACHE[key] = found
    while len(_CACHE) > _CACHE_ENTRIES:
        _CACHE.popitem(last=False)
    return found


async def suggestions_for(business_id: str, db: Session, backend: Any = None) -> Dict[str, Any]:
    docs = (
        db.query(KnowledgeDocument)
        .filter(KnowledgeDocument.business_id == business_id, KnowledgeDocument.doc_type == "website")
        .order_by(KnowledgeDocument.uploaded_at.asc())
        .all()
    )
    catalog = [s.title for s in db.query(Service).filter(Service.business_id == business_id).all()]
    suggestions: List[Dict[str, str]] = []
    sources: List[str] = []
    error: Optional[str] = None
    for doc in docs:
        text = (doc.answer or "").strip()
        if not text or text == f"Website synced from {doc.source_url}":  # the crawl returned nothing
            continue
        sources.append(doc.source_url or "")
        try:
            found = await _extract(text, backend)
        except Exception as e:  # a failed check must never break the Services page
            logger.warning("service suggestions failed for %s: %s", doc.source_url, e)
            error = "unavailable"
            continue
        for f in missing_from(catalog + [s["title"] for s in suggestions], found):
            suggestions.append({**f, "source_url": doc.source_url or ""})
    return {"suggestions": suggestions, "sources": sources, "error": error}
