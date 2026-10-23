"""
Plivo Voice Telephony Webhooks.
Handles incoming calls on Plivo numbers (India +91 and global) and answers them with a
bidirectional <Stream> that bridges audio into the unified Amsh AI Receptionist conversation engine.
"""

import logging
from typing import Optional
from urllib.parse import urlencode
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, Form, Query, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.ai.realtime.twilio.call_control import build_base_url, to_ws_url
from backend.server.cache.redis import get_redis_client
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
    # The patient's number, so the agent can offer "shall I use the number you're calling from?" (Twilio passes it as a
    # <Parameter>). Outbound "call me": Plivo calls the patient, so they are To; inbound: they are From. It goes through
    # Redis keyed by CallUUID, not extraHeaders: a second header pair made Plivo drop all of them, token included.
    direction = (Direction or query_params.get("Direction") or "").lower()
    patient = "".join(ch for ch in (dialed_to if direction == "outbound" else caller_from) if ch.isdigit())
    if patient and call_uuid != "PLIVO_UNKNOWN":
        try:
            get_redis_client().set(f"plivo:caller:{call_uuid}", patient, ex=600)
        except Exception as e:  # the call still works, the agent just asks for the number
            logger.warning("[PLIVO INCOMING] could not store the caller number for %s: %s", call_uuid, e)
    extra_headers = f"token={create_stream_token(business.id)}"
    logger.info(f"[PLIVO INCOMING] Bridging call {call_uuid} to business {business.id} ({business.name}) -> {stream_url}")

    return _xml(
        '<Stream bidirectional="true" keepCallAlive="true" contentType="audio/x-mulaw;rate=8000" '
        f'extraHeaders="{escape(extra_headers, {chr(34): "&quot;"})}">{escape(stream_url)}</Stream>'
    )


@router.api_route("/transfer", methods=["GET", "POST"], dependencies=[Depends(verify_plivo)])
async def handle_plivo_transfer(
    request: Request,
    staff_phone: str = Query(...),
    staff_name: str = Query("Staff"),
    department: str = Query("front_desk"),
    lang: str = Query("en"),
    From: Optional[str] = Form(None),
    To: Optional[str] = Form(None),
    Direction: Optional[str] = Form(None),
) -> Response:
    """Plivo fetches this after the gateway transferred the live call (plivo_client.transfer_call): ring the staff member.
    Caller ID is the clinic's own Plivo line (To on an inbound call, From on an outbound "call me"); the AI already told the
    caller they are being connected, so nothing is spoken here."""
    qp = request.query_params
    direction = (Direction or qp.get("Direction") or "").lower()
    clinic_line = "".join(ch for ch in ((From or qp.get("From")) if direction == "outbound" else (To or qp.get("To"))) or "" if ch.isdigit())
    staff_digits = "".join(ch for ch in staff_phone if ch.isdigit())
    if not staff_digits:
        return _xml("<Hangup/>")
    status_url = f"{build_base_url()}/api/voice/plivo/transfer-status?" + urlencode(
        {"staff_phone": staff_phone, "staff_name": staff_name, "department": department, "lang": lang}
    )
    caller_id = f' callerId="{clinic_line}"' if clinic_line else ""
    logger.info("[PLIVO TRANSFER] dialing %s (%s) for %s", staff_digits, department, From or qp.get("From"))
    return _xml(
        f'<Dial action="{escape(status_url)}" method="POST" timeout="20"{caller_id}><Number>{staff_digits}</Number></Dial>'
    )


@router.api_route("/transfer-status", methods=["GET", "POST"], dependencies=[Depends(verify_plivo)])
async def handle_plivo_transfer_status(
    request: Request,
    staff_phone: Optional[str] = Query(None),
    staff_name: str = Query("Staff"),
    department: str = Query("front_desk"),
    lang: str = Query("en"),
    DialStatus: Optional[str] = Form(None),
    From: Optional[str] = Form(None),
    CallUUID: Optional[str] = Form(None),
    db: Session = Depends(get_db),
) -> Response:
    """Plivo's <Dial action>: the staff call ended. Answered -> nothing more. Busy / no answer / failed -> the caller hears that
    someone will call back, the staff member gets an SMS, and the call ends (same zero-dropped-calls rule as Twilio's)."""
    form = {k: str(v) for k, v in (await request.form()).items()} if request.method == "POST" else {}
    status = (DialStatus or request.query_params.get("DialStatus") or "").lower()
    logger.info("[PLIVO TRANSFER] dial ended: status=%r params=%s", status, sorted(form))
    if status in ("", "completed", "answer", "answered"):  # unknown is treated as answered: never tell a served caller nobody came
        return _xml("")
    from backend.ai.engine.agent.hindi import language_pack
    from backend.server.api.routes.voice import alert_missed_transfer

    code = (lang or "en").split("-")[0].lower()
    line = (language_pack(code).get("strings") or {}).get("transfer_unanswered") or language_pack("en")["strings"]["transfer_unanswered"]
    caller = From or request.query_params.get("From") or ""
    await alert_missed_transfer(db, staff_phone, caller, CallUUID or "", department, status)
    # Plivo <Speak> voice per pack language. Hindi lines are written in Roman script, read best by the Indian English voice.
    voice_lang = {"hi": "en-IN", "es": "es-ES", "fr": "fr-FR", "de": "de-DE", "nl": "nl-NL", "ar": "arb"}.get(code, "en-US")
    return _xml(f'<Speak voice="WOMAN" language="{voice_lang}">{escape(line)}</Speak><Hangup/>')


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
