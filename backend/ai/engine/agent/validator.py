"""Deterministic action gate. The LLM only *asks* for an action; this module decides whether it may run.
Everything here is pure Python: it normalises loose LLM arguments, rejects impossible bookings, and enforces
the read-back -> caller-says-yes -> commit protocol for every write."""

import re
from dataclasses import dataclass, field
from datetime import date, datetime
from functools import lru_cache
from typing import Any, Dict, List, Optional, Pattern, Set, Tuple

from backend.ai.engine.agent.availability import (
    DEFAULT_SLOT_MINUTES,
    Availability,
    Booked,
    day_ranges,
    is_free,
    is_within,
    open_slots,
)
from backend.ai.engine.agent.datetime_utils import dates_in, format_time, parse_date, parse_time, speak_date
from backend.ai.engine.agent.grounding import spoken_clock_times, times_in
from backend.ai.engine.agent.hindi import fuzzy_in, normalize as normalize_hindi
from backend.ai.engine.conversation.spoken_numbers import spoken_to_digits
from backend.ai.lexicon import lexicon_languages, load_lexicon


@dataclass
class BusinessFacts:
    """Tenant facts loaded from Postgres once per call and reused by the prompt and the validator."""

    name: str
    timezone: str = ""  # required: resolve_business_context raises when it is empty (no silent UTC)
    working_hours: Dict[str, Any] = field(default_factory=dict)
    services: List[str] = field(default_factory=list)
    doctors: List[str] = field(default_factory=list)
    address: str = ""
    phone: str = ""
    city: str = ""
    country: str = ""
    vertical: str = ""  # required: no silent "clinic" (resolve_business_context raises when it is empty)
    slot_minutes: int = DEFAULT_SLOT_MINUTES  # visit length + the owner's buffer between visits
    notice_hours: float = 0.0  # minimum lead time before an appointment can start
    compliance_clause: str = ""  # the platform's privacy instruction for this region (admin: Policies & Privacy); empty = the built-in text


@dataclass
class Proposal:
    fields: Dict[str, Any]
    turn: int


@dataclass
class ActionGate:
    """Per-call protocol state. `turn` counts caller turns; a commit is only legal on a *later* turn than the
    read-back, which guarantees the caller actually had a chance to say yes."""

    turn: int = 0
    proposals: Dict[str, Proposal] = field(default_factory=dict)
    refs: Dict[str, str] = field(default_factory=dict)  # "A1" -> appointment id returned by lookup this call
    ref_phone: Dict[str, str] = field(default_factory=dict)


def err(code: str, message: str, **extra: Any) -> Dict[str, Any]:
    return {"ok": False, "code": code, "message": message, **extra}


def normalize_phone(text: Optional[str]) -> str:
    """Digits only, keeping a leading country code (so +91 98765 43210 -> 919876543210)."""
    return re.sub(r"\D", "", str(text or ""))


def same_phone(a: Optional[str], b: Optional[str]) -> bool:
    """Compare the last 10 digits, so +91-prefixed and local forms of one number match."""
    da, db = normalize_phone(a), normalize_phone(b)
    return len(da) >= 7 and len(db) >= 7 and da[-10:] == db[-10:]


def _clean_person(name: str) -> str:
    return re.sub(r"^(?:dr\.?|doctor)\s+", "", name.strip(), flags=re.IGNORECASE).lower()


_NO_PREFERENCE = {"any", "anyone", "any doctor", "anybody", "no preference", "none", "no", "n/a", "na", "null", "unspecified",
                  "not specified", "doesn't matter", "koi bhi", "koi bhi doctor", "koi bhi chalega", "कोई भी", "कोई भी डॉक्टर"}


def no_doctor_preference(name: Optional[str]) -> bool:
    """Models fill an optional 'doctor' with a placeholder ('any', 'none', 'koi bhi') when the caller expressed no
    preference. That means unspecified, not a doctor called 'any'."""
    return not str(name or "").strip() or str(name).strip().lower().rstrip(".") in _NO_PREFERENCE


def match_doctor(query: Optional[str], doctors: List[str]) -> Optional[str]:
    if no_doctor_preference(query):
        return None
    q = _clean_person(query)
    for d in doctors:
        c = _clean_person(d)
        if q and (q in c or c in q):
            return d
    return None


def match_service(query: Optional[str], services: List[str]) -> Optional[str]:
    if not query:
        return None
    q = query.strip().lower()
    for s in services:
        if q == s.lower():
            return s
    for s in services:
        if q in s.lower() or s.lower() in q:
            return s
    return None


def local_today(now: datetime) -> date:
    return now.date()


def slot_floor(when: date, now: datetime, notice_hours: float = 0.0) -> Optional[Any]:
    """Earliest start time still bookable on `when`: now + the owner's minimum notice. None = no restriction that
    day; 23:59 = the notice window swallows the whole day."""
    from datetime import time as _time, timedelta

    earliest = (now + timedelta(hours=notice_hours or 0)).replace(tzinfo=None)
    if when < earliest.date():
        return _time(23, 59)
    if when == earliest.date():
        return earliest.time().replace(second=0, microsecond=0)
    return None


def validate_slot(
    when: date,
    start,
    doctor: Optional[str],
    facts: BusinessFacts,
    booked: List[Booked],
    now: datetime,
    ignore_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Returns an error dict if the requested slot is not bookable, else None."""
    if when < now.date():
        return err("past_date", "That date has already passed. Ask the caller for a future date.")
    floor = slot_floor(when, now, facts.notice_hours)
    if floor is not None and (start.hour, start.minute) <= (floor.hour, floor.minute):
        if facts.notice_hours:
            hours = f"{facts.notice_hours:g}"
            return err("too_soon", f"The clinic needs at least {hours} hours' notice for an appointment. Offer a later time or another day.")
        return err("past_time", "That time has already passed today. Offer a later time or another day.")

    avail: Availability = day_ranges(facts.working_hours, when)
    if avail.configured:
        if not avail.ranges:
            return err("closed", f"The clinic is closed on {speak_date(when, now.date())}. Offer another day.")
        if not is_within(avail, start, facts.slot_minutes):
            spans = ", ".join(f"{format_time(a)} to {format_time(b)}" for a, b in avail.ranges)
            return err("outside_hours", f"That time is outside working hours ({spans}). Offer a time within them.")
    if not is_free(booked, start, doctor, len(facts.doctors), facts.slot_minutes, ignore_id):
        alternatives = open_slots(avail, booked, doctor, len(facts.doctors), facts.slot_minutes, floor, ignore_id)[:4]
        return err(
            "slot_taken",
            "That slot is already taken. Offer the alternatives instead.",
            alternatives=[format_time(t) for t in alternatives],
        )
    return None


def normalize_booking(args: Dict[str, Any], facts: BusinessFacts, now: datetime) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """Loose LLM args -> exact, validated fields. Returns (fields, None) or (None, error)."""
    missing = [k for k in ("patient_name", "phone_number", "preferred_date", "preferred_time") if not str(args.get(k) or "").strip()]
    if missing:
        return None, err("missing_fields", f"Still need from the caller: {', '.join(missing)}. Ask for them naturally.", missing=missing)

    name = " ".join(str(args["patient_name"]).split())
    if len(name) < 2 or re.search(r"\d", name):
        return None, err("bad_name", "That does not look like a person's name. Ask the caller to say their full name again.")

    phone = normalize_phone(args["phone_number"])
    if len(phone) < 10:
        return None, err("bad_phone", "The phone number needs at least 10 digits. Ask the caller to repeat it slowly.")

    when = parse_date(args["preferred_date"], now.date())
    if not when:
        return None, err("bad_date", "Could not understand the date. Ask for a specific day, like tomorrow or Thursday.")
    start = parse_time(args["preferred_time"])
    if not start:
        return None, err("bad_time", "The time is unclear. Ask for an exact time including AM or PM.")

    doctor = None
    if not no_doctor_preference(args.get("doctor_name")):
        doctor = match_doctor(args["doctor_name"], facts.doctors)
        if not doctor:
            names = ", ".join(facts.doctors) or "none listed"
            return None, err("unknown_doctor", f"No doctor by that name. Doctors here: {names}.")
    service = None
    if args.get("service_name"):
        service = match_service(args["service_name"], facts.services) if facts.services else str(args["service_name"])
        if not service:
            return None, err("unknown_service", f"That service is not offered. Services: {', '.join(facts.services)}.")
    elif facts.services:
        return None, err("missing_fields", "Still need from the caller: service_name. Ask what the visit is for.", missing=["service_name"])

    return {
        "patient_name": name,
        "phone_number": phone,
        "date": when,
        "time": start,
        "doctor_name": doctor or "",
        "service_name": service or "",
    }, None


def _not_from_caller(field: str) -> Dict[str, Any]:
    return err(
        "not_from_caller",
        f"The caller has not told you the {field.replace('_', ' ')}. Do not choose it yourself: ask the caller for it.",
        field=field,
    )


def ground_booking(fields: Dict[str, Any], said: List[str], caller_number: str, today: date) -> Optional[Dict[str, Any]]:
    """Every value that decides *who / when* must trace back to something the caller actually said.
    Models fill blanks with plausible guesses (a first free slot, a default service); a guess must never reach a
    read-back, let alone the database. `said` is every caller utterance so far in this call."""
    said = [normalize_hindi(s) for s in said]  # Devanagari -> Roman approximation, for checking only
    text = " ".join(said).lower()
    compact = re.sub(r"[^a-z]", "", text)  # tolerates names spelled letter by letter ("P A R I K S H I T")

    for token in re.findall(r"[a-z]+", fields["patient_name"].lower()):
        # fuzzy: a name said in Devanagari (परीक्षित) is transliterated, so "Parikshit" must match "pareekshit"
        if len(token) >= 3 and token not in compact and not fuzzy_in(token, said):
            return _not_from_caller("patient_name")

    per_message = [spoken_to_digits(s) for s in said]
    candidates = per_message + ["".join(d for d in per_message if len(d) >= 3)]  # number split over several turns
    phone = fields["phone_number"]
    if not any(phone[-10:] in c for c in candidates) and not same_phone(phone, caller_number):
        return _not_from_caller("phone_number")

    if not any(fields["date"] in dates_in(s, today) for s in said):
        return _not_from_caller("preferred_date")

    start = fields["time"]
    h12 = start.hour % 12 or 12
    stated = any(
        parse_time(s) == start
        or (start.hour, start.minute) in times_in(s)
        or re.search(rf"\b0?{h12}(?::{start.minute:02d})?\b", s.lower())
        or (h12, start.minute) in spoken_clock_times(s)  # in words, any language: "बारह बजे", "half twaalf"
        for s in said
    )
    if not stated:
        return _not_from_caller("preferred_time")
    return None


def describe(fields: Dict[str, Any], today: date) -> str:
    who = f" with {fields['doctor_name']}" if fields.get("doctor_name") else ""
    svc = f" for {fields['service_name']}" if fields.get("service_name") else ""
    return f"{speak_date(fields['date'], today)} at {format_time(fields['time'])}{who}{svc}"



@lru_cache(maxsize=None)
def _pack_affirm() -> Optional[Pattern[str]]:
    """A yes in any language pack's "affirm" list ("sahee hai", "ja, klopt", "oui", "sí", "نعم"), at the start of the reply."""
    words = {w.lower() for code in lexicon_languages() for w in load_lexicon(code).get("affirm") or []}
    if not words:
        return None
    alt = "|".join(re.escape(w) for w in sorted(words, key=len, reverse=True))
    return re.compile(rf"^\W*(?:{alt})(?!\w)", re.IGNORECASE)


def is_affirmative(text: Optional[str]) -> bool:
    """The caller's reply starts with a yes ("yes please", "haan theek hai", "sounds good"), in any language with a pack."""
    s = text or ""
    pack = _pack_affirm()
    return bool(pack and pack.search(s))


_HUMAN_NOUN =r"(?:human|real\s+person|a\s+person|someone|somebody|staff|front\s*desk|receptionist|operator|representative|manager|insaan|aadmi|kisi)"
_REQUEST_VERB = r"(?:talk|speak|connect|transfer|put\s+me|get\s+me|want|need|give\s+me|baat|milao|milwao|connect\s+kar)"


def explicit_human_request(text: Optional[str]) -> bool:
    """True when the caller clearly asks for a person ("I want to talk to a human"); a bare identity question
    ("are you a real person?") is not a request, so the agent must answer it instead of transferring."""
    s = (text or "").lower()
    return bool(re.search(_HUMAN_NOUN, s) and re.search(_REQUEST_VERB, s))


def check_confirmation(
    gate: ActionGate, key: str, fields: Dict[str, Any], confirmed: bool, prompt: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """Enforces read-back protocol. Returns None when the action may run; otherwise a result for the LLM.
    Step 1 (confirmed=false): store proposal. Step 2 (confirmed=true): proposal must match and be older than this turn."""
    if not confirmed:
        gate.proposals[key] = Proposal(fields=dict(fields), turn=gate.turn)
        return {
            "ok": False,
            "code": "needs_confirmation",
            "message": prompt or "Read these details back to the caller and ask them to confirm. Do not say it is done yet.",
            "details": _printable(fields),
        }
    proposal = gate.proposals.get(key)
    if not proposal or proposal.fields != fields:
        gate.proposals[key] = Proposal(fields=dict(fields), turn=gate.turn)
        return err("no_matching_readback", "The caller has not heard these exact details yet. Read them back and ask for confirmation first.", details=_printable(fields))
    if gate.turn <= proposal.turn:
        return err("caller_not_responded", "The caller has not answered yet. Ask for their confirmation and wait for their reply.")
    return None


def _printable(fields: Dict[str, Any]) -> Dict[str, Any]:
    out = {}
    for k, v in fields.items():
        out[k] = format_time(v) if hasattr(v, "hour") else (v.isoformat() if hasattr(v, "isoformat") else v)
    return out
