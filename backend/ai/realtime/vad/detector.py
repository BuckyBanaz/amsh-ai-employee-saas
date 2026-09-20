"""
Voice Activity Detection (VAD).
Calculates RMS energy of mulaw/PCM audio frames to detect speech onset and barge-in.
"""

import audioop
import base64


class SimpleVAD:
    """Energy-based VAD detector for realtime 8kHz mulaw audio."""

    def __init__(self, energy_threshold: int = 400) -> None:
        self.energy_threshold = energy_threshold

    def is_speech(self, payload_base64: str, pcm: bool = False) -> bool:
        """Determines if the inbound audio packet contains human speech."""
        try:
            raw_bytes = base64.b64decode(payload_base64)
            # Exotel sends linear PCM16 already; Twilio sends mulaw
            pcm_bytes = raw_bytes if pcm else audioop.ulaw2lin(raw_bytes, 2)
            # Calculate root-mean-square energy
            rms = audioop.rms(pcm_bytes, 2)
            return rms > self.energy_threshold
        except Exception:
            return False
