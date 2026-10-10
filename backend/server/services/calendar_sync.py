"""One entry point for "this appointment changed": pushes it to every calendar the clinic connected (Google and Outlook).

Booking, reschedule and cancel call this. Each provider is best-effort and never raises, so one failing calendar never blocks
the others or the booking.
"""

from backend.server.services import google_calendar, outlook_calendar


def sync_appointment(db, business_id: str, tx, deleted: bool = False) -> None:
    google_calendar.sync_appointment(db, business_id, tx, deleted=deleted)
    outlook_calendar.sync_appointment(db, business_id, tx, deleted=deleted)
