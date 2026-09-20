"""
Multi-Country Telephony Call Tunnels package.
Provides modular adapters for Exotel, Twilio, and global telephony providers.
"""

from backend.ai.realtime.call_tunnels.base_tunnel import BaseTelephonyTunnel
from backend.ai.realtime.call_tunnels.exotel_tunnel import ExotelTunnel
from backend.ai.realtime.call_tunnels.twilio_tunnel import TwilioTunnel
from backend.ai.realtime.call_tunnels.router import TunnelRouter

__all__ = [
    "BaseTelephonyTunnel",
    "ExotelTunnel",
    "TwilioTunnel",
    "TunnelRouter",
]
