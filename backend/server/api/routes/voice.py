"""
Voice Telephony Webhooks.
Handles Twilio's inbound call TwiML, status callbacks, and the Flaw 4
Zero-Dropped-Calls 20-second transfer fallback, per DOCS/11.
"""

import logging
import re
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

import httpx

from backend.ai.realtime.twilio.call_control import build_base_url, to_ws_url
from backend.ai.tools.common.send_sms import SendSmsTool
from backend.ai.tools.framework.base import ToolContext
from backend.server.auth.security import create_media_token, get_voice_user
from backend.server.auth.webhook_signatures import create_stream_token, sign_business_route, verify_twilio
from backend.server.services.number_routing import resolve_business
from backend.server.common import ratelimit
from backend.server.services import quotas
from backend.server.common.config import get_settings
from backend.server.database.models.user import User
from backend.server.database.models.business import Business
from backend.server.database.session import get_db
from backend.ai.speech.tts.cartesia import cartesia_tts
from backend.ai.speech.tts.voice_profile import detect_tts_language

from backend.server.services.call_recorder import update_call_recording_webhook

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice", tags=["Voice Telephony"])


from pydantic import BaseModel
from backend.ai.realtime.plivo.client import plivo_client


MAX_AUDIO_BYTES = 10 * 1024 * 1024
_PHONE = re.compile(r"^\+?[0-9]{8,15}$")


class CallMeRequest(BaseModel):
    phone_number: str
    business_id: Optional[str] = None


@router.post("/media-token")
async def media_token(user: User = Depends(get_voice_user)):
    """A 10-minute token for `<audio src="/api/voice/preview?...&token=...">`: audio elements cannot send an Authorization header."""
    return {"token": create_media_token(user.id), "expires_in": 600}


@router.get("/voices")
async def list_voices(user: User = Depends(get_voice_user)):
    """Fetch available TTS voices from Cartesia."""
    ratelimit.check("voices", user.id, 60, 60)
    voices = await cartesia_tts.get_voices()
    return {"voices": voices}


@router.get("/llm-models")
async def list_llm_models(refresh: bool = False, user: User = Depends(get_voice_user)):
    """Chat models available right now from Groq and Gemini (fetched live from their APIs, cached for a few minutes), for
    the dashboard's model picker. Each row: value ("groq:<id>" / "gemini:<id>", what the agent config stores), label,
    context window, whether it is in the current fallback chain and where, and tool-calling status ('no' once a model
    has refused tools, otherwise 'unknown': providers publish no reliable flag)."""
    ratelimit.check("llm-models", user.id, 30, 60)
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
    user: User = Depends(get_voice_user),
):
    """Generate and return MP3 audio preview for a voice and text (optional speed multiplier / emotion / language).
    The dashboard already sends `language`; it used to be dropped here. Without it the language is detected from the text."""
    ratelimit.check("preview", user.id, 120, 60)
    if len(text) > 500:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Text is too long for a preview (500 characters at most)")
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
    user: User = Depends(get_voice_user),
):
    """Transcribe browser microphone audio payload using Deepgram Nova-2."""
    from backend.ai.speech.stt.deepgram import deepgram_stt
    ratelimit.check("transcribe", user.id, 60, 60)
    content = await file.read(MAX_AUDIO_BYTES + 1)
    if len(content) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Audio is too large (10 MB at most)")
    mimetype = file.content_type or "audio/webm"
    text = await deepgram_stt.transcribe_audio(content, mimetype=mimetype)
    return {"transcript": text or ""}


async def _place_plivo_call(phone: str, business_id: Optional[str], biz_name: str, from_line: str) -> dict:
    """Plivo "call me": the callee's answer triggers our signed answer URL, which bridges the call to the business's stream."""
    base_url = build_base_url()
    answer_url = f"{base_url}/api/voice/plivo/incoming"
    if business_id:  # signed: the incoming webhook trusts a business_id only with its signature
        answer_url += f"?business_id={business_id}&bsig={sign_business_route(business_id)}"
    from backend.server.services.call_recorder import record_call_start
    res = await plivo_client.create_outbound_call(
        phone,
        caller_id=from_line,
        answer_url=answer_url,
        hangup_url=f"{base_url}/api/voice/plivo/status",
        record=True,
    )
    if "error" in res:
        logger.warning(f"[VOICE CALL-ME] Plivo returned error: {res.get('error')}")
        return {"success": False, "provider": "plivo", "message": f"Plivo error: {res.get('error')}"}
    # Plivo gives a request_uuid now; the real CallUUID arrives later at the answer URL
    call_id = res.get("request_uuid") or "plivo_call"
    record_call_start(call_id, business_id, phone, caller_name="Test Caller", greeting="Connecting outbound call...")
    return {
        "success": True,
        "provider": "plivo",
        "call_sid": call_id,
        "from_number": from_line,
        "message": f"Calling your phone {phone} from {from_line} for {biz_name}. Please pick up!",
    }


async def _place_twilio_call(phone: str, business_id: Optional[str], biz_name: str, from_line: str) -> dict:
    """Twilio "call me": inline TwiML streams the answered call straight to the business's media stream."""
    settings = get_settings()
    base_url = build_base_url()
    twiml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        f'<Response><Connect><Stream url="{to_ws_url(base_url)}/media-stream/{business_id}">'
        f'<Parameter name="caller_number" value="{phone}"/>'
        f'<Parameter name="token" value="{create_stream_token(business_id)}"/>'
        '</Stream></Connect></Response>'
    )
    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Calls.json"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            url,
            auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
            data={
                "To": phone,
                "From": from_line,
                "Twiml": twiml,
                "Record": "true",
                "RecordingStatusCallback": f"{base_url}/api/voice/recording-status",
                "StatusCallback": f"{base_url}/api/voice/status",
                "StatusCallbackEvent": ["completed"],
            },
        )
    if resp.status_code not in (200, 201):
        err_msg = resp.json().get("message", resp.text)
        logger.error(f"[VOICE CALL-ME] Twilio error: {err_msg}")
        return {"success": False, "provider": "twilio", "message": f"Twilio error: {err_msg}"}
    call_sid = resp.json().get("sid", "twilio_call")
    from backend.server.services.call_recorder import record_call_start
    record_call_start(call_sid, business_id, phone, caller_name="Test Caller", greeting="Connecting outbound call...")
    return {
        "success": True,
        "provider": "twilio",
        "call_sid": call_sid,
        "from_number": from_line,
        "message": f"Calling your phone {phone} from {from_line} for {biz_name}. Please pick up!",
    }


def _business_provider(agent_cfg: dict, line: Optional[str], biz: Optional[Business]) -> str:
    """The clinic's own telephony provider: its saved setting, else what its assigned line / country implies.
    "exotel" is the legacy name stored before Exotel was removed; it means Plivo now. The callee's number never decides this."""
    saved = (agent_cfg.get("telephony_provider") or "").lower()
    if saved in ("plivo", "exotel"):
        return "plivo"
    if saved == "twilio":
        return "twilio"
    if line:
        return "plivo" if line.startswith("+91") else "twilio"
    return "plivo" if biz and "india" in (biz.country or "").lower() else "twilio"


@router.post("/call-me")
async def trigger_test_call(payload: CallMeRequest, db: Session = Depends(get_db), user: User = Depends(get_voice_user)):
    """Places a real test call to the signed-in user's own phone (a call costs money, so it needs a login and is limited
    per user and per number). The call goes out only through the clinic's own provider, from the clinic's own AI number:
    a Plivo clinic never falls back to Twilio and vice versa."""
    phone = payload.phone_number.strip().replace(" ", "").replace("-", "")
    if not _PHONE.match(phone):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a phone number with country code, like +919876543210")
    ratelimit.check("call-me-user", user.id, 20, 3600)
    ratelimit.check("call-me-number", phone, 20, 3600)
    logger.info(f"[VOICE CALL-ME] {user.id} requested an outbound test call")

    # Use requested business_id if provided (e.g. testing Demo Clinic vs Mayo Clinic), else fallback to user.business_id
    business_id = payload.business_id or user.business_id
    biz = db.get(Business, business_id)
    if not biz:
        business_id = user.business_id
        biz = db.get(Business, business_id)
    biz_name = biz.name if biz else "your business"

    # The clinic's assigned AI line and provider settings
    from backend.server.database.models.phone_number import PhoneNumber
    from backend.server.database.models.agent import Agent
    pn = db.query(PhoneNumber).filter(PhoneNumber.business_id == business_id, PhoneNumber.status == "active").first()
    agent = db.query(Agent).filter(Agent.business_id == business_id).first()
    line = pn.number if pn and pn.number else None
    provider = _business_provider((agent.config or {}) if agent else {}, line, biz)
    logger.info(f"[VOICE CALL-ME] business {business_id} uses {provider} (line {line or 'none'})")
    settings = get_settings()

    if provider == "plivo":
        if not plivo_client.is_configured():
            return {"success": False, "provider": "plivo", "message": "This clinic uses Plivo, but Plivo is not configured (PLIVO_AUTH_ID / PLIVO_AUTH_TOKEN)."}
        from_line = line or plivo_client.caller_id
        if not from_line:
            return {"success": False, "provider": "plivo", "message": "This clinic has no Plivo number assigned (and PLIVO_PHONE_NUMBER is empty)."}
        try:
            return await _place_plivo_call(phone, business_id, biz_name, from_line)
        except Exception as e:
            logger.error(f"[VOICE CALL-ME] Plivo call failed: {e}")
            return {"success": False, "provider": "plivo", "message": str(e)}

    if not (settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN):
        return {"success": False, "provider": "twilio", "message": "This clinic uses Twilio, but Twilio is not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)."}
    from_line = line or settings.TWILIO_PHONE_NUMBER
    if not from_line:
        return {"success": False, "provider": "twilio", "message": "This clinic has no Twilio number assigned (and TWILIO_PHONE_NUMBER is empty)."}
    try:
        return await _place_twilio_call(phone, business_id, biz_name, from_line)
    except Exception as e:
        logger.error(f"[VOICE CALL-ME] Twilio call failed: {e}")
        return {"success": False, "provider": "twilio", "message": str(e)}


@router.post("/incoming", dependencies=[Depends(verify_twilio)])
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
    # Only numbers the platform assigned (phone_numbers) route a call; an ambiguous match is refused, never guessed
    business, how = resolve_business(db, To, ForwardedFrom)
    logger.info("[VOICE INCOMING] call %s routing: %s", CallSid, how)

    if not business and how == "no match" and get_settings().ALLOW_DEV_FALLBACKS:
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

    if not quotas.voice_allowed(db, business, get_settings().ENFORCE_VOICE_QUOTA):
        logger.info("[VOICE INCOMING] business %s used its plan's voice minutes: not answering call %s", business.id, CallSid)
        return Response(
            content='<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, we cannot take your call right now. Please try again later.</Say><Hangup/></Response>',
            media_type="application/xml",
        )

    stream_url = f"{to_ws_url(build_base_url())}/media-stream/{business.id}"
    twiml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        "<Connect>"
        f'<Stream url="{stream_url}">'
        f'<Parameter name="caller_number" value="{From}"/>'
        f'<Parameter name="token" value="{create_stream_token(business.id)}"/>'
        "</Stream>"
        "</Connect>"
        "</Response>"
    )
    logger.info(f"[VOICE INCOMING] Call {CallSid} from {From} -> business {business.id}")
    return Response(content=twiml, media_type="application/xml")


@router.post("/status", dependencies=[Depends(verify_twilio)])
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


@router.post("/recording-status", dependencies=[Depends(verify_twilio)])
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


@router.post("/transfer-status", dependencies=[Depends(verify_twilio)])
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
