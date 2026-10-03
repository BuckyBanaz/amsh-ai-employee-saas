import pathlib

p = pathlib.Path(r"C:\Users\Parikshit\Desktop\saas\backend\server\api\routes\admin.py")
s = p.read_text(encoding="utf-8")


def sub(old, new, count=1):
    global s
    assert s.count(old) == count, (s.count(old), old[:70])
    s = s.replace(old, new)


# 1. No read endpoint may ever delete data
sub("    ensure_single_business_cleanup(db)\n    query = select(Business)", "    query = select(Business)")
sub("    ensure_single_business_cleanup(db)\n    from collections import Counter, defaultdict", "    from collections import Counter, defaultdict")
sub('    """Returns business owners across all tenants from real Database with KPIs and facets."""\n    ensure_single_business_cleanup(db)\n',
    '    """Returns business owners across all tenants from real Database with KPIs and facets."""\n')

# 2. The purge becomes an explicit, previewed, confirmed action on a business chosen by the caller
sub('''TARGET_KEPT_BUSINESS_ID = "703b13dc-3d6b-4052-806f-04bceb1e5aa9"


def ensure_single_business_cleanup(db: Session, keep_id: str = TARGET_KEPT_BUSINESS_ID) -> Dict[str, Any]:
    """Purges all dummy/test businesses and their child records from PostgreSQL,
    leaving ONLY the single real business (Demo clinic: 703b13dc-3d6b-4052-806f-04bceb1e5aa9).
    Preserves all platform administrators (scope == 'platform') and platform-level configurations.
    Idempotent and safe: if no other businesses exist, returns immediately with zero overhead."""''',
    '''PURGE_CONFIRMATION = "DELETE"


def purge_other_businesses(db: Session, keep_id: str, dry_run: bool = True) -> Dict[str, Any]:
    """PERMANENTLY deletes every business except `keep_id` with all of its rows (users, calls, messages, bookings, staff, services,
    knowledge, numbers, integrations, usage, audit rows). Platform administrators are kept.

    Never call this from a read endpoint or on startup: it is reached only through `POST /database/purge-other-businesses`, which
    previews first (`dry_run=True` deletes nothing) and needs the confirmation word before it deletes. There is no undo."""''')

sub('''    # 1. Non-platform users belonging to other businesses or unlinked
    users_to_del = db.scalars(
        select(User.id).where(
            User.scope != "platform",
            or_(User.business_id.in_(other_biz_ids), User.business_id.is_(None))
        )
    ).all()
''', '''    # 1. Non-platform users belonging to other businesses or unlinked
    users_to_del = db.scalars(
        select(User.id).where(
            User.scope != "platform",
            or_(User.business_id.in_(other_biz_ids), User.business_id.is_(None))
        )
    ).all()

    if dry_run:  # a preview: what would go, nothing is touched
        names = [n for (n,) in db.execute(select(Business.name).where(Business.id.in_(other_biz_ids))).all()]
        return {
            "status": "preview",
            "kept_business": {"id": target.id, "name": target.name},
            "would_delete_businesses": len(other_biz_ids),
            "business_names": names,
            "would_delete_users": len(users_to_del),
            "would_delete_calls": db.scalar(select(func.count()).select_from(Call).where(Call.business_id.in_(other_biz_ids))) or 0,
            "would_delete_bookings": db.scalar(select(func.count()).select_from(Transaction).where(Transaction.business_id.in_(other_biz_ids))) or 0,
            "to_delete_for_real": f'POST again with "dry_run": false and "confirm": "{PURGE_CONFIRMATION}"',
        }
''')

a = s.index('@router.post("/database/purge-other-businesses")')
b = s.index('@router.get("/business-users/{user_id}")')
s = s[:a] + '''class PurgeRequest(BaseModel):
    keep_business_id: str
    dry_run: bool = True  # preview unless explicitly false
    confirm: str = ""  # must equal PURGE_CONFIRMATION to delete


@router.post("/database/purge-other-businesses")
def trigger_purge_other_businesses(
    payload: PurgeRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Delete every business except the one named. Preview by default; the real run needs `dry_run: false` and `confirm: "DELETE"`.
    Permanent. The action and its counts are written to the audit log."""
    if not payload.dry_run and payload.confirm != PURGE_CONFIRMATION:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f'Type "{PURGE_CONFIRMATION}" in `confirm` to delete. Nothing was deleted.')
    res = purge_other_businesses(db, payload.keep_business_id, dry_run=payload.dry_run)
    audit(db, "admin.database_purge_preview" if payload.dry_run else "admin.database_purged_other_tenants", admin, ip=client_ip(request), meta=res)
    return res


''' + s[b:]
p.write_text(s, encoding="utf-8")
print("safe purge patched; leftover refs:", s.count("ensure_single_business_cleanup"), s.count("TARGET_KEPT_BUSINESS_ID"))
