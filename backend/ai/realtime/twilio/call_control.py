"""
Twilio Live Call Control.
A call already bridged into our WebSocket media stream via <Connect><Stream>
can only be redirected (e.g. for a human transfer) through Twilio's REST API —
updating the live call's TwiML ends the stream and applies the new verbs.
"""

import logging

import httpx

from backend.server.common.config import get_settings

logger = logging.getLogger(__name__)


def build_base_url() -> str:
    settings = get_settings()
    return (settings.PUBLIC_BASE_URL or "http://localhost:8000").rstrip("/")


def to_ws_url(http_url: str) -> str:
    return http_url.replace("https://", "wss://").replace("http://", "ws://")


async def redirect_call(call_sid: str, twiml: str) -> bool:
    """Applies new TwiML to a live call, e.g. to hand it off to a <Dial> transfer."""
    settings = get_settings()
    if not (settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN):
        logger.warning("[CALL CONTROL] Twilio credentials not configured — cannot redirect call")
        return False

    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Calls/{call_sid}.json"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                url,
                auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                data={"Twiml": twiml},
            )
            if resp.status_code in (200, 201):
                return True
            logger.warning(f"[CALL CONTROL] Redirect failed ({resp.status_code}): {resp.text}")
    except Exception as e:
        logger.error(f"[CALL CONTROL] Redirect error: {e}")
    return False
