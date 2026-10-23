"""
Paralinguistic cues from the caller's own audio: laughter and sighs.

Deepgram transcribes words only: a caller saying "kya baat hai yaar" while laughing reaches the agent as plain words, so the
mood reader (agent/emotion.py), which looks for "haha" in the transcript, never sees the laugh (measured with
evals/paralinguistic_probe.py). This scores the utterance's audio itself with YAMNet, Google's AudioSet sound classifier
(521 classes, among them Laughter / Giggle / Snicker / Belly laugh / Chuckle and Sigh), run locally through LiteRT:
no API call, a few milliseconds per second of audio, language independent.

The model file lives in backend/data/models/yamnet.tflite (git-ignored, see scripts/fetch_yamnet.py). Without the model or the
runtime the detector reports itself unavailable and calls carry on exactly as before.
"""

import logging
import os
import threading
import time
import zipfile
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)

MODEL_PATH = Path(os.environ.get("YAMNET_MODEL_PATH") or Path(__file__).resolve().parents[3] / "data" / "models" / "yamnet.tflite")
MODEL_RATE = 16000
WINDOW = 15600  # samples the model takes per frame (0.975 s at 16 kHz)
HOP = 7680  # 0.48 s, YAMNet's own frame hop

# Laughter score from which a caller counts as laughing. Measured on 8 kHz mulaw, as a call delivers it:
#   - ESC-50 laughter alone 0.199-0.414 (n=4); breathing / coughing / clapping / snoring at most 0.043 (n=16);
#   - a real caller's plain speech (9 recorded turns) 0.000 every time;
#   - a laugh mixed into that caller's speech: a clear laugh over or after the words 0.08-0.41, a short or soft one 0.004-0.043.
# So the floor sits above every non-laugh seen (0.043) and catches clear laughs, also over speech. Soft giggles and a
# "smiling" voice stay undetected: YAMNet hears distinct laughter, not a laughing tone.
LAUGHTER_MIN = 0.08

# AudioSet class names, grouped into the cues the conversation layer uses. Names, not indices: the label file decides.
CUE_CLASSES: Dict[str, tuple] = {
    "laughter": ("Laughter", "Giggle", "Snicker", "Belly laugh", "Chuckle, chortle"),
    "sigh": ("Sigh",),
}


def _mulaw_table() -> np.ndarray:
    """G.711 mu-law byte -> linear PCM16 (the standard decoder)."""
    u = ~np.arange(256, dtype=np.int32) & 0xFF
    sign = u & 0x80
    exponent = (u >> 4) & 0x07
    mantissa = u & 0x0F
    magnitude = ((mantissa << 3) + 0x84) << exponent
    return np.where(sign != 0, 0x84 - magnitude, magnitude - 0x84).astype(np.int16)


_MULAW = _mulaw_table()


def to_model_input(audio: bytes, encoding: str = "mulaw", rate: int = 8000) -> np.ndarray:
    """Phone audio (mulaw or PCM16 little-endian) -> float32 mono at 16 kHz in [-1, 1]."""
    if encoding == "mulaw":
        pcm = _MULAW[np.frombuffer(audio, dtype=np.uint8)]
    else:
        pcm = np.frombuffer(audio[: len(audio) // 2 * 2], dtype="<i2")
    x = pcm.astype(np.float32) / 32768.0
    if rate != MODEL_RATE and x.size:
        n = int(round(x.size * MODEL_RATE / rate))
        x = np.interp(np.linspace(0, x.size - 1, n), np.arange(x.size), x).astype(np.float32)
    return x


class CueDetector:
    """Loads the model once (lazily, thread-safe); `score` is blocking, so call it through asyncio.to_thread."""

    def __init__(self, model_path: Path = MODEL_PATH) -> None:
        self.model_path = model_path
        self._lock = threading.Lock()
        self._interp = None
        self._groups: Dict[str, List[int]] = {}
        self._failed = False

    def available(self) -> bool:
        return self._load() is not None

    def _load(self):
        if self._interp is not None or self._failed:
            return self._interp
        with self._lock:
            if self._interp is not None or self._failed:
                return self._interp
            try:
                from ai_edge_litert.interpreter import Interpreter

                interp = Interpreter(model_path=str(self.model_path))
                interp.allocate_tensors()
                with zipfile.ZipFile(self.model_path) as z:  # the label list ships inside the model file
                    labels = z.read("yamnet_label_list.txt").decode("utf-8").splitlines()
                index = {name: i for i, name in enumerate(labels)}
                self._groups = {cue: [index[n] for n in names if n in index] for cue, names in CUE_CLASSES.items()}
                self._in = interp.get_input_details()[0]["index"]
                self._out = interp.get_output_details()[0]["index"]
                self._interp = interp
                logger.info("[CUES] YAMNet loaded from %s", self.model_path)
            except Exception as e:  # missing runtime or model: no cues, calls unaffected
                self._failed = True
                logger.warning("[CUES] paralinguistic detector unavailable: %s", e)
        return self._interp

    def score(self, audio: bytes, encoding: str = "mulaw", rate: int = 8000) -> Optional[Dict[str, float]]:
        """Highest score of each cue over the clip's frames (a laugh is short; averaging would hide it), plus the time it
        took. None when the detector is unavailable or the clip is empty."""
        interp = self._load()
        x = to_model_input(audio, encoding, rate)
        if interp is None or not x.size:
            return None
        started = time.perf_counter()
        if x.size < WINDOW:
            x = np.pad(x, (0, WINDOW - x.size))
        best = {cue: 0.0 for cue in self._groups}
        with self._lock:  # one interpreter, one frame at a time
            for start in range(0, x.size - WINDOW + 1, HOP):
                interp.set_tensor(self._in, x[start : start + WINDOW])
                interp.invoke()
                scores = interp.get_tensor(self._out)[0]
                for cue, idx in self._groups.items():
                    best[cue] = max(best[cue], float(scores[idx].max()) if idx else 0.0)
        out = {cue: round(v, 3) for cue, v in best.items()}
        out["ms"] = round((time.perf_counter() - started) * 1000, 1)
        return out


cue_detector = CueDetector()

CAPTURE_DIR = Path(__file__).resolve().parents[3] / "data" / "caller_audio"  # git-ignored (backend/data/)


def capture_turn(call_id: str, turn: int, audio: bytes, encoding: str, transcript: str, cues: Optional[Dict[str, float]]) -> Path:
    """Development aid (settings.CAPTURE_CALLER_AUDIO): one caller turn as an 8 kHz PCM16 WAV plus a line in index.jsonl with
    its transcript and scores, so laughter thresholds can be checked against what was really said and heard."""
    import json
    import wave

    CAPTURE_DIR.mkdir(parents=True, exist_ok=True)
    pcm = _MULAW[np.frombuffer(audio, dtype=np.uint8)].astype("<i2").tobytes() if encoding == "mulaw" else audio
    path = CAPTURE_DIR / f"{call_id}_{turn:03d}.wav"
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(8000)
        w.writeframes(pcm)
    with open(CAPTURE_DIR / "index.jsonl", "a", encoding="utf-8") as f:
        f.write(json.dumps({"file": path.name, "transcript": transcript, "cues": cues}, ensure_ascii=False) + "\n")
    return path
