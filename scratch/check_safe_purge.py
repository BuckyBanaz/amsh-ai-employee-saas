from sqlalchemy import func, select
from backend.server.database.session import SessionLocal
from backend.server.database.models.business import Business
from backend.server.api.routes import admin as a

with SessionLocal() as db:
    keep = db.scalars(select(Business.id)).first()
    before = db.scalar(select(func.count()).select_from(Business))
    temp = Business(name="TEMP purge test")
    db.add(temp)
    db.flush()  # visible inside this transaction only
    print("with temp row:", db.scalar(select(func.count()).select_from(Business)))
    preview = a.purge_other_businesses(db, keep, dry_run=True)
    print("preview:", {k: preview[k] for k in ("status", "would_delete_businesses", "business_names")})
    print("still there after preview:", db.scalar(select(func.count()).select_from(Business)))
    try:
        a.trigger_purge_other_businesses(a.PurgeRequest(keep_business_id=keep, dry_run=False, confirm=""), request=None, db=db, admin=None)
    except Exception as exc:
        print("without confirm ->", getattr(exc, "detail", exc))
    print("still there after refused purge:", db.scalar(select(func.count()).select_from(Business)))
    list_result = a.list_tenants(search=None, status_filter=None, plan=None, country=None, type=None, limit=50, offset=0, db=db, admin=None)
    print("list_tenants total (no auto delete):", list_result["total"])
    db.rollback()  # the temp row never reaches the database
    print("after rollback:", db.scalar(select(func.count()).select_from(Business)), "(was", before, ")")
