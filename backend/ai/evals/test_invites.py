"""Team invites end to end: the invite carries a link (and an email), the link greets the invitee, accepting signs them in
once, a deactivated member cannot reuse an old link, and only owners / admins of that clinic can invite or resend."""

import unittest
from unittest.mock import AsyncMock, patch
from urllib.parse import parse_qs, urlparse

from backend.ai.evals.fixtures import make_db_factory


class TeamInvites(unittest.TestCase):
    def setUp(self):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient

        from backend.server.api.routes import auth, users
        from backend.server.auth.security import create_access_token, hash_password
        from backend.server.database.models.business import Business
        from backend.server.database.models.user import User
        from backend.server.database.session import get_db

        self.factory, self.biz = make_db_factory()
        app = FastAPI()
        app.include_router(auth.router)
        app.include_router(users.router)

        def override():
            with self.factory() as db:
                yield db

        app.dependency_overrides[get_db] = override
        self.client = TestClient(app)
        self.User, self.Business = User, Business
        with self.factory() as db:
            db.add(Business(id="other-biz", name="Other Clinic"))
            owner = User(email="owner@x.example", hashed_password=hash_password("x" * 10), name="Dr Owner", scope="business", role="owner", business_id=self.biz)
            staff = User(email="staff@x.example", hashed_password=hash_password("x" * 10), name="Staff", scope="business", role="receptionist", business_id=self.biz)
            stranger = User(email="s@x.example", hashed_password=hash_password("x" * 10), name="S", scope="business", role="owner", business_id="other-biz")
            db.add_all([owner, staff, stranger])
            db.commit()
            self.h = {"Authorization": f"Bearer {create_access_token(owner.id)}"}
            self.staff_h = {"Authorization": f"Bearer {create_access_token(staff.id)}"}
            self.stranger_h = {"Authorization": f"Bearer {create_access_token(stranger.id)}"}
        self.mail = AsyncMock(return_value={"sent": True, "provider": "log"})
        patcher = patch.object(users, "send_email", self.mail)
        patcher.start()
        self.addCleanup(patcher.stop)

    def _invite(self, email="new@x.example", headers=None):
        return self.client.post(f"/api/businesses/{self.biz}/users", json={"name": "Neha", "email": email, "role": "receptionist"}, headers=headers or self.h)

    def test_invite_emails_a_link_that_greets_and_signs_the_invitee_in_once(self):
        r = self._invite()
        self.assertEqual(r.status_code, 201, r.text)
        url = r.json()["invite_url"]
        token = parse_qs(urlparse(url).query)["token"][0]
        self.assertTrue(url.split("?")[0].endswith("/accept-invite"))
        self.mail.assert_awaited_once()
        to, subject, text = self.mail.await_args.args[:3]
        self.assertEqual(to, "new@x.example")
        self.assertIn("Sanjeevani Clinic", subject)
        self.assertIn(url, text)

        info = self.client.get("/api/auth/invite", params={"token": token})
        self.assertEqual(info.status_code, 200, info.text)
        self.assertEqual((info.json()["name"], info.json()["business_name"]), ("Neha", "Sanjeevani Clinic"))

        self.assertEqual(self.client.post("/api/auth/accept-invite", json={"token": token, "password": "short"}).status_code, 400)
        ok = self.client.post("/api/auth/accept-invite", json={"token": token, "password": "a-good-password"})
        self.assertEqual(ok.status_code, 200, ok.text)
        me = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {ok.json()['access_token']}"})
        self.assertEqual((me.json()["email"], me.json()["business_id"]), ("new@x.example", self.biz))
        self.assertIsNotNone(me.json()["email_verified_at"])
        self.assertEqual(self.client.post("/api/auth/accept-invite", json={"token": token, "password": "another-password"}).status_code, 409)
        self.assertEqual(self.client.get("/api/auth/invite", params={"token": token}).status_code, 409)

    def test_a_deactivated_member_cannot_reactivate_with_an_old_link(self):
        token = parse_qs(urlparse(self._invite().json()["invite_url"]).query)["token"][0]
        joined = self.client.post("/api/auth/accept-invite", json={"token": token, "password": "a-good-password"}).json()
        self.client.patch(f"/api/businesses/{self.biz}/users/{joined['user']['id']}", json={"is_active": False}, headers=self.h)
        r = self.client.post("/api/auth/accept-invite", json={"token": token, "password": "take-it-back-1"})
        self.assertEqual(r.status_code, 409)
        with self.factory() as db:
            self.assertFalse(db.get(self.User, joined["user"]["id"]).is_active)

    def test_resend_gives_a_new_link_only_while_the_invite_is_pending(self):
        uid = self._invite().json()["user"]["id"]
        r = self.client.post(f"/api/businesses/{self.biz}/users/{uid}/resend-invite", headers=self.h)
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(self.mail.await_count, 2)
        token = parse_qs(urlparse(r.json()["invite_url"]).query)["token"][0]
        self.client.post("/api/auth/accept-invite", json={"token": token, "password": "a-good-password"})
        self.assertEqual(self.client.post(f"/api/businesses/{self.biz}/users/{uid}/resend-invite", headers=self.h).status_code, 409)

    def test_only_this_clinics_owner_or_admin_can_invite_or_resend(self):
        self.assertEqual(self._invite(headers=self.staff_h).status_code, 403)
        self.assertEqual(self._invite(headers=self.stranger_h).status_code, 403)
        uid = self._invite().json()["user"]["id"]
        self.assertEqual(self.client.post(f"/api/businesses/{self.biz}/users/{uid}/resend-invite", headers=self.stranger_h).status_code, 403)
        self.assertEqual(self.client.post(f"/api/businesses/other-biz/users/{uid}/resend-invite", headers=self.stranger_h).status_code, 404)

    def test_a_suspended_clinics_invite_cannot_be_used(self):
        token = parse_qs(urlparse(self._invite().json()["invite_url"]).query)["token"][0]
        with self.factory() as db:
            db.get(self.Business, self.biz).status = "suspended"
            db.commit()
        self.assertEqual(self.client.post("/api/auth/accept-invite", json={"token": token, "password": "a-good-password"}).status_code, 403)

    def test_bad_links_are_refused(self):
        from backend.server.auth.security import create_reset_token

        self.assertEqual(self.client.get("/api/auth/invite", params={"token": "nope"}).status_code, 400)
        self.assertEqual(self.client.get("/api/auth/invite", params={"token": create_reset_token("x", "y")}).status_code, 400)


if __name__ == "__main__":
    unittest.main()
