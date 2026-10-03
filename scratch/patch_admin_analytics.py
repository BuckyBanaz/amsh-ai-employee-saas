import pathlib

p = pathlib.Path(r"C:\Users\Parikshit\Desktop\saas\backend\server\api\routes\admin.py")
s = p.read_text(encoding="utf-8")
marker = '@router.get("/services")'
assert s.count(marker) == 1
new = '''@router.get("/analytics")
def get_admin_analytics(days: int = 30, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)):
    """Platform analytics computed from the database: tenants, calls, minutes, outcomes, bookings and plan mix for the last
    `days` days (1-365) against the equal period before. Recurring revenue is the list price of each active business's plan, not
    billed money: there is no invoice history to sum yet, and the response says so."""
    from collections import Counter, defaultdict
    from backend.server.database.models.call import Call
    from backend.server.database.models.plan import Plan
    from backend.server.database.models.transaction import Transaction

    days = max(1, min(int(days), 365))
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    prev_start = start - timedelta(days=days)

    calls = db.execute(select(Call).where(Call.started_at >= prev_start)).scalars().all()
    current = [c for c in calls if c.started_at >= start]
    previous = [c for c in calls if c.started_at < start]

    def minutes(items):
        return round(sum(c.duration_seconds or 0 for c in items) / 60, 1)

    def avg_latency(items):
        values = [c.latency_ms for c in items if c.latency_ms]
        return round(sum(values) / len(values)) if values else None

    per_day = defaultdict(lambda: {"calls": 0, "minutes": 0.0})
    for c in current:
        key = c.started_at.date().isoformat()
        per_day[key]["calls"] += 1
        per_day[key]["minutes"] += (c.duration_seconds or 0) / 60
    series = []
    for offset in range(days):
        day = (start + timedelta(days=offset)).date().isoformat()
        series.append({"date": day, "calls": per_day[day]["calls"], "minutes": round(per_day[day]["minutes"], 1)})

    businesses = db.execute(select(Business)).scalars().all()
    plans = {pl.key: pl for pl in db.execute(select(Plan)).scalars().all()}
    active = [b for b in businesses if b.status == "active"]
    mrr = defaultdict(float)
    for b in active:
        plan = plans.get((b.plan or "").lower())
        if plan and not plan.custom_pricing:
            monthly = plan.price if plan.cycle == "monthly" else (plan.price / 12)
            mrr[plan.currency] += monthly
    plan_mix = Counter((b.plan or "none") for b in active)
    vertical_mix = Counter((b.vertical or "unknown") for b in businesses)

    transactions = db.execute(select(Transaction).where(Transaction.created_at >= start)).scalars().all()
    calls_by_business = Counter(c.business_id for c in current)
    names = {b.id: b.name for b in businesses}

    return {
        "range": {"days": days, "from": start.date().isoformat(), "to": now.date().isoformat()},
        "generatedAt": now.isoformat(),
        "tenants": {
            "total": len(businesses),
            "active": len(active),
            "new": sum(1 for b in businesses if b.created_at and b.created_at >= start),
            "newPrevious": sum(1 for b in businesses if b.created_at and prev_start <= b.created_at < start),
            "byStatus": dict(Counter(b.status for b in businesses)),
            "byVertical": dict(vertical_mix),
            "byPlan": dict(plan_mix),
        },
        "calls": {
            "total": len(current),
            "previous": len(previous),
            "minutes": minutes(current),
            "minutesPrevious": minutes(previous),
            "avgLatencyMs": avg_latency(current),
            "avgDurationSeconds": round(sum(c.duration_seconds or 0 for c in current) / len(current)) if current else None,
            "byOutcome": dict(Counter(c.outcome for c in current)),
            "bySentiment": dict(Counter(c.sentiment for c in current if c.sentiment)),
            "series": series,
            "topBusinesses": [{"name": names.get(bid, "Unknown"), "calls": n} for bid, n in calls_by_business.most_common(5)],
        },
        "bookings": {
            "total": len(transactions),
            "byType": dict(Counter(t.type for t in transactions)),
            "byStatus": dict(Counter(t.status for t in transactions)),
        },
        "recurringRevenue": {"perMonth": {cur: round(v, 2) for cur, v in mrr.items()}, "basis": "List price of each active business's plan. Not billed or collected money."},
    }


'''
s = s.replace(marker, new + marker, 1)
p.write_text(s, encoding="utf-8")
print("analytics endpoint added")
