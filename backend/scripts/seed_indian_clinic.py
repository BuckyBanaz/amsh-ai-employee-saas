"""Seed a Hindi/Hinglish clinic and route the live Exotel number to it.

Run:  python -m backend.scripts.seed_indian_clinic
Idempotent: re-running updates the same business/agent/phone rows.

Env overrides:
  EXOTEL_NUMBER            default 08047284627
  CARTESIA_HINDI_VOICE_ID  Cartesia voice to speak Hindi with (no default: pick one in the Cartesia console)
"""

import os

from sqlalchemy import select

import backend.server.database.models  # noqa: F401  (registers every table on Base.metadata)
from backend.server.database.models.agent import Agent
from backend.server.database.models.business import Business
from backend.server.database.models.phone_number import PhoneNumber
from backend.server.database.models.service import Service
from backend.server.database.session import SessionLocal

BUSINESS_NAME = "Sanjeevani Clinic"
EXOTEL_NUMBER = os.getenv("EXOTEL_NUMBER", "09513886363")
HINDI_VOICE_ID = os.getenv("CARTESIA_HINDI_VOICE_ID") or None

SERVICES = [
    ("General Checkup", "Aam swasthya jaanch aur doctor se paramarsh", 30, 500),
    ("Blood Test", "Khoon ki jaanch (CBC, sugar, thyroid aadi)", 15, 300),
    ("Dental Consultation", "Daanton ki jaanch aur salah", 30, 400),
]

SYSTEM_PROMPT = (
    "Aap Sanjeevani Clinic ki expert medical receptionist 'Sneha' hain. Aapko sirf Hindi aur Hinglish me baat karni hai. "
    "Chhote, saaf aur vinamra vaakya bolein (20 shabd se kam). Marij ka naam, phone number, sewa, "
    "tarikh aur samay ek ek karke poochhein. Booking se pehle sab kuch dohra kar confirm karein. "
    "Koi bhi medical salah na dein; kewal appointment, doctor aur clinic ki jaankari dein."
)
GREETING = "Namaste, Sanjeevani Clinic me aapka swagat hai. Main  Sneha bol rahi hoon. Main aapki kya madad kar sakti hoon?"


def _get_or_create(db, model, where, **create_kwargs):
    row = db.execute(select(model).where(where)).scalars().first()
    if row is None:
        row = model(**create_kwargs)
        db.add(row)
    return row


def main() -> None:
    with SessionLocal() as db:
        HARDCODED_BUSINESS_ID = "6db8bc3e-723f-44e7-a835-a306d849fc25"
        
        # 1. Clear business_phone from ALL businesses to prevent any clashes
        all_biz = db.execute(select(Business)).scalars().all()
        for b in all_biz:
            b.business_phone = None
        db.flush()

        # 2. Get or create the business with the hardcoded ID
        business = db.execute(select(Business).where(Business.id == HARDCODED_BUSINESS_ID)).scalars().first()
        if not business:
            business = Business(id=HARDCODED_BUSINESS_ID)
            db.add(business)
        
        business.name = BUSINESS_NAME
        business.vertical = "clinic"
        business.business_type = "healthcare"
        business.country = "IN"
        business.timezone = "Asia/Kolkata"
        business.currency = "INR"
        business.status = "active"
        business.business_phone = EXOTEL_NUMBER
        db.flush()

        # Clear existing services to avoid duplicates
        db.execute(Service.__table__.delete().where(Service.business_id == business.id))
        db.flush()

        for title, desc, minutes, price in SERVICES:
            svc = _get_or_create(
                db, Service, (Service.business_id == business.id) & (Service.title == title),
                business_id=business.id, title=title,
            )
            svc.description, svc.duration_minutes = desc, minutes
            svc.price_amount, svc.price_currency = price, "INR"

        # Clear old agent if it exists
        db.execute(Agent.__table__.delete().where(Agent.business_id == business.id))
        db.flush()
        
        agent = Agent(business_id=business.id, name="Sneha")
        db.add(agent)
        agent.status = "active"
        agent.voice_provider = "cartesia"
        agent.primary_language = "hi"
        agent.languages = ["hi", "en"]
        agent.greeting_message = GREETING
        agent.config = {
            **(agent.config or {}),
            "personality": "warm",
            "system_prompt": SYSTEM_PROMPT,
            "tts_provider": {"provider": "cartesia", "language": "hi", "voice_id": HINDI_VOICE_ID},
            "stt": {"provider": "deepgram", "language": "hi"},
        }
        db.flush()

        # Clear old phone numbers
        db.execute(PhoneNumber.__table__.delete().where(PhoneNumber.number == EXOTEL_NUMBER))
        db.flush()
        
        number = PhoneNumber(business_id=business.id, number=EXOTEL_NUMBER)
        db.add(number)
        number.business_id = business.id
        number.mode = "dedicated"
        number.status = "active"

        db.commit()
        print(f"Business : {business.name} ({business.id})")
        print(f"Agent    : {agent.name} ({agent.id})")
        print(f"Number   : {EXOTEL_NUMBER} -> business {business.id}")
        if not HINDI_VOICE_ID:
            print("NOTE: CARTESIA_HINDI_VOICE_ID not set; agent.config.tts_provider.voice_id is null.")


if __name__ == "__main__":
    main()
