import pathlib

p = pathlib.Path(r"C:\Users\Parikshit\Desktop\saas\backend\server\api\routes\admin_integrations.py")
s = p.read_text(encoding="utf-8")


def sub1(old, new):
    global s
    assert s.count(old) == 1, old[:70]
    s = s.replace(old, new, 1)


# docstring: credentials can now be entered in the portal
sub1('''  * Credentials live in the server environment (`.env`). They are never copied into the database, never returned in full, and
    cannot be edited through this API: configure them in `.env` and restart.''',
     '''  * Credentials come from the server environment (`.env`) unless the superadmin enters one in the portal (Configure). A portal
    value is stored ENCRYPTED (CryptoManager) in `platform_integrations.config["secrets"]`, overrides `.env` for these checks,
    and can be reset to `.env` at any time. `.env` values are never copied into the database; nothing is returned in full.''')

# imports
sub1("import time\nfrom concurrent.futures import ThreadPoolExecutor\n", "import threading\nimport time\nfrom concurrent.futures import ThreadPoolExecutor\n")
sub1("from backend.server.common.config import get_settings\n", "from backend.server.auth.crypto import CryptoManager\nfrom backend.server.common.config import get_settings\n")
sub1("from backend.server.database.session import get_db\n", "from backend.server.database.session import SessionLocal, get_db\n")

# _setting: portal override first
sub1('''def _setting(name: str) -> str:
    return str(getattr(get_settings(), name, "") or "").strip()
''', '''_OVERRIDES: Dict[str, str] = {}  # decrypted portal-entered credentials, rebuilt from the database on every request that needs them


def _load_overrides(rows: Dict[str, PlatformIntegration]) -> None:
    fresh: Dict[str, str] = {}
    for row in rows.values():
        for key, token in ((row.config or {}).get("secrets") or {}).items():
            value = CryptoManager.decrypt(token)
            if value:
                fresh[key] = value
    _OVERRIDES.clear()
    _OVERRIDES.update(fresh)


def _setting(name: str) -> str:
    if _OVERRIDES.get(name):
        return _OVERRIDES[name].strip()
    return str(getattr(get_settings(), name, "") or "").strip()


def _source(name: str) -> str:
    return "portal" if _OVERRIDES.get(name) else (".env" if str(getattr(get_settings(), name, "") or "").strip() else "not set")
''')

# _ensure_rows loads the overrides
sub1('''            db.add(rows[provider_id])
    db.commit()
    return rows''', '''            db.add(rows[provider_id])
    db.commit()
    _load_overrides(rows)
    return rows''')

# _record keeps the secrets too
sub1('''    kept = {"smtp": stats["smtp"]} if stats.get("smtp") else {}  # the portal-entered SMTP settings survive; nothing else carries over''',
     '''    kept = {k: stats[k] for k in ("smtp", "secrets") if stats.get(k)}  # portal-entered settings survive; nothing else carries over''')

# view: where each key comes from
sub1('''        "managed_by": "portal" if row.id == "platform_smtp" else ".env",''',
     '''        "managed_by": "portal" if row.id == "platform_smtp" else ".env",
        "sources": {name: _source(name) for name in _key_names(spec)},
        "overridden": bool(stored.get("secrets")) or bool(row.id == "platform_smtp" and stored.get("smtp", {}).get("host")),''')
sub1('''        "configurable": row.id == "platform_smtp",  # the one provider whose details are entered in the portal''',
     '''        "configurable": True,''')
# the smtp row's own view uses spec for keys; keep SMTP special-case as is

# list: instant, refresh in the background
a = s.index('@router.get("")')
b = s.index('@router.patch("/{provider_id}")')
s = s[:a] + '''_refresh_lock = threading.Lock()


def _refresh_stale() -> None:
    """Background re-check of every provider whose last check is old. One refresh at a time."""
    if not _refresh_lock.acquire(blocking=False):
        return
    try:
        with SessionLocal() as db:
            rows = _ensure_rows(db)
            now = datetime.now(timezone.utc)
            stale = [pid for pid, row in rows.items() if not row.last_checked_at or now - row.last_checked_at > RECHECK_AFTER]
            if not stale:
                return
            with ThreadPoolExecutor(max_workers=8) as pool:
                results = dict(zip(stale, pool.map(_check, stale)))
            for pid, result in results.items():
                _record(rows[pid], result)
            db.commit()
    except Exception:
        pass
    finally:
        _refresh_lock.release()


@router.get("")
def list_platform_integrations(db: Session = Depends(get_db)):
    """All providers from their last stored check, returned immediately. Old or missing checks are refreshed in a background
    thread (read-only calls), so the next load shows them; the page never waits on a provider."""
    rows = _ensure_rows(db)
    now = datetime.now(timezone.utc)
    if any(not row.last_checked_at or now - row.last_checked_at > RECHECK_AFTER for row in rows.values()):
        threading.Thread(target=_refresh_stale, daemon=True).start()
    return [_view(rows[pid]) for pid in sorted(rows, key=lambda p: (rows[p].category, p))]


''' + s[b:]

# credentials CRUD
s += '''

class CredentialsPayload(BaseModel):
    values: Dict[str, str]  # env key -> new value; an empty string keeps what is saved


@router.put("/{provider_id}/credentials")
def save_credentials(provider_id: str, payload: CredentialsPayload, db: Session = Depends(get_db)):
    """Save portal-entered credentials for a provider (encrypted), then run a live check with them."""
    if provider_id not in PROVIDERS or provider_id == "platform_smtp":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Provider {provider_id} not found")
    allowed = set(_key_names(PROVIDERS[provider_id][2]))
    unknown = [k for k in payload.values if k not in allowed]
    if unknown:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown credential: {', '.join(unknown)}")
    row = _ensure_rows(db)[provider_id]
    config = dict(row.config or {})
    secrets = dict(config.get("secrets") or {})
    for key, value in payload.values.items():
        value = value.strip()
        if value:
            secrets[key] = CryptoManager.encrypt(value)
    config["secrets"] = secrets
    row.config = config
    db.commit()
    _load_overrides(_ensure_rows(db))
    result = _check(provider_id)
    _record(row, result)
    db.commit()
    return _view(row)


@router.delete("/{provider_id}/credentials")
def reset_credentials(provider_id: str, db: Session = Depends(get_db)):
    """Forget the portal-entered values so the provider goes back to `.env` (SMTP: clears the saved sender settings)."""
    if provider_id not in PROVIDERS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Provider {provider_id} not found")
    row = _ensure_rows(db)[provider_id]
    config = dict(row.config or {})
    config.pop("smtp" if provider_id == "platform_smtp" else "secrets", None)
    row.config = config
    db.commit()
    _load_overrides(_ensure_rows(db))
    result = _check(provider_id)
    _record(row, result)
    db.commit()
    return _view(row)
'''
p.write_text(s, encoding="utf-8")
print("integrations CRUD patched")
