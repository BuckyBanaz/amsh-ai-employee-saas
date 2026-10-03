import pathlib

p = pathlib.Path(r"C:\Users\Parikshit\Desktop\saas\backend\server\api\routes\admin.py")
s = p.read_text(encoding="utf-8")
a = s.index('@router.get("/analytics")')
b = s.index('@router.get("/services")')

new = '''def _is_trial_payment(details: dict) -> bool:
    return str((details or {}).get("payment_method", "")).startswith("Free Trial") or (details or {}).get("order_id") == "trial_order_free"


@router.get("/analytics")
def get_admin_analytics(days: int = 30, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)):
    """Platform analytics computed from the database for the last `days` days (1-365) and the equal period before.

    Trial = business status "trial"; trial start = its free-trial payment record. Paid = a non-trial payment record. Revenue is
    the sum of recorded payment amounts (what the payment gateway confirmed), grouped by currency; the daily series uses the
    currency with the most revenue. The growth split uses each business's CURRENT status (there is no status history), and
    churn is the count of paused or suspended businesses now. Nothing is estimated except where the response says so."""
    from collections import Counter, defaultdict
    from backend.server.billing.trial_service import TrialService
    from backend.server.database.models.call import Call
    from backend.server.database.models.plan import Plan
    from backend.server.database.models.transaction import Transaction

    days = max(1, min(int(days), 365))
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    prev_start = start - timedelta(days=days)
    day_keys = [(start + timedelta(days=i)).date() for i in range(days)]
    trial_days = int(TrialService.get_config().get("duration_days", 14))

    businesses = db.execute(select(Business)).scalars().all()
    by_id = {b.id: b for b in businesses}
    plans = {pl.key: pl for pl in db.execute(select(Plan)).scalars().all()}
    plan_name = lambda key: (plans[key].name if key in plans else (key or "None")).title() if key else "None"

    payments = db.execute(select(Transaction).where(Transaction.type == "payment", Transaction.status == "confirmed")).scalars().all()
    trial_started: dict = {}
    first_paid: dict = {}
    paid_events = []
    for t in sorted(payments, key=lambda x: x.created_at):
        d = t.details or {}
        if _is_trial_payment(d):
            trial_started.setdefault(t.business_id, t.created_at)
        else:
            first_paid.setdefault(t.business_id, t)
            paid_events.append(t)
    converted_ids = [bid for bid in first_paid if bid in trial_started and first_paid[bid].created_at >= trial_started[bid]]

    status_of = lambda b: (b.status or "").lower()
    trial_biz = [b for b in businesses if status_of(b) == "trial"]
    paid_biz = [b for b in businesses if status_of(b) == "active"]
    inactive_biz = [b for b in businesses if status_of(b) in ("paused", "suspended")]

    # ---- growth (cumulative businesses per day, split by current status)
    growth = []
    for day in day_keys:
        upto = [b for b in businesses if b.created_at and b.created_at.date() <= day]
        growth.append({
            "date": day.isoformat(),
            "total": len(upto),
            "trial": sum(1 for b in upto if status_of(b) == "trial"),
            "paid": sum(1 for b in upto if status_of(b) == "active"),
        })

    # ---- revenue
    totals_by_currency = defaultdict(float)
    for t in paid_events:
        if t.created_at >= start:
            totals_by_currency[(t.details or {}).get("currency") or "USD"] += float((t.details or {}).get("amount") or 0)
    primary = max(totals_by_currency, key=totals_by_currency.get) if totals_by_currency else "USD"
    revenue_by_day = defaultdict(float)
    for t in paid_events:
        if t.created_at >= start and ((t.details or {}).get("currency") or "USD") == primary:
            revenue_by_day[t.created_at.date()] += float((t.details or {}).get("amount") or 0)
    running = 0.0
    revenue_series = []
    for day in day_keys:
        running += revenue_by_day[day]
        revenue_series.append({"date": day.isoformat(), "revenue": round(revenue_by_day[day], 2), "cumulative": round(running, 2)})
    previous_revenue = sum(float((t.details or {}).get("amount") or 0) for t in paid_events if prev_start <= t.created_at < start and ((t.details or {}).get("currency") or "USD") == primary)

    mrr = defaultdict(float)  # list price of each active, paying business's plan (a standing figure, not collected money)
    for b in paid_biz:
        plan = plans.get((b.plan or "").lower())
        if plan and not plan.custom_pricing and plan.price:
            mrr[plan.currency] += plan.price if plan.cycle == "monthly" else plan.price / 12

    # ---- weekly trials vs conversions
    weeks = []
    week_start = start
    while week_start <= now:
        week_end = week_start + timedelta(days=7)
        weeks.append({
            "label": week_start.strftime("%b %d"),
            "trials": sum(1 for ts in trial_started.values() if week_start <= ts < week_end),
            "converted": sum(1 for bid in converted_ids if week_start <= first_paid[bid].created_at < week_end),
        })
        week_start = week_end

    # ---- calls
    calls = db.execute(select(Call).where(Call.started_at >= prev_start)).scalars().all()
    current = [c for c in calls if c.started_at >= start]
    previous = [c for c in calls if c.started_at < start]
    per_day = defaultdict(lambda: Counter())
    for c in current:
        day = per_day[c.started_at.date()]
        day["calls"] += 1
        day["ai"] += 1 if c.outcome in ("resolved", "booked") else 0
        day["transferred"] += 1 if c.outcome == "transferred" else 0
        day["seconds"] += c.duration_seconds or 0
    call_series = [
        {
            "date": d.isoformat(),
            "calls": per_day[d]["calls"],
            "aiRate": round(per_day[d]["ai"] / per_day[d]["calls"] * 100) if per_day[d]["calls"] else None,
            "transferRate": round(per_day[d]["transferred"] / per_day[d]["calls"] * 100) if per_day[d]["calls"] else None,
        }
        for d in day_keys
    ]
    done = [c for c in current if c.outcome != "live"]
    calls_by_vertical = Counter(((by_id[c.business_id].business_subtype or by_id[c.business_id].vertical or "unknown") if c.business_id in by_id else "unknown").replace("_", " ").title() for c in current)

    bookings = db.execute(select(Transaction).where(Transaction.type == "appointment", Transaction.created_at >= start)).scalars().all()
    calls_per_biz = Counter(c.business_id for c in current)
    bookings_per_biz = Counter(t.business_id for t in bookings)
    top = [
        {"name": by_id[bid].name if bid in by_id else "Unknown", "calls": n, "appointments": bookings_per_biz.get(bid, 0), "conversion": round(bookings_per_biz.get(bid, 0) / n * 100)}
        for bid, n in calls_per_biz.most_common(5)
    ]

    # ---- tables
    def row(b):
        return {"id": b.id, "name": b.name, "vertical": (b.business_subtype or b.vertical or "").replace("_", " ").title(), "plan": plan_name(b.plan), "status": b.status}

    recent = sorted(businesses, key=lambda b: b.created_at or now, reverse=True)[:6]
    expiring = []
    for b in trial_biz:
        began = trial_started.get(b.id) or b.created_at
        left = max(0, trial_days - (now - began).days) if began else None
        expiring.append({**row(b), "daysLeft": left, "calls": calls_per_biz.get(b.id, 0)})
    expiring = sorted(expiring, key=lambda r: (r["daysLeft"] is None, r["daysLeft"]))[:6]
    converted_recent = sorted(converted_ids, key=lambda bid: first_paid[bid].created_at, reverse=True)[:6]

    funnel_started = len({b.id for b in businesses if status_of(b) == "trial" or b.id in trial_started})
    return {
        "range": {"days": days, "from": start.date().isoformat(), "to": now.date().isoformat()},
        "generatedAt": now.isoformat(),
        "currency": primary,
        "kpis": {
            "totalBusinesses": len(businesses),
            "newBusinesses": sum(1 for b in businesses if b.created_at and b.created_at >= start),
            "newBusinessesPrevious": sum(1 for b in businesses if b.created_at and prev_start <= b.created_at < start),
            "trial": len(trial_biz),
            "paid": len(paid_biz),
            "converted": len(converted_ids),
            "inactive": len(inactive_biz),
            "revenue": dict((c, round(v, 2)) for c, v in totals_by_currency.items()),
            "revenuePrevious": round(previous_revenue, 2),
            "mrr": dict((c, round(v, 2)) for c, v in mrr.items()),
        },
        "trialDays": trial_days,
        "growth": growth,
        "planMix": dict(Counter(plan_name(b.plan) for b in businesses)),
        "funnel": {"signups": len(businesses), "trial": funnel_started, "converted": len(converted_ids), "paid": len(paid_biz)},
        "revenueSeries": revenue_series,
        "weekly": weeks,
        "calls": {
            "total": len(current),
            "previous": len(previous),
            "series": call_series,
            "aiRate": round(sum(1 for c in done if c.outcome in ("resolved", "booked")) / len(done) * 100) if done else None,
            "transferRate": round(sum(1 for c in done if c.outcome == "transferred") / len(done) * 100) if done else None,
            "byVertical": dict(calls_by_vertical),
        },
        "topBusinesses": top,
        "recentSignups": [{**row(b), "createdAt": b.created_at.isoformat() if b.created_at else None} for b in recent],
        "trialExpiring": expiring,
        "recentlyConverted": [
            {**row(by_id[bid]), "convertedAt": first_paid[bid].created_at.isoformat(), "toPlan": plan_name((first_paid[bid].details or {}).get("plan"))}
            for bid in converted_recent if bid in by_id
        ],
    }


'''
s = s[:a] + new + s[b:]
p.write_text(s, encoding="utf-8")
print("analytics v2 written")
