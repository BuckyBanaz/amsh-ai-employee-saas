"""Razorpay Payment Gateway integration service.

Handles server-to-server communication with Razorpay API, order creation,
and cryptographic HMAC SHA-256 signature verification.
"""

import hmac
import hashlib
import uuid
import httpx
from typing import Dict, Any, Optional

from backend.server.common.config import get_settings


class RazorpayGateway:
    """Encapsulates Razorpay payment operations."""

    @staticmethod
    def get_public_config() -> Dict[str, Any]:
        """Returns the public configuration required by Razorpay Checkout.js."""
        settings = get_settings()
        return {
            "key_id": settings.RAZORPAY_KEY_ID or "rzp_test_placeholder",
            "currency": "INR",
            "enabled": bool(settings.RAZORPAY_KEY_ID),
        }

    @staticmethod
    async def create_order(
        amount: float,
        currency: str = "INR",
        plan_id: str = "starter",
        cycle: str = "monthly",
        business_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Creates a Razorpay order via Razorpay REST API or provides a test order."""
        settings = get_settings()
        amount_in_paise = int(round(amount * 100))

        # Real Razorpay API integration if API keys are configured
        if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
            try:
                auth = (settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
                receipt_id = f"rcpt_{uuid.uuid4().hex[:12]}"
                payload = {
                    "amount": amount_in_paise,
                    "currency": currency,
                    "receipt": receipt_id,
                    "notes": {
                        "plan_id": plan_id,
                        "cycle": cycle,
                        "business_id": business_id or "onboarding"
                    }
                }
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(
                        "https://api.razorpay.com/v1/orders",
                        auth=auth,
                        json=payload
                    )
                    if response.status_code in (200, 201):
                        data = response.json()
                        return {
                            "success": True,
                            "order_id": data["id"],
                            "amount": data["amount"],
                            "currency": data["currency"],
                            "key_id": settings.RAZORPAY_KEY_ID,
                            "test_mode": False
                        }
                    else:
                        print(f"[Razorpay API Error] Status {response.status_code}: {response.text}")
                        return {"success": False, "error": f"Razorpay refused the order ({response.status_code})"}
            except Exception as e:
                print(f"[Razorpay Request Exception] {e}")
                # Real keys are configured: never hand out a fake order that a later "verify" could accept.
                return {"success": False, "error": "Could not reach Razorpay"}

        # Fallback test mode order
        mock_order_id = f"order_{uuid.uuid4().hex[:14]}"
        return {
            "success": True,
            "order_id": mock_order_id,
            "amount": amount_in_paise,
            "currency": currency,
            "key_id": settings.RAZORPAY_KEY_ID or "rzp_test_placeholder",
            "test_mode": not bool(settings.RAZORPAY_KEY_ID)
        }

    @staticmethod
    async def fetch_order(order_id: str) -> Optional[Dict[str, Any]]:
        """The order as Razorpay stored it (amount, currency, status, notes), or None if it cannot be read."""
        settings = get_settings()
        if not (settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET):
            return None
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"https://api.razorpay.com/v1/orders/{order_id}",
                    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
                )
            return response.json() if response.status_code == 200 else None
        except Exception as e:
            print(f"[Razorpay Fetch Order Exception] {e}")
            return None

    @staticmethod
    def verify_signature(
        order_id: str,
        payment_id: str,
        signature: str
    ) -> bool:
        """Cryptographically verifies the HMAC SHA-256 signature returned by Razorpay."""
        settings = get_settings()
        if not settings.RAZORPAY_KEY_SECRET:
            # If no secret configured in development, allow test verification
            return True

        message = f"{order_id}|{payment_id}".encode("utf-8")
        expected_signature = hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
            message,
            hashlib.sha256
        ).hexdigest()

        is_valid = hmac.compare_digest(expected_signature, signature)
        if not is_valid:
            print(f"[Razorpay Signature Verification Failed] Expected {expected_signature}, got {signature}")
        return is_valid
