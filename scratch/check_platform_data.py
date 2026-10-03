from backend.server.database.session import SessionLocal
from backend.server.api.routes import admin_platform_data as m
with SessionLocal() as db:
    r = m.list_receptionists(limit=200, db=db); print("receptionists", r["total"], r["items"][0]["name"], r["items"][0]["callsHandled"], r["items"][0]["resolutionRate"])
    a = m.list_appointments(status_filter=None, limit=200, db=db); print("appointments", a["total"], a["byStatus"], {k: a["items"][0][k] for k in ("patient","date","time","source")})
    c = m.list_conversations(limit=100, db=db); print("conversations", c["total"], c["items"][0]["channel"], c["items"][0]["messages"])
    d = m.get_conversation(next(i["id"] for i in c["items"] if i["messages"]), db=db); print("transcript msgs", len(d["messages"]))
