"""How the tenant's Voice/Behavior settings turn into TTS parameters. Pure functions, no imports from the engine,
so both the legacy loader and the LLM agent can use them without an import cycle."""

import re
from typing import Any, Optional

_DEVANAGARI = re.compile(r"[ऀ-ॿ]")
# Roman-script Hindi words that are not also common English words (so plain English never trips it).
_HINGLISH_WORDS = frozenset(
    "aap aapka aapko aapki kya hai hain nahi nahin haan kijiye kijiyega maaf mujhe mera meri main hoon karo kar karna "
    "bataiye batao bolo kaise kaun kaunsa naam theek thik acha accha achha dobara sakte sakti sakta madad chahiye kal aaj "
    "abhi toh aur mein ko ka ki ke se pe liye apna apka dhanyavad shukriya namaste ji bilkul zaroor samay din baje "
    "kripya swagat clinic doctor appointment".split()
)
_CORE_HINGLISH = _HINGLISH_WORDS - {"clinic", "doctor", "appointment"}  # shared with English: never count on their own


def detect_tts_language(text: str) -> str:
    """'hi' for Devanagari or Roman-script Hindi/Hinglish, else 'en'. Cartesia needs the language to pronounce Hindi
    words properly; an English-defaulted voice reading Hinglish is the classic 'wrong accent'."""
    if _DEVANAGARI.search(text or ""):
        return "hi"
    words = re.findall(r"[a-z']+", (text or "").lower())
    hits = sum(1 for w in words if w in _CORE_HINGLISH)
    return "hi" if hits >= 2 and hits / max(len(words), 1) >= 0.25 else "en"

# Dashboard personalities (AIStudioWorkbench) -> default speaking speed when the owner did not set one.
PERSONALITY_SPEED = {
    "energetic & fast": 1.15,
    "warm & friendly": 1.05,
    "crisp & professional": 1.05,
    "empathetic & calm": 0.95,
}
DEFAULT_SPEED = 1.05  # a touch brisk: 1.0 sounds flat over a phone line


def normalize_speed(raw: Any) -> Optional[float]:
    """The Voice tab stores speed as round(x * 50) (1.0x -> 50); accept that or a plain multiplier."""
    if not isinstance(raw, (int, float)) or isinstance(raw, bool) or raw <= 0:
        return None
    return round(min(max(raw / 50 if raw > 5 else raw, 0.6), 1.5), 2)


def resolve_speed(raw_speed: Any, personality: Optional[str]) -> float:
    """Owner's explicit speed wins; otherwise the personality's default; otherwise a slightly brisk default."""
    explicit = normalize_speed(raw_speed)
    if explicit is not None and explicit != 1.0:  # 1.0 is the slider's untouched position, not a decision
        return explicit
    return PERSONALITY_SPEED.get((personality or "").strip().lower(), DEFAULT_SPEED)
