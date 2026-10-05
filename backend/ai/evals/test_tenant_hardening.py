"""Audit P0 fixes: the appointments API touches only appointments (F1), a clinic cannot change its own plan or status (F2), calls
and WhatsApp messages reach a clinic only through a number that is unambiguously theirs (F3, F4), and trials and paid periods end (F5)."""

import unittest

from backend.ai.evals.fixtures import make_db_factory


class _Api(unittest.TestCase):
    ROUTERS = ()

    def setUp(self):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient

        from backend.server.auth.security import create_access_token, hash_password
        from backend.server.database.models.business import Business
        from backend.server.database.models.user import User
        from backend.server.database.session import get_db

        self.factory, self.biz = make_db_factory()
        app = FastAPI()
        for r in self.ROUTERS:
            app.include_router(r)

        def override():
            with self.factory() as db:
                yield db

        app.dependency_overrides[get_db] = override
        self.client = TestClient(app)
        self.Business = Business
        with self.factory() as db:
            db.add(Business(id="other-biz", name="Other Clinic"))
            users = {
                "owner": User(email="o@x.example", hashed_password=hash_password("x" * 10), name="O", scope="business", role="owner", business_id=self.biz),
                "receptionist": User(email="r@x.example", hashed_password=hash_password("x" * 10), name="R", scope="business", role="receptionist", business_id=self.biz),
                "stranger": User(email="s@x.example", hashed_password=hash_password("x" * 10), name="S", scope="business", role="owner", business_id="other-biz"),
            }
            db.add_all(users.values())
            db.commit()
            self.h = {k: {"Authorization": f"Bearer {create_access_token(u.id)}"} for k, u in users.items()}


class AppointmentsApiTouchesOnlyAppointments(_Api):
    """F1: payments and the free-trial marker live in the same table as appointments."""

    @property
    def ROUTERS(self):
        from backend.server.api.routes import appointments, billing

        return (appointments.router, billing.router)

    def _payment_id(self):
        from backend.server.database.models.transaction import Transaction

        with self.factory() as db:
            return db.query(Transaction).filter(Transaction.type == "payment").one().id

    def test_a_payment_cannot_be_read_changed_or_deleted_through_appointments(self):
        from unittest.mock import patch

        from backend.server.api.routes import billing

        with patch.object(billing, "_require_policies", lambda *a, **k: None):
            self.assertEqual(self.client.post(f"/api/billing/businesses/{self.biz}/start-trial", json={}, headers=self.h["owner"]).status_code, 200)
            pid = self._payment_id()
            base = f"/api/businesses/{self.biz}/appointments/{pid}"
            self.assertEqual(self.client.get(base, headers=self.h["owner"]).status_code, 404)
            self.assertEqual(self.client.patch(base, json={"status": "cancelled"}, headers=self.h["owner"]).status_code, 404)
            self.assertEqual(self.client.delete(base, headers=self.h["owner"]).status_code, 404)
            self.assertEqual(self._payment_id(), pid)  # still there
            # so the free trial still cannot be started twice
            self.assertEqual(self.client.post(f"/api/billing/businesses/{self.biz}/start-trial", json={}, headers=self.h["owner"]).status_code, 400)

    def test_only_an_owner_or_admin_deletes_an_appointment_staff_cancel_instead(self):
        body = {"customer_name": "Asha", "phone_number": "+919876543210", "preferred_date": "2026-10-01", "preferred_time": "10:00 AM"}
        appt = self.client.post(f"/api/businesses/{self.biz}/appointments", json=body, headers=self.h["receptionist"]).json()
        url = f"/api/businesses/{self.biz}/appointments/{appt['id']}"
        self.assertEqual(self.client.delete(url, headers=self.h["receptionist"]).status_code, 403)
        self.assertEqual(self.client.patch(url, json={"status": "cancelled"}, headers=self.h["receptionist"]).status_code, 200)
        self.assertEqual(self.client.delete(url, headers=self.h["stranger"]).status_code, 403)
        self.assertEqual(self.client.delete(url, headers=self.h["owner"]).status_code, 204)


class ClinicCannotChangeItsOwnPlan(_Api):
    """F2: plan and status move only through Billing or a platform admin; settings need an owner or admin."""

    @property
    def ROUTERS(self):
        from backend.server.api.routes import businesses

        return (businesses.router,)

    def test_plan_and_status_are_refused_for_every_clinic_role(self):
        url = f"/api/onboarding/businesses/{self.biz}"
        for who in ("owner", "receptionist"):
            for body in ({"plan": "business"}, {"status": "active"}, {"plan": "business", "status": "active", "name": "X"}):
                self.assertIn(self.client.patch(url, json=body, headers=self.h[who]).status_code, (403,), (who, body))
        with self.factory() as db:
            b = db.get(self.Business, self.biz)
            self.assertNotEqual((b.plan, b.name), ("business", "X"))

    def test_settings_need_an_owner_or_admin_and_are_audited(self):
        from backend.server.database.models.audit_log import AuditLog

        url = f"/api/onboarding/businesses/{self.biz}"
        self.assertEqual(self.client.patch(url, json={"city": "Mumbai"}, headers=self.h["receptionist"]).status_code, 403)
        self.assertEqual(self.client.patch(url, json={"city": "Mumbai"}, headers=self.h["stranger"]).status_code, 403)
        r = self.client.patch(url, json={"city": "Mumbai", "working_hours": {"Monday": []}}, headers=self.h["owner"])
        self.assertEqual((r.status_code, r.json()["city"]), (200, "Mumbai"))
        with self.factory() as db:
            row = db.query(AuditLog).filter(AuditLog.action == "business.updated").one()
            self.assertEqual(row.meta["fields"], ["city", "working_hours"])

    def test_a_platform_admin_can_still_set_them(self):
        from backend.scripts.create_platform_admin import create_platform_admin
        from backend.server.auth.security import create_access_token

        with self.factory() as db:
            admin = create_platform_admin(db, "root@amsh.ai", "Root", "a-long-enough-pass")
            h = {"Authorization": f"Bearer {create_access_token(admin.id)}"}
        r = self.client.patch(f"/api/onboarding/businesses/{self.biz}", json={"plan": "business", "status": "active"}, headers=h)
        self.assertEqual((r.status_code, r.json()["plan"]), (200, "business"))


if __name__ == "__main__":
    unittest.main()
