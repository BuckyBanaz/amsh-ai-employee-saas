"""Code-parsed slots from the caller's own words (never the model's prose), for workflows that declare them.

  country        "I'm from Nepal", "Nepali student", "नेपाल से हूँ", "من نيبال", "uit Nigeria" -> "Nepal" / "Nigeria"
  academic_year  "2026-27", "2026/2027", "२०२६-२७", "session 2026", "intake 2027" -> "2026-27" / "2026" / "2027"

University fees depend on both, so once the caller has said them the workflow keeps them (a later "and the hostel fee?"
still means Nepal, 2026-27), the knowledge-base fee lookup uses them, and they are saved on the enquiry for the
admissions team. A newer value replaces an older one."""

from __future__ import annotations

import re
from typing import Dict

from backend.ai.engine.rag import languages, structured
from backend.ai.lexicon import lexicon_languages, load_lexicon

# English country names documents and callers use (the vocabulary in languages.py maps other languages to these).
_COUNTRIES = {
    "india", "nepal", "bangladesh", "nigeria", "sri lanka", "bhutan", "kenya", "ghana", "afghanistan", "pakistan", "myanmar",
    "maldives", "united states", "united kingdom", "canada", "australia", "uae", "saudi arabia", "oman", "qatar", "kuwait",
    "bahrain", "yemen", "iraq", "iran", "jordan", "syria", "lebanon", "egypt", "morocco", "sudan", "ethiopia", "tanzania",
    "uganda", "rwanda", "zambia", "zimbabwe", "somalia", "cameroon", "south africa", "mauritius", "germany", "france",
    "netherlands", "belgium", "turkey", "china", "japan", "vietnam", "thailand", "indonesia", "malaysia", "philippines",
    "singapore", "suriname", "tajikistan", "uzbekistan", "kazakhstan", "turkmenistan", "kyrgyzstan", "mongolia",
}
_COUNTRIES |= set(structured.DEMONYMS.values())
_ALIASES = {"usa": "united states", "us": None, "uk": "united kingdom", "england": "united kingdom", "britain": "united kingdom",
            "america": "united states", "emirates": "uae", "dubai": "uae"}
_DISPLAY = {"uae": "UAE", "usa": "USA"}
_LANGUAGE_TALK = [re.compile(p, re.IGNORECASE) for code in lexicon_languages() for p in load_lexicon(code).get("language_talk_patterns", [])]

_RANGE = re.compile(r"\b(20[2-4]\d)\s*[-/–—]\s*(?:20)?(\d\d)\b")
_KEYWORD_YEAR = re.compile(
    r"(?:session|intake|batch|academic\s+year|admission|sessie|jaar|jahr|semester|ano|annee|सत्र|वर्ष|साल|عام|سنة|دفعة)\D{0,12}(20[2-4]\d)\b"
    r"|\b(20[2-4]\d)\D{0,6}(?:session|intake|batch|academic\s+year|सत्र|बैच|का\s+सत्र)")


def _title(country: str) -> str:
    return _DISPLAY.get(country) or " ".join(w.capitalize() for w in country.split())


def _without_language_talk(text: str) -> str:
    """Drop "speak in German", "good in the English", "hindi mein": a language named as a language is not where the caller is
    from. Phrases are data in each language's pack (`language_talk_patterns`)."""
    for pattern in _LANGUAGE_TALK:
        text = pattern.sub(" ", text)
    return text


def country_in(utterance: str) -> str | None:
    english = f" {_without_language_talk(languages.to_english(utterance))} "
    for word, country in structured.DEMONYMS.items():  # "Nepali", "Nigerian"
        if f" {word} " in english:
            english += f" {country} "
    for word, country in _ALIASES.items():
        if country and f" {word} " in english:
            english += f" {country} "
    found = [c for c in _COUNTRIES if f" {c} " in english]
    if not found:
        return None
    # several countries named ("Nepal or Bangladesh"): only one is a slot value; the last one named wins
    found.sort(key=lambda c: english.rfind(f" {c} "))
    return _title(found[-1])


def academic_year_in(utterance: str) -> str | None:
    text = languages.fold(utterance)
    m = _RANGE.search(text)
    if m:
        return f"{m.group(1)}-{m.group(2)}"
    m = _KEYWORD_YEAR.search(text)
    if m:
        return m.group(1) or m.group(2)
    return None


def parse(utterance: str) -> Dict[str, str]:
    out: Dict[str, str] = {}
    if not utterance or not utterance.strip():
        return out
    if country := country_in(utterance):
        out["country"] = country
    if year := academic_year_in(utterance):
        out["academic_year"] = year
    return out
