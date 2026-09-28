"""Keeps a half-finished booking from being dropped.

Models get pulled off task by small talk ("what is my name?", "I am building a system like you"): the caller said
"the day after tomorrow" three turns ago and nobody ever confirmed it. This reads only what the caller actually said and,
while a booking is open, produces a short note for the model listing what is already known and telling it to steer back.
Nothing here books anything; it only reminds.
"""

import re
from datetime import date
from typing import Iterable, List, Optional

from backend.ai.engine.agent.datetime_utils import dates_in, parse_time
from backend.ai.engine.agent.hindi import normalize

_INTENT = re.compile(
    r"appoint|apoin|apaint|apoint|\bbook|\bbuk|booking|\bslot\b|बुक|अपॉइंट|अपाइंट|अपोइंट|अपॉइन्ट|एपॉइंट",
    re.IGNORECASE,
)
_WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

BOOKING_NOTE = (
    "BOOKING IN PROGRESS: the caller wants an appointment and it is not finished. From the caller's own words so far: "
    "{known}. Not yet settled: {missing}. Do not drop this. If the caller asks a side question or chats, answer it in one "
    "short sentence and then bring the booking back with the next missing item; when the date and time are known, use "
    "check_availability and read the details back for the caller to confirm."
)


def booking_open(said: Iterable[str], succeeded: Iterable[str]) -> bool:
    """A booking was asked for (in any language) and no booking has been made yet."""
    done = set(succeeded or [])
    if done & {"book", "book_appointment"}:
        return False
    return any(_INTENT.search(s or "") or _INTENT.search(normalize(s or "")) for s in said)


def booking_note(said: List[str], succeeded: Iterable[str], today: date) -> Optional[str]:
    if not booking_open(said, succeeded):
        return None
    known: List[str] = []
    day: Optional[date] = None
    for text in reversed(said):  # the latest mention wins
        found = dates_in(normalize(text), today)
        if found:
            day = sorted(found)[-1]
            break
    when = None
    for text in reversed(said):
        when = parse_time(normalize(text))
        if when:
            break
    if day:
        known.append(f"date {day.isoformat()} ({_WEEKDAYS[day.weekday()]})")
    if when:
        known.append(f"time {when.strftime('%I:%M %p')}")
    missing = [name for name, have in (("date", day), ("time", when)) if not have]
    missing += ["service", "caller's name and phone number (unless already given)"]
    return BOOKING_NOTE.format(known=", ".join(known) or "nothing concrete yet", missing=", ".join(missing))
