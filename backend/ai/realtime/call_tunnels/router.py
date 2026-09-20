"""
Telephony Tunnel Router.
Dynamically resolves and instantiates the correct provider tunnel
(Exotel, Twilio, etc.) based on provider parameter or phone number prefix.
"""

import logging
from typing import Optional
from fastapi import WebSocket

from backend.ai.realtime.call_tunnels.base_tunnel import BaseTelephonyTunnel
from backend.ai.realtime.call_tunnels.exotel_tunnel import ExotelTunnel
from backend.ai.realtime.call_tunnels.twilio_tunnel import TwilioTunnel

logger = logging.getLogger(__name__)


class TunnelRouter:
    """Factory router for multi-provider telephony tunnels."""

    @staticmethod
    def get_tunnel(
        websocket: WebSocket,
        business_id: str,
        provider: Optional[str] = None,
        codec: Optional[str] = None,
        pcm: bool = False,
        caller_number: str = "+15550000000",
        call_id: Optional[str] = None
    ) -> BaseTelephonyTunnel:
        """
        Resolve provider tunnel based on explicit query params or audio encoding.
        - Exotel: provider == 'exotel' or codec == 'pcm' or pcm == True or Indian (+91) DID
        - Twilio: provider == 'twilio' or codec == 'mulaw' (default)
        """
        normalized_provider = (provider or "").lower().strip()
        normalized_codec = (codec or "").lower().strip()

        if (
            normalized_provider == "exotel"
            or normalized_codec in ("pcm", "pcm_s16le", "linear")
            or pcm is True
            or caller_number.startswith("+91")
        ):
            logger.info("TunnelRouter: Routing to ExotelTunnel (PCM16 @ 8kHz) for business %s", business_id)
            return ExotelTunnel(
                websocket=websocket,
                business_id=business_id,
                caller_number=caller_number,
                call_id=call_id
            )

        logger.info("TunnelRouter: Routing to TwilioTunnel (mu-law @ 8kHz) for business %s", business_id)
        return TwilioTunnel(
            websocket=websocket,
            business_id=business_id,
            caller_number=caller_number,
            call_id=call_id
        )
