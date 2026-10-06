"""Onboarding "Integrations" step: frontend/user/app/onboarding/integrations/page.tsx."""

from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
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
    if provider == "whatsapp":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="WhatsApp cannot be connected via generic connect. Use Meta Embedded Signup or platform admin.",
        )
    if provider == "google_calendar":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Calendar can only be connected through Google sign-in.",
        )

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
    # Merge so settings saved later don't wipe credentials from Embedded Signup
    integration.config = {**(integration.config or {}), **secured_config}
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
    if provider == "google_calendar":
        integration.config = {}  # drop stored Google tokens
    db.commit()
    db.refresh(integration)
    return integration


# -----------------------------------------------------------------------------
# Google Calendar OAuth
# -----------------------------------------------------------------------------
from fastapi.responses import RedirectResponse

from backend.server.services import google_calendar

google_router = APIRouter(prefix="/api/integrations/google", tags=["google-calendar"])


@router.get("/google_calendar/auth-url")
def google_calendar_auth_url(business_id: str, ret: str = "onboarding", db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    if not google_calendar.is_configured():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google Calendar is not configured on the server (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).")
    return {"url": google_calendar.build_auth_url(google_calendar.make_state(business_id, current_user.id, ret))}


@router.post("/google_calendar/sync-existing")
def google_calendar_sync_existing(business_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Send already-booked upcoming appointments to Google Calendar (new ones sync on their own)."""
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    return google_calendar.backfill_upcoming(db, business_id)


@google_router.get("/callback")
def google_calendar_callback(
    background: BackgroundTasks, state: str = "", code: str = "", error: str = "", db: Session = Depends(get_db)
):
    """Google redirects the browser here; the signed state ties it to the business that started the flow."""
    data = google_calendar.read_state(state)
    back = {"dashboard": "/integrations"}.get((data or {}).get("ret"), "/onboarding/integrations")
    frontend = get_settings().FRONTEND_URL.rstrip("/") + back
    if not data or error or not code:
        return RedirectResponse(f"{frontend}?google=error")
    business_id = data["bid"]
    try:
        tokens = google_calendar.exchange_code(code)
    except httpx.HTTPError:
        return RedirectResponse(f"{frontend}?google=error")

    integration = (
        db.query(Integration)
        .filter(Integration.business_id == business_id, Integration.provider == "google_calendar")
        .first()
    )
    if not integration:
        integration = Integration(business_id=business_id, provider="google_calendar")
        db.add(integration)
    old = integration.config or {}
    refresh = tokens.get("refresh_token") and CryptoManager.encrypt(tokens["refresh_token"]) or old.get("refresh_token")
    if not refresh:
        return RedirectResponse(f"{frontend}?google=error")
    integration.status = "connected"
    integration.config = {
        "refresh_token": refresh,
        "email": google_calendar.google_email(tokens["access_token"]),
        "calendar": "primary",
    }
    integration.connected_at = datetime.utcnow()
    db.commit()
    background.add_task(google_calendar.backfill_in_background, business_id)  # appointments booked before connecting
    return RedirectResponse(f"{frontend}?google=connected")


# -----------------------------------------------------------------------------
# Tenant Dashboard Integrations Router (/api/businesses/{business_id}/integrations)
# -----------------------------------------------------------------------------
dashboard_router = APIRouter(prefix="/api/businesses/{business_id}/integrations", tags=["dashboard-integrations"])


@dashboard_router.get("", response_model=list[IntegrationOut])
def dashboard_list_integrations(business_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return list_integrations(business_id, db, current_user)


@dashboard_router.post("/{provider}/connect", response_model=IntegrationOut)
def dashboard_connect_integration(
    business_id: str,
    provider: str,
    payload: IntegrationConnect,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return connect_integration(business_id, provider, payload, db, current_user)


@dashboard_router.post("/{provider}/disconnect", response_model=IntegrationOut)
def dashboard_disconnect_integration(
    business_id: str,
    provider: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return disconnect_integration(business_id, provider, db, current_user)


@dashboard_router.post("/google_calendar/sync-existing")
def dashboard_google_calendar_sync_existing(business_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return google_calendar_sync_existing(business_id, db, current_user)


@dashboard_router.get("/google_calendar/auth-url")
def dashboard_google_calendar_auth_url(business_id: str, ret: str = "dashboard", db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return google_calendar_auth_url(business_id, ret, db, current_user)


# -----------------------------------------------------------------------------
# Meta WhatsApp Embedded Signup (Coexistence: keep existing WhatsApp Business App number)
# -----------------------------------------------------------------------------
import secrets

import httpx

from backend.server.auth.crypto import CryptoManager
from backend.server.common.config import get_settings


class WhatsappEmbeddedSignup(BaseModel):
    code: str
    waba_id: str
    phone_number_id: str
    # True when the business kept its WhatsApp Business App number (coexistence);
    # such numbers are already live and must not be re-registered.
    coexistence: bool = False


class WhatsappTestMessage(BaseModel):
    to: str


def _graph_url(path: str) -> str:
    return f"https://graph.facebook.com/{get_settings().META_GRAPH_VERSION}/{path}"


def _graph_error(resp: httpx.Response) -> str:
    try:
        err = resp.json().get("error", {})
        return err.get("error_user_msg") or err.get("message") or resp.text
    except ValueError:
        return resp.text


@router.post("/whatsapp/embedded-signup", response_model=IntegrationOut)
async def whatsapp_embedded_signup(
    business_id: str,
    payload: WhatsappEmbeddedSignup,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)

    # Ensure phone_number_id is not already connected to another business
    conflict = (
        db.query(Integration)
        .filter(
            Integration.provider == "whatsapp",
            Integration.status == "connected",
            Integration.business_id != business_id,
        )
        .all()
    )
    for ext in conflict:
        if str((ext.config or {}).get("phone_number_id")) == str(payload.phone_number_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"WhatsApp phone number ID {payload.phone_number_id} is already connected to another business",
            )

    settings = get_settings()
    if not settings.META_APP_SECRET:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="META_APP_SECRET is not configured on the server")

    async with httpx.AsyncClient(timeout=20) as client:
        # 1. Exchange the short-lived code from FB.login for a business integration token
        resp = await client.get(
            _graph_url("oauth/access_token"),
            params={"client_id": settings.META_APP_ID, "client_secret": settings.META_APP_SECRET, "code": payload.code},
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Meta token exchange failed: {_graph_error(resp)}")
        access_token = resp.json()["access_token"]
        auth = {"Authorization": f"Bearer {access_token}"}

        # 2. Subscribe our app to the WABA so inbound messages hit our webhook
        resp = await client.post(_graph_url(f"{payload.waba_id}/subscribed_apps"), headers=auth)
        if resp.status_code != 200:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Webhook subscription failed: {_graph_error(resp)}")

        # 3. New numbers must be registered on Cloud API before they can send
        pin = None
        if not payload.coexistence:
            pin = f"{secrets.randbelow(10**6):06d}"
            resp = await client.post(
                _graph_url(f"{payload.phone_number_id}/register"),
                headers=auth,
                json={"messaging_product": "whatsapp", "pin": pin},
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Phone number registration failed: {_graph_error(resp)}")

        # 4. Fetch the connected number for display
        resp = await client.get(
            _graph_url(payload.phone_number_id),
            params={"fields": "display_phone_number,verified_name"},
            headers=auth,
        )
        number_info = resp.json() if resp.status_code == 200 else {}

    integration = (
        db.query(Integration)
        .filter(Integration.business_id == business_id, Integration.provider == "whatsapp")
        .first()
    )
    if not integration:
        integration = Integration(business_id=business_id, provider="whatsapp")
        db.add(integration)

    integration.status = "connected"
    integration.config = {
        **(integration.config or {}),
        "mode": "embedded_signup",
        "waba_id": payload.waba_id,
        "phone_number_id": payload.phone_number_id,
        "display_phone_number": number_info.get("display_phone_number"),
        "verified_name": number_info.get("verified_name"),
        "access_token": CryptoManager.encrypt(access_token),
        "coexistence": payload.coexistence,
        **({"two_step_pin": CryptoManager.encrypt(pin)} if pin else {}),
    }
    integration.connected_at = datetime.utcnow()
    db.commit()
    db.refresh(integration)
    return integration


@router.post("/whatsapp/test-message")
async def whatsapp_test_message(
    business_id: str,
    payload: WhatsappTestMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    integration = (
        db.query(Integration)
        .filter(Integration.business_id == business_id, Integration.provider == "whatsapp")
        .first()
    )
    config = (integration.config or {}) if integration else {}
    if not config.get("access_token") or not config.get("phone_number_id"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="WhatsApp is not connected via Meta yet")

    to = "".join(ch for ch in payload.to if ch.isdigit())
    async with httpx.AsyncClient(timeout=20) as client:
        # Free-form text only delivers inside the 24h customer-service window;
        # the recipient must have messaged this number recently.
        resp = await client.post(
            _graph_url(f"{config['phone_number_id']}/messages"),
            headers={"Authorization": f"Bearer {CryptoManager.decrypt(config['access_token'])}"},
            json={
                "messaging_product": "whatsapp",
                "to": to,
                "type": "text",
                "text": {"body": "✅ Test message from Amsh: your WhatsApp is connected!"},
            },
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Meta send failed: {_graph_error(resp)}")
    return {"success": True, "message_id": resp.json().get("messages", [{}])[0].get("id")}


# -----------------------------------------------------------------------------
# Telephony Available Numbers Endpoint (Twilio Live Search + Indian Fallback)
# -----------------------------------------------------------------------------
from fastapi import Query

telephony_router = APIRouter(prefix="/api/telephony", tags=["telephony"])


class AvailableNumberItem(BaseModel):
    number: str
    locality: str
    feature: str
    is_live: bool = False


class AvailableNumbersResponse(BaseModel):
    source: str
    country: str
    area_code: str | None = None
    numbers: list[AvailableNumberItem]


@telephony_router.get("/available-numbers", response_model=AvailableNumbersResponse)
async def get_available_telephony_numbers(
    country: str = Query("US", min_length=2, max_length=10),
    area_code: str | None = Query(None),
    limit: int = Query(3, ge=1, le=20),
):
    """Fetch available phone numbers from Twilio's live inventory if Twilio credentials are configured,
    or provide an intelligent curated available pool for Indian STD codes / development."""
    settings = get_settings()
    c_upper = country.strip().upper()
    if "IN" in c_upper or "+91" in c_upper:
        std = (area_code or "080").strip().lstrip("0")
        code_str = f"0{std}" if std else "080"
        return AvailableNumbersResponse(
            source="exotel_pool",
            country="IN",
            area_code=code_str,
            numbers=[
                AvailableNumberItem(
                    number=f"+91 {code_str} 4728 4627",
                    locality=f"Exotel Direct Indian Line • STD ({code_str})",
                    feature="Exotel HD • Sub-50ms Latency",
                    is_live=False,
                ),
                AvailableNumberItem(
                    number=f"+91 {code_str} 4728 4628",
                    locality=f"Exotel Toll-Free Line • India ({code_str})",
                    feature="Exotel HD • Toll Free Voice",
                    is_live=False,
                ),
                AvailableNumberItem(
                    number=f"+91 {code_str} 4728 4629",
                    locality=f"Exotel Smart Trunk Line • India ({code_str})",
                    feature="Exotel HD • Call Recording",
                    is_live=False,
                ),
            ],
        )

    # For US/Canada/UK/etc., check if Twilio credentials are set
    if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
        iso_country = "CA" if "CA" in c_upper else ("GB" if "GB" in c_upper else "US")
        clean_area = "".join(ch for ch in (area_code or "") if ch.isdigit())
        params: dict = {"PageSize": limit}
        if clean_area:
            params["AreaCode"] = clean_area

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/{iso_country}/Local.json"
                resp = await client.get(url, auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN), params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    items = data.get("available_phone_numbers", [])
                    if items:
                        results = []
                        for it in items[:limit]:
                            num_formatted = it.get("friendly_name") or it.get("phone_number")
                            loc = it.get("locality") or it.get("region") or f"Area Code ({clean_area or 'US'})"
                            results.append(
                                AvailableNumberItem(
                                    number=num_formatted,
                                    locality=f"Twilio US Direct Line • {loc}",
                                    feature="Twilio HD • Live PSTN Line",
                                    is_live=True,
                                )
                            )
                        return AvailableNumbersResponse(
                            source="twilio_live",
                            country=iso_country,
                            area_code=clean_area or None,
                            numbers=results,
                        )
        except Exception as e:
            logger.warning("[TELEPHONY] Twilio live number search failed, falling back to curated pool: %s", e)

    # Fallback pool for US/Intl when credentials are not configured or search returned 0
    clean_area = "".join(ch for ch in (area_code or "656") if ch.isdigit()) or "656"
    return AvailableNumbersResponse(
        source="twilio_preview_pool",
        country="US",
        area_code=clean_area,
        numbers=[
            AvailableNumberItem(
                number=f"+1 ({clean_area}) 254-7488",
                locality=f"Twilio US Direct Line • Area Code ({clean_area})",
                feature="Twilio HD • Ultra Low Latency",
                is_live=False,
            ),
            AvailableNumberItem(
                number=f"+1 ({clean_area}) 254-7489",
                locality=f"Twilio Toll-Free Line • Area Code ({clean_area})",
                feature="Twilio HD • SIP Trunk",
                is_live=False,
            ),
            AvailableNumberItem(
                number=f"+1 ({clean_area}) 254-7490",
                locality=f"Twilio Digital Carrier • Area Code ({clean_area})",
                feature="Twilio HD • Call Recording",
                is_live=False,
            ),
        ],
    )


# -----------------------------------------------------------------------------
# Meta WhatsApp Cloud API Webhook Endpoints
# -----------------------------------------------------------------------------
wa_webhook_router = APIRouter(prefix="/api/v1/whatsapp/webhook", tags=["whatsapp-webhook"])


import logging

from fastapi import BackgroundTasks, Query, Request, Response

logger = logging.getLogger(__name__)

@wa_webhook_router.get("")
def verify_whatsapp_webhook(
    hub_mode: str | None = Query(None, alias="hub.mode"),
    hub_challenge: str | None = Query(None, alias="hub.challenge"),
    hub_verify_token: str | None = Query(None, alias="hub.verify_token"),
):
    """Meta Webhook Challenge Verification (GET). Accepts hub.mode, hub.challenge, hub.verify_token."""
    from backend.server.common.config import get_settings
    settings = get_settings()
    valid_tokens = {settings.META_WHATSAPP_VERIFY_TOKEN}
    if settings.ALLOW_DEV_FALLBACKS:  # older tokens that used to be hard-coded here; off in production
        valid_tokens |= {"amsh_whatsapp_secret_token_2026", "amsh_wa_verify_token_2026"}
    if hub_mode == "subscribe" and hub_verify_token in valid_tokens:
        return Response(content=hub_challenge or "", media_type="text/plain")
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid verify token")


@wa_webhook_router.post("")
async def receive_whatsapp_webhook(request: Request, background: BackgroundTasks):
    """Inbound Meta WhatsApp message & status callback (POST). Verifies Meta's signature, then answers each text message
    with the AI receptionist in a background task (Meta needs a fast 200 or it retries)."""
    import json

    from backend.server.services.whatsapp_agent import extract_messages, verify_signature, whatsapp_agent

    raw = await request.body()
    secret = get_settings().META_APP_SECRET
    if not secret:
        if not get_settings().ALLOW_DEV_FALLBACKS:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="WhatsApp webhook verification is not configured")
        logger.warning("[WHATSAPP] META_APP_SECRET is not set: webhook signatures are NOT being verified (development only)")
    if not verify_signature(raw, request.headers.get("X-Hub-Signature-256"), secret):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid signature")
    try:
        payload = json.loads(raw or b"{}")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON")
    messages = extract_messages(payload)
    for msg in messages:
        background.add_task(whatsapp_agent.handle, msg)
    return {"status": "success", "received": len(messages)}

