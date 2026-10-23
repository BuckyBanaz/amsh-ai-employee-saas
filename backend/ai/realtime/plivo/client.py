"""
Plivo Telephony Client for voice & SMS.
Provides outbound calling and SMS dispatch via the Plivo REST API.

Outbound calls: Plivo returns a `request_uuid` immediately; the real CallUUID arrives later
at our answer URL (/api/voice/plivo/incoming), which is where the call is bridged.
"""

import logging
from typing import Any, Dict, Optional
from urllib.parse import urlencode

import httpx

from backend.server.common.config import get_settings

logger = logging.getLogger(__name__)

PLIVO_API_BASE = "https://api.plivo.com/v1/Account"


def normalize_e164(number: str, default_country_code: str = "91") -> str:
    """Digits-only E.164 ("+919876543210"). A bare 10-digit number is treated as Indian (+91)."""
    digits = "".join(ch for ch in (number or "") if ch.isdigit())
    if len(digits) == 10:
        digits = default_country_code + digits
    return f"+{digits}" if digits else ""


def transfer_url(staff_phone: str, staff_name: str, department: str, language: Optional[str]) -> str:
    """The XML URL a live Plivo call is moved to for a human transfer (routes/plivo.py /transfer: a <Dial> to the staff)."""
    from backend.ai.realtime.twilio.call_control import build_base_url

    query = urlencode({"staff_phone": staff_phone, "staff_name": staff_name, "department": department, "lang": language or "en"})
    return f"{build_base_url()}/api/voice/plivo/transfer?{query}"


class PlivoClient:
    """Plivo REST API client (basic auth: PLIVO_AUTH_ID / PLIVO_AUTH_TOKEN)."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.auth_id = getattr(self.settings, "PLIVO_AUTH_ID", "") or ""
        self.auth_token = getattr(self.settings, "PLIVO_AUTH_TOKEN", "") or ""
        self.caller_id = getattr(self.settings, "PLIVO_PHONE_NUMBER", "") or ""

    def is_configured(self) -> bool:
        return bool(self.auth_id and self.auth_token)

    @property
    def base_url(self) -> str:
        return f"{PLIVO_API_BASE}/{self.auth_id}"

    async def create_outbound_call(
        self,
        to_number: str,
        caller_id: Optional[str] = None,
        answer_url: Optional[str] = None,
        hangup_url: Optional[str] = None,
        record: bool = True,
    ) -> Dict[str, Any]:
        """
        Places an outbound call; when the callee answers, Plivo fetches `answer_url` (our XML <Stream>).
        Returns Plivo's JSON (contains `request_uuid`) or {"error": ..., "status_code": ...}.
        """
        if not self.is_configured():
            raise RuntimeError("Plivo credentials not configured in settings")

        payload: Dict[str, Any] = {
            "from": normalize_e164(caller_id or self.caller_id),
            "to": normalize_e164(to_number),
            "answer_url": answer_url,
            "answer_method": "POST",
            "record": record,
        }
        if hangup_url:
            payload["hangup_url"] = hangup_url
            payload["hangup_method"] = "POST"

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{self.base_url}/Call/",
                json=payload,
                auth=(self.auth_id, self.auth_token),
            )
            if resp.status_code in (200, 201, 202):
                logger.info(f"[PLIVO] Outbound call placed to {to_number}")
                return resp.json()
            logger.error(f"[PLIVO] Outbound call failed ({resp.status_code}): {resp.text}")
            return {"error": resp.text, "status_code": resp.status_code}

    async def transfer_call(self, call_uuid: str, aleg_url: str) -> bool:
        """Moves a live call (its caller leg) to new XML at `aleg_url`: Plivo ends the current <Stream> and runs what that
        URL returns, e.g. a <Dial> to clinic staff. Plivo's counterpart of Twilio's live-call redirect."""
        if not self.is_configured():
            logger.warning("[PLIVO] credentials not configured: cannot transfer call %s", call_uuid)
            return False
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{self.base_url}/Call/{call_uuid}/",
                    json={"legs": "aleg", "aleg_url": aleg_url, "aleg_method": "POST"},
                    auth=(self.auth_id, self.auth_token),
                )
        except Exception as e:
            logger.error(f"[PLIVO] Transfer of {call_uuid} failed: {e}")
            return False
        if resp.status_code in (200, 201, 202):
            logger.info(f"[PLIVO] Call {call_uuid} transferred")
            return True
        logger.error(f"[PLIVO] Transfer of {call_uuid} failed ({resp.status_code}): {resp.text}")
        return False

    async def send_sms(
        self,
        to_number: str,
        message: str,
        sender_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Sends an SMS via Plivo. For Indian numbers the sender ID and template must be DLT-registered."""
        if not self.is_configured():
            raise RuntimeError("Plivo credentials not configured in settings")

        payload = {
            "src": normalize_e164(sender_id or self.caller_id),
            "dst": normalize_e164(to_number),
            "text": message,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{self.base_url}/Message/",
                json=payload,
                auth=(self.auth_id, self.auth_token),
            )
            if resp.status_code in (200, 201, 202):
                logger.info(f"[PLIVO] SMS sent to {to_number}")
                return resp.json()
            logger.error(f"[PLIVO] SMS failed ({resp.status_code}): {resp.text}")
            return {"error": resp.text, "status_code": resp.status_code}


# Singleton instance
plivo_client = PlivoClient()
