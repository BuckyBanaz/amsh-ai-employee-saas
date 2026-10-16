"""
Spoken-number helpers.
STT often returns phone numbers as words ("eight nine zero one ..."), which LLM slot
extraction can miss. These pure-Python helpers turn them back into digit strings.
"""

import re
from typing import List

_DIGIT_WORDS = {
    "zero": "0", "oh": "0", "o": "0", "shunya": "0",
    "one": "1", "ek": "1",
    "two": "2", "do": "2",
    "three": "3", "teen": "3",
    "four": "4", "char": "4", "chaar": "4",
    "five": "5", "paanch": "5", "panch": "5",
    "six": "6", "chhe": "6", "chheh": "6", "cheh": "6",
    "seven": "7", "saat": "7",
    "eight": "8", "aath": "8",
    "nine": "9", "nau": "9",
}
_MULTIPLIERS = {"double": 2, "triple": 3}


def spoken_to_digits(text: str) -> str:
    """Return the digits spoken in `text`, e.g. 'eight nine double zero 1' -> '89001'.
    Words that are not digits are ignored."""
    tokens: List[str] = re.findall(r"[a-z]+|\d+", text.lower())
    out: List[str] = []
    repeat = 1
    for tok in tokens:
        if tok in _MULTIPLIERS:
            repeat = _MULTIPLIERS[tok]
            continue
        digits = tok if tok.isdigit() else _DIGIT_WORDS.get(tok, "")
        if digits:
            out.append(digits * repeat)
        repeat = 1
    return "".join(out)


def normalize_phone(value: str) -> str:
    """Normalize an extracted phone value (digits or spoken words) to a clean digit string."""
    return spoken_to_digits(str(value))


def read_back_digits(digits: str) -> str:
    """'8901414107' -> '8 9 0 1 4 1 4 1 0 7' so TTS reads it digit by digit."""
    return " ".join(digits)
