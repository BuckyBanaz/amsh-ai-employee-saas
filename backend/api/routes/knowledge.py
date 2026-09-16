"""Onboarding "Knowledge" step: frontend/user/app/onboarding/knowledge/page.tsx
(three sections — uploaded documents, synced websites, manual FAQs — all
stored as KnowledgeDocument rows distinguished by doc_type)."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.api.routes._shared import get_business_or_404, require_membership, require_owner_or_admin
from backend.auth.security import get_current_user
from backend.database.models.knowledge_base import KnowledgeDocument
from backend.database.models.user import User
from backend.database.session import get_db

router = APIRouter(prefix="/api/businesses/{business_id}/knowledge", tags=["knowledge"])

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
    _validate_doc_type(payload)
    # FAQs are entered directly and don't need indexing; uploads/website
    # syncs start "pending" until a worker (not built yet) processes them.
    entry = KnowledgeDocument(
        business_id=business_id,
        status="indexed" if payload.doc_type == "faq" else "pending",
        **payload.model_dump(),
    )
    db.add(entry)
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
