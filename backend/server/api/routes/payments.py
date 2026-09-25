"""Payments API routes (alias for billing routes)."""

from fastapi import APIRouter
from backend.server.api.routes import billing

router = APIRouter(prefix="/api/payments", tags=["payments"])

# Mount billing endpoints under /api/payments as well for backward compatibility
router.add_api_route("/config", billing.get_billing_config, methods=["GET"])
router.add_api_route("/razorpay/create-order", billing.create_razorpay_order, methods=["POST"])
router.add_api_route("/razorpay/verify", billing.verify_razorpay_payment, methods=["POST"])
