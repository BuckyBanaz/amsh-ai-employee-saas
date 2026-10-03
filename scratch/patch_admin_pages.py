import pathlib, re

p = pathlib.Path(r"C:\Users\Parikshit\Desktop\saas\backend\server\api\routes\admin.py")
s = p.read_text(encoding="utf-8")
start = s.index('@router.get("/health")')
end = s.index('@router.get("/services")')

new = '''_PROCESS_STARTED = datetime.now(timezone.utc)


def _fmt_uptime(seconds: float) -> str:
    seconds = int(seconds)
    days, rest = divmod(seconds, 86400)
    hours, rest = divmod(rest, 3600)
    minutes = rest // 60
    return f"{days}d {hours}h" if days else (f"{hours}h {minutes}m" if hours else f"{minutes}m")


def _integration_service(row, service_id: str, name: str) -> dict:
    """A health card built only from the last real provider check (admin_integrations); nothing is invented."""
    if row is None:
        return {"id": service_id, "name": name, "status": "Unknown", "latency": None, "errorRate": None, "detail": "No check has run yet."}
    status_map = {"Connected": "Operational", "API Error": "Degraded"}
    return {
        "id": service_id,
        "name": name,
        "status": status_map.get(row.status, "Not configured"),
        "latency": f"{int(row.latency_ms)}ms" if row.latency_ms is not None else None,
        "errorRate": row.error_rate,
        "detail": (row.config or {}).get("message"),
        "checkedAt": row.last_checked_at.isoformat() if row.last_checked_at else None,
    }


@router.get("/health")
def get_admin_health(db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)):
    """Platform health from real measurements only: database and Redis are timed now, providers come from their last live
    check, uptime is this API process's. Anything that is not measured is returned as null (the page shows a dash)."""
    import time
    from backend.server.cache.redis import get_redis_client
    from backend.server.database.models.platform_integration import PlatformIntegration

    started = time.perf_counter()
    db_status, db_latency = "Operational", None
    try:
        db.execute(select(func.count(User.id)))
        db_latency = f"{int((time.perf_counter() - started) * 1000)}ms"
    except Exception:
        db_status = "Degraded"

    redis_status, redis_latency = "Operational", None
    try:
        r_start = time.perf_counter()
        get_redis_client().ping()
        redis_latency = f"{int((time.perf_counter() - r_start) * 1000)}ms"
    except Exception:
        redis_status = "Degraded"

    rows = {r.id: r for r in db.execute(select(PlatformIntegration)).scalars().all()}
    uptime = _fmt_uptime((datetime.now(timezone.utc) - _PROCESS_STARTED).total_seconds())
    services = [
        {"id": "api-server", "name": "API Server", "status": "Operational", "latency": None, "errorRate": None, "detail": f"Up for {uptime} since the last restart."},
        {"id": "database", "name": "Database (Postgres)", "status": db_status, "latency": db_latency, "errorRate": None, "detail": "Timed with a live query."},
        {"id": "redis-cache", "name": "Redis Cache", "status": redis_status, "latency": redis_latency, "errorRate": None, "detail": "Timed with a live ping."},
        _integration_service(rows.get("groq"), "ai-gateway", "AI Gateway (Groq)"),
        _integration_service(rows.get("cartesia"), "voice-gateway", "Voice (Cartesia)"),
        _integration_service(rows.get("twilio"), "telephony", "Telephony (Twilio)"),
    ]
    alerts = [{"service": sv["name"], "message": sv["detail"] or sv["status"]} for sv in services if sv["status"] == "Degraded"]
    return {"services": services, "alerts": alerts, "generatedAt": datetime.now(timezone.utc).isoformat()}


@router.get("/settings")
def get_admin_settings(db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)):
    """Read-only facts about this deployment. There are no platform-wide switches (maintenance mode, signup lock) in the
    backend yet, so none are shown: a toggle that changes nothing would be misleading."""
    from backend.server.common.config import get_settings
    from backend.server.database.models.platform_integration import PlatformIntegration
    from backend.server.services import platform_smtp

    cfg = get_settings()
    rows = db.execute(select(PlatformIntegration)).scalars().all()
    smtp = platform_smtp.get_settings_public(db)
    return {
        "deployment": {
            "environment": "debug" if cfg.DEBUG else "production",
            "public_base_url": cfg.PUBLIC_BASE_URL,
            "api_started_at": _PROCESS_STARTED.isoformat(),
        },
        "counts": {
            "businesses": db.scalar(select(func.count(Business.id))) or 0,
            "users": db.scalar(select(func.count(User.id))) or 0,
            "integrations_connected": sum(1 for r in rows if r.status == "Connected"),
            "integrations_total": len(rows),
        },
        "email": {"sender_name": smtp["display_name"], "from_email": smtp["from_email"], "host": smtp["host"], "configured": bool(platform_smtp.load_settings(db))},
    }


@router.get("/notifications")
def get_admin_notifications(db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)):
    """Real platform notices: providers that need attention now, then recent audit events (sign-ins failing, tenants created)."""
    from backend.server.database.models.audit_log import AuditLog
    from backend.server.database.models.platform_integration import PlatformIntegration

    items = []
    for row in db.execute(select(PlatformIntegration)).scalars().all():
        if row.status == "Connected":
            continue
        items.append({
            "id": f"integration:{row.id}",
            "level": "error" if row.status == "API Error" else "info",
            "title": f"{row.name}: {row.status}",
            "message": (row.config or {}).get("message") or "Needs attention.",
            "date": (row.last_checked_at or row.updated_at or datetime.now(timezone.utc)).isoformat(),
            "link": "/integrations",
        })
    events = db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(25)).scalars().all()
    for ev in events:
        failed = ev.outcome != "success"
        items.append({
            "id": f"audit:{ev.id}",
            "level": "warning" if failed else "info",
            "title": ev.action.replace(".", " ").replace("_", " ").capitalize() + (" (failed)" if failed else ""),
            "message": f"{ev.actor_email or 'System'}" + (f" from {ev.ip}" if ev.ip else ""),
            "date": ev.created_at.isoformat(),
            "link": None,
        })
    return {"notifications": items}


'''
s = s[:start] + new + s[end:]
p.write_text(s, encoding="utf-8")
print("admin.py patched")
