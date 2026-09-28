"""Plan catalog rules: what a plan may contain, validation, and the shapes sent to the admin portal and the tenant app."""

import re
from typing import Any, Dict, List, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.server.database.models.business import Business
from backend.server.database.models.plan import Plan

# Capabilities a plan can include. `key` is stored on plans; label and hint are what people read.
FEATURES: List[Dict[str, str]] = [
    {"key": "call_recording", "label": "Call Recording", "hint": "Store call audio for playback"},
    {"key": "multi_language", "label": "Multi-language AI", "hint": "More than one spoken language"},
    {"key": "custom_voice", "label": "Custom Voice Clone", "hint": "Branded TTS voice"},
    {"key": "api_access", "label": "API Access", "hint": "Public REST + webhooks"},
    {"key": "advanced_analytics", "label": "Advanced Analytics", "hint": "Cohorts and exports"},
    {"key": "calendar_sync", "label": "Calendar Sync", "hint": "Google / Microsoft calendars"},
    {"key": "payments_integration", "label": "Payments", "hint": "Deposits and prepayments"},
    {"key": "whatsapp", "label": "WhatsApp Channel", "hint": "Messaging on WhatsApp Business"},
    {"key": "white_label", "label": "White Label", "hint": "Remove platform branding"},
    {"key": "priority_support", "label": "Priority Support", "hint": "SLA-backed response times"},
]
FEATURE_KEYS = [f["key"] for f in FEATURES]
FEATURE_LABELS = {f["key"]: f["label"] for f in FEATURES}

QUOTAS: List[Dict[str, str]] = [
    {"key": "voice_minutes", "label": "Voice Minutes", "unit": "min / month", "hint": "Inbound + outbound AI talk time"},
    {"key": "messages", "label": "Messages", "unit": "msg / month", "hint": "WhatsApp, SMS and web chat"},
    {"key": "concurrent_calls", "label": "Concurrent Calls", "unit": "channels", "hint": "Parallel calls allowed"},
    {"key": "ai_tokens_millions", "label": "AI Tokens", "unit": "million / month", "hint": "LLM inference budget"},
    {"key": "knowledge_docs", "label": "Knowledge Docs", "unit": "documents", "hint": "RAG source documents"},
    {"key": "audio_storage_gb", "label": "Audio Storage", "unit": "GB", "hint": "Call recordings retained"},
    {"key": "vector_storage_gb", "label": "Vector Storage", "unit": "GB", "hint": "Embeddings index size"},
    {"key": "conversation_retention_days", "label": "Conversation Retention", "unit": "days", "hint": "Transcript history kept"},
    {"key": "seats", "label": "Team Seats", "unit": "users", "hint": "Dashboard logins"},
]
QUOTA_KEYS = [q["key"] for q in QUOTAS]
OVERAGE_KEYS = ["per_minute", "per_message", "per_gb"]
CURRENCIES = ("USD", "INR", "EUR", "GBP")
_KEY = re.compile(r"^[a-z0-9][a-z0-9_-]{1,39}$")


class PlanError(ValueError):
    """A plan the admin tried to save is not valid; the message is shown to them."""


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:40]


def subscribers_by_plan(db: Session) -> Dict[str, int]:
    rows = db.execute(select(func.lower(Business.plan), func.count()).group_by(func.lower(Business.plan))).all()
    return {k: n for k, n in rows if k}


def find_by_key(db: Session, key: str) -> Optional[Plan]:
    return db.scalar(select(Plan).where(func.lower(Plan.key) == (key or "").strip().lower()))


def _number(value: Any, label: str, allow_none: bool) -> Optional[float]:
    if value is None or value == "":
        if allow_none:
            return None
        raise PlanError(f"{label} is required")
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise PlanError(f"{label} must be a number")
    if value < 0:
        raise PlanError(f"{label} cannot be negative")
    return float(value)


def validate(fields: Dict[str, Any], db: Session, existing: Optional[Plan] = None) -> Dict[str, Any]:
    """Return the clean values for a plan (create: every field given; update: the already-merged result) or raise PlanError."""
    out: Dict[str, Any] = {}
    name = str(fields.get("name") or "").strip()
    if not 2 <= len(name) <= 80:
        raise PlanError("Plan name must be 2 to 80 characters")
    clash = db.scalar(select(Plan).where(func.lower(Plan.name) == name.lower()))
    if clash and (existing is None or clash.id != existing.id):
        raise PlanError("A plan with this name already exists")
    out["name"] = name

    key = str(fields.get("key") or "").strip().lower()
    if existing is None:
        if not _KEY.match(key):
            raise PlanError("Plan key must be 2 to 40 characters: lowercase letters, digits, - or _")
        if find_by_key(db, key):
            raise PlanError("A plan with this key already exists")
        out["key"] = key

    description = str(fields.get("description") or "").strip()
    if len(description) > 300:
        raise PlanError("Description can be at most 300 characters")
    out["description"] = description or None

    kind = fields.get("kind") or "catalog"
    if kind not in ("catalog", "enterprise"):
        raise PlanError("Kind must be catalog or enterprise")
    client = str(fields.get("client") or "").strip()
    if kind == "enterprise" and not client:
        raise PlanError("Enterprise plans must name the client they are configured for")
    out["kind"], out["client"] = kind, (client[:120] if kind == "enterprise" else None)

    out["price"] = _number(fields.get("price", 0), "Price", allow_none=False)
    out["price_yearly"] = _number(fields.get("price_yearly"), "Yearly price", allow_none=True)
    cycle = fields.get("cycle") or "monthly"
    if cycle not in ("monthly", "yearly"):
        raise PlanError("Billing cycle must be monthly or yearly")
    if cycle == "yearly" and out["price_yearly"] is not None:
        raise PlanError("A yearly-billed plan has a single price; leave the yearly price empty")
    out["cycle"] = cycle
    currency = str(fields.get("currency") or "USD").upper()
    if currency not in CURRENCIES:
        raise PlanError(f"Currency must be one of {', '.join(CURRENCIES)}")
    out["currency"] = currency
    out["custom_pricing"] = bool(fields.get("custom_pricing", kind == "enterprise"))

    status = fields.get("status") or "draft"
    if status not in ("draft", "active", "archived"):
        raise PlanError("Status must be draft, active or archived")
    out["status"] = status
    out["highlighted"] = bool(fields.get("highlighted", False))
    sort_order = fields.get("sort_order", 0)
    if isinstance(sort_order, bool) or not isinstance(sort_order, int):
        raise PlanError("Sort order must be a whole number")
    out["sort_order"] = sort_order

    quotas = fields.get("quotas")
    if not isinstance(quotas, dict) or set(quotas) != set(QUOTA_KEYS):
        raise PlanError("Set every quota (leave a value empty for unlimited)")
    out["quotas"] = {k: _number(quotas[k], next(q["label"] for q in QUOTAS if q["key"] == k), allow_none=True) for k in QUOTA_KEYS}

    overage = fields.get("overage")
    if not isinstance(overage, dict) or set(overage) != set(OVERAGE_KEYS):
        raise PlanError("Set the overage rate for minutes, messages and storage")
    out["overage"] = {k: _number(overage[k], f"Overage {k.replace('per_', 'per ')}", allow_none=False) for k in OVERAGE_KEYS}

    features = fields.get("features")
    if not isinstance(features, list) or any(f not in FEATURE_KEYS for f in features):
        raise PlanError("Unknown feature in the plan")
    out["features"] = list(dict.fromkeys(features))  # no duplicates, order kept
    return out


def admin_shape(plan: Plan, subscribers: int) -> Dict[str, Any]:
    return {
        "id": plan.id, "key": plan.key, "name": plan.name, "description": plan.description, "kind": plan.kind, "client": plan.client,
        "price": plan.price, "cycle": plan.cycle, "price_yearly": plan.price_yearly, "currency": plan.currency,
        "custom_pricing": plan.custom_pricing, "status": plan.status, "highlighted": plan.highlighted, "sort_order": plan.sort_order,
        "quotas": plan.quotas, "overage": plan.overage, "features": plan.features, "subscribers": subscribers,
        "created_at": plan.created_at.isoformat() if plan.created_at else None,
        "updated_at": plan.updated_at.isoformat() if plan.updated_at else None,
    }


def public_shape(plan: Plan) -> Dict[str, Any]:
    """What a pricing screen needs: no ids, drafts, clients or subscriber counts."""
    monthly = plan.price if plan.cycle == "monthly" else None
    yearly = plan.price if plan.cycle == "yearly" else plan.price_yearly
    return {
        "key": plan.key, "name": plan.name, "description": plan.description,
        "price_monthly": monthly, "price_yearly": yearly, "currency": plan.currency, "highlighted": plan.highlighted,
        "quotas": plan.quotas, "overage": plan.overage,
        "features": [{"key": k, "label": FEATURE_LABELS.get(k, k)} for k in (plan.features or [])],
    }
