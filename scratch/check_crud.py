import time
from backend.server.database.session import SessionLocal
from backend.server.api.routes import admin_integrations as m
with SessionLocal() as db:
    t = time.time(); rows = m.list_platform_integrations(db=db); print("list took %.2fs" % (time.time() - t), len(rows))
    g = next(r for r in rows if r["id"] == "groq"); print("groq before:", g["status"], g["sources"])
    v = m.save_credentials("groq", m.CredentialsPayload(values={"GROQ_API_KEY": "gsk_bogus_key_123456"}), db=db)
    print("after bogus key:", v["status"], v["sources"], v["config"], "|", v["message"][:60])
    raw = db.get(m.PlatformIntegration, "groq").config["secrets"]["GROQ_API_KEY"]
    print("stored encrypted:", "bogus" not in raw)
    v = m.reset_credentials("groq", db=db)
    print("after reset:", v["status"], v["sources"], v["overridden"])
    try: m.save_credentials("groq", m.CredentialsPayload(values={"X": "y"}), db=db)
    except Exception as e: print("unknown key ->", e.detail)
