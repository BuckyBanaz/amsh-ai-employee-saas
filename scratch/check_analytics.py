import json
from backend.server.database.session import SessionLocal
from backend.server.api.routes import admin as a
with SessionLocal() as db:
    r = a.get_admin_analytics(days=30, db=db, admin=None)
    for k in ("growth", "revenueSeries"): r[k] = r[k][-2:]
    r["calls"]["series"] = r["calls"]["series"][-2:]
    print(json.dumps(r, indent=1, default=str)[:3800])
