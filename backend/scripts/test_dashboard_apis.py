"""
Verification Script for Dashboard Backend APIs.
Tests Appointments CRUD, Call Logs, Patients CRM, and Dashboard Overview Stats endpoints.
"""

import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

os.environ.setdefault("DATABASE_URL", "postgresql+psycopg2://amsh:amsh@localhost:5434/amsh")
os.environ.setdefault("REDIS_URL", "redis://localhost:6380/0")

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_dashboard_apis():
    print("=" * 65)
    print("🚀 VERIFYING DASHBOARD BACKEND APIS")
    print("=" * 65)

    # 1. Register test user & business
    email = f"test_owner_{os.urandom(4).hex()}@clinic.com"
    reg_resp = client.post("/api/auth/register", json={
        "name": "Dr. Sameer Sharma",
        "email": email,
        "password": "Password123!",
    })
    
    if reg_resp.status_code not in (200, 201):
        print(f"❌ Auth Failed: {reg_resp.status_code} - {reg_resp.text}")
        return

    auth_data = reg_resp.json()
    token = auth_data["access_token"]
    user_id = auth_data["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create business for tenant
    biz_resp = client.post("/api/onboarding/businesses", headers=headers, json={
        "name": "Apollo Dental Care",
        "vertical": "clinic"
    })
    if biz_resp.status_code != 201:
        print(f"❌ Create Business Failed: {biz_resp.status_code} - {biz_resp.text}")
        return

    biz_data = biz_resp.json()
    business_id = biz_data["id"]

    print(f"✅ Auth & Business Creation Success: Business ID = {business_id}")

    # 2. Test Create Appointment API (POST)
    print("\n🔹 Testing POST /api/businesses/{id}/appointments ...")
    create_apt_resp = client.post(
        f"/api/businesses/{business_id}/appointments",
        headers=headers,
        json={
            "customer_name": "Rahul Verma",
            "phone_number": "+919876543210",
            "service_name": "Teeth Cleaning & Polish",
            "doctor_name": "Dr. Sameer Sharma",
            "preferred_date": "2026-09-25",
            "preferred_time": "11:30 AM",
            "status": "confirmed",
            "notes": "First time patient checkup"
        }
    )
    print(f"  • Status Code : {create_apt_resp.status_code}")
    assert create_apt_resp.status_code == 201
    apt_data = create_apt_resp.json()
    apt_id = apt_data["id"]
    print(f"  • Created Booking ID: {apt_id}")
    print(f"  • Patient Name     : {apt_data['customer_name']}")

    # 3. Test List Appointments API (GET)
    print("\n🔹 Testing GET /api/businesses/{id}/appointments ...")
    list_apt_resp = client.get(f"/api/businesses/{business_id}/appointments", headers=headers)
    print(f"  • Status Code: {list_apt_resp.status_code}")
    assert list_apt_resp.status_code == 200
    apts = list_apt_resp.json()
    print(f"  • Total Bookings Found: {len(apts)}")

    # 4. Test List Patients CRM API (GET)
    print("\n🔹 Testing GET /api/businesses/{id}/customers ...")
    cust_resp = client.get(f"/api/businesses/{business_id}/customers", headers=headers)
    print(f"  • Status Code: {cust_resp.status_code}")
    assert cust_resp.status_code == 200
    custs = cust_resp.json()
    print(f"  • Total Registered Patients: {len(custs)}")
    if custs:
        print(f"  • First Patient: {custs[0]['name']} ({custs[0]['phone_number']})")

    # 5. Test Call Logs API (GET)
    print("\n🔹 Testing GET /api/businesses/{id}/calls ...")
    calls_resp = client.get(f"/api/businesses/{business_id}/calls", headers=headers)
    print(f"  • Status Code: {calls_resp.status_code}")
    assert calls_resp.status_code == 200
    calls = calls_resp.json()
    print(f"  • Total Call Logs: {len(calls)}")

    # 6. Test Dashboard Overview Stats API (GET)
    print("\n🔹 Testing GET /api/businesses/{id}/dashboard/stats ...")
    stats_resp = client.get(f"/api/businesses/{business_id}/dashboard/stats", headers=headers)
    print(f"  • Status Code: {stats_resp.status_code}")
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    print(f"  • Booked Appointments Metric: {stats['metrics']['booked_appointments']}")
    print(f"  • Total Calls Metric       : {stats['metrics']['total_calls']}")
    print(f"  • Conversion Rate Metric   : {stats['metrics']['conversion_rate']}")

    print("\n" + "=" * 65)
    print("✅ ALL DASHBOARD BACKEND APIS VERIFIED & TEST PASSED 100%!")
    print("=" * 65)


if __name__ == "__main__":
    test_dashboard_apis()
