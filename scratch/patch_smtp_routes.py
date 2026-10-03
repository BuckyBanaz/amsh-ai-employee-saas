import pathlib

p = pathlib.Path(r"C:\Users\Parikshit\Desktop\saas\backend\server\api\routes\admin_integrations.py")
s = p.read_text(encoding="utf-8")


def sub1(old, new):
    global s
    assert s.count(old) == 1, old[:70]
    s = s.replace(old, new, 1)


# imports
sub1("from fastapi import APIRouter, Depends, HTTPException, status\n",
     "import os\nimport uuid\n\nfrom fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status\n")
sub1("from backend.server.database.session import get_db\n",
     "from backend.server.database.session import get_db\nfrom backend.server.services import platform_smtp\n")

# Platform Email: a saved portal SMTP (preferred) or the Resend key from .env
sub1('''def _ping_resend() -> Tuple[bool, str]:''', '''def _check_email() -> Dict[str, Any]:
    """Platform email: the SMTP the superadmin saved in the portal (login test, nothing is sent), else Resend from .env."""
    smtp = platform_smtp.load_settings()
    started = time.perf_counter()
    if smtp:
        try:
            message = platform_smtp.test_login(smtp)
            ok = True
        except Exception as exc:
            ok, message = False, f"SMTP login failed on {smtp['host']}:{smtp.get('port')}: {str(exc)[:120]}"
        return {"ok": ok, "status": "Connected" if ok else "API Error", "latency_ms": round((time.perf_counter() - started) * 1000, 1), "message": message}
    if _setting("RESEND_API_KEY"):
        try:
            ok, message = _ping_resend()
        except Exception as exc:
            ok, message = False, f"Resend could not be reached: {type(exc).__name__}"
        return {"ok": ok, "status": "Connected" if ok else "API Error", "latency_ms": round((time.perf_counter() - started) * 1000, 1), "message": message}
    return {"ok": False, "status": "Disconnected", "latency_ms": None, "message": "Not configured: add your SMTP details with Configure, or set RESEND_API_KEY in .env"}


def _ping_resend() -> Tuple[bool, str]:''')
sub1('''    name, _, spec, ping = PROVIDERS[provider_id]
    missing = _missing(spec)''', '''    if provider_id == "platform_smtp":
        return _check_email()
    name, _, spec, ping = PROVIDERS[provider_id]
    missing = _missing(spec)''')
sub1('"platform_smtp": ("Platform Email (Resend)", "Email",', '"platform_smtp": ("Platform Email (SMTP)", "Email",')

# keep the saved SMTP settings when a check result is recorded
sub1('''    row.config = {"checks": checks, "failures": failures, "message": result["message"]}  # replaces anything that was stored before''',
     '''    kept = {"smtp": stats["smtp"]} if stats.get("smtp") else {}  # the portal-entered SMTP settings survive; nothing else carries over
    row.config = {**kept, "checks": checks, "failures": failures, "message": result["message"]}''')

# the list view must not leak the encrypted password
sub1('''        "config": {name: _mask(_setting(name)) for name in _key_names(spec)},
    }''', '''        "config": {name: _mask(_setting(name)) for name in _key_names(spec)},
        "configurable": row.id == "platform_smtp",  # the one provider whose details are entered in the portal
    }''')

# routes
s += '''

class SmtpSettings(BaseModel):
    display_name: Optional[str] = None
    from_email: Optional[str] = None
    username: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    security: Optional[str] = None
    reply_to: Optional[str] = None
    logo_url: Optional[str] = None
    password: Optional[str] = None  # write-only; empty keeps the saved one


@router.get("/platform_smtp/settings")
def get_smtp_settings(db: Session = Depends(get_db)):
    """The saved sender identity for platform email. The password is never returned, only `has_password`."""
    return platform_smtp.get_settings_public(db)


@router.put("/platform_smtp/settings")
def put_smtp_settings(payload: SmtpSettings, db: Session = Depends(get_db)):
    """Save the SMTP details entered in the portal (password encrypted). Not read from, and not written to, `.env`."""
    values = payload.model_dump(exclude={"password"})
    try:
        saved = platform_smtp.save_settings(db, values, payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return saved


LOGO_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static", "uploads", "platform")
LOGO_TYPES = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/svg+xml": ".svg"}
MAX_LOGO_BYTES = 1024 * 1024


@router.post("/platform_smtp/logo")
def upload_smtp_logo(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """The logo shown at the top of platform emails (PNG, JPG, WebP or SVG, up to 1 MB)."""
    extension = LOGO_TYPES.get(file.content_type or "")
    if not extension:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Logo must be a PNG, JPG, WebP or SVG image.")
    data = file.file.read(MAX_LOGO_BYTES + 1)
    if len(data) > MAX_LOGO_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Logo must be 1 MB or smaller.")
    os.makedirs(LOGO_DIR, exist_ok=True)
    name = f"smtp_logo_{uuid.uuid4().hex[:10]}{extension}"
    with open(os.path.join(LOGO_DIR, name), "wb") as handle:
        handle.write(data)
    return platform_smtp.save_settings(db, {"logo_url": f"/static/uploads/platform/{name}"}, None)
'''
p.write_text(s, encoding="utf-8")
print("routes patched")
