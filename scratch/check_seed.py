from backend.server.database.session import SessionLocal
from sqlalchemy import text

with SessionLocal() as db:
    print("businesses:", db.execute(text("select name, country, status, created_at::date from businesses order by created_at")).all())
    print("calls per business:", db.execute(text("select b.name, count(*) from calls c join businesses b on b.id = c.business_id group by 1 order by 2 desc")).all())
