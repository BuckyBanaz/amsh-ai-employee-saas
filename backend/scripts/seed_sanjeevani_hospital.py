"""
Seed script for Sanjeevani Hospital & Multi-Speciality Clinic.
Creates a complete demo account with realistic business details, doctors, services,
knowledge FAQs, call logs, and patient appointment transactions.

Run:
    python backend/scripts/seed_sanjeevani_hospital.py
"""

import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

os.environ.setdefault("DATABASE_URL", "postgresql+psycopg2://amsh:amsh@localhost:5434/amsh")
os.environ.setdefault("REDIS_URL", "redis://localhost:6380/0")

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from backend.server.auth.security import hash_password
from backend.server.database.models.agent import Agent
from backend.server.database.models.business import Business
from backend.server.database.models.call import Call
from backend.server.database.models.knowledge_base import KnowledgeDocument
from backend.server.database.models.message import Message
from backend.server.database.models.service import Service
from backend.server.database.models.staff import Staff
from backend.server.database.models.transaction import Transaction
from backend.server.database.models.user import User
from backend.server.database.session import SessionLocal


def seed_sanjeevani():
    db = SessionLocal()
    print("=" * 65)
    print("🏥 SEEDING DEMO ACCOUNT: SANJEEVANI HOSPITAL & CLINIC")
    print("=" * 65)

    try:
        # 1. Check or Create Demo Owner User
        email = "sanjeevani@hospital.com"
        existing_user = db.query(User).filter(User.email == email).first()

        if existing_user:
            print(f"ℹ️ User {email} already exists. Cleaning existing data...")
            biz_id = existing_user.business_id
            if biz_id:
                db.query(Transaction).filter(Transaction.business_id == biz_id).delete()
                db.query(Call).filter(Call.business_id == biz_id).delete()
                db.query(Service).filter(Service.business_id == biz_id).delete()
                db.query(Staff).filter(Staff.business_id == biz_id).delete()
                db.query(Agent).filter(Agent.business_id == biz_id).delete()
                db.query(KnowledgeDocument).filter(KnowledgeDocument.business_id == biz_id).delete()
                db.query(Business).filter(Business.id == biz_id).delete()
            db.delete(existing_user)
            db.commit()

        # 2. Create Sanjeevani Business
        business_id = str(uuid.uuid4())
        business = Business(
            id=business_id,
            name="Sanjeevani Hospital & Multi-Speciality Clinic",
            vertical="clinic",
            business_type="healthcare",
            business_subtype="hospital",
            country="IN",
            business_phone="+918047284627",
            business_email="contact@sanjeevani.com",
            website="https://sanjeevani-hospital.com",
            city="Noida",
            address="Plot 12, Sector 62, Noida, Uttar Pradesh 201309",
            working_hours={
                "monday": "08:00 - 20:00",
                "tuesday": "08:00 - 20:00",
                "wednesday": "08:00 - 20:00",
                "thursday": "08:00 - 20:00",
                "friday": "08:00 - 20:00",
                "saturday": "08:00 - 20:00",
                "sunday": "Emergency Only (24/7)",
            },
            timezone="Asia/Kolkata",
            currency="INR",
            status="active",
            created_at=datetime.now(timezone.utc),
        )
        db.add(business)

        # 3. Create User Account
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            hashed_password=hash_password("Password123!"),
            name="Dr. Rajesh Sharma (Director)",
            scope="business",
            role="owner",
            business_id=business_id,
            created_at=datetime.now(timezone.utc),
        )
        db.add(user)

        # 4. Create Doctors & Staff
        doctors_data = [
            {"name": "Dr. Rajesh Sharma", "role": "Senior Cardiologist", "email": "rajesh@sanjeevani.com", "phone": "+919811002233"},
            {"name": "Dr. Ananya Gupta", "role": "Dental Surgeon", "email": "ananya@sanjeevani.com", "phone": "+919822113344"},
            {"name": "Dr. Vikram Malhotra", "role": "Orthopedic Specialist", "email": "vikram@sanjeevani.com", "phone": "+919833224455"},
            {"name": "Dr. Meera Joshi", "role": "General Physician", "email": "meera@sanjeevani.com", "phone": "+919844335566"},
        ]
        for doc in doctors_data:
            st = Staff(
                id=str(uuid.uuid4()),
                business_id=business_id,
                name=doc["name"],
                role=doc["role"],
                email=doc["email"],
                phone=doc["phone"],
                created_at=datetime.now(timezone.utc),
            )
            db.add(st)

        # 5. Create Services & Treatments
        services_data = [
            {"title": "General OPD Consultation", "duration": 30, "price": 500.0, "desc": "Routine health checkup and consultation with general physician."},
            {"title": "Cardiology Consultation & ECG", "duration": 45, "price": 1200.0, "desc": "Heart checkup, ECG analysis, and consultation with cardiologist."},
            {"title": "Dental Cleaning & Scaling", "duration": 45, "price": 1500.0, "desc": "Complete ultrasonic dental cleaning, polishing, and oral exam."},
            {"title": "Orthopedic & Joint Checkup", "duration": 30, "price": 800.0, "desc": "Bone density, joint pain evaluation, and orthopedic advice."},
            {"title": "Full Body Blood & Health Checkup", "duration": 60, "price": 2500.0, "desc": "Comprehensive lab tests (CBC, Lipid, Liver, Kidney, Sugar)."},
        ]
        for s in services_data:
            srv = Service(
                id=str(uuid.uuid4()),
                business_id=business_id,
                title=s["title"],
                description=s["desc"],
                duration_minutes=s["duration"],
                price_amount=s["price"],
                price_currency="INR",
                created_at=datetime.now(timezone.utc),
            )
            db.add(srv)

        # 6. Create AI Receptionist Agent
        agent = Agent(
            id=str(uuid.uuid4()),
            business_id=business_id,
            name="Aanya (Sanjeevani AI Receptionist)",
            voice_provider="cartesia",
            primary_language="hi",
            languages=["hi", "en"],
            greeting_message="Namaste, Sanjeevani Hospital me aapka swagat hai. Main AI receptionist Aanya hoon. Main aapki kya madad kar sakti hoon?",
            status="active",
            config={"system_prompt": "You are Aanya, the friendly and professional AI receptionist for Sanjeevani Hospital Noida."},
            created_at=datetime.now(timezone.utc),
        )
        db.add(agent)
        db.flush()

        # 7. Create Knowledge FAQs
        faqs = [
            {"question": "What are the OPD Timings?", "answer": "OPD is open Monday to Saturday from 8:00 AM to 8:00 PM. Emergency services are open 24/7."},
            {"question": "What is the Hospital Address & Landmark?", "answer": "Plot 12, Sector 62, Noida, near Electronic City Metro Station."},
            {"question": "Is Insurance & Cashless Facility available?", "answer": "We offer cashless TPA for Star Health, HDFC Ergo, Max Bupa, ICICI Lombard, and SBI General."},
        ]
        for f in faqs:
            kd = KnowledgeDocument(
                id=str(uuid.uuid4()),
                business_id=business_id,
                doc_type="faq",
                question=f["question"],
                answer=f["answer"],
                status="indexed",
                uploaded_at=datetime.now(timezone.utc),
            )
            db.add(kd)

        # 8. Create Realistic Demo Appointments / Transactions
        now = datetime.now(timezone.utc)
        appointments_seed = [
            {
                "name": "Ramesh Gupta",
                "phone": "+919811223344",
                "service": "Cardiology Consultation & ECG",
                "doctor": "Dr. Rajesh Sharma",
                "date": (now + timedelta(days=1)).strftime("%Y-%m-%d"),
                "time": "10:30 AM",
                "status": "confirmed",
                "notes": "Patient complains of occasional chest discomfort.",
            },
            {
                "name": "Pooja Sharma",
                "phone": "+919877665544",
                "service": "Dental Cleaning & Scaling",
                "doctor": "Dr. Ananya Gupta",
                "date": (now + timedelta(days=1)).strftime("%Y-%m-%d"),
                "time": "02:00 PM",
                "status": "confirmed",
                "notes": "Routine 6-month cleaning.",
            },
            {
                "name": "Amit Kumar",
                "phone": "+919955443322",
                "service": "General OPD Consultation",
                "doctor": "Dr. Meera Joshi",
                "date": now.strftime("%Y-%m-%d"),
                "time": "05:00 PM",
                "status": "pending",
                "notes": "Fever and cough for 2 days.",
            },
            {
                "name": "Suresh Verma",
                "phone": "+919810011223",
                "service": "Orthopedic & Joint Checkup",
                "doctor": "Dr. Vikram Malhotra",
                "date": (now - timedelta(days=1)).strftime("%Y-%m-%d"),
                "time": "11:00 AM",
                "status": "completed",
                "notes": "Knee pain checkup completed.",
            },
        ]

        for apt in appointments_seed:
            tx = Transaction(
                id=str(uuid.uuid4()),
                business_id=business_id,
                type="appointment",
                details={
                    "customer_name": apt["name"],
                    "phone_number": apt["phone"],
                    "service_name": apt["service"],
                    "doctor_name": apt["doctor"],
                    "preferred_date": apt["date"],
                    "preferred_time": apt["time"],
                    "notes": apt["notes"],
                },
                status=apt["status"],
                created_at=now,
            )
            db.add(tx)

        # 9. Create Call History Logs with Transcripts
        c1_id = str(uuid.uuid4())
        call1 = Call(
            id=c1_id,
            business_id=business_id,
            agent_id=agent.id,
            caller_number="+919811223344",
            caller_name="Ramesh Gupta",
            intent="appointment_booking",
            outcome="resolved",
            summary="Booked Cardiology appointment with Dr. Rajesh Sharma for tomorrow 10:30 AM.",
            latency_ms=175,
            duration_seconds=42,
            started_at=now - timedelta(minutes=15),
            ended_at=now - timedelta(minutes=14),
        )
        db.add(call1)

        msg1 = Message(id=str(uuid.uuid4()), call_id=c1_id, speaker="AI", text="Namaste, Sanjeevani Hospital me aapka swagat hai. Main AI receptionist Aanya hoon. Main aapki kya madad kar sakti hoon?", sequence=1)
        msg2 = Message(id=str(uuid.uuid4()), call_id=c1_id, speaker="User", text="Mujhe Dr. Rajesh Sharma se cardiology appointment book karni hai kal subah 10:30 baje.", sequence=2)
        msg3 = Message(id=str(uuid.uuid4()), call_id=c1_id, speaker="AI", text="Ji zaroor. Ramesh Gupta ji, aapka appointment Dr. Rajesh Sharma ke saath kal subah 10:30 AM confirm ho gaya hai. SMS bhej diya hai.", sequence=3)
        db.add_all([msg1, msg2, msg3])

        db.commit()

        print("\n✅ SANJEEVANI HOSPITAL DEMO DATA CREATED SUCCESSFULLY!")
        print("-" * 65)
        print(f"📧 Login Email   : {email}")
        print(f"🔑 Login Password: Password123!")
        print(f"🏥 Business Name : {business.name}")
        print(f"🆔 Business ID   : {business_id}")
        print("=" * 65)

    except Exception as e:
        db.rollback()
        print(f"❌ Seeding Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_sanjeevani()
