"""Onboarding "Integrations" step: frontend/user/app/onboarding/integrations/page.tsx."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.server.api.routes._shared import get_business_or_404, require_membership, require_owner_or_admin
from backend.server.auth.security import get_current_user
from backend.server.database.models.integration import Integration
from backend.server.database.models.user import User
from backend.server.database.session import get_db

router = APIRouter(prefix="/api/onboarding/businesses/{business_id}/integrations", tags=["integrations"])


class IntegrationConnect(BaseModel):
    provider: str  # google_calendar | outlook | google_meet | twilio | whatsapp | stripe | ...
    config: dict = {}


class IntegrationOut(BaseModel):
    id: str
    business_id: str
    provider: str
    status: str
    config: dict
    connected_at: datetime | None

    model_config = {"from_attributes": True}


@router.get("", response_model=list[IntegrationOut])
def list_integrations(business_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    return db.query(Integration).filter(Integration.business_id == business_id).all()


@router.post("/{provider}/connect", response_model=IntegrationOut)
def connect_integration(
    business_id: str,
    provider: str,
    payload: IntegrationConnect,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    if payload.provider != provider:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="provider in path and body must match")

    integration = (
        db.query(Integration)
        .filter(Integration.business_id == business_id, Integration.provider == provider)
        .first()
    )
    if not integration:
        integration = Integration(business_id=business_id, provider=provider)
        db.add(integration)

    integration.status = "connected"
    integration.config = payload.config
    integration.connected_at = datetime.utcnow()
    db.commit()
    db.refresh(integration)
    return integration


@router.post("/{provider}/disconnect", response_model=IntegrationOut)
def disconnect_integration(
    business_id: str,
    provider: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    integration = (
        db.query(Integration)
        .filter(Integration.business_id == business_id, Integration.provider == provider)
        .first()
    )
    if not integration:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Integration not found")
    integration.status = "disconnected"
    integration.connected_at = None
    db.commit()
    db.refresh(integration)
    return integration
