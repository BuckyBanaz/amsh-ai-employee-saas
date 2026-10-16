"""
Plivo Voice Telephony Webhooks.
Handles incoming calls on Plivo numbers (India +91 and global) and answers them with a
bidirectional <Stream> that bridges audio into the unified Amsh AI Receptionist conversation engine.
"""

import logging
from typing import Optional
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, Form, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.ai.realtime.twilio.call_control import build_base_url, to_ws_url
from backend.server.auth.webhook_signatures import business_route_ok, create_stream_token, verify_plivo
from backend.server.services.number_routing import resolve_business
from backend.server.common.config import get_settings
from backend.server.database.models.business import Business
from backend.server.database.session import get_db
from backend.server.services import quotas

from backend.server.services.call_recorder import update_call_recording_webhook

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice/plivo", tags=["Plivo Telephony"])


def _xml(body: str) -> Response:
    return Response(content=f'<?xml version="1.0" encoding="UTF-8"?><Response>{body}</Response>', media_type="application/xml")


@router.api_route("/incoming", methods=["GET", "POST"], dependencies=[Depends(verify_plivo)])
async def handle_plivo_incoming_call(
    request: Request,
    CallUUID: Optional[str] = Form(None),
    From: Optional[str] = Form(None),
    To: Optional[str] = Form(None),
    Direction: Optional[str] = Form(None),
    db: Session = Depends(get_db),
) -> Response:
    """
    Plivo Answer URL. Receives the call details, resolves the tenant Business,
    and answers with a <Stream> that opens our media WebSocket.
    """
    # Plivo sends params as query (GET) or form body (POST)
    query_params = request.query_params
    call_uuid = CallUUID or query_params.get("CallUUID") or "PLIVO_UNKNOWN"
    caller_from = From or query_params.get("From") or ""
    dialed_to = To or query_params.get("To") or ""

    logger.info(f"[PLIVO INCOMING] Call {call_uuid} from {caller_from} to {dialed_to}")

    # 1. Resolve business — priority order:
    #    a) business_id query param (set by outbound call-me)
    #    b) dialed number match
    #    c) latest registered business (dev fallback only)
    business, how = None, "no match"
    business_id_param = query_params.get("business_id")
    if business_id_param:
        if business_route_ok(business_id_param, query_params.get("bsig")):  # only a URL we signed ("call me")
            business = db.get(Business, business_id_param)
            how = "signed business_id"
        else:
            logger.warning("[PLIVO INCOMING] ignoring an unsigned business_id on call %s", call_uuid)

    if not business:  # only numbers the platform assigned (phone_numbers); an ambiguous match is refused, never guessed
        business, how = resolve_business(db, dialed_to)
    logger.info("[PLIVO INCOMING] call %s routing: %s", call_uuid, how)

    if not business and how == "no match" and get_settings().ALLOW_DEV_FALLBACKS:
        logger.warning("[PLIVO INCOMING] No tenant matched: using the newest business (ALLOW_DEV_FALLBACKS)")
        business = db.execute(
            select(Business)
            .where(Business.status == "active")
            .order_by(Business.created_at.desc())
        ).scalars().first()
        if not business:
            business = db.execute(select(Business).order_by(Business.created_at.desc())).scalars().first()

    if not business:
        logger.warning(f"[PLIVO INCOMING] No business found for call {call_uuid}")
        return _xml("<Speak>No business configured.</Speak><Hangup/>")

    if business.status == "suspended":  # set by a platform admin: no AI answers for this clinic
        logger.info("[INCOMING] Business %s is suspended: refusing the call", business.id)
        return _xml("<Speak>This service is temporarily unavailable. Goodbye.</Speak><Hangup/>")

    if not quotas.voice_allowed(db, business, get_settings().ENFORCE_VOICE_QUOTA):
        logger.info("[PLIVO INCOMING] business %s used its plan's voice minutes: not answering call %s", business.id, call_uuid)
        return _xml("<Speak>Sorry, we cannot take your call right now. Please try again later.</Speak><Hangup/>")

    # 2. Bridge the call to our media WebSocket. The signed token travels in extraHeaders, which Plivo echoes in the start event
    #    (Plivo does not carry the WSS URL's query string into the stream).
    stream_url = f"{to_ws_url(build_base_url())}/media-stream/{business.id}"
    extra_headers = f"token={create_stream_token(business.id)}"
    logger.info(f"[PLIVO INCOMING] Bridging call {call_uuid} to business {business.id} ({business.name}) -> {stream_url}")

    return _xml(
        '<Stream bidirectional="true" keepCallAlive="true" contentType="audio/x-mulaw;rate=8000" '
        f'extraHeaders="{escape(extra_headers, {chr(34): "&quot;"})}">{escape(stream_url)}</Stream>'
    )


@router.api_route("/status", methods=["GET", "POST"], dependencies=[Depends(verify_plivo)])
async def handle_plivo_status_callback(
    request: Request,
    CallUUID: Optional[str] = Form(None),
    CallStatus: Optional[str] = Form(None),
    RecordUrl: Optional[str] = Form(None),
    Duration: Optional[str] = Form(None),
    RecordingDuration: Optional[str] = Form(None),
) -> Response:
    """Plivo hangup / recording callback with the recording URL and duration."""
    query_params = request.query_params
    sid = CallUUID or query_params.get("CallUUID") or ""
    status = CallStatus or query_params.get("CallStatus") or "completed"
    recording_url = RecordUrl or query_params.get("RecordUrl")

    dur_str = Duration or RecordingDuration or query_params.get("Duration") or query_params.get("RecordingDuration")
    duration_secs = None
    if dur_str:
        try:
            duration_secs = int(float(dur_str))
        except (ValueError, TypeError):
            pass

    logger.info(f"[PLIVO STATUS] Call {sid}: {status} | recording: {recording_url} | duration: {duration_secs}s")

    if sid:
        update_call_recording_webhook(
            call_id=sid,
            recording_url=recording_url,
            duration_seconds=duration_secs,
            status=status,
        )

    return Response(content="OK", media_type="text/plain")
