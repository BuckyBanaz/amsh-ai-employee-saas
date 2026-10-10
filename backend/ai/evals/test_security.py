"""Security hardening: telephony webhook verification, media-stream tokens, login + rate limits on paid voice endpoints,
the "no unguarded route" scan, rate limiter and production-config checks."""

import unittest
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.ai.evals.fixtures import make_db_factory
from backend.server.auth import security, webhook_signatures as ws
from backend.server.common import ratelimit
from backend.server.common.config import Settings, production_problems
from backend.server.database.models.business import Business
from backend.server.database.models.user import User
from backend.server.database.session import get_db


def fake_settings(**over):
    base = dict(TWILIO_AUTH_TOKEN="12345", EXOTEL_WEBHOOK_SECRET="s3cret", ALLOW_DEV_FALLBACKS=False, PUBLIC_BASE_URL="https://mycompany.com",
                JWT_SECRET="x" * 40, ENFORCE_VOICE_QUOTA=False, EXOTEL_ACCOUNT_SID=None, EXOTEL_API_KEY=None, EXOTEL_API_TOKEN=None, EXOTEL_PHONE_NUMBER=None)
    base.update(over)
    return SimpleNamespace(**base)


class SignatureMath(unittest.TestCase):
    def test_twilio_documented_example(self):
        params = {"Digits": "1234", "To": "+18005551212", "From": "+14158675310", "Caller": "+14158675310", "CallSid": "CA1234567890ABCDE"}
        self.assertEqual(ws.twilio_signature("12345", "https://mycompany.com/myapp.php?foo=1&bar=2", params), "GvWf1cFY/Q7PnoempGyD5oXAezc=")

    def test_exotel_key_compare(self):
        self.assertTrue(ws.exotel_key_ok("abc", "abc"))
        self.assertFalse(ws.exotel_key_ok("abc", "abd"))
        self.assertFalse(ws.exotel_key_ok("abc", ""))
        self.assertFalse(ws.exotel_key_ok("", ""))

    def test_stream_token_is_tied_to_the_business_and_expires(self):
        t = ws.create_stream_token("biz-1", now=1000)
        self.assertTrue(ws.stream_token_ok("biz-1", t, now=1100))
        self.assertFalse(ws.stream_token_ok("biz-2", t, now=1100))
        self.assertFalse(ws.stream_token_ok("biz-1", t, now=1000 + ws.STREAM_TOKEN_TTL + 1))
        self.assertFalse(ws.stream_token_ok("biz-1", "garbage"))
        self.assertFalse(ws.stream_token_ok("biz-1", None))
        self.assertFalse(ws.stream_token_ok("biz-1", "1100.deadbeef"))


class TelephonyWebhooks(unittest.TestCase):
    def setUp(self):
        from backend.server.api.routes import exotel, voice

        factory, self.biz = make_db_factory()
        app = FastAPI()
        app.include_router(voice.router)
        app.include_router(exotel.router)

        def override():
            with factory() as db:
                yield db

        app.dependency_overrides[get_db] = override
        with factory() as db:  # calls route only through a number the platform assigned
            from backend.server.database.models.phone_number import PhoneNumber

            db.add(PhoneNumber(business_id=self.biz, number="+912000000000", status="active"))
            db.commit()
        self.c = TestClient(app)
        self.addCleanup(patch.stopall)

    def sign(self, path, form, token="12345"):
        return {"X-Twilio-Signature": ws.twilio_signature(token, "https://mycompany.com" + path, form)}

    def test_twilio_webhook_needs_a_valid_signature(self):
        form = {"To": "+912000000000", "From": "+919999999999", "CallSid": "CA1"}
        with patch.object(ws, "get_settings", lambda: fake_settings()), patch("backend.ai.realtime.twilio.call_control.get_settings", lambda: fake_settings()), \
             patch("backend.server.api.routes.voice.get_settings", lambda: fake_settings()):
            self.assertEqual(self.c.post("/api/voice/incoming", data=form).status_code, 403)
            self.assertEqual(self.c.post("/api/voice/incoming", data=form, headers={"X-Twilio-Signature": "nope"}).status_code, 403)
            wrong = self.c.post("/api/voice/incoming", data=form, headers=self.sign("/api/voice/incoming", form, token="other"))
            self.assertEqual(wrong.status_code, 403)
            ok = self.c.post("/api/voice/incoming", data=form, headers=self.sign("/api/voice/incoming", form))
            self.assertEqual(ok.status_code, 200)
            self.assertIn('name="token"', ok.text)  # the TwiML carries the media-stream token
            self.assertEqual(self.c.post("/api/voice/status", data={"CallSid": "CA1", "CallStatus": "completed"}).status_code, 403)
            self.assertEqual(self.c.post("/api/voice/transfer-status", data={"DialCallStatus": "completed", "From": "+1", "CallSid": "CA1"}).status_code, 403)

    def test_twilio_without_a_token_is_refused_in_production_and_allowed_in_dev(self):
        form = {"CallSid": "CA1", "CallStatus": "completed"}
        with patch.object(ws, "get_settings", lambda: fake_settings(TWILIO_AUTH_TOKEN=None)):
            self.assertEqual(self.c.post("/api/voice/status", data=form).status_code, 403)
        with patch.object(ws, "get_settings", lambda: fake_settings(TWILIO_AUTH_TOKEN=None, ALLOW_DEV_FALLBACKS=True)):
            self.assertEqual(self.c.post("/api/voice/status", data=form).status_code, 200)

    def test_exotel_webhook_needs_the_shared_key(self):
        with patch.object(ws, "get_settings", lambda: fake_settings()):
            self.assertEqual(self.c.post("/api/voice/exotel/status", data={"CallSid": "E1"}).status_code, 403)
            self.assertEqual(self.c.post("/api/voice/exotel/status?key=wrong", data={"CallSid": "E1"}).status_code, 403)
            self.assertEqual(self.c.post("/api/voice/exotel/status?key=s3cret", data={"CallSid": "E1"}).status_code, 200)
            self.assertEqual(self.c.get("/api/voice/exotel/incoming?CallSid=E1").status_code, 403)
        with patch.object(ws, "get_settings", lambda: fake_settings(EXOTEL_WEBHOOK_SECRET=None)):
            self.assertEqual(self.c.post("/api/voice/exotel/status", data={"CallSid": "E1"}).status_code, 403)


class PaidVoiceEndpoints(unittest.TestCase):
    def setUp(self):
        from backend.server.api.routes import voice

        ratelimit.reset()
        factory, self.biz = make_db_factory()
        with factory() as db:
            db.add(Business(id="biz-2", name="Other"))
            owner = User(email="o@c.com", hashed_password="x", name="Owner", business_id=self.biz, role="owner")
            db.add(owner)
            db.commit()
            self.token = security.create_access_token(owner.id)
            self.media = security.create_media_token(owner.id)
        app = FastAPI()
        app.include_router(voice.router)

        def override():
            with factory() as db:
                yield db

        app.dependency_overrides[get_db] = override
        self.c = TestClient(app)
        self.h = {"Authorization": f"Bearer {self.token}"}
        self.addCleanup(patch.stopall)

    def test_every_paid_endpoint_needs_a_login(self):
        for method, url in (("get", "/api/voice/voices"), ("get", "/api/voice/llm-models"), ("get", "/api/voice/preview?voice_id=v&text=hi"),
                            ("post", "/api/voice/call-me"), ("post", "/api/voice/media-token")):
            r = getattr(self.c, method)(url, **({"json": {"phone_number": "+919876543210"}} if url.endswith("call-me") else {}))
            self.assertEqual(r.status_code, 401, url)
        self.assertEqual(self.c.post("/api/voice/transcribe", files={"file": ("a.webm", b"x", "audio/webm")}).status_code, 401)

    def test_preview_accepts_a_media_token_but_not_an_access_token_in_the_url(self):
        from backend.server.api.routes import voice

        async def fake(*a, **k):
            return b"MP3"

        with patch.object(voice.cartesia_tts, "generate_preview_audio", fake):
            ok = self.c.get(f"/api/voice/preview?voice_id=v&text=hi&token={self.media}")
            self.assertEqual((ok.status_code, ok.content), (200, b"MP3"))
            self.assertEqual(self.c.get("/api/voice/preview?voice_id=v&text=hi", headers=self.h).status_code, 200)
            self.assertEqual(self.c.get(f"/api/voice/preview?voice_id=v&text=hi&token={self.token}").status_code, 401)
            self.assertEqual(self.c.get("/api/voice/preview?voice_id=v&text=" + "a" * 501, headers=self.h).status_code, 400)

    def test_a_media_token_is_not_a_login_and_mints_from_a_login(self):
        self.assertEqual(self.c.post("/api/voice/media-token", headers={"Authorization": f"Bearer {self.media}"}).status_code, 401)
        r = self.c.post("/api/voice/media-token", headers=self.h)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(security.decode_media_token(r.json()["token"]), security.decode_access_token(self.token))

    def test_preview_is_rate_limited_per_user(self):
        from backend.server.api.routes import voice

        async def fake(*a, **k):
            return b"MP3"

        with patch.object(voice.cartesia_tts, "generate_preview_audio", fake):
            codes = [self.c.get("/api/voice/preview?voice_id=v&text=hi", headers=self.h).status_code for _ in range(121)]
        self.assertEqual(codes.count(200), 120)
        self.assertEqual(codes[-1], 429)

    def test_call_me_validates_the_number_uses_own_business_and_is_limited(self):
        from backend.server.api.routes import voice

        seen = {}

        async def fake_call(phone, callback_url=None):
            seen["url"] = callback_url
            return {"Call": {"Sid": "X1"}}

        with patch.object(voice.exotel_client, "is_configured", lambda: True), patch.object(voice.exotel_client, "create_outbound_call", fake_call), \
             patch.object(voice, "get_settings", lambda: fake_settings()):
            self.assertEqual(self.c.post("/api/voice/call-me", json={"phone_number": "12"}, headers=self.h).status_code, 400)
            self.assertEqual(self.c.post("/api/voice/call-me", json={"phone_number": "+91 98765-43210; rm"}, headers=self.h).status_code, 400)
            r = self.c.post("/api/voice/call-me", json={"phone_number": "+91 98765 43210", "business_id": "biz-2"}, headers=self.h)
            self.assertTrue(r.json()["success"])
            self.assertIn(f"business_id={self.biz}", seen["url"])  # the payload's business was ignored
            self.assertNotIn("biz-2", seen["url"])
            self.assertIn("key=s3cret", seen["url"])  # the call-back carries the Exotel shared key
            self.assertEqual(self.c.post("/api/voice/call-me", json={"phone_number": "+919876543210"}, headers=self.h).status_code, 200)
            self.assertEqual(self.c.post("/api/voice/call-me", json={"phone_number": "+919876543210"}, headers=self.h).status_code, 429)  # same number: 2 per hour


class SimulateEndpoint(unittest.TestCase):
    def test_simulate_needs_login_and_membership(self):
        from backend.ai.realtime.twilio import gateway

        ratelimit.reset()
        factory, biz = make_db_factory()
        with factory() as db:
            db.add(Business(id="biz-2", name="Other"))
            u = User(email="o@c.com", hashed_password="x", name="Owner", business_id=biz, role="owner")
            db.add(u)
            db.commit()
            h = {"Authorization": f"Bearer {security.create_access_token(u.id)}"}
        app = FastAPI()
        app.include_router(gateway.router)

        def override():
            with factory() as db:
                yield db

        app.dependency_overrides[get_db] = override
        c = TestClient(app)
        body = {"business_id": "biz-2", "user_transcript": "hello"}
        self.assertEqual(c.post("/api/voice/simulate", json=body).status_code, 401)
        self.assertEqual(c.post("/api/voice/simulate/stream", json=body).status_code, 401)
        self.assertEqual(c.post("/api/voice/simulate", json=body, headers=h).status_code, 403)  # another business
        self.assertEqual(c.post("/api/voice/simulate/stream", json=body, headers=h).status_code, 403)


class NoUnguardedRoutes(unittest.TestCase):
    """Every route must sit behind a login, a provider check or a secret link, unless it is on this reviewed list."""

    PUBLIC = {
        ("POST", "/api/auth/register"), ("POST", "/api/auth/login"), ("POST", "/api/auth/forgot-password"), ("POST", "/api/auth/reset-password"),
        ("POST", "/api/auth/verify-email"), ("POST", "/api/auth/accept-invite"), ("GET", "/api/auth/invite"), ("POST", "/api/public/demo-chat"), ("POST", "/api/admin/auth/login"),
        ("GET", "/api/plans"), ("GET", "/api/plans/{key}"), ("GET", "/api/languages"),
        ("GET", "/api/billing/config"), ("GET", "/api/billing/trial-config"), ("GET", "/api/payments/config"), ("GET", "/api/voice/stt-config"),
        ("GET", "/api/calendar/{business_id}/{token}.ics"), ("GET", "/api/recordings/{call_id}/{token}"),  # the token in the URL is the secret
        ("GET", "/api/v1/whatsapp/webhook"), ("POST", "/api/v1/whatsapp/webhook"),  # Meta verify token / signature checked inside
        ("GET", "/api/integrations/google/callback"), ("GET", "/api/integrations/outlook/callback"),  # OAuth redirects from Google / Microsoft: the signed state (JWT) ties them to a business, the code is exchanged server-side
        ("GET", "/api/policies/public/{key}"),  # the published Terms and Privacy text, shown before sign-up
        ("GET", "/api/seo/public"), ("GET", "/api/seo/robots.txt"), ("GET", "/api/seo/sitemap.xml"),  # public marketing-site SEO
        ("GET", "/"), ("GET", "/health"),
    }

    def test_only_reviewed_routes_are_open(self):
        from fastapi.routing import APIRoute

        from backend.main import app

        guards = {security.get_current_user, security.require_platform_admin, security.get_voice_user, ws.verify_twilio, ws.verify_exotel}

        def calls(dep):
            out = {dep.call} if dep.call else set()
            for d in dep.dependencies:
                out |= calls(d)
            return out

        contexts = []
        for r in app.routes:
            contexts.extend(r.effective_route_contexts() if hasattr(r, "effective_route_contexts") else [r])
        open_routes = set()
        for c in contexts:
            route = getattr(c, "original_route", c)
            if not isinstance(route, APIRoute):
                continue
            if not (calls(route.dependant) & guards):
                for m in route.methods:
                    open_routes.add((m, getattr(c, "path", route.path)))
        unexpected = sorted(open_routes - {p for p in self.PUBLIC})
        self.assertEqual(unexpected, [], f"unguarded routes that are not on the reviewed list: {unexpected}")


class Limiter(unittest.TestCase):
    def test_window_slides_and_keys_are_independent(self):
        from fastapi import HTTPException

        ratelimit.reset()
        for _ in range(3):
            ratelimit.check("t", "a", 3, 60)
        with self.assertRaises(HTTPException) as e:
            ratelimit.check("t", "a", 3, 60)
        self.assertEqual(e.exception.status_code, 429)
        ratelimit.check("t", "b", 3, 60)
        real = ratelimit.time.monotonic
        with patch("backend.server.common.ratelimit.time.monotonic", lambda: real() + 61):
            ratelimit.check("t", "a", 3, 60)


class ProductionConfig(unittest.TestCase):
    def test_defaults_are_production_safe_except_secrets(self):
        s = Settings(_env_file=None, JWT_SECRET="y" * 40, DATABASE_URL="postgresql://u:p@db/x", TWILIO_AUTH_TOKEN="t")
        self.assertFalse(s.DEBUG)
        self.assertFalse(s.ALLOW_DEV_FALLBACKS)
        self.assertEqual(s.CONVERSATION_ENGINE, "llm_agent")
        self.assertEqual(production_problems(s), [])

    def test_unsafe_settings_are_reported(self):
        s = Settings(_env_file=None, DEBUG=True, ALLOW_DEV_FALLBACKS=True)
        text = " ".join(production_problems(s))
        for needle in ("JWT_SECRET", "DEBUG", "ALLOW_DEV_FALLBACKS", "amsh/amsh", "webhooks"):
            self.assertIn(needle, text)


if __name__ == "__main__":
    unittest.main()
