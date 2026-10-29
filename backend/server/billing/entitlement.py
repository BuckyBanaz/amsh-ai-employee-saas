"""How long a business's plan lasts, and whether its AI still answers calls (F5: trials and paid plans used to never end).

Access is worked out from the stored dates whenever it is needed. Nothing flips `status` in the background: that would be an
automatic destructive action, and it would run once per worker if the API scaled out. `suspended` stays the admin's own switch.

    trial    ends at trial_ends_at
    active   ends at current_period_end, which every full payment extends; billing_cycle "manual" (given by platform staff,
             or no paid period on record) has no end
    others   pending / paused / suspended are not decided by dates

After the end the business gets BILLING_GRACE_DAYS more days ("grace": calls are still answered, the owner is warned),
then "expired": calls are refused until it pays. The dashboard and data stay open so the owner can renew.
"""

import calendar
import math
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

MANUAL = "manual"
CYCLES = ("monthly", "yearly")


def _utc(value: Optional[datetime]) -> Optional[datetime]:
    """SQLite hands back naive datetimes; every stored time here is UTC."""
    if value is None:
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def add_cycle(start: datetime, cycle: str) -> datetime:
    """`start` plus one billing cycle, on the same day of the month (clamped: Jan 31 + 1 month = Feb 28/29)."""
    months = 12 if cycle == "yearly" else 1
    month0 = start.month - 1 + months
    year, month = start.year + month0 // 12, month0 % 12 + 1
    return start.replace(year=year, month=month, day=min(start.day, calendar.monthrange(year, month)[1]))


def grace_days() -> int:
    from backend.server.common.config import get_settings

    return max(0, int(getattr(get_settings(), "BILLING_GRACE_DAYS", 3)))


def ends_at(biz: Any) -> Optional[datetime]:
    """When the current trial or paid period ends; None when nothing ends it (manual plan, or a status dates do not decide)."""
    status = (getattr(biz, "status", "") or "").lower()
    if status == "trial":
        return _utc(getattr(biz, "trial_ends_at", None))
    if status == "active" and getattr(biz, "billing_cycle", None) != MANUAL:
        return _utc(getattr(biz, "current_period_end", None))
    return None


def access(biz: Any, now: Optional[datetime] = None, grace: Optional[int] = None) -> str:
    """"ok", "grace" (period over, still answering) or "expired" (calls refused)."""
    end = ends_at(biz)
    if end is None:
        return "ok"
    now = now or datetime.now(timezone.utc)
    if now <= end:
        return "ok"
    return "grace" if now <= end + timedelta(days=grace_days() if grace is None else grace) else "expired"


def answers_calls(biz: Any, now: Optional[datetime] = None) -> bool:
    return access(biz, now) != "expired"


def start_trial(biz: Any, days: int, now: Optional[datetime] = None) -> None:
    now = now or datetime.now(timezone.utc)
    biz.status = "trial"
    biz.trial_ends_at = now + timedelta(days=max(1, int(days)))


def paid_period(biz: Any, cycle: str, now: Optional[datetime] = None, keep_end: bool = False) -> None:
    """A confirmed payment. A full-price payment adds one cycle from the later of now and the current end, so renewing early
    loses no days; `keep_end` (a prorated upgrade: only the difference was paid) keeps the period that was already paid for."""
    now = now or datetime.now(timezone.utc)
    cycle = cycle if cycle in CYCLES else "monthly"
    current = _utc(biz.current_period_end) if (biz.status or "").lower() == "active" and biz.billing_cycle != MANUAL else None
    if not (keep_end and current and current > now):
        biz.current_period_end = add_cycle(max(now, current) if current else now, cycle)
        biz.billing_cycle = cycle
    biz.status = "active"


def summary(biz: Any, now: Optional[datetime] = None) -> Dict[str, Any]:
    """What the billing page shows: the real end date, days left, and the grace window."""
    now = now or datetime.now(timezone.utc)
    end = ends_at(biz)
    state = access(biz, now)
    out: Dict[str, Any] = {"access": state, "expires_at": end.isoformat() if end else None, "days_left": None, "grace_ends_at": None}
    if end is not None:
        out["days_left"] = max(0, math.ceil((end - now).total_seconds() / 86400))  # a part-day left counts as a day
        out["grace_ends_at"] = (end + timedelta(days=grace_days())).isoformat()
    return out
