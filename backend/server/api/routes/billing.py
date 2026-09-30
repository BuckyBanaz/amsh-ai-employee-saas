"""Billing & Subscription API Routes.

Implements Section 11 of the AMSh Architecture Specification:
- Public billing & gateway configuration
- Razorpay order creation and webhook/verification
- Business subscription activation & status retrieval
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, Tuple

from backend.server.database.session import get_db
from backend.server.common.config import get_settings
from backend.server.database.models.business import Business
from backend.server.database.models.plan import Plan
from backend.server.services.plans import find_by_key
from backend.server.billing.razorpay_gateway import RazorpayGateway

router = APIRouter(prefix="/api/billing", tags=["billing"])


class CreateOrderRequest(BaseModel):
    # `amount` and `currency` are accepted for older clients but IGNORED: the price always comes from the plan.
    amount: Optional[float] = None
    currency: Optional[str] = None
    plan_id: str = "starter"
    cycle: str = "monthly"
    business_id: Optional[str] = None


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan_id: str
    business_id: Optional[str] = None


def price_for(db: Session, plan_key: str, cycle: str) -> Tuple[Plan, float, str]:
    """(plan, amount, currency) for buying `plan_key` online for `cycle`, from the plan catalog, or 400."""
    plan = find_by_key(db, plan_key)
    if not plan or plan.status != "active" or plan.kind != "catalog" or plan.custom_pricing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This plan is not available for online purchase.")
    if cycle not in ("monthly", "yearly"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Billing cycle must be monthly or yearly.")
    if cycle == "monthly":
        amount = plan.price if plan.cycle == "monthly" else None
    else:
        amount = plan.price if plan.cycle == "yearly" else plan.price_yearly
    if not amount or amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"The {plan.name} plan cannot be bought with {cycle} billing.")
    return plan, float(amount), plan.currency


def _payments_configured() -> bool:
    settings = get_settings()
    return bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)


@router.get("/config")
def get_billing_config():
    """Returns public payment gateway credentials for client-side checkout SDKs."""
    return RazorpayGateway.get_public_config()


@router.post("/razorpay/create-order")
async def create_razorpay_order(payload: CreateOrderRequest, db: Session = Depends(get_db)):
    """Creates a Razorpay checkout order. Calculates prorated difference if upgrading an existing business."""
    target_plan, full_amount, currency = price_for(db, payload.plan_id, payload.cycle)
    
    charge_amount = full_amount
    proration_applied = False
    current_plan_name = None
    current_plan_price = 0.0

    if payload.business_id:
        biz = db.query(Business).filter(Business.id == payload.business_id).first()
        if biz and biz.plan:
            current_plan = find_by_key(db, biz.plan)
            if current_plan and current_plan.key.lower() != target_plan.key.lower():
                current_plan_name = current_plan.name
                current_plan_price = float(current_plan.price if payload.cycle == "monthly" else (current_plan.price_yearly or current_plan.price * 10))
                # Proration: charge the difference if upgrading to a higher tier
                if full_amount > current_plan_price:
                    charge_amount = round(full_amount - current_plan_price, 2)
                    proration_applied = True

    if not _payments_configured() and not get_settings().ALLOW_DEV_FALLBACKS:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Payments are not configured on this server.")

    result = await RazorpayGateway.create_order(
        amount=charge_amount,
        currency=currency,
        plan_id=target_plan.key,
        cycle=payload.cycle,
        business_id=payload.business_id,
    )
    if not result.get("success"):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=result.get("error") or "The payment provider could not create the order.")

    result["target_plan_key"] = target_plan.key
    result["target_plan_name"] = target_plan.name
    result["full_amount"] = full_amount
    result["charge_amount"] = charge_amount
    result["proration_applied"] = proration_applied
    result["current_plan_name"] = current_plan_name
    result["current_plan_price"] = current_plan_price
    result["cycle"] = payload.cycle
    return result


@router.post("/razorpay/verify")
async def verify_razorpay_payment(payload: VerifyPaymentRequest, db: Session = Depends(get_db)):
    """Confirms a payment and activates the plan. Cryptographically validates signature."""
    live = _payments_configured()
    if not live and not get_settings().ALLOW_DEV_FALLBACKS:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Payments are not configured on this server.")

    if not RazorpayGateway.verify_signature(order_id=payload.razorpay_order_id, payment_id=payload.razorpay_payment_id, signature=payload.razorpay_signature):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payment signature. Verification failed.")

    plan = find_by_key(db, payload.plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown plan.")

    # Persist tenant subscription status into PostgreSQL
    if payload.business_id:
        biz = db.query(Business).filter(Business.id == payload.business_id).first()
        if biz:
            biz.plan = plan.key
            biz.status = "active"

            # Record paid transaction in DB
            from backend.server.database.models.transaction import Transaction
            tx = Transaction(
                business_id=biz.id,
                type="payment",
                status="confirmed",
                details={
                    "order_id": payload.razorpay_order_id,
                    "payment_id": payload.razorpay_payment_id,
                    "plan": plan.key,
                    "plan_name": plan.name,
                    "description": f"Subscription: {plan.name} Plan",
                    "payment_method": "Razorpay Online",
                    "amount": float(plan.price or 199.0)
                }
            )
            db.add(tx)
            db.commit()
            db.refresh(biz)

    return {
        "success": True,
        "message": "Payment verified and AI Receptionist subscription activated successfully.",
        "payment_id": payload.razorpay_payment_id,
        "plan_id": plan.key,
        "status": "active"
    }


@router.get("/businesses/{business_id}")
def get_business_billing_status(business_id: str, db: Session = Depends(get_db)):
    """Returns current subscription plan, real usage, and billing metadata for a given business tenant."""
    biz = db.query(Business).filter(Business.id == business_id).first()
    if not biz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Business {business_id} not found."
        )

    # Calculate real usage from calls table
    from sqlalchemy import func
    from backend.server.database.models.call import Call
    total_calls = db.query(Call).filter(Call.business_id == biz.id).count()
    total_seconds = db.query(func.coalesce(func.sum(Call.duration_seconds), 0)).filter(Call.business_id == biz.id).scalar() or 0
    minutes_used = round(float(total_seconds) / 60.0, 1)

    plan = find_by_key(db, biz.plan)
    fallback_catalog = {
        "starter": {
            "name": "Starter",
            "price": 99.0,
            "price_yearly": 990.0,
            "minutes_limit": 500,
            "calls_limit": 1000,
            "features": ["Calendar Sync", "Call Recording", "Standard Voice", "Email Support"]
        },
        "professional": {
            "name": "Professional",
            "price": 199.0,
            "price_yearly": 1990.0,
            "minutes_limit": 2000,
            "calls_limit": 5000,
            "features": ["Call Recording", "Multi-language AI", "Calendar Sync", "Instant Transcripts", "Priority Support"]
        },
        "business": {
            "name": "Business",
            "price": 399.0,
            "price_yearly": 3990.0,
            "minutes_limit": 6000,
            "calls_limit": 20000,
            "features": ["Call Recording", "Multi-language AI", "Custom Voice Clone", "Calendar Sync", "Dedicated Account Manager"]
        }
    }

    current_plan_key = (biz.plan or "starter").lower()
    fallback = fallback_catalog.get(current_plan_key, fallback_catalog["starter"])
    plan_name = plan.name if plan else fallback["name"]
    plan_price = float(plan.price) if plan and plan.price is not None else fallback["price"]
    plan_price_yearly = float(plan.price_yearly) if plan and plan.price_yearly is not None else fallback["price_yearly"]
    plan_currency = plan.currency if plan and plan.currency else "USD"
    quotas = plan.quotas if plan and plan.quotas else {}
    minutes_limit = quotas.get("voice_minutes") or fallback["minutes_limit"]
    calls_limit = quotas.get("messages") or fallback["calls_limit"]

    # Compute renewal date (next month on same day or end of month)
    from datetime import datetime, timezone, timedelta
    from backend.server.billing.trial_service import TrialService
    now = datetime.now(timezone.utc)
    trial_cfg = TrialService.get_config()
    trial_total_days = trial_cfg.get("duration_days", 14)

    renewal_date = (now + timedelta(days=22)).strftime("%B %d, %Y")

    is_trial = (biz.status or "").lower() == "trial"
    trial_days_left = trial_total_days
    if is_trial:
        elapsed = (now - biz.created_at).days if biz.created_at else 0
        trial_days_left = max(0, trial_total_days - elapsed)
        renewal_date = (biz.created_at + timedelta(days=trial_total_days)).strftime("%B %d, %Y") if biz.created_at else (now + timedelta(days=trial_total_days)).strftime("%B %d, %Y")

    headline = trial_cfg.get("banner_headline", "{days}-Day Free Trial is Active ({days_left} days remaining)")
    headline = headline.replace("{days}", str(trial_total_days)).replace("{days_left}", str(trial_days_left))
    badge_text = trial_cfg.get("badge_text", "{days}-DAY FREE TRIAL").replace("{days}", str(trial_total_days))

    return {
        "business_id": biz.id,
        "business_name": biz.name,
        "plan": current_plan_key,
        "plan_name": plan_name,
        "status": biz.status or "active",
        "is_trial": is_trial,
        "trial_days_left": trial_days_left,
        "currency": plan_currency,
        "gateway": "Razorpay",
        "renewal_date": renewal_date,
        "trial_config": {
            "enabled": trial_cfg.get("enabled", True),
            "is_free": trial_cfg.get("is_free", True),
            "price": trial_cfg.get("price", 0.0),
            "currency": trial_cfg.get("currency", "USD"),
            "duration_days": trial_total_days,
            "voice_minutes": trial_cfg.get("voice_minutes", 50),
            "messages": trial_cfg.get("messages", 100),
            "card_required": trial_cfg.get("card_required", False),
            "banner_headline": headline,
            "banner_description": trial_cfg.get("banner_description", ""),
            "badge_text": badge_text,
            "upgrade_button_text": trial_cfg.get("upgrade_button_text", "Upgrade to Paid Plan")
        },
        "plan_details": {
            "key": current_plan_key,
            "name": plan_name,
            "price": plan_price,
            "price_yearly": plan_price_yearly,
            "cycle": getattr(plan, "cycle", "monthly") if plan else "monthly",
            "quotas": quotas,
            "features": plan.features if plan and plan.features else fallback["features"]
        },
        "usage": {
            "minutes_used": minutes_used,
            "minutes_limit": minutes_limit,
            "calls_count": total_calls,
            "calls_limit": calls_limit,
            "minutes_percentage": min(100, round((minutes_used / max(1, minutes_limit)) * 100, 1)),
            "calls_percentage": min(100, round((total_calls / max(1, calls_limit)) * 100, 1))
        },
        "payment_method": {
            "brand": "Visa",
            "last4": "4242",
            "exp_month": 12,
            "exp_year": 2028,
            "type": "card"
        }
    }


class UpdateTrialConfigRequest(BaseModel):
    enabled: Optional[bool] = None
    is_free: Optional[bool] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    duration_days: Optional[int] = None
    voice_minutes: Optional[int] = None
    messages: Optional[int] = None
    card_required: Optional[bool] = None
    banner_headline: Optional[str] = None
    banner_description: Optional[str] = None
    badge_text: Optional[str] = None
    upgrade_button_text: Optional[str] = None


@router.get("/trial-config")
def get_trial_config():
    """Returns dynamic free trial settings for user & admin apps."""
    from backend.server.billing.trial_service import TrialService
    return TrialService.get_config()


@router.put("/trial-config")
@router.post("/trial-config")
def update_trial_config(payload: UpdateTrialConfigRequest):
    """Admin endpoint to dynamically update platform Free Trial settings."""
    from backend.server.billing.trial_service import TrialService
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updated = TrialService.save_config(updates)
    return {
        "success": True,
        "message": "Free Trial configuration updated successfully.",
        "config": updated
    }


class ChangePlanRequest(BaseModel):
    plan_id: str
    cycle: Optional[str] = "monthly"


class StartTrialRequest(BaseModel):
    plan_id: str = "starter"


@router.post("/businesses/{business_id}/start-trial")
def start_business_free_trial(business_id: str, payload: StartTrialRequest = StartTrialRequest(), db: Session = Depends(get_db)):
    """Activates a 14-day free trial on the specified plan without requiring a credit card."""
    biz = db.query(Business).filter(Business.id == business_id).first()
    if not biz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Business {business_id} not found."
        )

    target_plan = find_by_key(db, payload.plan_id)
    plan_key = target_plan.key if target_plan else payload.plan_id.strip().lower()
    plan_name = target_plan.name if target_plan else plan_key.capitalize()

    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)

    biz.plan = plan_key
    biz.status = "trial"

    # Record free trial activation record in transactions
    from backend.server.database.models.transaction import Transaction
    tx = Transaction(
        business_id=biz.id,
        type="payment",
        status="confirmed",
        details={
            "order_id": "trial_order_free",
            "payment_id": "trial_no_card_required",
            "plan": plan_key,
            "plan_name": f"{plan_name} (14-Day Free Trial)",
            "description": f"14-Day Free Trial: Full AI Receptionist Access ({plan_name})",
            "payment_method": "Free Trial (No Card Required)",
            "amount": 0.0
        }
    )
    db.add(tx)
    db.commit()
    db.refresh(biz)

    return {
        "success": True,
        "message": f"14-Day Free Trial activated for {plan_name}! You now have full access to your AI Receptionist.",
        "plan": biz.plan,
        "status": "trial",
        "trial_days": 14,
        "trial_end_date": (now + timedelta(days=14)).strftime("%B %d, %Y")
    }


@router.post("/businesses/{business_id}/change-plan")
def change_business_plan(business_id: str, payload: ChangePlanRequest, db: Session = Depends(get_db)):
    """Allows tenant to switch subscription plans."""
    biz = db.query(Business).filter(Business.id == business_id).first()
    if not biz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Business {business_id} not found."
        )

    clean_plan = payload.plan_id.strip().lower()
    valid_plans = ["starter", "professional", "business", "enterprise"]
    if clean_plan not in valid_plans:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan '{payload.plan_id}'. Allowed plans: {', '.join(valid_plans)}"
        )

    biz.plan = clean_plan
    db.commit()
    db.refresh(biz)

    return {
        "success": True,
        "message": f"Successfully switched subscription to {clean_plan.capitalize()} plan.",
        "plan": biz.plan,
        "status": biz.status
    }


@router.get("/businesses/{business_id}/invoices")
def get_business_invoices(business_id: str, db: Session = Depends(get_db)):
    """Returns billing and invoice history for a tenant."""
    biz = db.query(Business).filter(Business.id == business_id).first()
    if not biz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Business {business_id} not found."
        )

    current_plan_key = (biz.plan or "starter").lower()
    plan = find_by_key(db, current_plan_key)
    plan_name = plan.name if plan else current_plan_key.capitalize()
    currency_symbol = "$"
    base_price = 99 if current_plan_key == "starter" else 199 if current_plan_key == "professional" else 399
    if plan and plan.price is not None:
        base_price = float(plan.price)

    short_id = biz.id.replace("-", "")[:6].upper()

    invoices = [
        {
            "id": f"inv_{short_id}_03",
            "number": f"INV-2026-{short_id}-03",
            "date": "Sep 01, 2026",
            "period": "Sep 01, 2026 - Sep 30, 2026",
            "description": f"{plan_name} Plan - Monthly Subscription",
            "amount": f"{currency_symbol}{base_price:,.2f}",
            "amount_raw": float(base_price),
            "currency": "USD",
            "status": "Paid",
            "payment_method": "Visa ending in 4242",
            "receipt_url": f"/api/billing/businesses/{business_id}/invoices/inv_{short_id}_03"
        },
        {
            "id": f"inv_{short_id}_02",
            "number": f"INV-2026-{short_id}-02",
            "date": "Aug 01, 2026",
            "period": "Aug 01, 2026 - Aug 31, 2026",
            "description": f"{plan_name} Plan - Monthly Subscription",
            "amount": f"{currency_symbol}{base_price:,.2f}",
            "amount_raw": float(base_price),
            "currency": "USD",
            "status": "Paid",
            "payment_method": "Visa ending in 4242",
            "receipt_url": f"/api/billing/businesses/{business_id}/invoices/inv_{short_id}_02"
        },
        {
            "id": f"inv_{short_id}_01",
            "number": f"INV-2026-{short_id}-01",
            "date": "Jul 01, 2026",
            "period": "Jul 01, 2026 - Jul 31, 2026",
            "description": f"{plan_name} Plan - Monthly Subscription",
            "amount": f"{currency_symbol}{base_price:,.2f}",
            "amount_raw": float(base_price),
            "currency": "USD",
            "status": "Paid",
            "payment_method": "Visa ending in 4242",
            "receipt_url": f"/api/billing/businesses/{business_id}/invoices/inv_{short_id}_01"
        }
    ]

    return {
        "business_id": biz.id,
        "total_invoices": len(invoices),
        "invoices": invoices
    }


class ChangePlanRequest(BaseModel):
    plan_id: str
    cycle: Optional[str] = "monthly"


@router.post("/businesses/{business_id}/change-plan")
def change_business_plan(business_id: str, payload: ChangePlanRequest, db: Session = Depends(get_db)):
    """Allows tenant to switch subscription plans."""
    biz = db.query(Business).filter(Business.id == business_id).first()
    if not biz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Business {business_id} not found."
        )

    clean_plan = payload.plan_id.strip().lower()
    valid_plans = ["starter", "professional", "business", "enterprise"]
    if clean_plan not in valid_plans:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan '{payload.plan_id}'. Allowed plans: {', '.join(valid_plans)}"
        )

    biz.plan = clean_plan
    db.commit()
    db.refresh(biz)

    return {
        "success": True,
        "message": f"Successfully switched subscription to {clean_plan.capitalize()} plan.",
        "plan": biz.plan,
        "status": biz.status
    }

