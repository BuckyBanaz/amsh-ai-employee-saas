"""Clinic patient list: saved records plus patients derived from bookings, edit, remove, history, other clinics denied,
and migration 0012 moving the old fake "New patient" appointments into patient records."""

import unittest
from datetime import datetime, timedelta, timezone

from backend.ai.evals.fixtures import make_db_factory


class PatientsApi(unittest.TestCase):
    def setUp(self):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient

        from backend.server.api.routes import customers
        from backend.server.auth.security import create_access_token, hash_password
        from backend.server.database.models.business import Business
        from backend.server.database.models.call import Call
        from backend.server.database.models.transaction import Transaction
        from backend.server.database.models.user import User
        from backend.server.database.session import get_db

        self.factory, self.biz = make_db_factory()
        app = FastAPI()
        app.include_router(customers.router)
        app.include_router(customers.patients_router)

        def override():
            with self.factory() as db:
                yield db

        app.dependency_overrides[get_db] = override
        self.client = TestClient(app)
        self.Transaction = Transaction
        today = datetime.now(timezone.utc).date()
        self.past, self.future = (today - timedelta(days=3)).isoformat(), (today + timedelta(days=4)).isoformat()
        with self.factory() as db:
            db.add(Business(id="other-biz", name="Other Clinic"))
            owner = User(email="o@x.example", hashed_password=hash_password("x" * 10), name="O", scope="business", role="owner", business_id=self.biz)
            stranger = User(email="s@x.example", hashed_password=hash_password("x" * 10), name="S", scope="business", role="owner", business_id="other-biz")
            db.add_all([owner, stranger])
            # Asha booked twice (once in the past, once ahead) with two spellings of one number, and cancelled a third
            for date, phone, st in ((self.past, "+91 98765 43210", "confirmed"), (self.future, "9876543210", "confirmed"), (self.future, "09876543210", "cancelled")):
                db.add(Transaction(business_id=self.biz, type="appointment", status=st,
                                   details={"customer_name": "Asha", "phone_number": phone, "preferred_date": date, "service_name": "Dental Cleaning"}))
            db.add(Transaction(business_id="other-biz", type="appointment", status="confirmed",
                               details={"customer_name": "Elsewhere", "phone_number": "9999999999", "preferred_date": self.past}))
            db.add(Call(business_id=self.biz, caller_number="+919876543210", outcome="resolved", duration_seconds=42))
            db.add(Call(business_id=self.biz, caller_number="+911234567890", outcome="resolved"))
            db.commit()
            self.h = {"Authorization": f"Bearer {create_access_token(owner.id)}"}
            self.stranger_h = {"Authorization": f"Bearer {create_access_token(stranger.id)}"}
        self.url = f"/api/businesses/{self.biz}/customers"

    def _list(self):
        r = self.client.get(self.url, headers=self.h)
        self.assertEqual(r.status_code, 200, r.text)
        return r.json()

    def test_bookings_become_one_patient_with_real_counts(self):
        (asha,) = self._list()
        self.assertEqual(asha["id"], "ph_9876543210")
        self.assertEqual((asha["name"], asha["total_bookings"], asha["upcoming_bookings"]), ("Asha", 2, 1))
        self.assertEqual((asha["last_visit"], asha["next_visit"], asha["status"], asha["saved"]), (self.past, self.future, "active", False))
        self.assertEqual(self.client.get(f"/api/businesses/{self.biz}/patients", headers=self.h).json(), [asha])  # the alias route

    def test_adding_a_patient_saves_a_record_not_a_fake_appointment(self):
        r = self.client.post(self.url, json={"name": "Ravi", "phone_number": "+91 11111 22222", "email": "r@x.example"}, headers=self.h)
        self.assertEqual(r.status_code, 201, r.text)
        self.assertEqual((r.json()["total_bookings"], r.json()["saved"], r.json()["email"]), (0, True, "r@x.example"))
        with self.factory() as db:
            self.assertEqual(db.query(self.Transaction).filter(self.Transaction.business_id == self.biz).count(), 3)
        self.assertEqual({p["name"] for p in self._list()}, {"Asha", "Ravi"})
        # same number again, any spelling: refused
        self.assertEqual(self.client.post(self.url, json={"name": "Ravi 2", "phone_number": "1111122222"}, headers=self.h).status_code, 409)
        self.assertEqual(self.client.post(self.url, json={"name": "X", "phone_number": "12"}, headers=self.h).status_code, 422)

    def test_edit_a_patient_known_only_from_bookings(self):
        r = self.client.patch(f"{self.url}/ph_9876543210", json={"name": "Asha Rao", "notes": "Prefers mornings"}, headers=self.h)
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertTrue(body["saved"])
        self.assertNotEqual(body["id"], "ph_9876543210")
        self.assertEqual((body["name"], body["notes"], body["total_bookings"]), ("Asha Rao", "Prefers mornings", 2))
        (asha,) = self._list()
        self.assertEqual((asha["id"], asha["name"]), (body["id"], "Asha Rao"))
        # her number has appointments under it, so it cannot be moved
        self.assertEqual(self.client.patch(f"{self.url}/{body['id']}", json={"phone_number": "5555555555"}, headers=self.h).status_code, 409)

    def test_phone_change_allowed_without_bookings_and_never_onto_another_patient(self):
        pid = self.client.post(self.url, json={"name": "Ravi", "phone_number": "1111122222"}, headers=self.h).json()["id"]
        self.assertEqual(self.client.patch(f"{self.url}/{pid}", json={"phone_number": "9876543210"}, headers=self.h).status_code, 409)
        r = self.client.patch(f"{self.url}/{pid}", json={"phone_number": "+91 33333 44444"}, headers=self.h)
        self.assertEqual((r.status_code, r.json()["phone_number"]), (200, "+91 33333 44444"))

    def test_remove_hides_until_the_patient_books_again(self):
        self.assertEqual(self.client.delete(f"{self.url}/ph_9876543210", headers=self.h).status_code, 204)
        self.assertEqual(self._list(), [])
        with self.factory() as db:  # appointments are kept
            self.assertEqual(db.query(self.Transaction).filter(self.Transaction.business_id == self.biz).count(), 3)
            db.add(self.Transaction(business_id=self.biz, type="appointment", status="confirmed",
                                    created_at=datetime.now(timezone.utc) + timedelta(seconds=5),
                                    details={"customer_name": "Asha", "phone_number": "9876543210", "preferred_date": self.future}))
            db.commit()
        (asha,) = self._list()
        self.assertEqual(asha["total_bookings"], 3)

    def test_history_lists_her_appointments_and_calls_only(self):
        r = self.client.get(f"{self.url}/ph_9876543210/history", headers=self.h)
        self.assertEqual(r.status_code, 200, r.text)
        data = r.json()
        self.assertEqual(len(data["appointments"]), 3)  # cancelled ones are history too
        self.assertEqual([c["duration_seconds"] for c in data["calls"]], [42])
        self.assertEqual(self.client.get(f"{self.url}/ph_5555555555/history", headers=self.h).status_code, 404)

    def test_another_clinic_cannot_read_or_change_these_patients(self):
        pid = self.client.post(self.url, json={"name": "Ravi", "phone_number": "1111122222"}, headers=self.h).json()["id"]
        for method, path in (("get", ""), ("post", ""), ("patch", f"/{pid}"), ("delete", f"/{pid}"), ("get", f"/{pid}/history")):
            kwargs = {"json": {"name": "Z", "phone_number": "1231231234"}} if method in ("post", "patch") else {}
            r = getattr(self.client, method)(self.url + path, headers=self.stranger_h, **kwargs)
            self.assertEqual(r.status_code, 403, f"{method} {path}: {r.status_code}")
        # and their own clinic's URL with our patient's id finds nothing
        other = "/api/businesses/other-biz/customers"
        self.assertEqual(self.client.patch(f"{other}/{pid}", json={"name": "Z"}, headers=self.stranger_h).status_code, 404)
        self.assertEqual(self.client.get(f"{other}/ph_9876543210/history", headers=self.stranger_h).status_code, 404)
        self.assertEqual([p["name"] for p in self.client.get(other, headers=self.stranger_h).json()], ["Elsewhere"])
        self.assertEqual(self.client.get(self.url).status_code, 401)


class PatientsMigration(unittest.TestCase):
    def test_old_fake_appointments_become_patient_records(self):
        import json
        import tempfile

        from alembic import command
        from sqlalchemy import create_engine, text

        from backend.server.database.migrate import _config

        d = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        self.addCleanup(d.cleanup)
        url = "sqlite:///" + d.name.replace("\\", "/") + "/t.db"
        cfg = _config(url)
        command.upgrade(cfg, "0011")
        eng = create_engine(url)
        legacy = {"customer_name": "Old Patient", "phone_number": "+91 98765 00000", "email": None, "notes": "walk-in"}
        real = {"customer_name": "Booked", "phone_number": "9000000000", "preferred_date": "2026-10-01", "service_name": "X", "notes": ""}
        with eng.begin() as c:
            c.execute(text("insert into businesses (id, name, vertical, business_type, timezone, currency, working_hours, plan, status, created_at) "
                           "values ('b1', 'Clinic', 'clinic', 'clinic', 'UTC', 'INR', '{}', 'starter', 'active', '2026-01-01')"))
            for i, details in enumerate((legacy, real, dict(legacy, phone_number="")), start=1):
                c.execute(text("insert into transactions (id, business_id, type, details, status, created_at) "
                               "values (:id, 'b1', 'appointment', :d, 'confirmed', '2026-02-01')"), {"id": f"t{i}", "d": json.dumps(details)})
        command.upgrade(cfg, "head")
        with eng.connect() as c:
            self.assertEqual(sorted(r[0] for r in c.execute(text("select id from transactions"))), ["t2", "t3"])  # t3 has no phone: left alone
            rows = c.execute(text("select name, phone_key, notes from patients")).fetchall()
        self.assertEqual([tuple(r) for r in rows], [("Old Patient", "9876500000", "walk-in")])


if __name__ == "__main__":
    unittest.main()
