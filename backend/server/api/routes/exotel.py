"""
Exotel Voice Telephony Webhooks.
Handles incoming calls from Exotel ExoPhones (+91 Indian numbers) and bridges them
into the unified Amsh AI Receptionist conversation engine.
"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, Form, Query, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.ai.realtime.twilio.call_control import build_base_url, to_ws_url
from backend.ai.tools.framework.base import ToolContext
from backend.server.database.models.business import Business
from backend.server.database.session import get_db

from backend.server.services.call_recorder import update_call_recording_webhook

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice/exotel", tags=["Exotel Telephony"])


@router.api_route("/incoming", methods=["GET", "POST"])
async def handle_exotel_incoming_call(
    request: Request,
    CallSid: Optional[str] = Form(None),
    From: Optional[str] = Form(None),
    To: Optional[str] = Form(None),
    CallType: Optional[str] = Form(None),
    Direction: Optional[str] = Form(None),
    db: Session = Depends(get_db),
) -> Response:
    """
    Exotel Inbound Webhook (Passthru Applet).
    Receives incoming caller details from Exotel, resolves the tenant Business,
    and returns instructions / audio stream bridge.
    """
    # Exotel can pass data via query params (GET) or form body (POST)
    query_params = request.query_params
    call_sid = CallSid or query_params.get("CallSid") or "EXO_UNKNOWN"
    caller_from = From or query_params.get("From") or ""
    dialed_to = To or query_params.get("To") or ""

    logger.info(f"[EXOTEL INCOMING] Call {call_sid} from {caller_from} to {dialed_to}")

    # 1. Resolve business — priority order:
    #    a) business_id query param (set by outbound call-me)
    #    b) dialed number match
    #    c) latest registered business (fallback for direct Exotel applet calls)
    business = None
    business_id_param = query_params.get("business_id")
    if business_id_param:
        business = db.execute(select(Business).where(Business.id == business_id_param)).scalars().first()
        if business:
            logger.info(f"[EXOTEL INCOMING] Tenant resolved from business_id param: {business.id} ({business.name})")

    if not business and dialed_to:
        business = (
            db.execute(select(Business).where(Business.business_phone.contains(dialed_to[-10:])))
            .scalars()
            .first()
        )

    if not business:
        # Fallback to latest registered business
        business = db.execute(select(Business).order_by(Business.created_at.desc())).scalars().first()

    if not business:
        logger.warning(f"[EXOTEL INCOMING] No business found for call {call_sid}")
        return Response(content="<Response><Say>No business configured.</Say><Hangup/></Response>", media_type="application/xml")

    # 2. Build websocket stream URL
    base_url = build_base_url()
    stream_url = f"{to_ws_url(base_url)}/media-stream/{business.id}?codec=pcm"
    
    logger.info(f"[EXOTEL INCOMING] Bridging call {call_sid} to business {business.id} ({business.name}) -> stream_url: {stream_url}")

    # Return JSON with websocket endpoints for Exotel Voicebot Applet
    return {
        "websocket_url": stream_url,
        "endpoint": stream_url,
        "stream_url": stream_url,
        "url": stream_url,
        "status": "success",
        "business_id": business.id,
        "business_name": business.name,
    }


@router.api_route("/status", methods=["GET", "POST"])
async def handle_exotel_status_callback(
    request: Request,
    CallSid: Optional[str] = Form(None),
    Status: Optional[str] = Form(None),
    RecordingUrl: Optional[str] = Form(None),
    Duration: Optional[str] = Form(None),
    ConversationDuration: Optional[str] = Form(None),
) -> Response:
    """Exotel Call Status Callback with audio recording URL and duration."""
    query_params = request.query_params
    sid = CallSid or query_params.get("CallSid") or ""
    status = Status or query_params.get("Status") or query_params.get("CallType") or "completed"
    recording_url = RecordingUrl or query_params.get("RecordingUrl") or query_params.get("recording_url")
    
    dur_str = Duration or ConversationDuration or query_params.get("Duration") or query_params.get("ConversationDuration")
    duration_secs = None
    if dur_str:
        try:
            duration_secs = int(float(dur_str))
        except (ValueError, TypeError):
            pass

    logger.info(f"[EXOTEL STATUS] Call {sid}: {status} | recording: {recording_url} | duration: {duration_secs}s")
    
    if sid:
        update_call_recording_webhook(
            call_id=sid,
            recording_url=recording_url,
            duration_seconds=duration_secs,
            status=status,
        )

    return Response(content="OK", media_type="text/plain")
