"""Probe: what the live stack can actually tell about HOW a caller speaks (laughing, sighing), not just what they say.

Synthesises the same line plainly and with a real laugh (Cartesia's [laughter] tag) as 8 kHz mulaw phone audio, then asks:
  1. Deepgram, with the live-call model/language, what it transcribes (does any laugh reach the transcript?);
  2. Gemini, given the audio itself, whether the speaker laughs (and how long that takes).
Synthetic audio is a proxy for a real caller, not proof. Spends a few TTS/STT/LLM calls; needs the provider keys.

    python -m backend.ai.evals.paralinguistic_probe
"""

import asyncio
import audioop
import base64
import io
import json
import time
import wave

import httpx

from backend.ai.realtime.audio.paralinguistic import cue_detector
from backend.ai.speech.stt.deepgram import model_for, resolve_stt_language
from backend.ai.speech.tts.cartesia import cartesia_tts
from backend.server.common.config import get_settings

CLIPS = {
    "plain": "क्या बात है यार!",
    "plain_english": "Can I book an appointment for tomorrow morning?",
    "laughing": "[laughter] क्या बात है यार! [laughter]",
    "english_laughing": "[laughter] Oh my god, that's so funny! [laughter]",
}
ASK = ('Listen to the caller. Reply with JSON only: {"laughing": true|false, "sighing": true|false, '
       '"hesitant": true|false, "tone": "<one word>"}.')


async def synth(text: str) -> bytes:
    out = bytearray()
    async for chunk in cartesia_tts.stream_speech(text, encoding="pcm_mulaw", sample_rate=8000, language="hi"):
        out.extend(chunk)
    return bytes(out)


def wav_16k(mulaw: bytes) -> bytes:
    pcm = audioop.ulaw2lin(mulaw, 2)
    pcm, _ = audioop.ratecv(pcm, 2, 1, 8000, 16000, None)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1), w.setsampwidth(2), w.setframerate(16000), w.writeframes(pcm)
    return buf.getvalue()


async def deepgram(mulaw: bytes) -> str:
    s = get_settings()
    lang = resolve_stt_language("hi")
    url = f"https://api.deepgram.com/v1/listen?model={model_for(lang)}&language={lang}&encoding=mulaw&sample_rate=8000&punctuate=true"
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(url, headers={"Authorization": f"Token {s.DEEPGRAM_API_KEY}", "Content-Type": "application/octet-stream"}, content=mulaw)
    r.raise_for_status()
    return r.json()["results"]["channels"][0]["alternatives"][0]["transcript"]


async def gemini(wav: bytes) -> tuple:
    s = get_settings()
    model = getattr(s, "GEMINI_MODEL", None) or "gemini-3.1-flash-lite"
    body = {
        "model": model,
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": ASK},
            {"type": "input_audio", "input_audio": {"data": base64.b64encode(wav).decode(), "format": "wav"}},
        ]}],
        "reasoning_effort": "none",
    }
    t0 = time.perf_counter()
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                         headers={"Authorization": f"Bearer {s.GEMINI_API_KEY}"}, json=body)
    ms = (time.perf_counter() - t0) * 1000
    if r.status_code != 200:
        return f"HTTP {r.status_code}: {r.text[:200]}", ms
    return r.json()["choices"][0]["message"]["content"].strip(), ms


async def main(args) -> None:
    for name, text in CLIPS.items():
        audio = await synth(text)
        cues = cue_detector.score(audio)  # local YAMNet on the same phone audio
        if args.no_remote:
            print(json.dumps({"clip": name, "seconds": round(len(audio) / 8000, 2), "yamnet": cues}, ensure_ascii=False))
            continue
        dg = await deepgram(audio)
        answer, ms = await gemini(wav_16k(audio))
        print(json.dumps({"clip": name, "seconds": round(len(audio) / 8000, 2), "yamnet": cues, "deepgram": dg, "gemini": answer,
                          "gemini_ms": round(ms)}, ensure_ascii=False))


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--no-remote", action="store_true", help="YAMNet only: skip the Deepgram and Gemini calls")
    asyncio.run(main(parser.parse_args()))
