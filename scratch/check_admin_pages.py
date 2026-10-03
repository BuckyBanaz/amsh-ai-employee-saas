from backend.server.database.session import SessionLocal
from backend.server.api.routes import admin as a
with SessionLocal() as db:
    h = a.get_admin_health(db=db, admin=None)
    for s in h["services"]: print(s["name"], "|", s["status"], "|", s["latency"], "|", s["errorRate"], "|", (s.get("detail") or "")[:60])
    print("alerts:", len(h["alerts"]))
    print("settings:", a.get_admin_settings(db=db, admin=None))
    n = a.get_admin_notifications(db=db, admin=None)["notifications"]
    print("notifications:", len(n)); [print(" -", x["level"], x["title"]) for x in n[:5]]
