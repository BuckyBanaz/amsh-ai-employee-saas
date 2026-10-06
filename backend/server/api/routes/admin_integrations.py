"""Platform Infrastructure Integrations API for the Admin Portal.

What the superadmin sees here is REAL:
  * Credentials come from the server environment (`.env`) unless the superadmin enters one in the portal (Configure). A portal
    value is stored ENCRYPTED (CryptoManager) in `platform_integrations.config["secrets"]`, overrides `.env` for these checks,
    and can be reset to `.env` at any time. `.env` values are never copied into the database; nothing is returned in full.
  * Status comes from a live, read-only call to each provider with the credentials from the environment (no sleep, no
    simulated "Connected"). A provider whose credentials are missing shows "Disconnected: not configured".
  * The database table `platform_integrations` keeps only non-secret operational state: the last check result, latency, a
    failure rate, and the "default" switch.

Providers: Twilio, Exotel (telephony), Groq, Gemini, Deepgram (AI / speech), Cartesia, ElevenLabs (voice), WhatsApp (Meta Graph),
Resend (platform email), Razorpay and Stripe (billing).
"""

import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, List, Optional, Tuple

import httpx
import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.server.auth.security import require_platform_admin
from backend.server.auth.crypto import CryptoManager
from backend.server.common.config import get_settings
from backend.server.database.models.platform_integration import PlatformIntegration
from backend.server.database.session import SessionLocal, get_db
from backend.server.services import platform_smtp

router = APIRouter(prefix="/api/admin/integrations", tags=["admin-integrations"], dependencies=[Depends(require_platform_admin)])

PING_TIMEOUT_SECONDS = 4.0
RECHECK_AFTER = timedelta(seconds=60)  # the list refreshes a provider's status when its last check is older than this


_OVERRIDES: Dict[str, str] = {}  # decrypted portal-entered credentials, rebuilt from the database on every request that needs them


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


def _get(url: str, **kwargs: Any) -> httpx.Response:
    with httpx.Client(timeout=PING_TIMEOUT_SECONDS) as client:
        return client.get(url, **kwargs)


def _verdict(response: httpx.Response, name: str, ok_codes: Tuple[int, ...] = (200,)) -> Tuple[bool, str]:
    if response.status_code in ok_codes:
        return True, f"{name} answered {response.status_code}"
    detail = ""
    try:
        body = response.json()
        error = body.get("error") if isinstance(body, dict) else None
        message = error.get("message") if isinstance(error, dict) else error
        detail = str(message or (body.get("message") if isinstance(body, dict) else "") or "")[:140]
    except Exception:
        detail = response.text[:140]
    return False, f"{name} answered {response.status_code}" + (f": {detail}" if detail else "")


def _ping_twilio() -> Tuple[bool, str]:
    sid = _setting("TWILIO_ACCOUNT_SID")
    r = _get(f"https://api.twilio.com/2010-04-01/Accounts/{sid}.json", auth=(sid, _setting("TWILIO_AUTH_TOKEN")))
    if r.status_code == 200 and r.json().get("status") not in (None, "active"):
        return False, f"Twilio account status is {r.json().get('status')}"
    return _verdict(r, "Twilio")


def _ping_exotel() -> Tuple[bool, str]:
    sub = _setting("EXOTEL_SUBDOMAIN") or "api.exotel.com"
    r = _get(f"https://{sub}/v1/Accounts/{_setting('EXOTEL_ACCOUNT_SID')}/Calls.json", params={"PageSize": 1},
             auth=(_setting("EXOTEL_API_KEY"), _setting("EXOTEL_API_TOKEN")))
    return _verdict(r, "Exotel")


def _ping_groq() -> Tuple[bool, str]:
    return _verdict(_get("https://api.groq.com/openai/v1/models", headers={"Authorization": f"Bearer {_setting('GROQ_API_KEY')}"}), "Groq")


def _ping_gemini() -> Tuple[bool, str]:
    return _verdict(_get("https://generativelanguage.googleapis.com/v1beta/models", params={"pageSize": 1},
                         headers={"x-goog-api-key": _setting("GEMINI_API_KEY")}), "Gemini")


def _ping_deepgram() -> Tuple[bool, str]:
    return _verdict(_get("https://api.deepgram.com/v1/projects", headers={"Authorization": f"Token {_setting('DEEPGRAM_API_KEY')}"}), "Deepgram")


def _ping_cartesia() -> Tuple[bool, str]:
    return _verdict(_get("https://api.cartesia.ai/voices", params={"limit": 1},
                         headers={"X-API-Key": _setting("CARTESIA_API_KEY"), "Cartesia-Version": "2024-11-13"}), "Cartesia")


def _ping_elevenlabs() -> Tuple[bool, str]:
    return _verdict(_get("https://api.elevenlabs.io/v1/user", headers={"xi-api-key": _setting("ELEVENLABS_API_KEY")}), "ElevenLabs")


def _ping_whatsapp() -> Tuple[bool, str]:
    version = _setting("META_GRAPH_VERSION") or "v23.0"
    return _verdict(_get(f"https://graph.facebook.com/{version}/me", params={"fields": "id,name"},
                         headers={"Authorization": f"Bearer {_setting('META_WHATSAPP_TOKEN')}"}), "Meta WhatsApp")


def _ping_google_calendar() -> Tuple[bool, str]:
    """Validates the OAuth client without touching any user: a bogus code is rejected with invalid_grant when the client id/secret are right, invalid_client when they are not."""
    r = httpx.post("https://oauth2.googleapis.com/token", timeout=PING_TIMEOUT_SECONDS, data={
        "code": "amsh-health-check", "client_id": _setting("GOOGLE_CLIENT_ID"), "client_secret": _setting("GOOGLE_CLIENT_SECRET"),
        "redirect_uri": _setting("GOOGLE_REDIRECT_URI") or "http://localhost:8010/api/integrations/google/callback", "grant_type": "authorization_code",
    })
    error = (r.json() or {}).get("error") if r.headers.get("content-type", "").startswith("application/json") else None
    if error == "invalid_grant":
        return True, "Google accepted the OAuth client id and secret"
    if error == "invalid_client":
        return False, "Google rejected the OAuth client id or secret"
    return _verdict(r, "Google OAuth")


def _check_email() -> Dict[str, Any]:
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


def _ping_resend() -> Tuple[bool, str]:
    r = _get("https://api.resend.com/domains", headers={"Authorization": f"Bearer {_setting('RESEND_API_KEY')}"})
    if r.status_code == 401 and "restricted" in r.text.lower():  # a send-only key cannot list domains but is valid
        return True, "Resend key is valid (send-only)"
    return _verdict(r, "Resend")


def _ping_razorpay() -> Tuple[bool, str]:
    key_id = _setting("RAZORPAY_KEY_ID") or _setting("RAZORPAY_API_KEY")
    key_secret = _setting("RAZORPAY_KEY_SECRET") or _setting("RAZORPAY_SECRET_KEY")
    return _verdict(_get("https://api.razorpay.com/v1/orders", params={"count": 1}, auth=(key_id, key_secret)), "Razorpay")


def _ping_stripe() -> Tuple[bool, str]:
    return _verdict(_get("https://api.stripe.com/v1/balance", headers={"Authorization": f"Bearer {_setting('STRIPE_SECRET_KEY')}"}), "Stripe")


# id -> (display name, category, environment keys that must be set (an alternative group is a tuple), ping function)
PROVIDERS: Dict[str, Tuple[str, str, List[Any], Callable[[], Tuple[bool, str]]]] = {
    "twilio": ("Twilio Telephony Gateway", "Voice", ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"], _ping_twilio),
    "exotel": ("Exotel India Virtual Numbers", "Voice", ["EXOTEL_ACCOUNT_SID", "EXOTEL_API_KEY", "EXOTEL_API_TOKEN"], _ping_exotel),
    "groq": ("Groq Fast LPU Inference", "AI", ["GROQ_API_KEY"], _ping_groq),
    "gemini": ("Google Gemini", "AI", ["GEMINI_API_KEY"], _ping_gemini),
    "deepgram": ("Deepgram Speech-to-Text", "AI", ["DEEPGRAM_API_KEY"], _ping_deepgram),
    "cartesia": ("Cartesia Sonic Voice", "Voice", ["CARTESIA_API_KEY"], _ping_cartesia),
    "elevenlabs": ("ElevenLabs Voice", "Voice", ["ELEVENLABS_API_KEY"], _ping_elevenlabs),
    "whatsapp": ("Meta WhatsApp Cloud API", "Messaging", ["META_WHATSAPP_TOKEN"], _ping_whatsapp),
    "google_calendar": ("Google Calendar (OAuth)", "Calendar", ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"], _ping_google_calendar),
    "platform_smtp": ("Platform Email (SMTP)", "Email", ["RESEND_API_KEY"], _ping_resend),
    "razorpay": ("Razorpay Billing Gateway", "Payments", [("RAZORPAY_KEY_ID", "RAZORPAY_API_KEY"), ("RAZORPAY_KEY_SECRET", "RAZORPAY_SECRET_KEY")], _ping_razorpay),
    "stripe": ("Stripe Card Gateway", "Payments", ["STRIPE_SECRET_KEY"], _ping_stripe),
}


def _key_names(spec: List[Any]) -> List[str]:
    return [name for item in spec for name in (item if isinstance(item, tuple) else (item,))]


def _missing(spec: List[Any]) -> List[str]:
    """Environment keys that are not set (for an alternative group, the first name is reported)."""
    out = []
    for item in spec:
        names = item if isinstance(item, tuple) else (item,)
        if not any(_setting(n) for n in names):
            out.append(names[0])
    return out


def _mask(value: str) -> str:
    return "not set" if not value else (value[:4] + "••••••••" + value[-4:] if len(value) > 8 else "••••••••")


def _check(provider_id: str) -> Dict[str, Any]:
    """One real check. Returns {ok, status, latency_ms, message}. Never raises."""
    if provider_id == "platform_smtp":
        return _check_email()
    name, _, spec, ping = PROVIDERS[provider_id]
    missing = _missing(spec)
    if missing:
        return {"ok": False, "status": "Disconnected", "latency_ms": None, "message": f"Not configured: set {', '.join(missing)} in .env"}
    started = time.perf_counter()
    try:
        ok, message = ping()
    except Exception as exc:  # network down, DNS, timeout...
        ok, message = False, f"{name} could not be reached: {type(exc).__name__}"
    return {"ok": ok, "status": "Connected" if ok else "API Error", "latency_ms": round((time.perf_counter() - started) * 1000, 1), "message": message}


def _ensure_rows(db: Session) -> Dict[str, PlatformIntegration]:
    rows = {r.id: r for r in db.query(PlatformIntegration).all()}
    for provider_id, (name, category, _, _) in PROVIDERS.items():
        if provider_id not in rows:
            rows[provider_id] = PlatformIntegration(id=provider_id, name=name, category=category, status="Disconnected", is_active_default=True, config={}, error_rate="0.0%")
            db.add(rows[provider_id])
    db.commit()
    _load_overrides(rows)
    return rows


def _record(row: PlatformIntegration, result: Dict[str, Any]) -> None:
    """Store the outcome of a check: status, latency, failure rate and a message. No credentials, ever."""
    stats = dict((row.config or {}))
    checks = int(stats.get("checks", 0)) + 1
    failures = int(stats.get("failures", 0)) + (0 if result["ok"] else 1)
    row.status = result["status"]
    row.latency_ms = result["latency_ms"]
    row.last_checked_at = datetime.now(timezone.utc)
    row.error_rate = f"{failures / checks * 100:.1f}%"
    kept = {k: stats[k] for k in ("smtp", "secrets") if stats.get(k)}  # portal-entered settings survive; nothing else carries over
    row.config = {**kept, "checks": checks, "failures": failures, "message": result["message"]}
    row.updated_at = datetime.now(timezone.utc)


def _smtp_summary(stored: Dict[str, Any]) -> Dict[str, str]:
    smtp = stored.get("smtp", {})
    return {
        "host": f"{smtp.get('host')}:{smtp.get('port', 587)} ({smtp.get('security', 'starttls')})",
        "username": smtp.get("username") or "not set",
        "from": smtp.get("from_email") or "not set",
        "password": "saved (encrypted)" if smtp.get("password_enc") else "not set",
    }


def _view(row: PlatformIntegration) -> Dict[str, Any]:
    spec = PROVIDERS[row.id][2]
    stored = row.config or {}
    return {
        "id": row.id,
        "name": PROVIDERS[row.id][0],  # the code's name wins over a stale stored one
        "category": row.category,
        "status": row.status,
        "is_active_default": row.is_active_default,
        "latency_ms": row.latency_ms,
        "error_rate": row.error_rate,
        "last_checked_at": row.last_checked_at.isoformat() if row.last_checked_at else None,
        "message": stored.get("message", ""),
        "managed_by": "portal" if row.id == "platform_smtp" else ".env",
        "sources": {name: _source(name) for name in _key_names(spec)},
        "overridden": bool(stored.get("secrets")) or bool(row.id == "platform_smtp" and stored.get("smtp", {}).get("host")),
        # Which environment keys this provider needs, with a masked preview read from the environment right now (not stored).
        # Platform email is entered in the portal instead, so it lists the saved SMTP details (never the password).
        "config": _smtp_summary(stored) if row.id == "platform_smtp" and stored.get("smtp", {}).get("host") else {name: _mask(_setting(name)) for name in _key_names(spec)},
        "configurable": True,
    }


class PlatformIntegrationUpdate(BaseModel):
    status: Optional[str] = None
    is_active_default: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None


_refresh_lock = threading.Lock()


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


@router.patch("/{provider_id}")
def update_platform_integration(provider_id: str, payload: PlatformIntegrationUpdate, db: Session = Depends(get_db)):
    """Only the "default" switch can change here. Credentials and status are not editable: they come from `.env` and live checks."""
    if provider_id not in PROVIDERS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Provider {provider_id} not found")
    if payload.config is not None or payload.status is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Credentials are managed in the server .env file and status comes from live checks: they cannot be edited here.")
    row = _ensure_rows(db)[provider_id]
    if payload.is_active_default is not None:
        row.is_active_default = payload.is_active_default
        row.updated_at = datetime.now(timezone.utc)
        db.commit()
    return {"success": True, "provider_id": provider_id, "is_active_default": row.is_active_default}


@router.post("/{provider_id}/test")
def test_platform_integration(provider_id: str, db: Session = Depends(get_db)):
    """A real, read-only call to the provider with the credentials from the environment."""
    if provider_id not in PROVIDERS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Provider {provider_id} not found")
    row = _ensure_rows(db)[provider_id]
    result = _check(provider_id)
    _record(row, result)
    db.commit()
    return {"success": result["ok"], "provider_id": provider_id, "name": row.name, "status": result["status"],
            "latency_ms": result["latency_ms"], "message": result["message"]}


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
