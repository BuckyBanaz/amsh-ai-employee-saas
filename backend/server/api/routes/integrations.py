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

    # Encrypt sensitive tokens/credentials inside config before saving to DB
    from backend.server.auth.crypto import CryptoManager
    secured_config = dict(payload.config)
    for sensitive_key in ["access_token", "token", "secret", "session_key", "meta_token"]:
        if sensitive_key in secured_config and isinstance(secured_config[sensitive_key], str):
            secured_config[sensitive_key] = CryptoManager.encrypt(secured_config[sensitive_key])

    integration.status = "connected"
    integration.config = secured_config
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


# -----------------------------------------------------------------------------
# Meta WhatsApp Cloud API Webhook Endpoints
# -----------------------------------------------------------------------------
wa_webhook_router = APIRouter(prefix="/api/v1/whatsapp/webhook", tags=["whatsapp-webhook"])


@wa_webhook_router.get("")
def verify_whatsapp_webhook(
    hub_mode: str | None = None,
    hub_challenge: str | None = None,
    hub_verify_token: str | None = None,
):
    """Meta Webhook Challenge Verification (GET)."""
    expected_verify_token = "amsh_wa_verify_token_2026"
    if hub_mode == "subscribe" and hub_verify_token == expected_verify_token:
        return int(hub_challenge) if hub_challenge and hub_challenge.isdigit() else hub_challenge
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid verify token")


@wa_webhook_router.post("")
async def receive_whatsapp_webhook(payload: dict):
    """Inbound Meta WhatsApp Message & Status Callback (POST)."""
    # Log incoming WhatsApp event
    entries = payload.get("entry", [])
    for entry in entries:
        changes = entry.get("changes", [])
        for change in changes:
            value = change.get("value", {})
            messages = value.get("messages", [])
            for msg in messages:
                sender = msg.get("from")
                text_body = msg.get("text", {}).get("body", "")
                print(f"[Meta WhatsApp Inbound] From: {sender} | Msg: {text_body}")

    return {"status": "success", "received": True}

