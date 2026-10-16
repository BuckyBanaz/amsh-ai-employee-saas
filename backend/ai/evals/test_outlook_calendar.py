"""Outlook / Microsoft 365 calendar sync. Microsoft Graph and the token endpoint are replaced by a fake that records every call,
so these run offline and check what would really be sent: create on booking, update on reschedule, delete on cancel, and that
a calendar failure never breaks the booking."""

import json
import unittest
from datetime import date
from types import SimpleNamespace
from unittest import mock

import httpx

from backend.ai.evals.fixtures import make_db_factory
from backend.server.auth.crypto import CryptoManager
from backend.server.database.models.business import Business
from backend.server.database.models.integration import Integration
from backend.server.database.models.transaction import Transaction
from backend.server.services import calendar_sync, outlook_calendar as O


class FakeGraph:
    """Records requests. Token refresh returns a fresh access token and a rotated refresh token."""

    def __init__(self, create_status=201, token_status=200):
        self.calls = []
        self.create_status = create_status
        self.token_status = token_status
        self.next_id = 0

    def handler(self, request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content) if request.content and request.headers.get("content-type", "").startswith("application/json") else None
        self.calls.append((request.method, str(request.url), body))
        if str(request.url).startswith(O.TOKEN_URL):
            if self.token_status != 200:
                return httpx.Response(self.token_status, json={"error": "invalid_grant"})
            return httpx.Response(200, json={"access_token": "AT", "refresh_token": "RT2", "expires_in": 3600})
        if request.method == "POST" and str(request.url) == f"{O.GRAPH}/me/events":
            self.next_id += 1
            return httpx.Response(self.create_status, json={"id": f"ev{self.next_id}"})
        if request.method == "PATCH":
            return httpx.Response(200, json={"id": request.url.path.rsplit("/", 1)[-1]})
        if request.method == "DELETE":
            return httpx.Response(204)
        return httpx.Response(404, json={})


class OutlookSync(unittest.TestCase):
    def setUp(self):
        self.factory, self.biz = make_db_factory()
        self.graph = FakeGraph()
        db = self.factory()
        b = db.get(Business, self.biz)
        b.timezone = "Asia/Kolkata"
        db.add(Integration(business_id=self.biz, provider="outlook", status="connected",
                           config={"refresh_token": CryptoManager.encrypt("RT1"), "email": "dr@clinic.example"}))
        db.commit()
        db.close()
        transport = httpx.MockTransport(self.graph.handler)
        self._client = mock.patch.object(O.httpx, "post", side_effect=lambda url, **kw: httpx.Client(transport=transport).post(url, **kw))
        self._patch = mock.patch.object(O.httpx, "patch", side_effect=lambda url, **kw: httpx.Client(transport=transport).patch(url, **kw))
        self._delete = mock.patch.object(O.httpx, "delete", side_effect=lambda url, **kw: httpx.Client(transport=transport).delete(url, **kw))
        self._configured = mock.patch.object(O, "is_configured", return_value=True)
        for p in (self._client, self._patch, self._delete, self._configured):
            p.start()
        self.addCleanup(mock.patch.stopall)

    def _booking(self, **details):
        base = {"customer_name": "Parikshit Verma", "phone_number": "8901414107", "service_name": "Teeth Whitening",
                "preferred_date": "2026-10-12", "preferred_time": "12:00 PM", "doctor_name": "Dr. Vinita"}
        db = self.factory()
        tx = Transaction(id=f"tx{date.today().isoformat()}{len(details)}", business_id=self.biz, type="appointment", status="confirmed",
                         details={**base, **details})
        db.add(tx)
        db.commit()
        db.refresh(tx)
        return db, tx

    def test_booking_creates_one_event_at_the_right_utc_time(self):
        db, tx = self._booking()
        calendar_sync.sync_appointment(db, self.biz, tx)
        posts = [c for c in self.graph.calls if c[0] == "POST" and c[1] == f"{O.GRAPH}/me/events"]
        self.assertEqual(len(posts), 1)
        body = posts[0][2]
        self.assertEqual(body["subject"], "Teeth Whitening - Parikshit Verma")
        self.assertEqual(body["start"], {"dateTime": "2026-10-12T06:30:00", "timeZone": "UTC"})  # 12:00 IST = 06:30 UTC
        self.assertEqual(body["end"]["dateTime"], "2026-10-12T07:00:00")
        db.refresh(tx)
        self.assertEqual(tx.details[O.EVENT_KEY], "ev1")
        db.close()

    def test_reschedule_updates_the_same_event_and_cancel_deletes_it(self):
        db, tx = self._booking()
        calendar_sync.sync_appointment(db, self.biz, tx)
        tx.details = {**tx.details, "preferred_time": "4:00 PM"}
        db.commit()
        calendar_sync.sync_appointment(db, self.biz, tx)
        patches = [c for c in self.graph.calls if c[0] == "PATCH"]
        self.assertEqual(len(patches), 1)
        self.assertTrue(patches[0][1].endswith("/me/events/ev1"))
        self.assertEqual(patches[0][2]["start"]["dateTime"], "2026-10-12T10:30:00")  # 4 PM IST
        tx.status = "cancelled"
        db.commit()
        calendar_sync.sync_appointment(db, self.biz, tx)
        self.assertEqual([c[0] for c in self.graph.calls if c[0] == "DELETE"], ["DELETE"])
        db.refresh(tx)
        self.assertNotIn(O.EVENT_KEY, tx.details)
        db.close()

    def test_a_rotated_refresh_token_is_stored_encrypted(self):
        db, tx = self._booking()
        calendar_sync.sync_appointment(db, self.biz, tx)
        integ = db.query(Integration).filter(Integration.provider == "outlook").one()
        self.assertEqual(CryptoManager.decrypt(integ.config["refresh_token"]), "RT2")
        db.close()

    def test_a_failing_graph_never_breaks_the_booking(self):
        self.graph.create_status = 500
        db, tx = self._booking()
        calendar_sync.sync_appointment(db, self.biz, tx)  # must not raise
        db.refresh(tx)
        self.assertNotIn(O.EVENT_KEY, tx.details)
        db.close()

    def test_revoked_consent_skips_quietly(self):
        self.graph.token_status = 400
        db, tx = self._booking()
        calendar_sync.sync_appointment(db, self.biz, tx)
        self.assertEqual([c for c in self.graph.calls if c[0] == "POST" and c[1] == f"{O.GRAPH}/me/events"], [])
        db.close()

    def test_not_connected_does_nothing(self):
        db = self.factory()
        db.query(Integration).filter(Integration.provider == "outlook").delete()
        db.commit()
        _, tx = self._booking(preferred_date="2026-10-13")
        calendar_sync.sync_appointment(db, self.biz, tx)
        self.assertEqual(self.graph.calls, [])
        db.close()

    def test_the_dispatcher_calls_both_providers(self):
        with mock.patch("backend.server.services.google_calendar.sync_appointment") as g, \
                mock.patch.object(O, "sync_appointment") as o:
            calendar_sync.sync_appointment("db", "biz", "tx", deleted=True)
        g.assert_called_once_with("db", "biz", "tx", deleted=True)
        o.assert_called_once_with("db", "biz", "tx", deleted=True)


class OutlookOAuth(unittest.TestCase):
    def test_state_round_trips_and_is_not_a_google_state(self):
        from backend.server.services import google_calendar
        state = O.make_state("biz1", "user1", ret="dashboard")
        data = O.read_state(state)
        self.assertEqual((data["bid"], data["uid"], data["ret"]), ("biz1", "user1", "dashboard"))
        self.assertIsNone(google_calendar.read_state(state))  # a Microsoft state never passes as a Google one

    def test_auth_url_asks_for_offline_access_and_calendar(self):
        with mock.patch.object(O, "_cfg", side_effect=lambda n: {"MICROSOFT_CLIENT_ID": "cid", "MICROSOFT_REDIRECT_URI": "https://x/cb"}.get(n)):
            url = O.build_auth_url("st")
        self.assertIn("login.microsoftonline.com/common", url)
        self.assertIn("offline_access", url)
        self.assertIn("Calendars.ReadWrite", url)
        self.assertIn("client_id=cid", url)

    def test_event_body_handles_am_and_pm_and_bad_dates(self):
        morning = O.event_body({"preferred_date": "2026-10-12", "preferred_time": "9:30 AM"}, "Asia/Kolkata")
        self.assertEqual(morning["start"]["dateTime"], "2026-10-12T04:00:00")
        self.assertIsNone(O.event_body({"preferred_date": "not-a-date", "preferred_time": "9 AM"}, "Asia/Kolkata"))
        self.assertIsNone(O.event_body({"preferred_time": "9 AM"}, "Asia/Kolkata"))


if __name__ == "__main__":
    unittest.main()
