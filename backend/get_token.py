import sys
sys.path.insert(0, '/app')
from backend.server.database.session import SessionLocal
from backend.server.database.models.user import User
from backend.server.auth.security import create_access_token

db = SessionLocal()
user = db.query(User).filter(User.business_id == '703b13dc-3d6b-4052-806f-04bceb1e5aa9').first()
if user:
    token = create_access_token({"sub": user.email, "user_id": user.id})
    print(f"Token: {token}")
    print(f"User: {user.email}, role: {user.role}")
else:
    print("No user found for this business")
db.close()
