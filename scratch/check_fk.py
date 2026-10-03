from sqlalchemy import text
from backend.server.database.session import SessionLocal

SQL = """
select tc.table_name, kcu.column_name, ccu.table_name as ref_table, rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name
join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name
join information_schema.referential_constraints rc on rc.constraint_name = tc.constraint_name
where tc.constraint_type = 'FOREIGN KEY' and ccu.table_name in ('businesses', 'users', 'calls', 'agents')
order by ref_table, tc.table_name
"""
with SessionLocal() as db:
    for r in db.execute(text(SQL)).all():
        print(r)
    print("business ids:", db.execute(text("select id, name from businesses")).all())
    print("users:", db.execute(text("select email, scope, business_id from users")).all())
