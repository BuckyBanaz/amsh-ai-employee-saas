"""Multilingual support for knowledge-base search: the languages the AI employee speaks (English, Hindi, Dutch, Arabic,
German, Spanish, French) and Hinglish.

  fold()               one comparable form of any text: lower case, Latin accents removed (één -> een, gebühr -> gebuhr),
                       Arabic normalised (diacritics, tatweel and letter variants: أ إ آ -> ا, ة -> ه, ى -> ي), Devanagari
                       normalised (nukta, chandrabindu), Devanagari / Arabic-Indic digits -> 0-9 (२०२६ -> 2026)
  STOP_WORDS           question words and grammar in every language, so "Wat zijn de openingstijden?" is searched as
                       "openingstijden" and "हॉस्टल की फीस कितनी है?" is not matched on "की" and "है"
  to_english()         the caller's words for countries, nationalities, student categories, courses and fee vocabulary
                       replaced by the English words business documents use ("नेपाल के छात्र की बीटेक फीस" ->
                       "nepal के student की btech fee"), so an English fee sheet answers a Hindi, Arabic or Dutch question
  guess_language()     script and stop words; decides whether a question that found nothing is worth translating

This is vocabulary, not translation: anything else is left to the semantic embeddings (multilingual) and to the
translation fallback in index.py."""

from __future__ import annotations

import re
import unicodedata
from typing import Dict, List, Tuple

_DIGITS = {ord(c): str(i) for i, c in enumerate("०१२३४५६७८९")}
_DIGITS.update({ord(c): str(i) for i, c in enumerate("٠١٢٣٤٥٦٧٨٩")})
_DIGITS.update({ord(c): str(i) for i, c in enumerate("۰۱۲۳۴۵۶۷۸۹")})
_ARABIC_MARKS = re.compile(r"[ؐ-ًؚ-ٰٟۖ-ۭـ]")  # harakat, Quranic marks, tatweel
_ARABIC_LETTERS = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ى": "ي", "ة": "ه", "ؤ": "و", "ئ": "ي"})
_DEVANAGARI = str.maketrans({"़": None, "ँ": "ं", "‌": None, "‍": None})
_ARABIC_PREFIXES = ("وال", "بال", "كال", "فال", "لل", "ال")
# A word: letters and digits plus the combining marks of Latin and the Indic scripts (Devanagari .. Sinhala). Python's \w
# alone splits Hindi at every vowel sign ("क्लिनिक" -> क, ल, न, क). The danda (। ॥) ends a sentence, not part of a word.
_WORD = re.compile(r"(?:(?![\u0964\u0965])[\w\u0300-\u036f\u0900-\u0dff\u1cd0-\u1cff\ua8e0-\ua8ff])+")


def fold(text: str) -> str:
    text = unicodedata.normalize("NFKC", text or "").translate(_DIGITS)
    if any("؀" <= ch <= "ۿ" for ch in text):
        text = _ARABIC_MARKS.sub("", text).translate(_ARABIC_LETTERS)
    if any("ऀ" <= ch <= "ॿ" for ch in text):
        text = text.translate(_DEVANAGARI)
    if any(ord(ch) > 127 for ch in text):  # Latin accents only: Devanagari vowel signs are combining marks too, keep them
        out: List[str] = []
        for ch in unicodedata.normalize("NFKD", text):
            if unicodedata.combining(ch) and out and ord(out[-1]) < 0x250:
                continue
            out.append(ch)
        text = unicodedata.normalize("NFC", "".join(out)).replace("ß", "ss")
    return text.lower()


def words(text: str) -> List[str]:
    """The words of `text`, folded (the one tokenizer used for indexing, queries and table lookups)."""
    return _WORD.findall(fold(text))


def strip_arabic_article(token: str) -> str:
    """الهند -> هند, والرسوم -> رسوم: the article and a joined conjunction/preposition are not part of the word."""
    if token and "؀" <= token[0] <= "ۿ":
        for p in _ARABIC_PREFIXES:
            if token.startswith(p) and len(token) - len(p) >= 2:
                return token[len(p):]
    return token


# ----------------------------------------------------------------------------------------------------------- stop words

_STOP = {
    "en": "what is are a an the in on at for to of and or do does did you your have has can could i we my our how much many "
          "when where why who which tell me about please any some there it its this that be will would with from by as if "
          "so also want know need like get give hi hello",
    "hinglish": "kya hai hain ka ki ke ko se mein me aur batao bataiye kitna kitni kitne kab kaha kahan kaise mujhe mera "
                "meri aap aapka aapki hum ham haan ji na nahi bhi toh to tha thi ho hota hoti",
    "hi": "क्या है हैं था थी थे का की के को से में पर और या तो भी कब कहाँ कहां कैसे कितना कितनी कितने कौन कौनसा कौनसी "
          "मुझे मेरा मेरी मेरे आप आपका आपकी आपके हम हमें हमारा यह ये वह वो इस उस एक होता होती होते हो रहा रही रहे रहता "
          "रहती रहते लिए बताइए बताएं बताओ बताइये कृपया जी हाँ नहीं",
    "nl": "wat is zijn de het een en of van voor in op aan met bij hoe veel wanneer waar waarom wie welke welk kan kunnen "
          "ik mij mijn je jij u uw we wij ons onze er dat dit die deze ook graag wil wilt willen heb heeft hebben moet "
          "moeten te om naar over",
    "de": "was ist sind der die das ein eine einen und oder von fur in im auf an mit bei wie viel viele wann wo warum wer "
          "welche welcher kann konnen ich mir mein meine sie ihr ihre wir uns unser es dass diese dieser auch bitte "
          "mochte habe hat haben muss zu zum zur uber",
    "es": "que es son el la los las un una y o de del para en con por como cuanto cuanta cuantos cuando donde quien cual "
          "cuales puedo puede yo mi mis usted su sus nosotros hay esto esta este tambien por favor quiero tiene tengo al",
    "fr": "quel quelle quels quelles est sont le la les un une et ou de du des pour en dans sur avec par comment combien "
          "quand ou pourquoi qui puis peut je moi mon ma mes vous votre vos nous notre il y a ce cette aussi s'il vous plait "
          "voudrais veux avez ai au aux",
    "ar": "ما ماذا هي هو هل من في الى على عن مع كم كيف متى اين لماذا اي هذا هذه ذلك تلك التي الذي او و ثم لكم لك لي "
          "لدي لديكم عندكم عندك يوجد هناك ان انا نحن انت انتم كان يكون الرجاء من فضلك اريد",
}
STOP_WORDS = {w for ws in _STOP.values() for w in fold(ws).split()}
_LANG_STOPS = {lang: set(fold(ws).split()) for lang, ws in _STOP.items()}


def is_stop(token: str) -> bool:
    return token in STOP_WORDS or strip_arabic_article(token) in STOP_WORDS


def guess_language(text: str) -> str:
    """hi | ar | nl | de | es | fr | hinglish | en, from the script and then stop words (good enough to decide whether to
    translate a question, not a language detector)."""
    if any("ऀ" <= ch <= "ॿ" for ch in text):
        return "hi"
    if any("؀" <= ch <= "ۿ" for ch in text):
        return "ar"
    tokens = words(text)
    scores = {lang: sum(w in stops for w in tokens) for lang, stops in _LANG_STOPS.items() if lang not in ("hi", "ar")}
    best = max(scores, key=lambda k: (scores[k], k == "en"))
    return best if scores[best] and scores[best] > scores["en"] else "en"


# ----------------------------------------------------------------------------------------------- vocabulary to English

# Countries: the caller's word (any language, nationality or country) -> the English name documents use.
_COUNTRIES: Dict[str, str] = {
    # Hindi
    "भारत": "india", "इंडिया": "india", "भारतीय": "india", "नेपाल": "nepal", "नेपाली": "nepal", "बांग्लादेश": "bangladesh",
    "बंगलादेश": "bangladesh", "बांग्लादेशी": "bangladesh", "नाइजीरिया": "nigeria", "नाइजीरियाई": "nigeria", "नाइजीरियन": "nigeria",
    "श्रीलंका": "sri lanka", "श्रीलंकाई": "sri lanka", "भूटान": "bhutan", "भूटानी": "bhutan", "केन्या": "kenya", "घाना": "ghana",
    "अफगानिस्तान": "afghanistan", "अफ़ग़ानिस्तान": "afghanistan", "अफगानी": "afghanistan", "पाकिस्तान": "pakistan", "म्यांमार": "myanmar",
    "मालदीव": "maldives", "अमेरिका": "united states", "अमेरिकी": "united states", "ब्रिटेन": "united kingdom", "यूके": "united kingdom",
    "कनाडा": "canada", "ऑस्ट्रेलिया": "australia", "यूएई": "uae", "सऊदी": "saudi arabia", "ओमान": "oman", "कतर": "qatar",
    "कुवैत": "kuwait", "इथियोपिया": "ethiopia", "तंजानिया": "tanzania", "युगांडा": "uganda", "जर्मनी": "germany", "फ्रांस": "france",
    # Arabic (folded forms are produced by fold(), so the normal spelling works)
    "الهند": "india", "هند": "india", "هندي": "india", "نيبال": "nepal", "نيبالي": "nepal", "بنغلاديش": "bangladesh",
    "بنجلاديش": "bangladesh", "بنغالي": "bangladesh", "نيجيريا": "nigeria", "نيجيري": "nigeria", "سريلانكا": "sri lanka",
    "باكستان": "pakistan", "باكستاني": "pakistan", "الإمارات": "uae", "اماراتي": "uae", "السعودية": "saudi arabia", "سعودي": "saudi arabia",
    "مصر": "egypt", "مصري": "egypt", "كينيا": "kenya", "عمان": "oman", "عماني": "oman", "قطر": "qatar", "قطري": "qatar",
    "الكويت": "kuwait", "كويتي": "kuwait", "اليمن": "yemen", "يمني": "yemen", "السودان": "sudan", "سوداني": "sudan",
    "العراق": "iraq", "عراقي": "iraq", "إيران": "iran", "ايراني": "iran", "الأردن": "jordan", "أردني": "jordan", "سوريا": "syria",
    "سوري": "syria", "المغرب": "morocco", "مغربي": "morocco", "بريطانيا": "united kingdom", "بريطاني": "united kingdom",
    "المملكة المتحدة": "united kingdom", "أمريكا": "united states", "امريكي": "united states", "الولايات المتحدة": "united states",
    "افغانستان": "afghanistan", "أفغاني": "afghanistan", "ماليزيا": "malaysia", "إندونيسيا": "indonesia", "تركيا": "turkey",
    # Dutch
    "indiaas": "india", "indiase": "india", "nepalees": "nepal", "nepalese": "nepal", "nigeriaans": "nigeria", "nigeriaanse": "nigeria",
    "bengaals": "bangladesh", "verenigd koninkrijk": "united kingdom", "verenigde staten": "united states", "duitsland": "germany",
    "frankrijk": "france", "belgie": "belgium", "belgisch": "belgium", "nederland": "netherlands", "nederlands": "netherlands",
    "marokko": "morocco", "marokkaans": "morocco", "turkije": "turkey", "turks": "turkey", "surinaams": "suriname",
    # German
    "indien": "india", "indisch": "india", "indische": "india", "vereinigte staaten": "united states", "vereinigtes konigreich": "united kingdom",
    "deutschland": "germany", "nepalesisch": "nepal", "nigerianisch": "nigeria", "turkei": "turkey",
    # Spanish
    "estados unidos": "united states", "reino unido": "united kingdom", "alemania": "germany", "indio": "india", "india ": "india",
    "nepali": "nepal", "nigeriano": "nigeria", "marruecos": "morocco", "turquia": "turkey",
    # French
    "inde": "india", "indien ": "india", "etats-unis": "united states", "etats unis": "united states", "royaume-uni": "united kingdom",
    "royaume uni": "united kingdom", "allemagne": "germany", "nepalais": "nepal", "nigerian": "nigeria", "maroc": "morocco",
    "turquie": "turkey",
}

# Student categories, courses and the fee / admission vocabulary documents are written in.
_TERMS: Dict[str, str] = {
    # categories
    "घरेलू": "domestic", "देशी": "domestic", "स्थानीय": "domestic", "अंतरराष्ट्रीय": "international", "अंतर्राष्ट्रीय": "international",
    "अन्तर्राष्ट्रीय": "international", "इंटरनेशनल": "international", "विदेशी": "international",
    "محلي": "domestic", "محلية": "domestic", "وطني": "domestic", "دولي": "international", "دولية": "international",
    "اجنبي": "international", "أجنبية": "international", "وافد": "international", "وافدة": "international",
    "دوليين": "international", "دوليون": "international", "اجانب": "international", "وافدين": "international",
    "محليين": "domestic", "محليون": "domestic", "छात्रों": "student", "विद्यार्थियों": "student", "studenten": "student",
    "estudiantes": "student", "etudiants": "student", "studierende": "student",
    "binnenlands": "domestic", "binnenlandse": "domestic", "internationaal": "international", "internationale": "international",
    "buitenlands": "international", "buitenlandse": "international", "inlandisch": "domestic", "auslandisch": "international",
    "nacional": "domestic", "internacional": "international", "extranjero": "international", "extranjera": "international",
    "etranger": "international", "etrangere": "international", "international ": "international",
    # courses (Hindi spellings of the English abbreviations)
    "बीटेक": "btech", "बी टेक": "btech", "बी.टेक": "btech", "एमटेक": "mtech", "एम टेक": "mtech", "एमबीए": "mba", "बीबीए": "bba",
    "बीसीए": "bca", "एमसीए": "mca", "बीएससी": "bsc", "एमएससी": "msc", "बीकॉम": "bcom", "एमकॉम": "mcom", "बीए": "ba", "एमए": "ma",
    "पीएचडी": "phd", "एमबीबीएस": "mbbs", "बीडीएस": "bds", "बीफार्मा": "bpharm", "सीएसई": "cse", "ईसीई": "ece", "आईटी": "it",
    "कंप्यूटर": "computer", "कम्प्यूटर": "computer", "साइंस": "science", "इंजीनियरिंग": "engineering", "मैनेजमेंट": "management",
    "डेटा": "data", "डाटा": "data", "बिजनेस": "business", "नर्सिंग": "nursing", "फार्मेसी": "pharmacy", "लॉ": "law",
    # fee / admission vocabulary
    "फीस": "fee", "शुल्क": "fee", "ट्यूशन": "tuition", "हॉस्टल": "hostel", "होस्टल": "hostel", "छात्रावास": "hostel",
    "स्कॉलरशिप": "scholarship", "छात्रवृत्ति": "scholarship", "छात्र": "student", "छात्रा": "student", "विद्यार्थी": "student",
    "स्टूडेंट": "student", "कोर्स": "course", "पाठ्यक्रम": "course", "एडमिशन": "admission", "प्रवेश": "admission",
    "डेडलाइन": "deadline", "अंतिम तिथि": "deadline", "पार्किंग": "parking", "कीमत": "price", "दाम": "price", "रेट": "price",
    "कमरा": "room", "कमरे": "room", "पता": "address", "समय": "timings",
    "رسوم": "fee", "الرسوم": "fee", "مصاريف": "fee", "تكلفة": "cost", "سعر": "price", "اسعار": "price", "سكن": "hostel",
    "السكن": "hostel", "منحة": "scholarship", "منح": "scholarship", "طالب": "student", "طالبة": "student", "طلاب": "student",
    "تخصص": "course", "دورة": "course", "قبول": "admission", "القبول": "admission", "التسجيل": "admission", "موعد": "deadline",
    "غرفة": "room", "عنوان": "address",
    "collegegeld": "tuition fee", "kosten": "fee", "kost": "fee", "prijs": "price", "studentenhuis": "hostel",
    "studentenkamer": "hostel", "huisvesting": "hostel", "studiebeurs": "scholarship", "beurs": "scholarship",
    "opleiding": "course", "toelating": "admission", "inschrijving": "admission", "kamer": "room", "adres": "address",
    "openingstijden": "opening hours", "parkeren": "parking",
    "studiengebuhren": "tuition fee", "gebuhr": "fee", "gebuhren": "fee", "kosten ": "fee", "preis": "price",
    "wohnheim": "hostel", "stipendium": "scholarship", "studiengang": "course", "zulassung": "admission", "zimmer": "room",
    "offnungszeiten": "opening hours",
    "matricula": "tuition fee", "tasa": "fee", "cuota": "fee", "precio": "price", "residencia": "hostel", "beca": "scholarship",
    "carrera": "course", "admision": "admission", "habitacion": "room", "horario": "opening hours",
    "frais de scolarite": "tuition fee", "frais": "fee", "prix": "price", "logement": "hostel", "residence": "hostel",
    "bourse": "scholarship", "formation": "course", "chambre": "room", "horaires": "opening hours",
}


def _build_phrases() -> List[Tuple[str, str]]:
    table: Dict[str, str] = {}
    for src in (_COUNTRIES, _TERMS):
        for k, v in src.items():
            key = " ".join(words(k.strip()))
            if key:
                table[key] = v
    return sorted(table.items(), key=lambda kv: -len(kv[0]))  # longest phrase first ("अंतिम तिथि" before "तिथि")


_PHRASES = _build_phrases()
_SINGLE = {k: v for k, v in _PHRASES if " " not in k}
_MULTI = [(k, v) for k, v in _PHRASES if " " in k]


def to_english(text: str) -> str:
    """The folded text with known words and phrases replaced by the English words documents use. Unknown words stay."""
    joined = " " + " ".join(words(text)) + " "
    for phrase, english in _MULTI:
        joined = joined.replace(f" {phrase} ", f" {english} ")
    out = []
    for w in joined.split():
        found = _SINGLE.get(w) or _SINGLE.get(strip_arabic_article(w))
        if not found and len(w) > 3 and w[0] in "وبلكف":  # a joined one-letter preposition: لطالب -> طالب (dictionary words only)
            found = _SINGLE.get(w[1:]) or _SINGLE.get(strip_arabic_article(w[1:]))
        out.append(found or w)
    return " ".join(out)


# ------------------------------------------------------------------------------------------------ translation fallback

_translator = None  # tests: set_translator(fn)
_cache: "Dict[str, str]" = {}


def set_translator(fn) -> None:
    """Tests and scripts: translate with `fn(text) -> str | None` (None restores the configured LLM)."""
    global _translator
    _translator = fn
    _cache.clear()


def translate_query(text: str) -> str | None:
    """The question in English, for a search that found nothing in the caller's language. One short LLM call (Groq, the
    agent's own provider) with KB_TRANSLATE_TIMEOUT; None when it is off, unavailable or slow. Runs in the tool's worker
    thread, never on the call's event loop."""
    key = text.strip().lower()
    if key in _cache:
        return _cache[key]
    result = None
    try:
        if _translator is not None:
            result = _translator(text)
        else:
            from backend.server.common.config import get_settings

            s = get_settings()
            if (getattr(s, "KB_QUERY_TRANSLATION", "auto") or "auto").lower() == "off" or not s.GROQ_API_KEY:
                return None
            import httpx

            resp = httpx.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {s.GROQ_API_KEY}"},
                json={"model": s.GROQ_MODEL, "temperature": 0, "max_tokens": 80, "messages": [
                    {"role": "system", "content": "Translate the customer's question into English for a document search. "
                                                  "Keep names, numbers, course codes and years exactly. Reply with the translation only."},
                    {"role": "user", "content": text[:500]}]},
                timeout=s.KB_TRANSLATE_TIMEOUT,
            )
            if resp.status_code == 200:
                result = (resp.json()["choices"][0]["message"]["content"] or "").strip().strip('"')[:500] or None
    except Exception:
        result = None
    if result:
        _cache[key] = result
        while len(_cache) > 512:
            _cache.pop(next(iter(_cache)))
    return result
