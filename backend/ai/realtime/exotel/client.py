"""
Exotel Telephony Client for Indian (+91) Voice & SMS.
Provides outbound calling, SMS dispatch, and call status tracking via Exotel REST API.
"""

import logging
from typing import Any, Dict, Optional
import httpx

from backend.server.common.config import get_settings

logger = logging.getLogger(__name__)


class ExotelClient:
    """Exotel REST API client for India telephony."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.account_sid = getattr(self.settings, "EXOTEL_ACCOUNT_SID", "")
        self.api_key = getattr(self.settings, "EXOTEL_API_KEY", "")
        self.api_token = getattr(self.settings, "EXOTEL_API_TOKEN", "")
        self.caller_id = getattr(self.settings, "EXOTEL_PHONE_NUMBER", "08047284627")
        self.subdomain = getattr(self.settings, "EXOTEL_SUBDOMAIN", "api.exotel.com")

    def is_configured(self) -> bool:
        return bool(self.account_sid and self.api_key and self.api_token)

    @property
    def base_url(self) -> str:
        return f"https://{self.subdomain}/v1/Accounts/{self.account_sid}"

    async def create_outbound_call(
        self,
        to_number: str,
        caller_id: Optional[str] = None,
        callback_url: Optional[str] = None,
        custom_field: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Initiates an outbound call connecting the recipient to our AI flow or applet.
        """
        if not self.is_configured():
            raise RuntimeError("Exotel credentials not configured in settings")

        from_number = caller_id or self.caller_id
        # Normalize Indian number with leading 0 if 10-digit
        clean_to = to_number.replace("+91", "").replace("-", "").strip()
        if len(clean_to) == 10 and not clean_to.startswith("0"):
            clean_to = f"0{clean_to}"

        url = f"{self.base_url}/Calls/connect.json"

        flow_url = callback_url or f"{getattr(self.settings, 'PUBLIC_BASE_URL', '')}/api/voice/exotel/incoming"

        data: Dict[str, Any] = {
            "From": clean_to,
            "CallerId": from_number,
            "CallType": "trans",
        }
        if flow_url and "http" in flow_url:
            data["Url"] = flow_url
        else:
            data["To"] = from_number

        if custom_field:
            data["CustomField"] = custom_field

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                url,
                data=data,
                auth=(self.api_key, self.api_token),
            )
            if resp.status_code in (200, 201):
                logger.info(f"[EXOTEL] Outbound call placed to {to_number}")
                return resp.json()
            else:
                logger.error(f"[EXOTEL] Outbound call failed ({resp.status_code}): {resp.text}")
                return {"error": resp.text, "status_code": resp.status_code}

    async def send_sms(
        self,
        to_number: str,
        message: str,
        sender_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sends an instant transactional SMS to an Indian mobile number.
        """
        if not self.is_configured():
            raise RuntimeError("Exotel credentials not configured in settings")

        from_id = sender_id or self.caller_id
        url = f"{self.base_url}/Sms/send.json"

        data = {
            "From": from_id,
            "To": to_number,
            "Body": message,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                url,
                data=data,
                auth=(self.api_key, self.api_token),
            )
            if resp.status_code in (200, 201):
                logger.info(f"[EXOTEL] SMS sent to {to_number}")
                return resp.json()
            else:
                logger.error(f"[EXOTEL] SMS failed ({resp.status_code}): {resp.text}")
                return {"error": resp.text, "status_code": resp.status_code}


# Singleton instance
exotel_client = ExotelClient()
