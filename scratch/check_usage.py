import json
from backend.server.database.session import SessionLocal
from backend.server.api.routes import admin_platform_data as m
with SessionLocal() as db:
    l = m.live_snapshot(db=db); print({k: v for k, v in l.items() if k != "live"})
    u = m.usage_overview(db=db); print(u["totals"], u["byChannel"], u["items"][0], len(u["daily"]))
