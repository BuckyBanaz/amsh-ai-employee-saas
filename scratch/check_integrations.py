from backend.server.database.session import SessionLocal
from backend.server.api.routes.admin_integrations import list_platform_integrations

with SessionLocal() as db:
    rows = list_platform_integrations(db=db)
for r in rows:
    print("%-14s %-13s %-8s %s" % (r["id"], r["status"], r["latency_ms"], r["message"][:100]))
