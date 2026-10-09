"""Real availability: business working hours minus existing confirmed appointments.
Pure functions (no DB) so the rules are unit-testable; the toolbox feeds them data loaded from Postgres."""

import re
from dataclasses import dataclass, field
from datetime import date, datetime, time
from typing import Any, Dict, List, Optional, Tuple

from backend.ai.capabilities.operations.clinic.slot_availability import slot_is_free
from backend.ai.engine.agent.datetime_utils import parse_clock, parse_time, to_minutes

DEFAULT_SLOT_MINUTES = 30
_DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


@dataclass
class Booked:
    start: time
    doctor: str = ""
    appointment_id: str = ""


@dataclass
class Availability:
    """`configured=False` means the tenant never saved working hours: we must not invent open/closed."""

    configured: bool
    ranges: List[Tuple[time, time]] = field(default_factory=list)


def normalize_working_hours(working_hours: Any) -> Dict[str, Any]:
    """Normalize working hours from whatever format (dict, list of DaySchedule, etc.) into a consistent dict."""
    if not working_hours:
        return {}
    if isinstance(working_hours, dict):
        return working_hours
    if isinstance(working_hours, list):
        norm: Dict[str, Any] = {}
        for entry in working_hours:
            if isinstance(entry, dict):
                day = entry.get("day") or entry.get("name")
                if not day:
                    continue
                if entry.get("active") is False or entry.get("is_open") is False:
                    norm[str(day)] = []
                    continue
                ranges = entry.get("ranges")
                if ranges is not None:
                    norm[str(day)] = ranges
                elif entry.get("open") or entry.get("start"):
                    start = entry.get("start") or entry.get("open")
                    end = entry.get("end") or entry.get("close")
                    norm[str(day)] = [{"start": start, "end": end}] if start and end else []
                elif entry.get("hours"):
                    norm[str(day)] = entry.get("hours")
                else:
                    norm[str(day)] = []
        return norm
    return {}


def day_ranges(working_hours: Optional[Any], d: date) -> Availability:
    """Open ranges for `d`. Accepts {"Monday": [{"start": "09:00", "end": "17:00"}]} or "9 AM - 5 PM" strings or list schedules."""
    working_hours = normalize_working_hours(working_hours)
    if not working_hours or not isinstance(working_hours, dict):
        return Availability(configured=False)
    by_key = {str(k).strip().lower(): v for k, v in working_hours.items()}
    name = _DAY_KEYS[d.weekday()]
    value = by_key.get(name, by_key.get(name[:3]))
    if value in (None, "", [], {}, False) or (isinstance(value, str) and "closed" in value.lower()):
        return Availability(configured=True, ranges=[])

    items = value if isinstance(value, list) else [value]
    ranges: List[Tuple[time, time]] = []
    for item in items:
        start = end = None
        if isinstance(item, dict):
            start = parse_clock(item.get("start") or item.get("open"))
            end = parse_clock(item.get("end") or item.get("close"))
        elif isinstance(item, str) and re.search(r"[-–]|\bto\b", item):
            left, right = re.split(r"\s*(?:-|–|\bto\b)\s*", item, maxsplit=1)
            start, end = parse_clock(left), parse_clock(right)
        if start and end and to_minutes(end) > to_minutes(start):
            ranges.append((start, end))
    return Availability(configured=True, ranges=ranges)


def is_within(avail: Availability, start: time, slot_minutes: int) -> bool:
    return any(
        to_minutes(a) <= to_minutes(start) and to_minutes(start) + slot_minutes <= to_minutes(b)
        for a, b in avail.ranges
    )


def is_free(
    booked: List[Booked],
    start: time,
    doctor: Optional[str],
    doctor_count: int,
    slot_minutes: int,
    ignore_id: Optional[str] = None,
) -> bool:
    """Delegates to capabilities/operations/clinic/slot_availability.py (the rules live there, in one place)."""
    overlapping = [
        b.doctor
        for b in booked
        if b.appointment_id != ignore_id and abs(to_minutes(b.start) - to_minutes(start)) < slot_minutes
    ]
    return slot_is_free(overlapping, doctor, doctor_count)


def open_slots(
    avail: Availability,
    booked: List[Booked],
    doctor: Optional[str],
    doctor_count: int,
    slot_minutes: int = DEFAULT_SLOT_MINUTES,
    not_before: Optional[time] = None,
    ignore_id: Optional[str] = None,
) -> List[time]:
    slots: List[time] = []
    for start, end in avail.ranges:
        cursor = to_minutes(start)
        while cursor + slot_minutes <= to_minutes(end):
            t = time(cursor // 60, cursor % 60)
            if (not_before is None or to_minutes(t) > to_minutes(not_before)) and is_free(
                booked, t, doctor, doctor_count, slot_minutes, ignore_id
            ):
                slots.append(t)
            cursor += slot_minutes
    return slots


def booked_from_appointments(appointments: List[Dict[str, Any]]) -> List[Booked]:
    """Converts ClinicReadOperations.get_appointments() rows; rows with unparseable times are skipped."""
    out: List[Booked] = []
    for a in appointments:
        t = parse_time(a.get("preferred_time")) or parse_clock(a.get("preferred_time"))
        if t:
            out.append(Booked(start=t, doctor=str(a.get("doctor_name") or ""), appointment_id=str(a.get("id") or "")))
    return out


def now_floor(d: date, now: datetime) -> Optional[time]:
    """For today's date, slots at or before the current time are gone."""
    return now.time().replace(second=0, microsecond=0) if d == now.date() else None
