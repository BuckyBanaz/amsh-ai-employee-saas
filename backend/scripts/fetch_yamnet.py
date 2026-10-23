"""Download the YAMNet sound classifier used for caller laughter detection (ai/realtime/audio/paralinguistic.py).

Google's published TFLite model (label list embedded), checked against a pinned SHA-256 so a changed file is never used.
Without it, calls work as before, just without laughter cues.

    python -m backend.scripts.fetch_yamnet [destination]
"""

import hashlib
import sys
import urllib.request
from pathlib import Path

URL = ("https://storage.googleapis.com/download.tensorflow.org/models/tflite/task_library/audio_classification/android/"
       "lite-model_yamnet_classification_tflite_1.tflite")
SHA256 = "10c95ea3eb9a7bb4cb8bddf6feb023250381008177ac162ce169694d05c317de"


def fetch(dest: Path) -> Path:
    if dest.exists() and hashlib.sha256(dest.read_bytes()).hexdigest() == SHA256:
        return dest
    data = urllib.request.urlopen(URL, timeout=120).read()
    digest = hashlib.sha256(data).hexdigest()
    if digest != SHA256:
        raise SystemExit(f"YAMNet download does not match the pinned checksum ({digest}); not installed")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return dest


if __name__ == "__main__":
    from backend.ai.realtime.audio.paralinguistic import MODEL_PATH

    print(fetch(Path(sys.argv[1]) if len(sys.argv) > 1 else MODEL_PATH))
