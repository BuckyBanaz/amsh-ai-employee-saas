"""Admin: create a business with its owner, and permanently delete one (preview first, exact-name confirmation)."""

import unittest

from backend.ai.evals.fixtures import make_db_factory


class AdminTenantManage(unittest.TestCase):
    def setUp(self):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient

        from backend.scripts.create_platform_admin import create_platform_admin
        from backend.server.api.routes import admin_tenant_manage
        from backend.server.auth.security import create_access_token, hash_password
        from backend.server.database.models.business import Business
        from backend.server.database.models.call import Call
        from backend.server.database.models.message import Message
        from backend.server.database.models.service import Service
        from backend.server.database.models.staff import Staff
        from backend.server.database.models.user import User
        from backend.server.database.session import get_db

        self.factory, self.biz = make_db_factory()  # a throwaway in-memory database
        app = FastAPI()
        app.include_router(admin_tenant_manage.router)

        def override():
            with self.factory() as db:
                yield db

        app.dependency_overrides[get_db] = override
        self.client = TestClient(app)
        with self.factory() as db:
            admin = create_platform_admin(db, "root@amsh.ai", "Root", "a-long-enough-pass")
            owner = User(email="owner@x.example", hashed_password=hash_password("x" * 10), name="Owner", scope="business", role="owner", business_id=self.biz)
            db.add(owner)
            db.commit()
            self.admin_h = {"Authorization": f"Bearer {create_access_token(admin.id)}"}
            self.owner_h = {"Authorization": f"Bearer {create_access_token(owner.id)}"}
        self.Business, self.User, self.Call, self.Message, self.Service, self.Staff = Business, User, Call, Message, Service, Staff

    def _body(self, **over):
        body = {"name": "Nova Dental", "vertical": "clinic", "country": "IN", "plan": None, "owner": {"name": "Dr Nova", "email": "Nova@Clinic.example", "password": "long-enough-1"}}
        body.update(over)
        return body

    def test_create_makes_the_business_and_its_owner_login(self):
        r = self.client.post("/api/admin/tenants", json=self._body(), headers=self.admin_h)
        self.assertEqual(r.status_code, 201, r.text)
        data = r.json()
        with self.factory() as db:
            owner = db.query(self.User).filter(self.User.business_id == data["id"]).one()
            self.assertEqual((owner.email, owner.role, owner.scope), ("nova@clinic.example", "owner", "business"))
            self.assertTrue(owner.email_verified_at)
            self.assertEqual(db.get(self.Business, data["id"]).status, "active")

    def test_create_rejects_a_taken_email_an_unknown_plan_and_non_admins(self):
        self.assertEqual(self.client.post("/api/admin/tenants", json=self._body(owner={"name": "A", "email": "owner@x.example", "password": "long-enough-1"}), headers=self.admin_h).status_code, 409)
        self.assertEqual(self.client.post("/api/admin/tenants", json=self._body(plan="no-such-plan"), headers=self.admin_h).status_code, 400)
        self.assertEqual(self.client.post("/api/admin/tenants", json=self._body(), headers=self.owner_h).status_code, 403)
        with self.factory() as db:
            self.assertEqual(db.query(self.Business).filter(self.Business.name == "Nova Dental").count(), 0)

    def test_delete_previews_then_needs_the_exact_name_and_removes_everything_of_that_business_only(self):
        made = self.client.post("/api/admin/tenants", json=self._body(), headers=self.admin_h).json()
        bid = made["id"]
        with self.factory() as db:
            svc, staff = self.Service(business_id=bid, title="Cleaning", duration_minutes=30, price_amount=1, price_currency="INR"), self.Staff(business_id=bid, name="Dr A", role="dentist")
            db.add_all([svc, staff, self.Call(id="CAx", business_id=bid, caller_number="+911")])
            db.commit()
            db.add(self.Message(call_id="CAx", speaker="User", text="hi"))
            db.commit()

        preview = self.client.get(f"/api/admin/tenants/{bid}/delete-preview", headers=self.admin_h).json()
        self.assertEqual(preview["confirm_with"], "Nova Dental")
        self.assertGreaterEqual(preview["counts"]["users"], 1)
        with self.factory() as db:
            self.assertIsNotNone(db.get(self.Business, bid))  # a preview deletes nothing

        wrong = self.client.request("DELETE", f"/api/admin/tenants/{bid}", json={"confirm": "nova dental"}, headers=self.admin_h)
        self.assertEqual(wrong.status_code, 400)
        self.assertEqual(self.client.request("DELETE", f"/api/admin/tenants/{bid}", json={"confirm": "Nova Dental"}, headers=self.owner_h).status_code, 403)

        done = self.client.request("DELETE", f"/api/admin/tenants/{bid}", json={"confirm": "Nova Dental"}, headers=self.admin_h)
        self.assertEqual(done.status_code, 200, done.text)
        with self.factory() as db:
            self.assertIsNone(db.get(self.Business, bid))
            self.assertEqual(db.query(self.User).filter(self.User.business_id == bid).count(), 0)
            self.assertIsNotNone(db.get(self.Business, self.biz))  # the other business is untouched
            self.assertEqual(db.query(self.User).filter(self.User.business_id == self.biz).count(), 1)


if __name__ == "__main__":
    unittest.main()
