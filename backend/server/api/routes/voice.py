"""
Voice Telephony Webhooks.
Handles Twilio's inbound call TwiML, status callbacks, and the Flaw 4
Zero-Dropped-Calls 20-second transfer fallback, per DOCS/11.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.ai.realtime.twilio.call_control import build_base_url, to_ws_url
from backend.ai.tools.common.send_sms import SendSmsTool
from backend.ai.tools.framework.base import ToolContext
from backend.server.common.config import get_settings
from backend.server.database.models.business import Business
from backend.server.database.session import get_db
from backend.ai.speech.tts.cartesia import cartesia_tts
from backend.ai.speech.tts.voice_profile import detect_tts_language

from backend.server.services.call_recorder import update_call_recording_webhook

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice", tags=["Voice Telephony"])


from pydantic import BaseModel
from backend.ai.realtime.exotel.client import exotel_client


class CallMeRequest(BaseModel):
    phone_number: str
    business_id: Optional[str] = None


@router.get("/voices")
async def list_voices():
    """Fetch available TTS voices from Cartesia."""
    voices = await cartesia_tts.get_voices()
    return {"voices": voices}


@router.get("/llm-models")
async def list_llm_models(refresh: bool = False):
    """Chat models available right now from Groq and Gemini (fetched live from their APIs, cached for a few minutes), for
    the dashboard's model picker. Each row: value ("groq:<id>" / "gemini:<id>", what the agent config stores), label,
    context window, whether it is in the current fallback chain and where, and tool-calling status ('no' once a model
    has refused tools, otherwise 'unknown': providers publish no reliable flag)."""
    from backend.ai.engine.agent.llm_backend import parse_provider_spec, tool_calling_status
    from backend.ai.llm.catalog import fetch_catalog
    from backend.ai.llm.client import llm_client
    from backend.server.common.config import get_settings

    settings = get_settings()
    data = await fetch_catalog(llm_client.api_key, settings.GEMINI_API_KEY, force=refresh)
    chain = []
    for entry in parse_provider_spec(settings.LLM_PROVIDERS):
        model = entry["model"] or (llm_client.model if entry["kind"] == "groq" else settings.GEMINI_MODEL)
        value = f"{entry['kind']}:{model}"
        if value not in chain:
            chain.append(value)
    rows = []
    for m in data["models"]:
        value = f"{m['provider']}:{m['id']}"
        position = chain.index(value) + 1 if value in chain else None
        rows.append({**m, "value": value, "in_chain": position is not None, "chain_position": position,
                     "tool_calling": tool_calling_status(m["provider"], m["id"])})
    rows.sort(key=lambda r: (r["chain_position"] is None, r["chain_position"] or 0, r["provider"], r["id"]))
    return {"models": rows, "default": chain[0] if chain else None, "chain": chain, "errors": data["errors"]}


@router.get("/preview")
async def preview_voice(
    voice_id: str = Query(...),
    text: str = Query(...),
    speed: Optional[float] = Query(None, ge=0.6, le=1.5),
    emotion: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
):
    """Generate and return MP3 audio preview for a voice and text (optional speed multiplier / emotion / language).
    The dashboard already sends `language`; it used to be dropped here. Without it the language is detected from the text."""
    lang = (language or "").strip().lower()[:2] or detect_tts_language(text)
    audio_bytes = await cartesia_tts.generate_preview_audio(text, voice_id, speed=speed, emotion=emotion, language=lang)
    if not audio_bytes:
        status_code, message = cartesia_tts.last_error or (500, "")
        if status_code == 402:  # tell the dashboard the truth instead of a generic 500
            return Response(status_code=402, content="Text-to-speech credits are exhausted. Top up the Cartesia account.")
        return Response(status_code=500, content=f"Failed to generate audio {message[:120]}".strip())
    return Response(content=audio_bytes, media_type="audio/mpeg")


@router.post("/transcribe")
async def transcribe_audio_file(
    file: UploadFile = File(...),
):
    """Transcribe browser microphone audio payload using Deepgram Nova-2."""
    from backend.ai.speech.stt.deepgram import deepgram_stt
    content = await file.read()
    mimetype = file.content_type or "audio/webm"
    text = await deepgram_stt.transcribe_audio(content, mimetype=mimetype)
    return {"transcript": text or ""}


@router.post("/call-me")
async def trigger_test_call(payload: CallMeRequest, db: Session = Depends(get_db)):
    """Triggers a real phone call to the user's phone via Exotel."""
    phone = payload.phone_number.strip().replace(" ", "")
    logger.info(f"[VOICE CALL-ME] User requested outbound test call to {phone}")

    # Resolve business_id – use payload value or fall back to latest active business
    business_id = payload.business_id
    if not business_id:
        biz = db.execute(
            select(Business)
            .where(Business.status == "active")
            .order_by(Business.created_at.desc())
        ).scalars().first()
        if biz:
            business_id = biz.id

    if exotel_client.is_configured():
        try:
            # Embed business_id in the callback URL so the Exotel incoming webhook
            # always routes to the correct tenant regardless of which Exotel DID
            # the call lands on.
            base_url = build_base_url()
            callback_url = f"{base_url}/api/voice/exotel/incoming"
            if business_id:
                callback_url = f"{callback_url}?business_id={business_id}"

            res = await exotel_client.create_outbound_call(phone, callback_url=callback_url)
            if "error" in res:
                return {
                    "success": False,
                    "provider": "exotel",
                    "message": f"Exotel error: {res.get('error')}",
                }
            call_sid = res.get("Call", {}).get("Sid") or "exotel_call"
            return {
                "success": True,
                "provider": "exotel",
                "call_sid": call_sid,
                "from_number": exotel_client.caller_id,
                "message": f"Calling your phone {phone} from {exotel_client.caller_id}. Please pick up!",
            }
        except Exception as e:
            logger.error(f"[VOICE CALL-ME] Failed to place call: {e}")
            return {"success": False, "message": str(e)}

    return {
        "success": False,
        "message": "Telephony provider not configured. Please test in browser using the chat simulation.",
    }


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

    if not business and get_settings().ALLOW_DEV_FALLBACKS:
        logger.warning("[VOICE INCOMING] No tenant matched: using the newest business (ALLOW_DEV_FALLBACKS)")
        # Fallback to latest business for development and trial numbers
        business = db.execute(select(Business).order_by(Business.created_at.desc())).scalars().first()

    if not business:
        logger.warning(f"[VOICE INCOMING] No businesses found in database (call {CallSid})")
        twiml = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            "<Response><Say>Sorry, no business is currently configured on this system. Goodbye.</Say><Hangup/></Response>"
        )
        return Response(content=twiml, media_type="application/xml")

    if business.status == "suspended":  # set by a platform admin: no AI answers for this clinic
        logger.info("[%s] Business %s is suspended: refusing the call", "INCOMING", business.id)
        return Response(
            content='<?xml version="1.0" encoding="UTF-8"?><Response><Say>This service is temporarily unavailable. Goodbye.</Say><Hangup/></Response>',
            media_type="application/xml",
        )

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
    CallDuration: Optional[str] = Form(None),
    RecordingUrl: Optional[str] = Form(None),
) -> Response:
    """Twilio StatusCallback — call lifecycle events (ringing/answered/completed)."""
    duration_secs = None
    if CallDuration:
        try:
            duration_secs = int(float(CallDuration))
        except (ValueError, TypeError):
            pass

    logger.info(f"[VOICE STATUS] {CallSid}: {CallStatus} | recording: {RecordingUrl} | duration: {duration_secs}s")
    update_call_recording_webhook(
        call_id=CallSid,
        recording_url=RecordingUrl,
        duration_seconds=duration_secs,
        status=CallStatus,
    )
    return Response(content="", media_type="application/xml")


@router.post("/recording-status")
async def handle_recording_callback(
    CallSid: str = Form(...),
    RecordingUrl: Optional[str] = Form(None),
    RecordingDuration: Optional[str] = Form(None),
    RecordingStatus: Optional[str] = Form(None),
) -> Response:
    """Twilio Recording Status Callback — fires when audio recording is ready."""
    duration_secs = None
    if RecordingDuration:
        try:
            duration_secs = int(float(RecordingDuration))
        except (ValueError, TypeError):
            pass

    logger.info(f"[VOICE RECORDING] Call {CallSid}: ready at {RecordingUrl} ({duration_secs}s)")
    update_call_recording_webhook(
        call_id=CallSid,
        recording_url=RecordingUrl,
        duration_seconds=duration_secs,
        status=RecordingStatus,
    )
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
