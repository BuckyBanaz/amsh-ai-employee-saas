"""
Fix script:
1. Clear Sanjeevani Hospital's business_phone (it incorrectly stores the Exotel DID)
2. Ensure user's real business (703b13dc) is marked active
3. Report current state
"""
import sys
sys.path.insert(0, '/app')
from backend.server.database.session import SessionLocal
from backend.server.database.models.business import Business

db = SessionLocal()

# Fix 1: Clear Sanjeevani's phone (it stores the Exotel DID which causes wrong routing)
sanjeevani = db.get(Business, "47adec85-6aa4-4d53-b767-f8fd766a180b")
if sanjeevani:
    print(f"Clearing Sanjeevani phone: {sanjeevani.business_phone} -> None")
    sanjeevani.business_phone = None
    sanjeevani.status = "paused"

# Fix 2: Make sure user's real business is active
user_biz = db.get(Business, "703b13dc-3d6b-4052-806f-04bceb1e5aa9")
if user_biz:
    print(f"Setting {user_biz.name} ({user_biz.id}) status -> active")
    user_biz.status = "active"

db.commit()
print("Done.")

# Verify
print("\n=== Final state ===")
for b in db.query(Business).order_by(Business.created_at.desc()).all():
    print(f"  {b.id[:8]}  {b.name[:30]:<30}  phone={b.business_phone}  status={b.status}")

db.close()
