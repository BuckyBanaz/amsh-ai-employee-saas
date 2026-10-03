"""Numbers for the clinic dashboard, all computed from the clinic's own calls and bookings.

Nothing here is a placeholder: with no data a count is 0 and a rate or trend is None (the dashboard shows a dash). "Today" and
"yesterday" follow the clinic's own timezone. Trends compare with the previous equal period and are None when that period had none.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.server.common.channels import channel_color, channel_label, channel_of
from backend.server.database.models.business import Business
from backend.server.database.models.call import Call
from backend.server.database.models.transaction import Transaction

VOLUME_BUCKETS = (0, 3, 6, 9, 12, 15, 18, 21)  # 3-hour windows covering the whole day: the AI answers around the clock
SPARK_DAYS = 6


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    return None if dt is None else (dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc))


def _zone(name: Optional[str]) -> ZoneInfo:
    try:
        return ZoneInfo(name or "UTC")
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC")


def trend(current: int, previous: int, label: str) -> Optional[str]:
    """"+12% from yesterday", or None when there is nothing to compare with."""
    if previous <= 0:
        return None
    pct = round((current - previous) / previous * 100)
    return f"{'+' if pct >= 0 else ''}{pct}% from {label}"


def _hour_label(h: int) -> str:
    return f"{h % 12 or 12} {'AM' if h < 12 else 'PM'}"


def _spark(values: List[int]) -> List[int]:
    """Bar heights 0-100 relative to the busiest day; an all-zero series stays flat at 0."""
    top = max(values) if values else 0
    return [round(v / top * 100) if top else 0 for v in values]


def compute(db: Session, business: Business, now: Optional[datetime] = None) -> Dict[str, Any]:
    now = _aware(now) or datetime.now(timezone.utc)
    tz = _zone(business.timezone)
    local_now = now.astimezone(tz)
    today = local_now.date()
    first_day = today - timedelta(days=SPARK_DAYS - 1)
    since = datetime.combine(first_day - timedelta(days=SPARK_DAYS), datetime.min.time(), tzinfo=tz).astimezone(timezone.utc)  # enough history for trends

    calls = [c for c in db.scalars(select(Call).where(Call.business_id == business.id, Call.started_at >= since)).all()]
    txs = db.scalars(select(Transaction).where(Transaction.business_id == business.id)).all()
    appointments = [t for t in txs if t.type == "appointment"]

    def local_day(dt: Optional[datetime]):
        return _aware(dt).astimezone(tz).date() if dt else None

    calls_by_day: Dict[Any, List[Call]] = {}
    for c in calls:
        calls_by_day.setdefault(local_day(c.started_at), []).append(c)
    appts_by_day: Dict[Any, int] = {}
    for t in appointments:
        appts_by_day[local_day(t.created_at)] = appts_by_day.get(local_day(t.created_at), 0) + 1

    def calls_on(d) -> List[Call]:
        return calls_by_day.get(d, [])

    def resolution(cs: List[Call]) -> Optional[float]:
        done = [c for c in cs if c.outcome != "live"]
        return round((sum(c.outcome != "transferred" for c in done) / len(done)) * 100, 1) if done else None

    # New patients: people whose first booking was in the last 7 days (identified by phone number), against the 7 days before.
    first_seen: Dict[str, datetime] = {}
    for t in sorted(appointments, key=lambda x: _aware(x.created_at) or now):
        phone = (t.details or {}).get("phone_number") or (t.details or {}).get("phone")
        if phone and phone not in first_seen:
            first_seen[phone] = _aware(t.created_at) or now
    week_ago, two_weeks_ago = now - timedelta(days=7), now - timedelta(days=14)
    new_this_week = sum(1 for d in first_seen.values() if d >= week_ago)
    new_prev_week = sum(1 for d in first_seen.values() if two_weeks_ago <= d < week_ago)

    days = [first_day + timedelta(days=i) for i in range(SPARK_DAYS)]
    calls_today, calls_yday = len(calls_on(today)), len(calls_on(today - timedelta(days=1)))
    appts_today, appts_yday = appts_by_day.get(today, 0), appts_by_day.get(today - timedelta(days=1), 0)
    res_today, res_yday = resolution(calls_on(today)), resolution(calls_on(today - timedelta(days=1)))
    latencies = [c.latency_ms for c in calls if c.latency_ms]
    transferred_today = sum(c.outcome == "transferred" for c in calls_on(today))

    # Performance panel: the last 7 days of calls.
    week_calls = [c for c in calls if _aware(c.started_at) >= week_ago]
    finished = [c for c in week_calls if c.outcome != "live"]
    transferred = sum(c.outcome == "transferred" for c in finished)
    booked_calls = len({t.call_id for t in appointments if t.call_id and _aware(t.created_at) >= week_ago})
    week_res = resolution(week_calls)
    performance = {
        "resolution_rate": week_res, "resolved": len(finished) - transferred, "booked_appointments": booked_calls,
        "general_inquiries": max(len(finished) - transferred - booked_calls, 0), "escalated_to_human": transferred, "calls": len(finished), "period": "last 7 days",
    }

    volume = []
    for start in VOLUME_BUCKETS:
        n = sum(1 for c in calls_on(today) if start <= _aware(c.started_at).astimezone(tz).hour < start + 3)
        volume.append({"time": _hour_label(start), "calls": n})

    by_channel: Dict[str, int] = {}
    for t in appointments:
        key = channel_of(t.details, t.call_id)
        by_channel[key] = by_channel.get(key, 0) + 1
    total_channel = sum(by_channel.values())
    sources = {"total": total_channel, "breakdown": [
        {"source": k, "label": channel_label(k), "percentage": round(n / total_channel * 100) if total_channel else 0, "count": n, "color": channel_color(k)}
        for k, n in sorted(by_channel.items(), key=lambda kv: -kv[1])]}

    recent = sorted(calls, key=lambda c: _aware(c.started_at), reverse=True)[:5]
    activity = [{
        "id": c.id, "type": "call", "caller": c.caller_name or c.caller_number, "intent": c.intent or "Not analysed yet", "outcome": c.outcome,
        "duration": f"{c.duration_seconds}s", "time": _aware(c.started_at).astimezone(tz).strftime("%I:%M %p"),
    } for c in recent]

    return {
        "metrics": {
            "total_calls": calls_today, "booked_appointments": appts_today, "new_patients": new_this_week, "transferred_calls": transferred_today,
            "resolution_rate": f"{res_today:g}%" if res_today is not None else None, "conversion_rate": f"{res_today:g}%" if res_today is not None else None,
            "avg_latency": f"{round(sum(latencies) / len(latencies))}ms" if latencies else None, "ai_accuracy": None,
            "calls_trend": trend(calls_today, calls_yday, "yesterday"), "appointments_trend": trend(appts_today, appts_yday, "yesterday"),
            "patients_trend": trend(new_this_week, new_prev_week, "last week"),
            "resolution_trend": (f"{'+' if res_today - res_yday >= 0 else ''}{round(res_today - res_yday)} pts from yesterday" if res_today is not None and res_yday is not None else None),
            "calls_spark": _spark([len(calls_on(d)) for d in days]), "appointments_spark": _spark([appts_by_day.get(d, 0) for d in days]),
            "patients_spark": _spark([sum(1 for v in first_seen.values() if local_day(v) == d) for d in days]),
            "resolution_spark": [round(r) if (r := resolution(calls_on(d))) is not None else 0 for d in days],
        },
        "performance": performance, "call_volume": volume, "appointment_sources": sources, "recent_activity": activity,
        "timezone": str(tz), "as_of": now.isoformat(),
    }
