"""
Skill: emotional tone layer (DOCS/12 Human-Like Conversation & Emotional Voice Layer).
Detects caller sentiment with pure-Python rules and adapts phrasing only.
Facts (slots, prices, availability) are never touched: we only prepend a short
empathetic bridge to the deterministic response.
"""

import re
from enum import Enum
from typing import Optional


class Sentiment(str, Enum):
    NEUTRAL = "neutral"
    ANXIOUS = "anxious"
    FRUSTRATED = "frustrated"
    UPBEAT = "upbeat"


class ToneProfile(str, Enum):
    PROFESSIONAL = "professional"
    FRIENDLY = "friendly"
    WARM = "warm"
    CALM = "calm"


_ANXIOUS = re.compile(
    r"\b(pain|painful|hurts?|hurting|ache|aching|bleeding|swelling|swollen|worried|scared|afraid|nervous|anxious|"
    r"dard|dukh|dukhta|dar|darr|ghabra\w*|tension)\b",
    re.IGNORECASE,
)
_FRUSTRATED = re.compile(
    r"\b(frustrat\w*|annoy\w*|ridiculous|useless|waste|waiting|again and again|already (?:told|said)|"
    r"not (?:listening|helping)|speak to (?:a |the )?(?:human|person|manager)|manager|complain\w*|"
    r"pareshan|gussa|bekar|kitni baar)\b",
    re.IGNORECASE,
)
_UPBEAT = re.compile(r"\b(great|thanks?|thank you|awesome|perfect|wonderful|shukriya|dhanyavad)\b", re.IGNORECASE)

_BRIDGES = {
    Sentiment.ANXIOUS: {
        ToneProfile.PROFESSIONAL: "I understand. Let's get you seen quickly.",
        ToneProfile.FRIENDLY: "I'm sorry to hear that, let's get you taken care of.",
        ToneProfile.WARM: "I understand you're not feeling well, and I'm here to help.",
        ToneProfile.CALM: "That's alright, take your time. We'll sort this out together.",
    },
    Sentiment.FRUSTRATED: {
        ToneProfile.PROFESSIONAL: "I apologize for the inconvenience.",
        ToneProfile.FRIENDLY: "I hear you, sorry for the trouble.",
        ToneProfile.WARM: "I hear you, and I'm sorry this has been frustrating.",
        ToneProfile.CALM: "I'm sorry about that. Let's fix this calmly.",
    },
}


def parse_profile(value: Optional[str]) -> ToneProfile:
    """Map tenant config (agents.config['personality']) to a profile; default professional."""
    v = (value or "").strip().lower()
    if v in ("warm", "empathetic", "warm / empathetic", "warm_empathetic"):
        return ToneProfile.WARM
    # The four personalities the dashboard offers (they used to fall through to PROFESSIONAL, so the choice did nothing).
    dashboard = {
        "warm & friendly": ToneProfile.FRIENDLY,
        "energetic & fast": ToneProfile.FRIENDLY,
        "empathetic & calm": ToneProfile.CALM,
        "crisp & professional": ToneProfile.PROFESSIONAL,
    }
    if v in dashboard:
        return dashboard[v]
    try:
        return ToneProfile(v)
    except ValueError:
        return ToneProfile.PROFESSIONAL


def detect_sentiment(text: str) -> Sentiment:
    """Frustration outranks anxiety: a de-escalation matters more than reassurance."""
    if _FRUSTRATED.search(text):
        return Sentiment.FRUSTRATED
    if _ANXIOUS.search(text):
        return Sentiment.ANXIOUS
    if _UPBEAT.search(text):
        return Sentiment.UPBEAT
    return Sentiment.NEUTRAL


def bridge_for(sentiment: Sentiment, profile: ToneProfile) -> str:
    """Empathetic opener for this sentiment, or '' when none applies."""
    return _BRIDGES.get(sentiment, {}).get(profile, "")
