"""WhatsApp can be "connected" while Meta refuses every reply (e.g. the WABA's payment account). The last refusal is kept on the
integration so the dashboard can say so; the next successful send clears it. Nothing about the patient is stored."""

import asyncio
import unittest
from unittest.mock import patch

import httpx

from backend.ai.evals.fixtures import make_db_factory
from backend.server.auth.crypto import CryptoManager
from backend.server.database.models.integration import Integration
from backend.server.services import whatsapp_agent

REFUSED = {"error": {"message": "(#10) Viewer cannot access the provided Paid Message Account 1", "code": 10, "type": "OAuthException"}}


def fake_client(status, body):
    class Client:
        def __init__(self, *a, **k):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def post(self, url, **k):
            return httpx.Response(status, json=body, request=httpx.Request("POST", url))

    return Client


class SendHealth(unittest.TestCase):
    def setUp(self):
        self.factory, self.biz = make_db_factory()
        with self.factory() as db:
            db.add(Integration(business_id=self.biz, provider="whatsapp", status="connected", config={"phone_number_id": "pn1"}))
            db.commit()
        self.config = {"phone_number_id": "pn1", "access_token": CryptoManager.encrypt("token")}
        p = patch.object(whatsapp_agent, "SessionLocal", self.factory)
        p.start()
        self.addCleanup(p.stop)

    def send(self, status, body):
        with patch.object(whatsapp_agent.httpx, "AsyncClient", fake_client(status, body)):
            return asyncio.run(whatsapp_agent.send_text(self.config, "919999999999", "Your appointment is at 5"))

    def stored(self):
        with self.factory() as db:
            return db.query(Integration).filter_by(business_id=self.biz).one().config

    def test_a_refused_reply_is_kept_without_patient_data(self):
        self.assertFalse(self.send(400, REFUSED))
        err = self.stored()["last_send_error"]
        self.assertEqual(err["code"], 10)
        self.assertIn("Paid Message Account", err["message"])
        self.assertIn("at", err)
        self.assertNotIn("919999999999", str(err))
        self.assertNotIn("appointment", str(err))

    def test_the_next_good_send_clears_it(self):
        self.send(400, REFUSED)
        self.assertTrue(self.send(200, {"messages": [{"id": "wamid.1"}]}))
        self.assertNotIn("last_send_error", self.stored())
        self.assertEqual(self.stored()["phone_number_id"], "pn1")


if __name__ == "__main__":
    unittest.main()
