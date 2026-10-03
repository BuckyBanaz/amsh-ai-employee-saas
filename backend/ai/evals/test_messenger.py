"""The messenger: template + clinic preferences + quiet hours + channel fallback + message_log, and that today's wording is unchanged."""

import asyncio
import unittest
from datetime import datetime, timezone

from backend.ai.evals.fixtures import make_db_factory
from backend.server.database.models.business import Business
from backend.server.database.models.integration import Integration
from backend.server.database.models.message_template import MessageLog, MessageTemplate
from backend.server.notifications import messenger as m
from backend.server.services import message_templates as svc

# 2026-09-30 17:30 UTC = 23:00 in Kolkata (inside a 21:00 to 08:00 quiet window); 06:30 UTC = 12:00 local.
NIGHT = datetime(2026, 9, 30, 17, 30, tzinfo=timezone.utc)
NOON = datetime(2026, 9, 30, 6, 30, tzinfo=timezone.utc)


class Recorder:
    """Adapters that remember what they were asked to send and can be told to fail."""

    def __init__(self, fail=()):
        self.sent, self.fail = [], set(fail)

    def adapters(self):
        async def make(channel, *args, **kw):
            self.sent.append((channel, args, kw))
            return {"ok": channel not in self.fail, "provider": channel, "error": None if channel not in self.fail else "boom"}

        async def sms(phone, text, **kw):
            return await make("sms", phone, text, **kw)

        async def email(address, text, **kw):
            return await make("email", address, text, **kw)

        async def whatsapp(config, phone, text, **kw):
            return await make("whatsapp", phone, text, **kw)

        return {"sms": sms, "email": email, "whatsapp": whatsapp}


class Messenger(unittest.TestCase):
    def setUp(self):
        self.factory, self.biz = make_db_factory()
        self.rec = Recorder()

    def send(self, event="booking.confirmed", rec=None, **kw):
        rec = rec or self.rec
        with self.factory() as db:
            values = dict(patient_name="Asha", service="Dental Cleaning", doctor="Dr. Sharma", date="Fri 2 Oct", time="10:30 AM", clinic_name="Sanjeevani Clinic", clinic_phone="+912000000000")
            ctx = m.context_for(event, **{**values, **kw.pop("ctx", {})})
            kw.setdefault("phone", "+919876543210")
            return asyncio.run(m.send_event(db, event, business_id=self.biz, context=ctx, adapters=rec.adapters(), **kw))

    def prefs(self, **body):
        with self.factory() as db:
            svc.save_preferences(db, self.biz, body.get("events"), body.get("quiet_hours"))

    def logs(self):
        with self.factory() as db:
            return [(r.event_key, r.channel, r.status) for r in db.query(MessageLog).all()]

    def test_wording_is_unchanged_for_the_messages_the_app_already_sends(self):
        self.send("booking.confirmed")
        self.assertEqual(self.rec.sent[0][1][1], "Hello! Your booking at Sanjeevani Clinic is confirmed: Dental Cleaning on Fri 2 Oct at 10:30 AM. Thank you for calling!")
        self.rec.sent.clear()
        self.send("call.missed_followup", ctx={"clinic_name": "Sanjeevani Clinic", "clinic_phone": "+912000000000"})
        self.assertEqual(self.rec.sent[0][1][1], "Sorry we missed your call to Sanjeevani Clinic. Call us back on +912000000000 any time: our assistant answers 24/7, or tell us what you need and we will help.")

    def test_reminder_text_matches_the_old_hardcoded_sentence(self):
        from backend.server.workers.jobs.reminders import reminder_context, reminder_text

        start = datetime(2026, 10, 2, 9, 30, tzinfo=timezone.utc)
        with self.factory() as db:
            biz = db.get(Business, self.biz)
            for details in ({"customer_name": "Asha", "doctor_name": "Dr. Sharma", "service_name": "Cleaning"}, {"customer_name": "Ravi", "doctor_name": "Duty Doctor"}):
                new = svc.render(svc.builtin("booking.reminder", "sms")["body"], reminder_context(details, biz, start))
                old = reminder_text(details, biz, start)
                if details.get("doctor_name") == "Duty Doctor":
                    self.assertEqual(new, old.replace(" at Sanjeevani Clinic on", " at Sanjeevani Clinic with our team on"))  # the only wording change: an unassigned doctor
                else:
                    self.assertEqual(new, old)

    def test_staff_alert_wording(self):
        rec = Recorder()
        with self.factory() as db:
            ctx = m.context_for("alert.booking", summary="Dental Cleaning for Asha on Fri 2 Oct")
            asyncio.run(m.send_event(db, "alert.booking", business_id=self.biz, context=ctx, phone="+919876543210", email="o@c.com", fanout=True, respect_preferences=False, adapters=rec.adapters()))
        channels = {c: a for c, a, _ in rec.sent}
        self.assertEqual(channels["sms"][1], "[AMSh] New booking: Dental Cleaning for Asha on Fri 2 Oct.")
        self.assertEqual(channels["email"][1], "New booking: Dental Cleaning for Asha on Fri 2 Oct.")
        self.assertEqual(len(rec.sent), 2)  # fan-out: every channel the contact has

    def test_clinic_can_switch_an_event_off(self):
        self.prefs(events={"booking.confirmed": {"enabled": False}})
        r = self.send("booking.confirmed")
        self.assertEqual((r["sent"], r["reason"]), (False, "switched off by the clinic"))
        self.assertEqual(self.rec.sent, [])

    def test_channel_order_fallback_and_first_success_wins(self):
        self.prefs(events={"booking.confirmed": {"order": ["email", "sms"]}})
        rec = Recorder(fail={"email"})
        r = self.send("booking.confirmed", rec=rec, email="a@b.com")
        self.assertEqual([(a["channel"], a["sent"]) for a in r["attempts"]], [("email", False), ("sms", True)])
        self.assertEqual([c for c, _, _ in rec.sent], ["email", "sms"])
        rec2 = Recorder()
        self.send("booking.confirmed", rec=rec2, email="a@b.com")
        self.assertEqual([c for c, _, _ in rec2.sent], ["email"])  # stops at the first channel that works
        self.assertEqual(self.logs(), [("booking.confirmed", "email", "failed"), ("booking.confirmed", "sms", "sent"), ("booking.confirmed", "email", "sent")])

    def test_a_channel_without_an_address_is_skipped(self):
        self.prefs(events={"booking.confirmed": {"order": ["email", "sms"]}})
        r = self.send("booking.confirmed")  # no email address given
        self.assertEqual(r["attempts"][0], {"channel": "email", "sent": False, "reason": "no address"})
        self.assertTrue(r["sent"])

    def test_quiet_hours_hold_back_only_messages_amsh_starts(self):
        self.prefs(quiet_hours={"enabled": True, "from": "21:00", "to": "08:00"})
        held = self.send("booking.reminder", now=NIGHT)
        self.assertEqual((held["sent"], held["deferred"]), (False, True))
        self.assertEqual(self.rec.sent, [])
        self.assertTrue(self.send("booking.reminder", now=NOON)["sent"])  # daytime: sent
        self.assertTrue(self.send("booking.confirmed", now=NIGHT)["sent"])  # an answer to the patient's own booking is never held
        self.assertTrue(m.in_quiet_hours({"enabled": True, "from": "09:00", "to": "17:00"}, "UTC", datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)))  # a window inside one day
        self.assertFalse(m.in_quiet_hours({"enabled": False, "from": "21:00", "to": "08:00"}, "Asia/Kolkata", NIGHT))

    def test_whatsapp_text_amsh_starts_needs_an_approved_template(self):
        with self.factory() as db:
            db.add(Integration(business_id=self.biz, provider="whatsapp", status="connected", config={"access_token": "t", "phone_number_id": "1"}))
            db.commit()
        r = self.send("booking.reminder", now=NOON)  # default order is whatsapp then sms; nothing is approved yet
        self.assertEqual(r["attempts"][0]["reason"], "needs a Meta-approved template")
        self.assertEqual([c for c, _, _ in self.rec.sent], ["sms"])
        with self.factory() as db:
            db.add(MessageTemplate(scope="platform", event_key="booking.reminder", channel="whatsapp", language="en", body="Hi {{patient_name}}, see you {{date}} at {{time}}.", status="active", whatsapp_name="reminder_v1", meta_status="approved"))
            db.commit()
        self.rec.sent.clear()
        r = self.send("booking.reminder", now=NOON)
        channel, args, kw = self.rec.sent[0]
        self.assertEqual((channel, r["attempts"][0]["sent"]), ("whatsapp", True))
        self.assertEqual(kw["params"], ["Asha", "Fri 2 Oct", "10:30 AM"])  # {{1}} {{2}} {{3}} in order of appearance
        self.assertEqual(kw["template"]["whatsapp_name"], "reminder_v1")

    def test_free_whatsapp_text_is_allowed_inside_the_24_hour_window(self):
        with self.factory() as db:
            db.add(Integration(business_id=self.biz, provider="whatsapp", status="connected", config={"access_token": "t", "phone_number_id": "1"}))
            db.commit()
        r = self.send("booking.confirmed", window_open=True)
        channel, _, kw = self.rec.sent[0]
        self.assertEqual((channel, r["sent"], kw["template"]), ("whatsapp", True, None))

    def test_a_clinics_own_wording_is_used_and_logged_with_its_version(self):
        with self.factory() as db:
            db.add(MessageTemplate(scope="business", business_id=self.biz, event_key="booking.confirmed", channel="sms", language="en", body="Namaste {{patient_name}}, confirmed for {{date}}.", status="active", version=3))
            db.commit()
        self.send("booking.confirmed")
        self.assertEqual(self.rec.sent[0][1][1], "Namaste Asha, confirmed for Fri 2 Oct.")
        with self.factory() as db:
            self.assertEqual(db.query(MessageLog).one().template_version, 3)

    def test_failures_never_raise_and_are_logged(self):
        async def boom(*a, **k):
            raise RuntimeError("provider down")

        with self.factory() as db:
            ctx = m.context_for("booking.confirmed")
            r = asyncio.run(m.send_event(db, "booking.confirmed", business_id=self.biz, context=ctx, phone="+919876543210", adapters={"sms": boom, "whatsapp": boom}))
        self.assertFalse(r["sent"])
        self.assertEqual({s for _, _, s in self.logs()}, {"failed"})

    def test_sync_entry_point_works_from_plain_and_async_callers(self):
        with self.factory() as db:
            ctx = m.context_for("booking.confirmed")
            r = m.send_event_sync(db, "booking.confirmed", business_id=self.biz, context=ctx, phone="+919876543210", adapters=self.rec.adapters())
            self.assertTrue(r["sent"])

            async def inside_a_loop():
                return m.send_event_sync(db, "booking.confirmed", business_id=self.biz, context=ctx, phone="+919876543210", adapters=self.rec.adapters())

            self.assertTrue(asyncio.run(inside_a_loop())["sent"])

    def test_unknown_event_is_an_error_and_in_app_channel_is_not_used(self):
        with self.factory() as db:
            with self.assertRaises(svc.TemplateError):
                asyncio.run(m.send_event(db, "nope", business_id=self.biz, context={}))
        r = self.send("alert.escalation", fanout=True, respect_preferences=False, ctx={"caller": "+91", "reason": "x", "summary": "y"})
        self.assertNotIn("push", [a["channel"] for a in r["attempts"]])


if __name__ == "__main__":
    unittest.main()
