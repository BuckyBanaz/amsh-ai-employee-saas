"""What each paid tool costs us, and what that leaves after revenue.

Quantities come from what the platform already records: call minutes from `calls`, spoken characters from the AI's transcript turns,
messages from `message_log`, LLM tokens from `usage_events`. Prices come from the rate card below, with the owner's edits (`cost_rates`)
laid over the defaults, and are applied when the report runs, so fixing a price fixes the history too.

The default prices are ESTIMATES from public price lists, not read from any invoice. The admin page says so; the owner confirms them.
"""

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from backend.server.database.models.business import Business
from backend.server.database.models.call import Call
from backend.server.database.models.message import Message
from backend.server.database.models.message_template import MessageLog
from backend.server.database.models.spend import CostRate, UsageEvent
from backend.server.database.models.transaction import Transaction
from backend.server.services import quotas
from backend.server.services.cost_tracking import TEST_CALL_PREFIXES

CURRENCY = "USD"
SENT = ("sent", "delivered", "read")

# key -> (tool id, label, provider, unit shown to the owner, default price in USD)
RATE_CARD: Dict[str, Tuple[str, str, str, str, float]] = {
    "llm.groq.input": ("llm.groq", "AI model: Groq (input)", "Groq", "per 1M tokens", 0.15),
    "llm.groq.output": ("llm.groq", "AI model: Groq (output)", "Groq", "per 1M tokens", 0.60),
    "llm.gemini.input": ("llm.gemini", "AI model: Gemini (input)", "Google", "per 1M tokens", 0.10),
    "llm.gemini.output": ("llm.gemini", "AI model: Gemini (output)", "Google", "per 1M tokens", 0.40),
    "stt": ("stt", "Speech to text", "Deepgram", "per minute of call", 0.0043),
    "tts": ("tts", "Text to speech", "Cartesia", "per 1,000 characters", 0.03),
    "telephony": ("telephony", "Phone calls", "Twilio / Exotel", "per minute", 0.012),
    "sms": ("sms", "SMS", "Twilio / Exotel", "per message", 0.0075),
    "whatsapp": ("whatsapp", "WhatsApp", "Meta", "per message", 0.0125),
    "email": ("email", "Email", "SMTP provider", "per message", 0.0004),
}
TOOLS: Dict[str, Dict[str, str]] = {
    "llm.groq": {"label": "AI model: Groq", "provider": "Groq", "unit": "tokens"},
    "llm.gemini": {"label": "AI model: Gemini", "provider": "Google", "unit": "tokens"},
    "stt": {"label": "Speech to text", "provider": "Deepgram", "unit": "minutes"},
    "tts": {"label": "Text to speech", "provider": "Cartesia", "unit": "characters"},
    "telephony": {"label": "Phone calls", "provider": "Twilio / Exotel", "unit": "minutes"},
    "sms": {"label": "SMS", "provider": "Twilio / Exotel", "unit": "messages"},
    "whatsapp": {"label": "WhatsApp", "provider": "Meta", "unit": "messages"},
    "email": {"label": "Email", "provider": "SMTP provider", "unit": "messages"},
}


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    return dt if dt is None or dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def rates(db: Session) -> Dict[str, float]:
    prices = {k: v[4] for k, v in RATE_CARD.items()}
    for row in db.scalars(select(CostRate)).all():
        if row.key in prices:
            prices[row.key] = float(row.price)
    return prices


def rate_card(db: Session) -> List[Dict[str, Any]]:
    edited = {r.key: r for r in db.scalars(select(CostRate)).all()}
    return [
        {"key": k, "tool": t, "label": label, "provider": provider, "unit": unit, "default": default,
         "price": float(edited[k].price) if k in edited else default, "edited": k in edited,
         "updated_at": _aware(edited[k].updated_at).isoformat() if k in edited and edited[k].updated_at else None}
        for k, (t, label, provider, unit, default) in RATE_CARD.items()
    ]


def set_rates(db: Session, prices: Dict[str, float], user_id: Optional[str]) -> Dict[str, float]:
    """Save prices. A key not on the card, or a negative price, is an error (ValueError); a price equal to the default clears the edit."""
    for key, price in prices.items():
        if key not in RATE_CARD:
            raise ValueError(f"Unknown rate: {key}")
        if price < 0 or price > 1000:
            raise ValueError(f"{key}: price must be between 0 and 1000")
    for key, price in prices.items():
        row = db.get(CostRate, key)
        if abs(price - RATE_CARD[key][4]) < 1e-12:
            if row:
                db.delete(row)
        elif row:
            row.price, row.updated_by, row.updated_at = price, user_id, datetime.now(timezone.utc)
        else:
            db.add(CostRate(key=key, price=price, updated_by=user_id))
    db.commit()
    return rates(db)


def _llm_tool(provider: str) -> str:
    return "llm.gemini" if provider.startswith("gemini") else "llm.groq"


def _cost(tool: str, qty: float, qty_out: float, price: Dict[str, float]) -> float:
    if tool.startswith("llm."):
        return qty / 1e6 * price[f"{tool}.input"] + qty_out / 1e6 * price[f"{tool}.output"]
    if tool == "tts":
        return qty / 1000 * price["tts"]
    if tool in ("stt", "telephony"):
        return qty * price[tool]  # qty is minutes
    return qty * price[tool]  # messages


def _usage_rows(db: Session, since: datetime) -> List[Dict[str, Any]]:
    """Every metered quantity in the window as (business, day, tool, test?, quantity in, quantity out, estimated)."""
    out: List[Dict[str, Any]] = []
    is_test = case((or_(*[Call.id.startswith(p, autoescape=True) for p in TEST_CALL_PREFIXES]), 1), else_=0)
    browser_test = case((or_(*[Call.id.startswith(p, autoescape=True) for p in ("studio_", "webcall_", "sim_")]), 1), else_=0)  # no phone line involved

    day = func.date(Call.started_at)
    for biz, d, test, browser, secs, n in db.execute(
        select(Call.business_id, day, is_test, browser_test, func.coalesce(func.sum(Call.duration_seconds), 0), func.count()).where(Call.started_at >= since).group_by(Call.business_id, day, is_test, browser_test)
    ).all():
        minutes = float(secs or 0) / 60
        out.append({"biz": biz, "day": str(d), "tool": "calls", "test": bool(test), "browser": bool(browser), "qty": minutes, "out": 0, "n": int(n), "estimated": False})

    mday = func.date(Message.created_at)
    for biz, d, test, chars in db.execute(
        select(Call.business_id, mday, is_test, func.coalesce(func.sum(func.length(Message.text)), 0))
        .join(Call, Call.id == Message.call_id).where(Message.speaker == "AI", Message.created_at >= since).group_by(Call.business_id, mday, is_test)
    ).all():
        out.append({"biz": biz, "day": str(d), "tool": "tts", "test": bool(test), "qty": float(chars or 0), "out": 0, "estimated": False})

    lday = func.date(MessageLog.created_at)
    for biz, d, channel, n in db.execute(
        select(MessageLog.business_id, lday, MessageLog.channel, func.count()).where(MessageLog.created_at >= since, MessageLog.status.in_(SENT)).group_by(MessageLog.business_id, lday, MessageLog.channel)
    ).all():
        if channel in ("sms", "whatsapp", "email"):
            out.append({"biz": biz, "day": str(d), "tool": channel, "test": False, "qty": float(n), "out": 0, "estimated": False})

    eday = func.date(UsageEvent.created_at)
    for biz, d, provider, source, estimated, tin, tout in db.execute(
        select(UsageEvent.business_id, eday, UsageEvent.provider, UsageEvent.source, UsageEvent.estimated, func.sum(UsageEvent.input_units), func.sum(UsageEvent.output_units))
        .where(UsageEvent.created_at >= since, UsageEvent.tool == "llm").group_by(UsageEvent.business_id, eday, UsageEvent.provider, UsageEvent.source, UsageEvent.estimated)
    ).all():
        out.append({"biz": biz, "day": str(d), "tool": _llm_tool(provider), "test": source == "test", "qty": float(tin or 0), "out": float(tout or 0), "estimated": bool(estimated)})
    return out


def _revenue(db: Session, since: datetime) -> Tuple[Dict[str, float], int]:
    """Cash collected per clinic in the window, in the report currency, and how many payments in other currencies were left out."""
    by_biz: Dict[str, float] = defaultdict(float)
    skipped = 0
    for t in db.scalars(select(Transaction).where(Transaction.type == "payment", Transaction.status == "confirmed", Transaction.created_at >= since)).all():
        d = t.details or {}
        amount = float(d.get("amount") or 0)
        if amount <= 0:
            continue  # a free trial is not revenue
        if str(d.get("currency") or CURRENCY).upper() != CURRENCY:
            skipped += 1
            continue
        by_biz[t.business_id] += amount
    return by_biz, skipped


def report(db: Session, days: int = 30) -> Dict[str, Any]:
    days = max(1, min(int(days), 365))
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)
    price = rates(db)

    tools: Dict[str, Dict[str, Any]] = {t: {"tool": t, **meta, "quantity": 0.0, "cost": 0.0, "test_cost": 0.0, "estimated": False} for t, meta in TOOLS.items()}
    tenants: Dict[Optional[str], Dict[str, Any]] = defaultdict(lambda: {"spend": 0.0, "test_spend": 0.0, "calls": 0, "minutes": 0.0})
    daily: Dict[str, float] = defaultdict(float)

    def add(tool: str, biz: Optional[str], day: str, test: bool, qty: float, qty_out: float, estimated: bool) -> None:
        cost = _cost(tool, qty, qty_out, price)
        row = tools[tool]
        row["quantity"] += qty + qty_out
        row["cost"] += cost
        row["estimated"] = row["estimated"] or estimated
        t = tenants[biz]
        if test:
            row["test_cost"] += cost
            t["test_spend"] += cost
        else:
            t["spend"] += cost
        daily[day] += cost

    for r in _usage_rows(db, since):
        if r["tool"] == "calls":
            t = tenants[r["biz"]]
            if not r["test"]:
                t["calls"] += r["n"]
                t["minutes"] += r["qty"]
            if not r["browser"]:
                add("telephony", r["biz"], r["day"], r["test"], r["qty"], 0, False)  # a phone line carried this call
            if not r["test"]:
                add("stt", r["biz"], r["day"], False, r["qty"], 0, True)  # speech is transcribed for the whole call: counted from its length
        else:
            add(r["tool"], r["biz"], r["day"], r["test"], r["qty"], r["out"], r["estimated"])

    revenue, skipped = _revenue(db, since)
    ids = {b for b in set(tenants) | set(revenue) if b}
    info = {b.id: b for b in db.scalars(select(Business).where(Business.id.in_(ids))).all()} if ids else {}
    rows = []
    for biz in ids:
        t, b = tenants[biz], info.get(biz)
        spend = t["spend"] + t["test_spend"]
        rev = revenue.get(biz, 0.0)
        vq = next((q for q in quotas.status_for(db, b) if q["key"] == "voice_minutes"), None) if b else None
        rows.append({"id": biz, "voice_quota": {k: vq[k] for k in ("used", "limit", "percent", "state")} if vq else None, "name": b.name if b else "(deleted clinic)", "plan": b.plan if b else None, "status": b.status if b else None, "calls": t["calls"], "minutes": round(t["minutes"], 1),
                     "spend": round(spend, 4), "test_spend": round(t["test_spend"], 4), "revenue": round(rev, 2), "profit": round(rev - spend, 4)})
    rows.sort(key=lambda r: r["profit"])  # the clinics costing us most relative to what they pay come first

    spend_total = sum(v["cost"] for v in tools.values())
    test_total = sum(v["test_cost"] for v in tools.values())
    revenue_total = sum(revenue.values())
    trial_spend = sum(r["spend"] + r["test_spend"] for r in rows if (r["status"] or "") == "trial")
    unattributed = tenants[None]["spend"] + tenants[None]["test_spend"] if None in tenants else 0.0
    tool_rows = sorted(({**v, "quantity": round(v["quantity"], 1), "cost": round(v["cost"], 4), "test_cost": round(v["test_cost"], 4),
                         "share_pct": round(v["cost"] / spend_total * 100, 1) if spend_total else 0.0} for v in tools.values()), key=lambda r: r["cost"], reverse=True)
    series = [(since + timedelta(days=i + 1)).date().isoformat() for i in range(days)]
    estimated_llm = any(v["estimated"] for k, v in tools.items() if k.startswith("llm."))

    return {
        "days": days, "currency": CURRENCY, "since": since.isoformat(),
        "totals": {"spend": round(spend_total, 4), "testing_spend": round(test_total, 4), "trial_spend": round(trial_spend, 4), "unattributed_spend": round(unattributed, 4),
                   "revenue": round(revenue_total, 2), "profit": round(revenue_total - spend_total, 4),
                   "margin_pct": round((revenue_total - spend_total) / revenue_total * 100, 1) if revenue_total else None},
        "limits": _near_limits(db, [info[r["id"]] for r in rows if r["id"] in info][:100]),
        "by_tool": tool_rows, "by_tenant": rows, "by_day": [{"date": d, "spend": round(daily.get(d, 0.0), 4)} for d in series],
        "notes": _notes(estimated_llm, skipped),
    }


def _near_limits(db: Session, businesses: List[Business]) -> List[Dict[str, Any]]:
    """Clinics at or near a plan limit this calendar month (the same numbers the clinic sees on its own dashboard)."""
    out = []
    for b in businesses:
        for q in quotas.status_for(db, b):
            if q["state"] in ("near", "over"):
                out.append({"id": b.id, "name": b.name, "plan": b.plan, **{k: q[k] for k in ("key", "label", "unit", "used", "limit", "percent", "state")}})
    return sorted(out, key=lambda r: r["percent"] or 0, reverse=True)


def _notes(estimated_llm: bool, skipped_payments: int) -> List[str]:
    notes = [
        "Prices are estimates from public price lists until you confirm them on the rate card below. Spend is quantity times price, so correcting a price corrects the past too.",
        "Revenue is cash collected in the period (confirmed payments above zero). Profit is revenue minus spend: revenue is earned by a plan, not by a tool, so tools show cost and share, and profit is shown for the platform and for each clinic.",
        "Speech to text is counted from call length, text to speech from the AI's transcript characters. Not tracked yet: post-call analysis, voice previews, WhatsApp provider fees, phone-number rental.",
    ]
    if estimated_llm:
        notes.append("Some AI-model tokens are counted from text length (about 4 characters per token) because streamed replies carry no provider count.")
    if skipped_payments:
        notes.append(f"{skipped_payments} payment(s) in a currency other than {CURRENCY} are left out of revenue (no exchange rate is applied).")
    return notes
