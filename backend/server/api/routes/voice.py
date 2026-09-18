"""
Voice Telephony Webhooks.
Handles Twilio's inbound call TwiML, status callbacks, and the Flaw 4
Zero-Dropped-Calls 20-second transfer fallback, per DOCS/11.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Form, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.ai.realtime.twilio.call_control import build_base_url, to_ws_url
from backend.ai.tools.common.send_sms import SendSmsTool
from backend.ai.tools.framework.base import ToolContext
from backend.server.database.models.business import Business
from backend.server.database.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice", tags=["Voice Telephony"])


@router.post("/incoming")
async def handle_incoming_call(
    To: str = Form(...),
    From: str = Form(...),
    CallSid: str = Form(...),
    ForwardedFrom: Optional[str] = Form(None),
    db: Session = Depends(get_db),
) -> Response:
    """Twilio VoiceUrl webhook.
    Path A (dedicated AI line): tenant's Twilio DID == `To`.
    Path B (carrier call forwarding, *72): tenant's published line arrives as
    `ForwardedFrom`, `To` is our shared background trunk number.
    """
    lookup_number = ForwardedFrom or To
    business = (
        db.execute(select(Business).where(Business.business_phone == lookup_number))
        .scalars()
        .first()
    )

    if not business:
        logger.warning(f"[VOICE INCOMING] No business found for number {lookup_number} (call {CallSid})")
        twiml = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            "<Response><Say>Sorry, this number is not currently configured. Goodbye.</Say><Hangup/></Response>"
        )
        return Response(content=twiml, media_type="application/xml")

    stream_url = f"{to_ws_url(build_base_url())}/media-stream/{business.id}"
    twiml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        "<Connect>"
        f'<Stream url="{stream_url}">'
        f'<Parameter name="caller_number" value="{From}"/>'
        "</Stream>"
        "</Connect>"
        "</Response>"
    )
    logger.info(f"[VOICE INCOMING] Call {CallSid} from {From} -> business {business.id}")
    return Response(content=twiml, media_type="application/xml")


@router.post("/status")
async def handle_status_callback(
    CallSid: str = Form(...),
    CallStatus: str = Form(...),
) -> Response:
    """Twilio StatusCallback — call lifecycle events (ringing/answered/completed)."""
    logger.info(f"[VOICE STATUS] {CallSid}: {CallStatus}")
    return Response(content="", media_type="application/xml")


@router.post("/transfer-status")
async def handle_transfer_status(
    DialCallStatus: str = Form(...),
    From: str = Form(...),
    CallSid: str = Form(...),
    staff_name: str = Query("Staff"),
    staff_phone: Optional[str] = Query(None),
    department: str = Query("front_desk"),
    db: Session = Depends(get_db),
) -> Response:
    """Called by Twilio when the <Dial> started by transfer_call completes or
    times out after 20s. DialCallStatus: 'completed' | 'busy' | 'no-answer' |
    'failed' | 'canceled'. Implements DOCS/11 §3's zero-dropped-calls fallback."""
    if DialCallStatus == "completed":
        return Response(content="<Response></Response>", media_type="application/xml")

    fallback_twiml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        f'<Say voice="Polly.Joanna">{staff_name} is currently unavailable. I have marked this as '
        "high priority, and someone will call you back at this number shortly.</Say>"
        "<Hangup/>"
        "</Response>"
    )

    if staff_phone:
        sms_tool = SendSmsTool()
        await sms_tool.execute(
            ToolContext(business_id="", caller_number=From, call_id=CallSid, db=db),
            to_phone=staff_phone,
            message_body=(
                f"[AMSH P0 ALERT] Urgent callback needed for {From}. "
                f"Transfer to {department} went unanswered ({DialCallStatus})."
            ),
        )
    else:
        logger.warning(f"[VOICE TRANSFER] No staff_phone to alert for call {CallSid}")

    # NOTE: no call_logs/tickets table yet to persist a PENDING_CALLBACK record —
    # tracked as a gap against DOCS/11 §3 until backend/server ships call logs (DOCS/10 §1.4).
    logger.warning(f"[VOICE TRANSFER] Fallback triggered for {CallSid}: {DialCallStatus}")
    return Response(content=fallback_twiml, media_type="application/xml")
