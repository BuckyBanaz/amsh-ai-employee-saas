"""
Common Write Operations.
Provides shared actions across all verticals (Call Transfer, SMS Dispatch, Escalation).
"""

import logging
from typing import Any, Dict, Optional
from backend.ai.tools.common.send_sms import send_sms_sync

logger = logging.getLogger(__name__)


class CommonWriteOperations:
    """Shared cross-vertical write and external dispatch actions."""

    @staticmethod
    def send_confirmation_sms(
        to_phone: str,
        business_name: str,
        booking_details: str
    ) -> Dict[str, Any]:
        """
        Dispatches SMS via Exotel (India +91) or Twilio (Global).
        """
        body = f"Hello! Your booking at {business_name} is confirmed: {booking_details}. Thank you for calling!"
        return send_sms_sync(to_phone=to_phone, body=body)

    @staticmethod
    def transfer_to_human(
        transfer_to_phone: str,
        reason: str = "Escalation to staff"
    ) -> Dict[str, Any]:
        """Initiates call transfer to staff."""
        logger.info("Initiating call transfer to %s for reason: %s", transfer_to_phone, reason)
        return {
            "action": "transfer",
            "target": transfer_to_phone,
            "reason": reason
        }
