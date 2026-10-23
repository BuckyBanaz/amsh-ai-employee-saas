"""Does the laughter/sigh detector work on PHONE audio? Scores labelled sound clips twice: at full quality (16 kHz) and as a
call would deliver them (8 kHz mulaw), so the loss from the phone line is visible.

Clips: any .wav files in a folder, labelled by the part of the file name before "__" (e.g. "laughing__1-1791-A-26.wav", from
the ESC-50 dataset), plus optional caller recordings. Prints one row per clip and the per-label medians.

    python -m backend.ai.evals.cue_detector_eval backend/data/eval_audio
"""

import statistics
import sys
import wave
from collections import defaultdict
from pathlib import Path

import numpy as np

from backend.ai.realtime.audio.paralinguistic import _MULAW, cue_detector


def read_wav(path: Path):
    with wave.open(str(path), "rb") as w:
        raw, rate, width, channels = w.readframes(w.getnframes()), w.getframerate(), w.getsampwidth(), w.getnchannels()
    x = np.frombuffer(raw, dtype="<i2" if width == 2 else np.uint8).astype(np.float32)
    if width == 1:
        x = (x - 128) * 256
    if channels > 1:
        x = x.reshape(-1, channels).mean(axis=1)
    return x / 32768.0, rate


def resample(x: np.ndarray, src: int, dst: int) -> np.ndarray:
    """Band-limited (FFT) resampling: no aliasing when going down to the phone's 8 kHz."""
    n = int(round(len(x) * dst / src))
    spec = np.fft.rfft(x)
    keep = n // 2 + 1
    spec = spec[:keep] if keep <= spec.size else np.pad(spec, (0, keep - spec.size))
    return (np.fft.irfft(spec, n) * (n / len(x))).astype(np.float32)


def to_mulaw(x: np.ndarray) -> bytes:
    """Linear -> mu-law the way the phone network encodes it (nearest code via the decoder table)."""
    pcm = np.clip(x * 32768.0, -32768, 32767).astype(np.int16)
    order = np.argsort(_MULAW)
    table = _MULAW[order]
    pos = np.clip(np.searchsorted(table, pcm), 1, 255)
    nearer = np.where(np.abs(table[pos - 1].astype(int) - pcm) <= np.abs(table[pos].astype(int) - pcm), pos - 1, pos)
    return order[nearer].astype(np.uint8).tobytes()


def main(folder: str) -> None:
    by_label = defaultdict(lambda: {"hq": [], "phone": []})
    for path in sorted(Path(folder).glob("*.wav")):
        label = path.name.split("__")[0]
        x, rate = read_wav(path)
        hq = cue_detector.score((np.clip(resample(x, rate, 16000), -1, 1) * 32767).astype("<i2").tobytes(), encoding="pcm16", rate=16000)
        phone = cue_detector.score(to_mulaw(resample(x, rate, 8000)), encoding="mulaw", rate=8000)
        by_label[label]["hq"].append(hq["laughter"])
        by_label[label]["phone"].append(phone["laughter"])
        print(f"{path.name:<40} laughter hq={hq['laughter']:.3f} phone={phone['laughter']:.3f}   sigh phone={phone['sigh']:.3f}   {phone['ms']}ms")
    print()
    for label, v in sorted(by_label.items()):
        print(f"{label:<12} n={len(v['hq'])}  median laughter: hq={statistics.median(v['hq']):.3f} phone={statistics.median(v['phone']):.3f}"
              f"  min phone={min(v['phone']):.3f} max phone={max(v['phone']):.3f}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "backend/data/eval_audio")
