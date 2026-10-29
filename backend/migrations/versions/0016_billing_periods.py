"""Billing periods (F5): businesses.trial_ends_at / current_period_end / billing_cycle

Before this, a trial and a paid plan never ended. Additive only, and `status` is never touched. Every existing trial and paid
business gets a full period counted from today (no clinic loses its AI the moment this runs):
    trial   -> today + the configured trial length
    active  -> today + one cycle, read from its last real payment: monthly, or yearly when that payment was clearly more than a
               month's price or the plan only sells yearly. Unclear -> yearly (the longer one: never cut a yearly payer short).
               No paid payment on record (given by platform staff, or a dev-mode zero payment) -> "manual": no end date.

Revision ID: 0016
Revises: 0015
Create Date: 2026-10-26
"""
import calendar
import json
from datetime import datetime, timedelta, timezone

from alembic import op
import sqlalchemy as sa

revision = '0016'
down_revision = '0015'
branch_labels = None
depends_on = None

TRIAL_PAYMENT_ID = "trial_no_card_required"


def _columns(table):
    return {c["name"] for c in sa.inspect(op.get_bind()).get_columns(table)}


def _add_cycle(start, cycle):
    months = 12 if cycle == "yearly" else 1
    month0 = start.month - 1 + months
    year, month = start.year + month0 // 12, month0 % 12 + 1
    return start.replace(year=year, month=month, day=min(start.day, calendar.monthrange(year, month)[1]))


def _trial_days():
    try:
        from backend.server.billing.trial_service import TrialService

        return max(1, int(TrialService.get_config().get("duration_days", 14)))
    except Exception:
        return 14


def _details(raw):
    if isinstance(raw, dict):
        return raw
    try:
        return json.loads(raw or "{}")
    except (TypeError, ValueError):
        return {}


def _cycle(bind, business_id, plan_key):
    """The cycle of the business's last real payment; None when it never paid anything."""
    paid = None
    rows = bind.execute(
        sa.text("SELECT details FROM transactions WHERE business_id = :b AND type = 'payment' AND status = 'confirmed' ORDER BY created_at DESC"),
        {"b": business_id},
    ).fetchall()
    for (raw,) in rows:
        d = _details(raw)
        if d.get("payment_id") != TRIAL_PAYMENT_ID and float(d.get("amount") or 0) > 0:
            paid = float(d["amount"])
            break
    if paid is None:
        return None
    plan = bind.execute(sa.text("SELECT price, cycle, price_yearly FROM plans WHERE lower(key) = lower(:k)"), {"k": plan_key or ""}).fetchone()
    if not plan:
        return "yearly"
    price, cycle, _ = plan
    if cycle == "yearly":
        return "yearly"
    return "monthly" if price and paid <= float(price) * 1.5 else "yearly"


def upgrade() -> None:
    cols = _columns("businesses")
    with op.batch_alter_table("businesses") as batch:  # batch: SQLite cannot ALTER most things in place
        if "trial_ends_at" not in cols:
            batch.add_column(sa.Column("trial_ends_at", sa.DateTime(timezone=True), nullable=True))
        if "current_period_end" not in cols:
            batch.add_column(sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True))
        if "billing_cycle" not in cols:
            batch.add_column(sa.Column("billing_cycle", sa.String(20), nullable=True))

    bind = op.get_bind()
    now = datetime.now(timezone.utc)
    trial_end = now + timedelta(days=_trial_days())
    counts = {"trial": 0, "monthly": 0, "yearly": 0, "manual": 0}
    for business_id, status, plan_key in bind.execute(
        sa.text("SELECT id, status, plan FROM businesses WHERE lower(status) IN ('trial', 'active')")
    ).fetchall():
        if (status or "").lower() == "trial":
            bind.execute(sa.text("UPDATE businesses SET trial_ends_at = :e WHERE id = :b AND trial_ends_at IS NULL"), {"e": trial_end, "b": business_id})
            counts["trial"] += 1
            continue
        cycle = _cycle(bind, business_id, plan_key)
        end = _add_cycle(now, cycle) if cycle else None
        bind.execute(
            sa.text("UPDATE businesses SET billing_cycle = :c, current_period_end = :e WHERE id = :b AND billing_cycle IS NULL AND current_period_end IS NULL"),
            {"c": cycle or "manual", "e": end, "b": business_id},
        )
        counts[cycle or "manual"] += 1
    print(f"[MIGRATE 0016] billing periods from today: {counts}", flush=True)  # counts only: no business names


def downgrade() -> None:
    with op.batch_alter_table("businesses") as batch:
        batch.drop_column("billing_cycle")
        batch.drop_column("current_period_end")
        batch.drop_column("trial_ends_at")
