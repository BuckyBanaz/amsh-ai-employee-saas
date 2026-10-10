"""
Voice Activity Detection (VAD).
Calculates RMS energy of mulaw/PCM audio frames to detect speech onset and barge-in.
"""

try:
    import audioop
except ImportError:
    import audioop_lts as audioop
import base64


class SimpleVAD:
    """Energy-based VAD detector for realtime 8kHz mulaw audio."""

    def __init__(self, energy_threshold: int = 400) -> None:
        self.energy_threshold = energy_threshold

    def rms(self, payload_base64: str, pcm: bool = False) -> int:
        """Root-mean-square energy of one inbound frame (0 if it cannot be decoded)."""
        try:
            raw_bytes = base64.b64decode(payload_base64)
            # Exotel sends linear PCM16 already; Twilio sends mulaw
            pcm_bytes = raw_bytes if pcm else audioop.ulaw2lin(raw_bytes, 2)
            return audioop.rms(pcm_bytes, 2)
        except Exception:
            return 0

    def is_speech(self, payload_base64: str, pcm: bool = False) -> bool:
        """Determines if the inbound audio packet contains human speech."""
        return self.rms(payload_base64, pcm=pcm) > self.energy_threshold
