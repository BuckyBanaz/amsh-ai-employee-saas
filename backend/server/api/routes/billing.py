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
    """Creates a Razorpay checkout order. The amount and currency come from the plan catalog, never from the request."""
    plan, amount, currency = price_for(db, payload.plan_id, payload.cycle)
    if not _payments_configured() and not get_settings().ALLOW_DEV_FALLBACKS:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Payments are not configured on this server.")
    result = await RazorpayGateway.create_order(
        amount=amount,
        currency=currency,
        plan_id=plan.key,
        cycle=payload.cycle,
        business_id=payload.business_id,
    )
    if not result.get("success"):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=result.get("error") or "The payment provider could not create the order.")
    return result


@router.post("/razorpay/verify")
async def verify_razorpay_payment(payload: VerifyPaymentRequest, db: Session = Depends(get_db)):
    """Confirms a payment and activates the plan. Trusts only what Razorpay says about the order (plan, business, amount,
    paid), not what the browser claims, so paying for a cheap plan cannot unlock an expensive one or another business."""
    live = _payments_configured()
    if not live and not get_settings().ALLOW_DEV_FALLBACKS:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Payments are not configured on this server.")

    if not RazorpayGateway.verify_signature(order_id=payload.razorpay_order_id, payment_id=payload.razorpay_payment_id, signature=payload.razorpay_signature):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payment signature. Verification failed.")

    plan = find_by_key(db, payload.plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown plan.")

    if live:
        order = await RazorpayGateway.fetch_order(payload.razorpay_order_id)
        if not order:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not confirm the order with the payment provider.")
        notes = order.get("notes") or {}
        mismatch = HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This payment does not match the plan or business.")
        if str(notes.get("plan_id", "")).lower() != plan.key.lower() or str(notes.get("business_id", "")) != (payload.business_id or "onboarding"):
            raise mismatch
        if order.get("status") != "paid":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The payment has not been completed.")
        _, expected, currency = price_for(db, plan.key, str(notes.get("cycle", "monthly")))
        if int(order.get("amount", -1)) != int(round(expected * 100)) or order.get("currency") != currency:
            raise mismatch

    # Persist tenant subscription status into PostgreSQL
    if payload.business_id:
        biz = db.query(Business).filter(Business.id == payload.business_id).first()
        if biz:
            biz.plan = plan.key
            biz.status = "active"
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
    """Returns current subscription plan and billing metadata for a given business tenant."""
    biz = db.query(Business).filter(Business.id == business_id).first()
    if not biz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Business {business_id} not found."
        )

    return {
        "business_id": biz.id,
        "business_name": biz.name,
        "plan": biz.plan,
        "status": biz.status,
        "currency": biz.currency,
        "gateway": "Razorpay" if biz.currency == "INR" else "Stripe"
    }
