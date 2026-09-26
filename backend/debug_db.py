import sys
sys.path.insert(0, '/app')
from backend.server.database.session import SessionLocal
from backend.server.database.models.business import Business
from backend.server.database.models.agent import Agent

db = SessionLocal()

print("=== BUSINESSES ===")
for b in db.query(Business).order_by(Business.created_at.desc()).all():
    print(f"  ID: {b.id}")
    print(f"  Name: {b.name}")
    print(f"  Phone: {b.business_phone}")
    print()

print("=== AGENTS ===")
for a in db.query(Agent).all():
    print(f"  business_id: {a.business_id}")
    print(f"  greeting_message: {a.greeting_message}")
    cfg = a.config or {}
    tts = cfg.get('tts_provider') or {}
    print(f"  voice_id: {tts.get('voice_id')}")
    print()

db.close()
