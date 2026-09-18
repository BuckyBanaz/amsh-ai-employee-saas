"""
Mu-law 8kHz Framing Helpers.
Twilio Media Streams carries base64-encoded mulaw audio in ~160-byte (20ms)
frames. Cartesia is configured to emit raw pcm_mulaw @ 8000Hz directly, so no
transcoding is needed — only base64 framing/pacing for outbound playback.
"""

import base64
from typing import AsyncIterator, Iterator

FRAME_BYTES = 160  # 8000 samples/sec * 1 byte/sample (mulaw) * 20ms
FRAME_DURATION_S = 0.02


def decode_payload(payload_b64: str) -> bytes:
    return base64.b64decode(payload_b64)


def encode_frame(raw_bytes: bytes) -> str:
    return base64.b64encode(raw_bytes).decode("ascii")


def chunk_bytes(data: bytes, frame_size: int = FRAME_BYTES) -> Iterator[bytes]:
    for i in range(0, len(data), frame_size):
        yield data[i : i + frame_size]


async def frame_stream(audio_chunks: AsyncIterator[bytes]) -> AsyncIterator[str]:
    """Re-chunk an arbitrary-sized async byte stream into paced 20ms base64 frames."""
    buffer = b""
    async for chunk in audio_chunks:
        buffer += chunk
        while len(buffer) >= FRAME_BYTES:
            frame, buffer = buffer[:FRAME_BYTES], buffer[FRAME_BYTES:]
            yield encode_frame(frame)
    if buffer:
        yield encode_frame(buffer)
