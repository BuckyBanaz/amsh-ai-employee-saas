"""Hindi support for the code-side guards. Speech-to-text often returns Devanagari (even for English words), but the
validators, date/time parsers and safety gate work on Roman text. `normalize` turns Devanagari into a Roman
approximation *for checking only*; the LLM still sees and answers the caller's original words."""

import re
from backend.ai.lexicon import language_pack, pack_languages
from difflib import SequenceMatcher
from typing import Iterable, Optional

_DEVANAGARI = re.compile(r"[ऀ-ॿ]")

_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")

# Words whose meaning the guards need (days, times of day). Applied before letter-by-letter transliteration.
_WORDS = {
    "परसों": "parso", "कल": "kal", "आज": "aaj",
    "सोमवार": "somvar", "मंगलवार": "mangalvar", "बुधवार": "budhvar", "गुरुवार": "guruvar", "बृहस्पतिवार": "guruvar",
    "शुक्रवार": "shukravar", "शनिवार": "shanivar", "रविवार": "ravivar", "इतवार": "itwar",
    "बजे": "baje", "सुबह": "subah", "सवेरे": "subah", "दोपहर": "dopahar", "शाम": "shaam", "रात": "raat",
    "हाँ": "haan", "हां": "haan", "जी": "ji", "ठीक": "theek", "नहीं": "nahi",
}

_CONS = {
    "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "n", "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "n",
    "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n", "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
    "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m", "य": "y", "र": "r", "ल": "l", "व": "v", "श": "sh",
    "ष": "sh", "स": "s", "ह": "h", "ळ": "l", "क्ष": "ksh", "ज्ञ": "gy",
}
_NUKTA = {"क": "q", "ख": "kh", "ग": "g", "ज": "z", "ड": "r", "ढ": "rh", "फ": "f"}
_VOWELS = {"अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo", "ऋ": "ri", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au", "ऑ": "o"}
_MATRAS = {"ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo", "ृ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ॉ": "o"}
_VIRAMA, _NUKTA_MARK = "्", "़"
_NASAL = {"ं": "n", "ँ": "n", "ः": "h"}


def has_devanagari(text: Optional[str]) -> bool:
    return bool(_DEVANAGARI.search(text or ""))


def _translit_word(word: str) -> str:
    out, i, n = [], 0, len(word)
    while i < n:
        ch = word[i]
        cluster = word[i : i + 3]
        if cluster in ("क्ष", "ज्ञ"):  # conjuncts with their own sound
            unit, i = _CONS[cluster], i + 3
            base = True
        elif ch in _CONS:
            unit, i = _CONS[ch], i + 1
            base = True
            if i < n and word[i] == _NUKTA_MARK:
                unit, i = _NUKTA.get(ch, unit), i + 1
        elif ch in _VOWELS:
            out.append(_VOWELS[ch]); i += 1; continue
        elif ch in _NASAL:
            out.append(_NASAL[ch]); i += 1; continue
        elif ch in _MATRAS or ch == _VIRAMA:
            i += 1; continue  # stray mark
        else:
            out.append(ch); i += 1; continue
        # a consonant: what follows decides its vowel
        nxt = word[i] if i < n else ""
        if nxt == _VIRAMA:
            out.append(unit); i += 1
        elif nxt in _MATRAS:
            out.append(unit + _MATRAS[nxt]); i += 1
        elif i >= n or not (word[i] in _CONS or word[i] in _VOWELS or word[i] in _MATRAS):
            out.append(unit)  # word-final schwa is not pronounced
        else:
            out.append(unit + "a")
    return "".join(out)


def normalize(text: Optional[str]) -> str:
    """Devanagari -> Roman approximation (digits, key words, then letters). Latin text passes through untouched."""
    s = str(text or "")
    if not has_devanagari(s):
        return s
    s = s.translate(_DIGITS)
    for deva, roman in sorted(_WORDS.items(), key=lambda kv: -len(kv[0])):
        s = re.sub(rf"(?<![ऀ-ॿ]){re.escape(deva)}(?![ऀ-ॣ०-ॿ])", roman, s)
    return re.sub(r"[ऀ-ॿ]+", lambda m: _translit_word(m.group(0)), s)


def _simplify(word: str) -> str:
    """Collapse doubled vowels so long/short spellings compare equal (pareekshit ~ parikshit, varmaa ~ verma)."""
    return re.sub(r"([aeiou])\1+", r"\1", word)


def fuzzy_in(token: str, texts: Iterable[str], threshold: float = 0.78) -> bool:
    """Is `token` (a Latin name part) something the caller said, allowing for transliteration spelling drift
    (परीक्षित -> "pareekshit" vs the LLM's "Parikshit")? Compares against every word and letter-spelled run."""
    token = _simplify(token.lower())
    for text in texts:
        low = normalize(text).lower()
        if token in _simplify(re.sub(r"[^a-z]", "", low)):
            return True
        for word in re.findall(r"[a-z]+", low):
            if SequenceMatcher(None, token, _simplify(word)).ratio() >= threshold:
                return True
    return False


# Deterministic escalation cues for the safety gate (the vertical config's keywords are English only). The phrases are DATA in each
# language's pack (`ai/locales/lexicon/<code>.json`: `emergency_patterns`, `human_request`), so every language with a pack is covered
# and adding one needs no code change.
def _compile_packs():
    emergency, human = [], []
    for code in pack_languages():
        pack = language_pack(code)
        if pack.get("emergency_patterns"):
            emergency.append(re.compile("|".join(f"(?:{p})" for p in pack["emergency_patterns"]), re.IGNORECASE))
        spec = pack.get("human_request")
        if spec:
            human.append((re.compile(spec["who"], re.IGNORECASE), re.compile(spec["ask"], re.IGNORECASE) if spec.get("ask") else None))
    return emergency, human


_EMERGENCY_PACKS, _HUMAN_PACKS = _compile_packs()


def requested_language(text: Optional[str]) -> Optional[str]:
    """Language code when the caller asks to switch language ("can we talk in Hindi", "english mein baat karo", "habla español"),
    else None. Each language's "speak <language>" phrases come from its pack. Models forget such a request after a turn or two,
    so the engine remembers it in code."""
    s = text or ""
    found = []  # (position, code): the latest mention wins when the caller names two languages
    for code in pack_languages():
        for phrase in language_pack(code).get("ask_patterns", []):
            match = re.search(phrase, s, re.IGNORECASE)
            if match:
                found.append((match.start(), code))
    return max(found)[1] if found else None


def language_escalation(text: str) -> Optional[str]:
    """'emergency' / 'front_desk' when an utterance in any packed language clearly needs it, else None."""
    s = text or ""
    if any(p.search(s) for p in _EMERGENCY_PACKS):
        return "emergency"
    if any(who.search(s) and (ask is None or ask.search(s)) for who, ask in _HUMAN_PACKS):
        return "front_desk"
    return None


hindi_escalation = language_escalation  # earlier name, kept for existing imports


def _compile_key(key: str):
    return [re.compile(p, re.IGNORECASE) for code in pack_languages() for p in language_pack(code).get(key, [])]


_FAREWELL, _HANGUP = _compile_key("farewell_patterns"), _compile_key("hangup_patterns")
_SHORT_FAREWELL_WORDS = 8  # "ok good night" ends the call; a long sentence that merely contains "bye" does not


def caller_is_leaving(text: Optional[str]) -> bool:
    """The caller is saying goodbye (a short farewell in any packed language) or asks for the call to be ended. A question is never a
    goodbye. Phrases are data in each language's pack (`farewell_patterns`, `hangup_patterns`)."""
    s = (text or "").strip()
    if not s or "?" in s:
        return False
    if any(p.search(s) for p in _HANGUP):
        return True
    return len(s.split()) <= _SHORT_FAREWELL_WORDS and any(p.search(s) for p in _FAREWELL)


# --- Speaker gender: a safety net under the prompt's gender rule ---------------------------------------------------
# Weaker models still slip ("समझ गया" from a female agent). Only first-person forms are touched (…ूँगा, …ता हूँ, रहा हूँ,
# समझ गया) so ordinary words such as "गया" in "दिन निकल गया" are left alone.
_FEMALE_FORMS = [
    (re.compile(r"(ू[ँं]|ऊ[ँं])गा(?![ऀ-ॣ०-ॿ])"), r"\1गी"),
    (re.compile(r"(ता|रहा|गया)(\s+ह[ूु][ँं])"), lambda m: {"ता": "ती", "रहा": "रही", "गया": "गई"}[m[1]] + m[2]),
    (re.compile(r"(समझ|जान|मिल|सुन)\s+गया(?![ऀ-ॣ०-ॿ])"), r"\1 गई"),
    (re.compile(r"\b(karung|dung|bataung|dekhung|milung|bhejung|book karung)a\b", re.I), r"\1i"),
    (re.compile(r"\b(sakt|chaht|kar rah|de rah|bata rah|dekh rah|samajh\s+gay|dhund rah)a\b", re.I), r"\1i"),
    # adjectives and participles that change with the speaker: "मैं बहुत अच्छा हूँ" -> "अच्छी हूँ" (a whitelist: "आप क्या हूँ" style words are left alone)
    (re.compile(r"(?<![ऀ-ॿ])(अच्छा|बुरा|थका|अकेला|सुना|समझा|चुका)(\s+ह[ूु][ँं])"), lambda m: {"अच्छा": "अच्छी", "बुरा": "बुरी", "थका": "थकी", "अकेला": "अकेली", "सुना": "सुनी", "समझा": "समझी", "चुका": "चुकी"}[m[1]] + m[2]),
    (re.compile(r"\b(achh?a|accha)(\s+ho+n\b|\s+hun\b)", re.I), lambda m: m[1][:-1] + "i" + m[2]),
]
_MALE_FORMS = [
    (re.compile(r"(ू[ँं]|ऊ[ँं])गी(?![ऀ-ॣ०-ॿ])"), r"\1गा"),
    (re.compile(r"(ती|रही|गई)(\s+ह[ूु][ँं])"), lambda m: {"ती": "ता", "रही": "रहा", "गई": "गया"}[m[1]] + m[2]),
    (re.compile(r"(समझ|जान|मिल|सुन)\s+गई(?![ऀ-ॣ०-ॿ])"), r"\1 गया"),
    (re.compile(r"\b(karung|dung|bataung|dekhung|milung|bhejung)i\b", re.I), r"\1a"),
    (re.compile(r"\b(sakt|chaht|kar rah|de rah|bata rah|dekh rah|samajh\s+gay)i\b", re.I), r"\1a"),
    (re.compile(r"(?<![ऀ-ॿ])(अच्छी|बुरी|थकी|अकेली|सुनी|समझी|चुकी)(\s+ह[ूु][ँं])"), lambda m: {"अच्छी": "अच्छा", "बुरी": "बुरा", "थकी": "थका", "अकेली": "अकेला", "सुनी": "सुना", "समझी": "समझा", "चुकी": "चुका"}[m[1]] + m[2]),
    (re.compile(r"\b(achh?i|acchi)(\s+ho+n\b|\s+hun\b)", re.I), lambda m: m[1][:-1] + "a" + m[2]),
]


def match_speaker_gender(text: str, gender: Optional[str]) -> str:
    """Rewrite first-person Hindi/Hinglish verb endings to the agent's gender ('female' / 'male'); anything else is untouched."""
    forms = _FEMALE_FORMS if gender == "female" else _MALE_FORMS if gender == "male" else None
    for pattern, repl in forms or []:
        text = pattern.sub(repl, text)
    return text


# --- Wrong-language reply guard ------------------------------------------------------------------------------------
_ENGLISH_WORDS = frozenset(
    "the a an is are was were be can could would will shall you your yours which what when where who how for to of and or "
    "with on at in it this that these those please sure day time works work like want need help have has do does did "
    "sorry thanks thank yes no okay ok let me my our we us i".split()
)


def looks_english(sentence: str) -> bool:
    """True for a plain English sentence (no Devanagari, at least three English function words). Names, a lone 'Sure!'
    or short Roman-script Hindi do not count."""
    if has_devanagari(sentence):
        return False
    words = re.findall(r"[A-Za-z']+", sentence.lower())
    return len(words) >= 4 and sum(w in _ENGLISH_WORDS for w in words) >= 3
