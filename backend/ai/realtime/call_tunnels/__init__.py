"""
Multi-Country Telephony Call Tunnels package.
Provides modular adapters for Plivo and Twilio telephony providers.
"""

from backend.ai.realtime.call_tunnels.base_tunnel import BaseTelephonyTunnel
from backend.ai.realtime.call_tunnels.plivo_tunnel import PlivoTunnel
from backend.ai.realtime.call_tunnels.twilio_tunnel import TwilioTunnel
from backend.ai.realtime.call_tunnels.router import TunnelRouter

__all__ = [
    "BaseTelephonyTunnel",
    "PlivoTunnel",
    "TwilioTunnel",
    "TunnelRouter",
]
