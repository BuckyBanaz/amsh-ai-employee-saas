"""Onboarding "Knowledge" step: frontend/user/app/onboarding/knowledge/page.tsx
(three sections — uploaded documents, synced websites, manual FAQs — all
stored as KnowledgeDocument rows distinguished by doc_type)."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.server.api.routes._shared import get_business_or_404, require_membership, require_owner_or_admin
from backend.server.auth.security import get_current_user
from backend.server.database.models.business import Business
from backend.server.database.models.knowledge_base import KnowledgeDocument
from backend.server.database.models.service import Service
from backend.server.database.models.user import User
from backend.server.database.session import get_db
from backend.server.services import quotas
from backend.ai.engine.rag.retriever import rag_retriever
from backend.ai.engine.rag.vector_store import global_vector_store

router = APIRouter(prefix="/api/onboarding/businesses/{business_id}/knowledge", tags=["knowledge"])

DOC_TYPES = {"document", "website", "faq"}


class KnowledgeCreate(BaseModel):
    doc_type: str  # document | website | faq
    filename: str | None = None
    source_url: str | None = None
    question: str | None = None
    answer: str | None = None


class KnowledgeUpdate(BaseModel):
    status: str | None = None
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

    model_config = {"from_attributes": True}


def ensure_business_indexed(business_id: str, db: Session, force_reload: bool = False) -> int:
    """Ensures all knowledge sources (documents, synced websites, FAQs, bookable services, and business info)
    are indexed into the sub-50ms RAG vector store for this business.
    """
    current_store = global_vector_store._stores.get(business_id)
    if not force_reload and current_store is not None and len(current_store) > 0:
        return len(current_store)

    global_vector_store.clear_business(business_id)
    total_indexed = 0

    # 1. Index Business Profile (Name, Type, Address, Timings, Phone)
    biz = db.get(Business, business_id)
    if biz:
        biz_info = []
        biz_info.append(f"Business/Clinic Name: {biz.name}")
        biz_info.append(f"Category: {biz.business_type} ({biz.vertical})")
        if biz.business_phone:
            biz_info.append(f"Phone Number: {biz.business_phone}")
        if biz.address or biz.city:
            loc_parts = [p for p in [biz.address, biz.city, biz.postal_code, biz.country] if p]
            biz_info.append(f"Location / Address: {', '.join(loc_parts)}")
        if biz.working_hours:
            if isinstance(biz.working_hours, dict):
                hours_str = ", ".join(f"{k}: {v}" for k, v in biz.working_hours.items() if v)
                biz_info.append(f"Working Hours / Timings: {hours_str}")
            else:
                biz_info.append(f"Working Hours: {biz.working_hours}")
        if biz.website:
            biz_info.append(f"Website: {biz.website}")

        biz_text = "\n".join(biz_info)
        total_indexed += rag_retriever.index_document_text(
            business_id,
            biz_text,
            source_id="business_profile",
            source_name=f"Clinic Profile: {biz.name}",
        )

    # 2. Index Bookable Services & Treatments with Pricing
    services = db.query(Service).filter(Service.business_id == business_id).all()
    if services:
        # Grouped summary chunk for general queries like "what is clinic services" / "what services do you offer"
        service_catalog = [f"Clinic Services & Treatments offered at {biz.name if biz else 'the clinic'}:"]
        for s in services:
            price_display = f"{s.price_currency} {s.price_amount}" if s.price_amount is not None else "Price on consultation"
            desc_part = f" - {s.description}" if s.description else ""
            service_catalog.append(f"• {s.title} ({price_display}, Duration: {s.duration_minutes} mins){desc_part}")

        catalog_text = "\n".join(service_catalog)
        total_indexed += rag_retriever.index_document_text(
            business_id,
            catalog_text,
            source_id="services_catalog",
            source_name="Services & Pricing Catalog",
        )

        # Also individual chunks for each unique service for high-precision matching
        for s in services:
            price_display = f"{s.price_currency} {s.price_amount}" if s.price_amount is not None else "Price on consultation"
            s_text = (
                f"Service Name: {s.title}\n"
                f"Description: {s.description or 'Specialized clinic treatment and consultation'}\n"
                f"Price / Fee: {price_display}\n"
                f"Appointment Duration: {s.duration_minutes} minutes"
            )
            total_indexed += rag_retriever.index_document_text(
                business_id,
                s_text,
                source_id=f"service_{s.id}",
                source_name=f"Service: {s.title}",
            )

    # 3. Index Knowledge Documents (FAQs, Synced Websites, Uploaded Documents)
    docs = db.query(KnowledgeDocument).filter(
        KnowledgeDocument.business_id == business_id
    ).all()

    for doc in docs:
        if doc.doc_type == "faq":
            faq_text = f"FAQ:\nQuestion: {doc.question}\nAnswer: {doc.answer}"
            source_title = f"FAQ: {doc.question[:45]}..." if doc.question and len(doc.question) > 45 else (doc.question or "Clinic FAQ")
            total_indexed += rag_retriever.index_document_text(
                business_id,
                faq_text,
                source_id=doc.id,
                source_name=source_title,
            )
        elif doc.doc_type == "website":
            site_text = doc.answer or ""
            source_title = doc.source_url or "Website Knowledge"
            if site_text.strip():
                total_indexed += rag_retriever.index_document_text(
                    business_id,
                    site_text,
                    source_id=doc.id,
                    source_name=source_title,
                )
        elif doc.doc_type == "document":
            file_text = doc.answer or ""
            source_title = doc.filename or "Uploaded Document"
            if file_text.strip():
                total_indexed += rag_retriever.index_document_text(
                    business_id,
                    file_text,
                    source_id=doc.id,
                    source_name=source_title,
                )

    return total_indexed


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


@router.post("", response_model=KnowledgeOut, status_code=status.HTTP_201_CREATED)
def create_knowledge_entry(
    business_id: str,
    payload: KnowledgeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    quotas.enforce_add(db, get_business_or_404(business_id, db), "knowledge_docs")
    _validate_doc_type(payload)
    entry = KnowledgeDocument(
        business_id=business_id,
        status="indexed" if payload.doc_type == "faq" else "pending",
        **payload.model_dump(),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    ensure_business_indexed(business_id, db, force_reload=True)
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
    query = db.query(KnowledgeDocument).filter(KnowledgeDocument.business_id == business_id)
    if doc_type:
        query = query.filter(KnowledgeDocument.doc_type == doc_type)
    return query.order_by(KnowledgeDocument.uploaded_at.asc()).all()


def _get_entry_or_404(business_id: str, entry_id: str, db: Session) -> KnowledgeDocument:
    entry = db.get(KnowledgeDocument, entry_id)
    if not entry or entry.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge entry not found")
    return entry


@router.patch("/{entry_id}", response_model=KnowledgeOut)
def update_knowledge_entry(
    business_id: str,
    entry_id: str,
    payload: KnowledgeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    entry = _get_entry_or_404(business_id, entry_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    ensure_business_indexed(business_id, db, force_reload=True)
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
    db.delete(entry)
    db.commit()
    ensure_business_indexed(business_id, db, force_reload=True)


# -----------------------------------------------------------------------------
# Document Upload (PDF/DOCX/TXT), Website Sync & RAG Query Endpoints
# -----------------------------------------------------------------------------
import io
import json
import re
import urllib.request
from fastapi import File, UploadFile


def _extract_file_text(filename: str, content_bytes: bytes) -> str:
    """Extract clean text from PDF, DOCX, or TXT content bytes."""
    lower_fn = filename.lower()
    if lower_fn.endswith(".pdf"):
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(content_bytes))
            extracted = "\n".join([page.extract_text() or "" for page in reader.pages])
            if extracted.strip():
                return extracted
        except Exception:
            pass
        return content_bytes.decode("utf-8", errors="ignore")
    elif lower_fn.endswith(".docx"):
        try:
            import zipfile
            import xml.etree.ElementTree as ET
            with zipfile.ZipFile(io.BytesIO(content_bytes)) as z:
                xml_content = z.read("word/document.xml")
                tree = ET.fromstring(xml_content)
                return "".join(tree.itertext())
        except Exception:
            pass
        return content_bytes.decode("utf-8", errors="ignore")
    else:
        return content_bytes.decode("utf-8", errors="ignore")


def _extract_rich_html(html: str, url: str) -> str:
    """Extracts semantic structured content from HTML including schema.org JSON-LD, meta tags, and body."""
    sections: list[str] = []

    # 1. Page Title
    title_m = re.findall(r"<title>(.*?)</title>", html, re.IGNORECASE)
    if title_m and title_m[0].strip():
        sections.append(f"Page Title: {title_m[0].strip()}")

    # 2. Meta Description and Keywords
    desc_m = re.findall(r'<meta\s+[^>]*name=["\']description["\'][^>]*content=["\']([^"\']+)["\']', html, re.IGNORECASE)
    if not desc_m:
        desc_m = re.findall(r'<meta\s+[^>]*content=["\']([^"\']+)["\'][^>]*name=["\']description["\']', html, re.IGNORECASE)
    if desc_m and desc_m[0].strip():
        sections.append(f"Clinic Overview: {desc_m[0].strip()}")

    kw_m = re.findall(r'<meta\s+[^>]*name=["\']keywords["\'][^>]*content=["\']([^"\']+)["\']', html, re.IGNORECASE)
    if not kw_m:
        kw_m = re.findall(r'<meta\s+[^>]*content=["\']([^"\']+)["\'][^>]*name=["\']keywords["\']', html, re.IGNORECASE)
    if kw_m and kw_m[0].strip():
        sections.append(f"Treatments, Specialties & Keywords: {kw_m[0].strip()}")

    # 3. Schema.org JSON-LD (FAQs, Medical Procedures, Doctor details, Reviews)
    ld_blocks = re.findall(r'<script\s+[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.DOTALL | re.IGNORECASE)
    for block in ld_blocks:
        try:
            data = json.loads(block.strip())
            items = data if isinstance(data, list) else [data]
            for item in items:
                # FAQs
                if item.get("@type") == "FAQPage" and "mainEntity" in item:
                    faq_lines = ["\nFrequently Asked Questions:"]
                    for q in item["mainEntity"]:
                        q_name = q.get("name", "")
                        a_text = q.get("acceptedAnswer", {}).get("text", "")
                        if q_name and a_text:
                            faq_lines.append(f"Q: {q_name}\nA: {a_text}")
                    if len(faq_lines) > 1:
                        sections.append("\n".join(faq_lines))

                # Medical Procedures / Available Services
                services = item.get("availableService") or []
                if services:
                    proc_lines = ["\nDental Treatments & Medical Procedures:"]
                    for s in services:
                        s_name = s.get("name", "")
                        if s_name:
                            proc_lines.append(f"• {s_name}")
                    if len(proc_lines) > 1:
                        sections.append("\n".join(proc_lines))

                # Doctor Profile
                if item.get("@type") == "Person":
                    p_name = item.get("name", "")
                    job = item.get("jobTitle", "")
                    p_desc = item.get("description", "")
                    if p_name:
                        sections.append(f"\nDoctor Profile: {p_name} ({job})\n{p_desc}")
        except Exception:
            pass

    # 4. Clean Body Text (strip noscript, scripts, styles, boilerplates)
    body = re.sub(r"<noscript.*?>.*?</noscript>", " ", html, flags=re.DOTALL | re.IGNORECASE)
    body = re.sub(r"<script.*?>.*?</script>", " ", body, flags=re.DOTALL | re.IGNORECASE)
    body = re.sub(r"<style.*?>.*?</style>", " ", body, flags=re.DOTALL | re.IGNORECASE)
    body = re.sub(r"<header.*?>.*?</header>", " ", body, flags=re.DOTALL | re.IGNORECASE)
    body = re.sub(r"<footer.*?>.*?</footer>", " ", body, flags=re.DOTALL | re.IGNORECASE)
    body = re.sub(r"<nav.*?>.*?</nav>", " ", body, flags=re.DOTALL | re.IGNORECASE)
    body = re.sub(r"<.*?>", " ", body)
    # Remove boilerplate noise
    body = re.sub(r"You need to enable JavaScript to run this app\.?", " ", body, flags=re.IGNORECASE)
    body = " ".join(body.split())

    if len(body) > 100:
        sections.append(f"\nPage Content:\n{body[:3000]}")

    return "\n\n".join(sections)


def _scrape_url_single(url: str) -> str:
    """Helper to fetch and clean raw HTML text from a single URL."""
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AMSh-AI-Crawler/1.0"}
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
            return _extract_rich_html(html, url)
    except Exception:
        return ""


def _scrape_website_text(url: str) -> str:
    """Scrapes main page, auto-discovers sitemap.xml & crawls core subpages (about/services/pricing/faq)."""
    base_url = url.rstrip("/")
    scraped_texts: list[str] = []

    # 1. Scrape primary URL
    main_text = _scrape_url_single(url)
    if main_text:
        scraped_texts.append(f"--- Main Page ({url}) ---\n{main_text}")

    # 2. Check sitemap.xml for deeper subpage links
    sitemap_url = f"{base_url}/sitemap.xml"
    discovered_urls: list[str] = []
    try:
        req = urllib.request.Request(sitemap_url, headers={"User-Agent": "AMSh-AI-Crawler/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            xml_content = resp.read().decode("utf-8", errors="ignore")
            found_locs = re.findall(r"<loc>(.*?)</loc>", xml_content, flags=re.IGNORECASE)
            for loc in found_locs[:10]:  # Cap at top 10 pages for speed
                if loc != url and loc != f"{base_url}/":
                    discovered_urls.append(loc)
    except Exception:
        pass

    # 3. Fallback: If no sitemap found, try standard core subpages
    if not discovered_urls:
        core_paths = ["/services", "/pricing", "/about", "/about-us", "/faq", "/doctors", "/contact"]
        discovered_urls = [f"{base_url}{path}" for path in core_paths]

    # 4. Crawl discovered subpages (up to 5 pages max)
    crawled_count = 0
    for sub_url in discovered_urls:
        if crawled_count >= 5:
            break
        sub_text = _scrape_url_single(sub_url)
        # Avoid duplicate SPA pages that return the same HTML as main page
        if sub_text and len(sub_text) > 100 and sub_text != main_text:
            scraped_texts.append(f"\n--- Subpage ({sub_url}) ---\n{sub_text}")
            crawled_count += 1

    combined_text = "\n\n".join(scraped_texts)
    return combined_text if combined_text.strip() else f"Website content for {url}. Status: Active."


class SyncUrlPayload(BaseModel):
    source_url: str


class KnowledgeQueryPayload(BaseModel):
    query: str
    top_k: int = 4


@router.post("/upload-file", response_model=KnowledgeOut, status_code=status.HTTP_201_CREATED)
async def upload_knowledge_file(
    business_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload PDF, DOCX, or TXT document, extract text, chunk & index into vector store for RAG."""
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    quotas.enforce_add(db, get_business_or_404(business_id, db), "knowledge_docs")

    content_bytes = await file.read()
    extracted_text = _extract_file_text(file.filename or "document.txt", content_bytes)

    entry = KnowledgeDocument(
        business_id=business_id,
        doc_type="document",
        filename=file.filename or "document.txt",
        status="indexed",
        question=f"Document: {file.filename}",
        answer=extracted_text if extracted_text else "Document uploaded and indexed.",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    # Re-index all business knowledge into RAG vector store
    ensure_business_indexed(business_id, db, force_reload=True)

    return entry


@router.post("/sync-url", response_model=KnowledgeOut, status_code=status.HTTP_201_CREATED)
def sync_knowledge_url(
    business_id: str,
    payload: SyncUrlPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Crawl website URL, clean HTML noise, chunk & index into vector store for RAG."""
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    quotas.enforce_add(db, get_business_or_404(business_id, db), "knowledge_docs")

    scraped_text = _scrape_website_text(payload.source_url)

    entry = KnowledgeDocument(
        business_id=business_id,
        doc_type="website",
        source_url=payload.source_url,
        status="indexed",
        question=f"Website: {payload.source_url}",
        answer=scraped_text if scraped_text else f"Website synced from {payload.source_url}",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    # Re-index all business knowledge into RAG vector store
    ensure_business_indexed(business_id, db, force_reload=True)

    return entry


@router.post("/query")
def query_knowledge_base(
    business_id: str,
    payload: KnowledgeQueryPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sub-50ms RAG search query returning top relevant policy/pricing snippets."""
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)

    ensure_business_indexed(business_id, db, force_reload=False)
    search_meta = rag_retriever.search_with_metadata(business_id, payload.query, top_k=payload.top_k)
    return search_meta


dashboard_router = APIRouter(prefix="/api/businesses/{business_id}/knowledge", tags=["knowledge"])
dashboard_router.add_api_route("", create_knowledge_entry, methods=["POST"], response_model=KnowledgeOut, status_code=status.HTTP_201_CREATED)
dashboard_router.add_api_route("", list_knowledge_entries, methods=["GET"], response_model=list[KnowledgeOut])
dashboard_router.add_api_route("/{entry_id}", update_knowledge_entry, methods=["PATCH"], response_model=KnowledgeOut)
dashboard_router.add_api_route("/{entry_id}", delete_knowledge_entry, methods=["DELETE"], status_code=status.HTTP_204_NO_CONTENT)
dashboard_router.add_api_route("/upload-file", upload_knowledge_file, methods=["POST"], response_model=KnowledgeOut, status_code=status.HTTP_201_CREATED)
dashboard_router.add_api_route("/sync-url", sync_knowledge_url, methods=["POST"], response_model=KnowledgeOut, status_code=status.HTTP_201_CREATED)
dashboard_router.add_api_route("/query", query_knowledge_base, methods=["POST"])



