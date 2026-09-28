"""Deterministic test tenant: in-memory SQLite seeded with a clinic, doctors, services, hours and an agent.
Uses the real SQLAlchemy models, so agent tools run against the same schema as production."""

from datetime import datetime
from typing import Callable, Tuple

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import os

# Tests and evals must never send a real SMS, even when Twilio/Exotel credentials exist in .env.
os.environ.setdefault("AMSH_DISABLE_SMS", "1")
os.environ.setdefault("AMSH_DISABLE_POST_CALL", "1")  # tests call process_call_end directly when they want it

import backend.server.database.models  # noqa: F401  (registers every table on Base.metadata)
from backend.server.database.models.agent import Agent
from backend.server.database.models.business import Business
from backend.server.database.models.service import Service
from backend.server.database.models.staff import Staff
from backend.server.database.session import Base

BUSINESS_ID = "eval-biz-0001"
# Monday 2026-09-28 10:00: fixed so "tomorrow", "Thursday" and "already passed" are reproducible.
FIXED_NOW = datetime(2026, 9, 28, 10, 0)


def make_db_factory() -> Tuple[Callable[[], Session], str]:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    hours = {d: [{"start": "09:00", "end": "17:00"}] for d in ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday")}
    hours["Sunday"] = []  # closed
    with factory() as db:
        db.add(
            Business(
                id=BUSINESS_ID,
                name="Sanjeevani Clinic",
                city="Pune",
                address="12 MG Road",
                business_phone="+912000000000",
                timezone="Asia/Kolkata",
                working_hours=hours,
            )
        )
        db.add_all(
            [
                Staff(business_id=BUSINESS_ID, name="Dr. Sharma", role="Doctor", specialty="General Physician", phone="+911111111111"),
                Staff(business_id=BUSINESS_ID, name="Dr. Mehta", role="Doctor", specialty="Dentist"),
                Service(business_id=BUSINESS_ID, title="General Consultation", duration_minutes=30, price_amount=500),
                Service(business_id=BUSINESS_ID, title="Dental Cleaning", duration_minutes=30, price_amount=1200),
                Service(business_id=BUSINESS_ID, title="Root Canal Treatment", duration_minutes=30, price_amount=6000),
                Agent(business_id=BUSINESS_ID, name="Maya", primary_language="en", config={"gender": "female"}),
            ]
        )
        db.commit()
    return factory, BUSINESS_ID
