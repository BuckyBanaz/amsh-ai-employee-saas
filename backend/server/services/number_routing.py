"""Which clinic a phone call belongs to, decided only by numbers the platform assigned (the `phone_numbers` table).

Never by `Business.business_phone`: that is a display field the clinic edits itself, so matching on it let one clinic claim another
clinic's line. Numbers are compared on their last 10 digits (providers send "+918047284627", "08047284627" or "8047284627" for the
same line), and a call is routed only when exactly one assigned number matches: two candidates means a misconfiguration, and the
call is refused rather than handed to a guess.
"""

import logging
import re
from typing import List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.server.database.models.business import Business
from backend.server.database.models.phone_number import PhoneNumber

logger = logging.getLogger(__name__)

ROUTABLE = ("active", "pending")  # "pending" is how the seed scripts and early rows were created; "failed" / "released" never route


def number_key(number: Optional[str]) -> str:
    """Last 10 digits of a phone number, or "" when it has fewer than 7 digits (not a real line)."""
    digits = re.sub(r"\D", "", number or "")
    return digits[-10:] if len(digits) >= 7 else ""


def _rows(db: Session) -> List[PhoneNumber]:
    return list(db.scalars(select(PhoneNumber).where(PhoneNumber.status.in_(ROUTABLE))).all())


def resolve_business(db: Session, dialed: Optional[str], forwarded_from: Optional[str] = None) -> Tuple[Optional[Business], str]:
    """(business, how it was decided). A forwarded call (the clinic's published number forwarded to our line) is matched on the
    number it was forwarded from; otherwise on the number dialed. None when nothing or more than one assignment matches."""
    rows = _rows(db)
    for field, value in (("forwarded_from", forwarded_from), ("number", dialed)):
        key = number_key(value)
        if not key:
            continue
        hits = {r.business_id for r in rows if number_key(getattr(r, field)) == key}
        if len(hits) == 1:
            business = db.get(Business, next(iter(hits)))
            if business is not None:
                return business, f"{field} match"
        if len(hits) > 1:
            logger.error("[ROUTING] %s ends in %s is assigned to %d businesses: refusing the call", field, key[-4:], len(hits))
            return None, "ambiguous"
    return None, "no match"


def assignment_conflict(db: Session, number: Optional[str], forwarded_from: Optional[str], ignore_id: Optional[str] = None) -> Optional[str]:
    """Why `number` / `forwarded_from` cannot be assigned (it would make routing ambiguous), or None."""
    for value in (number, forwarded_from):
        key = number_key(value)
        if not key:
            continue
        for r in db.scalars(select(PhoneNumber)).all():
            if r.id != ignore_id and key in (number_key(r.number), number_key(r.forwarded_from)):
                return f"A number ending in {key[-4:]} is already assigned"
    return None
