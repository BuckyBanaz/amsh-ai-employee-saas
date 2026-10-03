"""Platform SMTP: the sender identity the superadmin configures in the admin portal (Integrations -> Platform Email).

Stored in the database row `platform_integrations.id = "platform_smtp"` under `config["smtp"]`: display name, from address, username,
host, port, security, reply-to, logo, and the password ENCRYPTED with CryptoManager. These values are entered in the portal; they are
not copied from `.env` (and `.env` is not touched). The password is write-only: it is never returned by the API.

Used by: the admin integrations route (settings, live login test) and `services/email_service.py` (sending). With no SMTP settings
saved, email falls back to Resend from `.env`, as before.
"""

import logging
import re
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from backend.server.auth.crypto import CryptoManager
from backend.server.database.models.platform_integration import PlatformIntegration
from backend.server.database.session import SessionLocal

logger = logging.getLogger(__name__)

PROVIDER_ID = "platform_smtp"
SECURITY_MODES = ("starttls", "ssl", "none")
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
FIELDS = ("display_name", "from_email", "username", "host", "port", "security", "reply_to", "logo_url")


def _row(db: Session) -> Optional[PlatformIntegration]:
    return db.get(PlatformIntegration, PROVIDER_ID)


def get_settings_public(db: Session) -> Dict[str, Any]:
    """What the portal form shows. The password is never included, only whether one is saved."""
    stored = ((_row(db).config if _row(db) else None) or {}).get("smtp") or {}
    out = {field: stored.get(field, "") for field in FIELDS}
    out["port"] = stored.get("port", 587)
    out["security"] = stored.get("security", "starttls")
    out["has_password"] = bool(stored.get("password_enc"))
    return out


def load_settings(db: Optional[Session] = None) -> Optional[Dict[str, Any]]:
    """The saved SMTP settings with the password decrypted, or None when SMTP is not configured (host, username, password and
    from address are all required)."""
    owns = db is None
    db = db or SessionLocal()
    try:
        row = _row(db)
        stored = ((row.config if row else None) or {}).get("smtp") or {}
    finally:
        if owns:
            db.close()
    if not (stored.get("host") and stored.get("username") and stored.get("password_enc") and stored.get("from_email")):
        return None
    try:
        password = CryptoManager.decrypt(stored["password_enc"])
    except Exception:
        logger.warning("[SMTP] could not decrypt the saved SMTP password")
        return None
    return {**stored, "password": password}


def save_settings(db: Session, values: Dict[str, Any], password: Optional[str]) -> Dict[str, Any]:
    """Validate and store. `password` None or empty keeps the saved one. Raises ValueError with a message for the form."""
    clean: Dict[str, Any] = {}
    for field in ("display_name", "username", "host", "reply_to", "logo_url"):
        if values.get(field) is not None:
            clean[field] = str(values[field]).strip()[:255]
    if values.get("from_email") is not None:
        email = str(values["from_email"]).strip()
        if email and not _EMAIL.match(email):
            raise ValueError("From address is not a valid email.")
        clean["from_email"] = email
    if values.get("reply_to") and not _EMAIL.match(clean.get("reply_to", "")):
        raise ValueError("Reply-to is not a valid email.")
    if values.get("port") is not None:
        try:
            port = int(values["port"])
        except (TypeError, ValueError):
            raise ValueError("Port must be a number.")
        if not 1 <= port <= 65535:
            raise ValueError("Port must be between 1 and 65535.")
        clean["port"] = port
    if values.get("security") is not None:
        if values["security"] not in SECURITY_MODES:
            raise ValueError("Security must be starttls, ssl or none.")
        clean["security"] = values["security"]

    row = _row(db)
    if row is None:
        row = PlatformIntegration(id=PROVIDER_ID, name="Platform Email", category="Email", status="Disconnected", is_active_default=True, config={})
        db.add(row)
    config = dict(row.config or {})
    smtp = dict(config.get("smtp") or {})
    smtp.update(clean)
    if password:
        smtp["password_enc"] = CryptoManager.encrypt(password)
    config["smtp"] = smtp
    row.config = config  # reassigned so the JSON column is saved
    db.commit()
    return get_settings_public(db)


def _connect(settings: Dict[str, Any], timeout: float) -> smtplib.SMTP:
    host, port, mode = settings["host"], int(settings.get("port") or 587), settings.get("security") or "starttls"
    if mode == "ssl":
        client: smtplib.SMTP = smtplib.SMTP_SSL(host, port, timeout=timeout, context=ssl.create_default_context())
    else:
        client = smtplib.SMTP(host, port, timeout=timeout)
        client.ehlo()
        if mode == "starttls":
            client.starttls(context=ssl.create_default_context())
            client.ehlo()
    client.login(settings["username"], settings["password"])
    return client


def test_login(settings: Dict[str, Any], timeout: float = 6.0) -> str:
    """Connect and authenticate, send nothing. Returns a short success message; raises on failure."""
    client = _connect(settings, timeout)
    try:
        client.noop()
    finally:
        try:
            client.quit()
        except Exception:
            pass
    return f"SMTP login OK ({settings['host']}:{settings.get('port') or 587})"


def send_message(settings: Dict[str, Any], to: str, subject: str, text: str, html: Optional[str] = None, public_base_url: str = "") -> None:
    message = EmailMessage()
    message["From"] = formataddr((settings.get("display_name") or "", settings["from_email"]))
    message["To"] = to
    message["Subject"] = subject
    if settings.get("reply_to"):
        message["Reply-To"] = settings["reply_to"]
    message.set_content(text)
    if html:
        logo = settings.get("logo_url") or ""
        if logo:
            src = logo if logo.startswith("http") else f"{public_base_url.rstrip('/')}{logo}"
            html = f'<div style="margin-bottom:16px"><img src="{src}" alt="{settings.get("display_name") or ""}" height="40"></div>{html}'
        message.add_alternative(html, subtype="html")
    client = _connect(settings, 15.0)
    try:
        client.send_message(message)
    finally:
        try:
            client.quit()
        except Exception:
            pass
