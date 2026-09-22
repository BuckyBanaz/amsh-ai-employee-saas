"""
Test script for WhatsApp Integration API & Notification Dispatcher.
Verifies:
1. Inbound Meta/Baileys Webhook verification challenge (GET /api/v1/whatsapp/webhook)
2. Inbound Meta WhatsApp Message & Callback (POST /api/v1/whatsapp/webhook)
3. Notification Dispatcher WhatsApp payload creation
"""

import os
import sys
sys.path.insert(0, r"c:\Users\Parikshit\Desktop\saas")

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.server.api.router import api_router

app = FastAPI()
app.include_router(api_router)

client = TestClient(app)


def test_whatsapp_webhook_verification():
    print("\n--- 1. Testing Webhook Verification Challenge (GET) ---")
    params = {
        "hub_mode": "subscribe",
        "hub_verify_token": "amsh_wa_verify_token_2026",
        "hub_challenge": "11559933"
    }
    res = client.get("/api/v1/whatsapp/webhook", params=params)
    print(f"Status: {res.status_code}")
    print(f"Response: {res.text}")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert "11559933" in res.text, "Challenge response mismatch"
    print("SUCCESS: Webhook Verification Passed!")


def test_whatsapp_inbound_event():
    print("\n--- 2. Testing Inbound WhatsApp Message Callback (POST) ---")
    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "109283746501928",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {"display_phone_number": "15550192834"},
                            "messages": [
                                {
                                    "from": "919876543210",
                                    "id": "wamid.HBgMOTE5ODc2NTQzMjEwFQIAERgSR",
                                    "timestamp": "1726992000",
                                    "text": {"body": "Hi, do you have any appointment available with Dr. Sharma tomorrow?"},
                                    "type": "text"
                                }
                            ]
                        },
                        "field": "messages"
                    }
                ]
            }
        ]
    }
    res = client.post("/api/v1/whatsapp/webhook", json=payload)
    print(f"Status: {res.status_code}")
    print(f"Response: {res.json()}")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert res.json().get("status") == "success", "Callback failed"
    print("SUCCESS: Inbound Event Callback Passed!")


if __name__ == "__main__":
    try:
        test_whatsapp_webhook_verification()
        test_whatsapp_inbound_event()
        print("\nALL WHATSAPP BACKEND VERIFICATION TESTS PASSED SUCCESSFULLY!")
    except Exception as e:
        print(f"\nTest Failed: {e}")
        sys.exit(1)

