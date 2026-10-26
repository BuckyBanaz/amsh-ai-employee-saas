"""Department routing for human transfers (DOCS/31 §5.2): which team a caller is connected to, whether it can take the call now,
what is tried when it cannot, and the record of what really happened.

Only for businesses that configured a department directory (`departments` table). A business without one (every clinic today)
never reaches this module: its transfers ring the fallback number / business line exactly as before.

    choose()            the department for a request: its exact key, else the best intent + context match, else the general desk;
                        then the first one in its fallback chain that is open now and has a destination (bounded, no cycles)
    start_attempt()     a `transfer_attempts` row (status "initiated"), created only when a dial is really placed
    dial_result()       the provider's real <Dial> result for an attempt; on no answer / busy / failure: ONE fallback hop to
                        another open department, else a callback task (an `enquiries` row of kind "callback")

A transfer is never reported as successful by this module: "initiated" means dialled; only the provider's callback sets
"completed". Phone numbers are configuration: logs and attempts keep the last four digits only.
"""

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from backend.ai.engine.agent.availability import day_ranges
from backend.ai.engine.agent.datetime_utils import local_now
from backend.server.database.models.business import Business
from backend.server.database.models.vertical import Department, Enquiry, TransferAttempt

logger = logging.getLogger(__name__)

E164 = re.compile(r"^\+[1-9]\d{6,14}$")
GENERAL_INTENTS = ("human_request", "general_enquiry")
ANSWERED = {"completed", "answer", "answered"}


@dataclass
class RouteDecision:
    department: Optional[Department]  # the one to dial; None when nobody can take the call now
    requested: str
    code: str  # "route" (dial it) | "unknown_department" | "department_closed" | "no_destination"
    tried: List[Tuple[str, str]] = field(default_factory=list)  # (key, why skipped) along the fallback chain


def _key(text: Optional[str]) -> str:
    return re.sub(r"[^a-z0-9]+", "_", str(text or "").strip().lower()).strip("_")


def has_directory(db: Session, business_id: str) -> bool:
    return db.query(Department.id).filter(Department.business_id == business_id, Department.active.is_(True)).first() is not None


def is_open(dept: Department, business: Optional[Business], now: Optional[datetime] = None) -> bool:
    """Open now by the department's own hours, else the business's. Hours not configured anywhere = open (as for the business)."""
    hours = dept.hours if dept.hours else (business.working_hours if business else None)
    tz = (business.timezone if business else None) or "UTC"
    now = now or local_now(tz)
    avail = day_ranges(hours, now.date())
    if not avail.configured:
        return True
    minutes = now.hour * 60 + now.minute
    return any(a.hour * 60 + a.minute <= minutes < b.hour * 60 + b.minute for a, b in avail.ranges)


def _matches(dept: Department, intent: str, context: Dict[str, Any]) -> bool:
    intents = {_key(i) for i in (dept.intents or [])}
    if intent and intent not in intents:
        return False
    return all(_key(context.get(k)) == _key(v) for k, v in (dept.match or {}).items())


def choose(db: Session, business_id: str, requested: str, context: Optional[Dict[str, Any]] = None,
           now: Optional[datetime] = None) -> RouteDecision:
    context = {k: v for k, v in (context or {}).items() if v not in (None, "")}
    wanted = _key(requested)
    departments = (
        db.query(Department)
        .filter(Department.business_id == business_id, Department.active.is_(True))
        .order_by(Department.priority.desc(), Department.key)
        .all()
    )
    by_key = {d.key: d for d in departments}
    first: Optional[Department] = by_key.get(wanted)
    if first is None:
        intent = _key(context.get("topic")) if wanted in ("", "route", "front_desk") else wanted
        candidates = [d for d in departments if intent and _matches(d, intent, context)]
        if not candidates and wanted not in ("", "route", "front_desk"):
            candidates = [d for d in departments if _matches(d, _key(context.get("topic")), context)] if context.get("topic") else []
        if not candidates:
            candidates = [d for d in departments if {_key(i) for i in d.intents or []} & set(GENERAL_INTENTS)]
        first = candidates[0] if candidates else None
    if first is None:
        return RouteDecision(None, wanted, "unknown_department")

    business = db.get(Business, business_id)
    tried: List[Tuple[str, str]] = []
    dept: Optional[Department] = first
    seen = set()
    while dept is not None and dept.key not in seen and len(seen) <= len(departments):
        seen.add(dept.key)
        if not (dept.transfer_phone and E164.match(dept.transfer_phone)):
            tried.append((dept.key, "no_destination"))
        elif not is_open(dept, business, now):
            tried.append((dept.key, "closed"))
        else:
            return RouteDecision(dept, wanted, "route", tried)
        dept = by_key.get(dept.fallback_key or "")
    reason = "department_closed" if any(why == "closed" for _, why in tried) else "no_destination"
    return RouteDecision(None, wanted, reason, tried)


def start_attempt(db: Session, business_id: str, call_id: Optional[str], dept: Department, requested: Optional[str],
                  reason: str, status: str = "initiated") -> TransferAttempt:
    digits = re.sub(r"\D", "", dept.transfer_phone or "")
    row = TransferAttempt(
        business_id=business_id, call_id=call_id, department_key=dept.key,
        requested_key=requested if requested and requested != dept.key else None,
        destination_tail=digits[-4:] or None, reason=(reason or "")[:255], status=status,
    )
    db.add(row)
    db.commit()
    return row


def record_unreachable(db: Session, business_id: str, call_id: Optional[str], decision: RouteDecision, reason: str) -> TransferAttempt:
    """Nobody could be dialled (closed / no destination / no department): the attempt is still recorded for the dashboard."""
    row = TransferAttempt(
        business_id=business_id, call_id=call_id, department_key=(decision.tried[0][0] if decision.tried else decision.requested or "unknown")[:50],
        requested_key=decision.requested or None, status="closed" if decision.code == "department_closed" else "no_destination",
        reason=(reason or "")[:255], outcome_detail=", ".join(f"{k}:{why}" for k, why in decision.tried)[:255] or decision.code,
        finished_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    return row


@dataclass
class DialOutcome:
    attempt: Optional[TransferAttempt]
    fallback: Optional[Department] = None  # dial this next (one hop)
    fallback_attempt: Optional[TransferAttempt] = None
    callback: Optional[Enquiry] = None  # nobody reached: the follow-up task created


def dial_result(db: Session, attempt_id: Optional[str], status: str, caller: Optional[str]) -> DialOutcome:
    """Record the provider's real result for an attempt. Not answered: try the department's fallback once (open, with a
    destination, not already tried on this call), else create a callback task for the team."""
    attempt = db.get(TransferAttempt, attempt_id) if attempt_id else None
    if attempt is None:
        return DialOutcome(None)
    s = (status or "").strip().lower()
    if attempt.finished_at is not None:  # a provider retry of the same callback: report what was decided the first time
        return DialOutcome(attempt)
    attempt.status = "completed" if s in ANSWERED else (s.replace("-", "_") or "failed")[:20]
    attempt.finished_at = datetime.now(timezone.utc)
    db.commit()
    if attempt.status == "completed":
        return DialOutcome(attempt)

    business = db.get(Business, attempt.business_id)
    dept = db.query(Department).filter_by(business_id=attempt.business_id, key=attempt.department_key).first()
    tried = {a.department_key for a in db.query(TransferAttempt).filter_by(business_id=attempt.business_id, call_id=attempt.call_id).all()} if attempt.call_id else {attempt.department_key}
    nxt = db.query(Department).filter_by(business_id=attempt.business_id, key=dept.fallback_key, active=True).first() if dept and dept.fallback_key else None
    if nxt is not None and nxt.key not in tried and nxt.transfer_phone and E164.match(nxt.transfer_phone) and is_open(nxt, business):
        follow = start_attempt(db, attempt.business_id, attempt.call_id, nxt, attempt.requested_key or attempt.department_key,
                               f"fallback after {attempt.status}")
        return DialOutcome(attempt, fallback=nxt, fallback_attempt=follow)

    callback = create_callback(db, attempt.business_id, attempt.call_id, caller, attempt.department_key, f"Transfer {attempt.status}")
    if callback is not None:
        attempt.enquiry_id = callback.id
        db.commit()
    return DialOutcome(attempt, callback=callback)


def create_callback(db: Session, business_id: str, call_id: Optional[str], caller: Optional[str], department_key: Optional[str],
                    note: str) -> Optional[Enquiry]:
    """A callback task for the team (idempotent per call and department). None when the caller's number is unknown."""
    digits = re.sub(r"\D", "", caller or "")
    if len(digits) < 7 or digits.endswith("5550000000"):  # no real caller id (the gateway's placeholder)
        return None
    idem = f"callback:{call_id or digits}:{department_key or ''}"[:80]
    existing = db.query(Enquiry).filter_by(business_id=business_id, idempotency_key=idem).first()
    if existing is not None:
        return existing
    row = Enquiry(
        business_id=business_id, call_id=call_id, source="ai", kind="callback", contact_name="Caller (transfer not answered)",
        contact_phone=("+" + digits) if len(digits) > 10 else digits, contact_phone_key=digits[-10:], department_key=department_key,
        idempotency_key=idem, notes=note[:1000], follow_up_due_at=datetime.now(timezone.utc) + timedelta(hours=4), details={},
    )
    db.add(row)
    try:
        db.commit()
    except Exception:
        db.rollback()
        return db.query(Enquiry).filter_by(business_id=business_id, idempotency_key=idem).first()
    return row
