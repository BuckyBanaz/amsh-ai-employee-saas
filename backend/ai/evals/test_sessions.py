"""Sign out everywhere: old login and media tokens stop working, this device keeps a fresh one; password change and reset end
other sessions; the STT stream and the optional-admin check honour it too."""

import time
import unittest
from unittest.mock import patch

from backend.ai.evals.fixtures import make_db_factory


class SignOutEverywhere(unittest.TestCase):
    def setUp(self):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient

        from backend.server.api.routes import auth
        from backend.server.auth.security import create_access_token, create_media_token, hash_password
        from backend.server.database.models.user import User
        from backend.server.database.session import get_db

        self.factory, self.biz = make_db_factory()
        app = FastAPI()
        app.include_router(auth.router)

        def override():
            with self.factory() as db:
                yield db

        app.dependency_overrides[get_db] = override
        self.client = TestClient(app)
        self.User = User
        with self.factory() as db:
            user = User(email="o@x.example", hashed_password=hash_password("old-password-1"), name="O", scope="business", role="owner", business_id=self.biz)
            db.add(user)
            db.commit()
            self.user_id = user.id
        self.laptop = create_access_token(self.user_id)
        self.phone = create_access_token(self.user_id)
        self.media = create_media_token(self.user_id)
        time.sleep(0.01)  # a revocation is always later than the tokens it ends

    def _me(self, token):
        return self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code

    def test_logout_all_ends_every_token_and_keeps_this_device_signed_in(self):
        self.assertEqual((self._me(self.laptop), self._me(self.phone)), (200, 200))
        r = self.client.post("/api/auth/logout-all", headers={"Authorization": f"Bearer {self.laptop}"})
        self.assertEqual(r.status_code, 200, r.text)
        fresh = r.json()["access_token"]
        self.assertEqual((self._me(self.laptop), self._me(self.phone), self._me(fresh)), (401, 401, 200))
        self.assertIn("signed out", self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {self.phone}"}).json()["detail"])

    def test_media_tokens_are_ended_too(self):
        from fastapi import HTTPException

        from backend.server.auth.security import get_voice_user

        self.client.post("/api/auth/logout-all", headers={"Authorization": f"Bearer {self.laptop}"})
        with self.factory() as db, self.assertRaises(HTTPException) as caught:
            get_voice_user(token=self.media, credentials=None, db=db)
        self.assertEqual(caught.exception.status_code, 401)

    def test_changing_the_password_signs_out_other_devices(self):
        r = self.client.post("/api/auth/change-password", json={"current_password": "old-password-1", "new_password": "new-password-2"},
                             headers={"Authorization": f"Bearer {self.laptop}"})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual((self._me(self.phone), self._me(r.json()["access_token"])), (401, 200))

    def test_a_password_reset_signs_out_everyone(self):
        from backend.server.auth.security import create_reset_token

        with self.factory() as db:
            token = create_reset_token(self.user_id, db.get(self.User, self.user_id).hashed_password)
        self.assertEqual(self.client.post("/api/auth/reset-password", json={"token": token, "password": "brand-new-pass"}).status_code, 200)
        self.assertEqual(self._me(self.phone), 401)
        login = self.client.post("/api/auth/login", json={"email": "o@x.example", "password": "brand-new-pass"})
        self.assertEqual(self._me(login.json()["access_token"]), 200)

    def test_tokens_from_before_this_change_work_until_a_revocation(self):
        from jose import jwt

        from backend.server.common.config import get_settings

        s = get_settings()
        legacy = jwt.encode({"sub": self.user_id, "exp": int(time.time()) + 600}, s.JWT_SECRET, algorithm=s.JWT_ALGORITHM)  # no "iat"
        self.assertEqual(self._me(legacy), 200)
        self.client.post("/api/auth/logout-all", headers={"Authorization": f"Bearer {self.laptop}"})
        self.assertEqual(self._me(legacy), 401)

    def test_stt_stream_refuses_a_signed_out_or_unknown_account(self):
        from backend.server.api.routes import stt
        from backend.server.auth.security import create_access_token

        with patch.object(stt, "SessionLocal", self.factory):
            self.assertEqual(stt._authorised(self.phone), self.user_id)
            self.assertIsNone(stt._authorised(create_access_token("no-such-user")))
            self.client.post("/api/auth/logout-all", headers={"Authorization": f"Bearer {self.laptop}"})
            self.assertIsNone(stt._authorised(self.phone))

    def test_logout_all_needs_a_login(self):
        self.assertEqual(self.client.post("/api/auth/logout-all").status_code, 401)


if __name__ == "__main__":
    unittest.main()
