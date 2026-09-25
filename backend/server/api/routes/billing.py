"""Billing & Subscription API Routes.

Implements Section 11 of the AMSh Architecture Specification:
- Public billing & gateway configuration
- Razorpay order creation and webhook/verification
- Business subscription activation & status retrieval
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from backend.server.database.session import get_db
from backend.server.database.models.business import Business
from backend.server.billing.razorpay_gateway import RazorpayGateway

router = APIRouter(prefix="/api/billing", tags=["billing"])


class CreateOrderRequest(BaseModel):
    amount: float
    currency: str = "INR"
    plan_id: str = "starter"
    cycle: str = "monthly"
    business_id: Optional[str] = None


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan_id: str
    business_id: Optional[str] = None


@router.get("/config")
def get_billing_config():
    """Returns public payment gateway credentials for client-side checkout SDKs."""
    return RazorpayGateway.get_public_config()


@router.post("/razorpay/create-order")
async def create_razorpay_order(payload: CreateOrderRequest):
    """Generates an authenticated Razorpay checkout order."""
    result = await RazorpayGateway.create_order(
        amount=payload.amount,
        currency=payload.currency,
        plan_id=payload.plan_id,
        cycle=payload.cycle,
        business_id=payload.business_id
    )
    return result


@router.post("/razorpay/verify")
def verify_razorpay_payment(payload: VerifyPaymentRequest, db: Session = Depends(get_db)):
    """Verifies HMAC signature and activates the business tenant subscription in PostgreSQL."""
    is_valid = RazorpayGateway.verify_signature(
        order_id=payload.razorpay_order_id,
        payment_id=payload.razorpay_payment_id,
        signature=payload.razorpay_signature
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment signature. Verification failed."
        )

    # Persist tenant subscription status into PostgreSQL
    if payload.business_id:
        biz = db.query(Business).filter(Business.id == payload.business_id).first()
        if biz:
            biz.plan = payload.plan_id
            biz.status = "active"
            db.commit()
            db.refresh(biz)

    return {
        "success": True,
        "message": "Payment verified and AI Receptionist subscription activated successfully.",
        "payment_id": payload.razorpay_payment_id,
        "plan_id": payload.plan_id,
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
