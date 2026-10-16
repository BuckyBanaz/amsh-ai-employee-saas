"""
Telephony Tunnel Router.
Resolves the correct provider tunnel (Plivo or Twilio) from the explicit `provider`
query param set by our own answer route. Caller number prefix does not pick the provider.
"""

import logging
from typing import Optional
from fastapi import WebSocket

from backend.ai.realtime.call_tunnels.base_tunnel import BaseTelephonyTunnel
from backend.ai.realtime.call_tunnels.plivo_tunnel import PlivoTunnel
from backend.ai.realtime.call_tunnels.twilio_tunnel import TwilioTunnel

logger = logging.getLogger(__name__)

class TunnelRouter:
    """Factory router for multi-provider telephony tunnels."""

    @staticmethod
    def get_tunnel(
        websocket: WebSocket,
        business_id: str,
        provider: Optional[str] = None,
        caller_number: str = "+15550000000",
        call_id: Optional[str] = None
    ) -> BaseTelephonyTunnel:
        """
        - Plivo: provider == 'plivo' (mu-law @ 8kHz)
        - Twilio: any other provider (default, mu-law @ 8kHz)
        """
        normalized_provider = (provider or "").lower().strip()

        if normalized_provider == "plivo":
            logger.info("TunnelRouter: Routing to PlivoTunnel (mu-law @ 8kHz) for business %s", business_id)
            return PlivoTunnel(
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
