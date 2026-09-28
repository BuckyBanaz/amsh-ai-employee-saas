"""Deterministic date/time parsing for booking validation.
The LLM may pass loose values ("tomorrow", "Thursday", "5 pm"); code turns them into exact dates/times
or rejects them, so the database never stores a relative or ambiguous value."""

import re
from datetime import date, datetime, time, timedelta
from typing import Optional

_WEEKDAYS = {
    "monday": 0, "mon": 0, "tuesday": 1, "tue": 1, "tues": 1, "wednesday": 2, "wed": 2,
    "thursday": 3, "thu": 3, "thur": 3, "thurs": 3, "friday": 4, "fri": 4, "saturday": 5, "sat": 5,
    "sunday": 6, "sun": 6,
    # Hindi (Roman script)
    "somvar": 0, "mangalvar": 1, "budhvar": 2, "guruvar": 3, "veervar": 3, "shukravar": 4,
    "shanivar": 5, "ravivar": 6, "itwar": 6,
}
_MONTHS = {
    "january": 1, "jan": 1, "february": 2, "feb": 2, "march": 3, "mar": 3, "april": 4, "apr": 4, "may": 5,
    "june": 6, "jun": 6, "july": 7, "jul": 7, "august": 8, "aug": 8, "september": 9, "sep": 9, "sept": 9,
    "october": 10, "oct": 10, "november": 11, "nov": 11, "december": 12, "dec": 12,
}
_ISO = re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b")
_DMY = re.compile(r"\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b")
_DAY_MONTH = re.compile(r"\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]{3,9})\b")
_MONTH_DAY = re.compile(r"\b([a-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?\b")
_CLOCK = re.compile(r"\b(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?(?![\d:])", re.IGNORECASE)


def _safe_date(y: int, m: int, d: int) -> Optional[date]:
    try:
        return date(y, m, d)
    except ValueError:
        return None


def _next_weekday(today: date, weekday: int) -> date:
    """Next occurrence strictly after today ("Monday" said on a Monday means next week)."""
    return today + timedelta(days=(weekday - today.weekday() - 1) % 7 + 1)


def parse_date(text: Optional[str], today: date) -> Optional[date]:
    """Returns an exact date, or None if the text is not an understandable calendar date."""
    if not text:
        return None
    s = str(text).strip().lower()

    if m := _ISO.search(s):
        return _safe_date(int(m[1]), int(m[2]), int(m[3]))
    if re.search(r"\b(day after tomorrow|parso)\b", s):
        return today + timedelta(days=2)
    if re.search(r"\b(today|aaj)\b", s):
        return today
    if re.search(r"\b(tomorrow|kal)\b", s):
        return today + timedelta(days=1)
    if re.search(r"\bnext week\b", s):
        return None  # too vague to book; the agent must ask for a day

    for word, weekday in _WEEKDAYS.items():
        if re.search(rf"\b{word}\b", s):
            return _next_weekday(today, weekday)

    if m := _DAY_MONTH.search(s):
        month = _MONTHS.get(m[2])
        if month:
            return _roll_year(today, month, int(m[1]))
    if m := _MONTH_DAY.search(s):
        month = _MONTHS.get(m[1])
        if month:
            return _roll_year(today, month, int(m[2]))
    if m := _DMY.search(s):  # day-first (India)
        day, month = int(m[1]), int(m[2])
        if m[3]:
            year = int(m[3]) + (2000 if int(m[3]) < 100 else 0)
            return _safe_date(year, month, day)
        return _roll_year(today, month, day)
    return None


def dates_in(text: Optional[str], today: date) -> set:
    """Every calendar date mentioned anywhere in `text` ("closed tomorrow. How about Thursday or Friday?").
    Lenient by design: used to check that a date came from the conversation, never to book one."""
    s = str(text or "").lower()
    found: set = set()
    for m in _ISO.finditer(s):
        found.add(_safe_date(int(m[1]), int(m[2]), int(m[3])))
    if re.search(r"\b(day after tomorrow|parso)\b", s):
        found.add(today + timedelta(days=2))
    if re.search(r"\b(today|aaj)\b", s):
        found.add(today)
    if re.search(r"\b(tomorrow|kal)\b", s):
        found.add(today + timedelta(days=1))
    for word, weekday in _WEEKDAYS.items():
        if re.search(rf"\b{word}\b", s):
            found.add(_next_weekday(today, weekday))
    for m in _DAY_MONTH.finditer(s):
        if _MONTHS.get(m[2]):
            found.add(_roll_year(today, _MONTHS[m[2]], int(m[1])))
    for m in _MONTH_DAY.finditer(s):
        if _MONTHS.get(m[1]):
            found.add(_roll_year(today, _MONTHS[m[1]], int(m[2])))
    for m in _DMY.finditer(s):
        found.add(parse_date(m[0], today))
    found.discard(None)
    return found


def _roll_year(today: date, month: int, day: int) -> Optional[date]:
    d = _safe_date(today.year, month, day)
    if d and d < today:
        d = _safe_date(today.year + 1, month, day)
    return d


def parse_time(text: Optional[str]) -> Optional[time]:
    """Returns an exact time. Ambiguous clock times ("5", "5:30" with no am/pm) return None so the agent asks."""
    if not text:
        return None
    s = str(text).strip().lower()
    if re.search(r"\bnoon\b", s):
        return time(12, 0)
    if re.search(r"\bmidnight\b", s):
        return time(0, 0)
    m = _CLOCK.search(s)
    if not m:
        return None
    hour, minute, meridiem = int(m[1]), int(m[2] or 0), (m[3] or "").replace(".", "")
    if minute > 59 or hour > 23:
        return None
    if meridiem:
        if not 1 <= hour <= 12:
            return None
        hour = hour % 12 + (12 if meridiem == "pm" else 0)
        return time(hour, minute)
    if hour >= 13 or hour == 0:
        return time(hour, minute)  # unambiguous 24h clock
    # "subah 10 baje", "10 in the morning", "shaam 5 baje": the time of day settles AM/PM.
    if re.search(r"\b(subah|savere|morning)\b", s):
        return time(hour % 12, minute)
    if re.search(r"\b(dopahar|afternoon|shaam|evening)\b", s):
        return time(hour % 12 + 12, minute)
    if re.search(r"\b(raat|night)\b", s):
        return time(0 if hour == 12 else hour % 12 + 12, minute)
    return None


def parse_clock(text: Optional[str]) -> Optional[time]:
    """Like parse_time but for stored business hours, where "09:00" means 24h clock, not ambiguous."""
    t = parse_time(text)
    if t:
        return t
    m = re.fullmatch(r"\s*(\d{1,2})(?:[:.](\d{2}))?\s*", str(text or ""))
    if m and int(m[1]) < 24 and int(m[2] or 0) < 60:
        return time(int(m[1]), int(m[2] or 0))
    return None


def format_time(t: time) -> str:
    return t.strftime("%I:%M %p")


def to_minutes(t: time) -> int:
    return t.hour * 60 + t.minute


def speak_date(d: date, today: date) -> str:
    if d == today:
        return "today"
    if d == today + timedelta(days=1):
        return "tomorrow"
    return f"{d.strftime('%A')}, {d.day} {d.strftime('%B')}"


def local_now(tz_name: Optional[str]) -> datetime:
    """Current time in the business timezone; falls back to UTC if the tz database is unavailable."""
    try:
        from zoneinfo import ZoneInfo

        return datetime.now(ZoneInfo(tz_name or "UTC"))
    except Exception:
        return datetime.utcnow()
