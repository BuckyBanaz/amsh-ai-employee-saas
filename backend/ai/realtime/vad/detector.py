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

    def is_speech(self, mulaw_payload_base64: str) -> bool:
        """Determines if the inbound audio packet contains human speech."""
        try:
            raw_bytes = base64.b64decode(mulaw_payload_base64)
            # Convert mulaw to 16-bit linear PCM
            pcm_bytes = audioop.ulaw2lin(raw_bytes, 2)
            # Calculate root-mean-square energy
            rms = audioop.rms(pcm_bytes, 2)
            return rms > self.energy_threshold
        except Exception:
            return False
