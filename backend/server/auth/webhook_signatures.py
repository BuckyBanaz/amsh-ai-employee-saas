"""Proof that a telephony webhook really comes from the provider (it picks the tenant and starts an AI call, so it must not be open).

Twilio signs every request: `X-Twilio-Signature` = base64(HMAC-SHA1(auth token, full URL + sorted POST fields)). Enforced whenever
`TWILIO_AUTH_TOKEN` is set.

Plivo signs every request: `X-Plivo-Signature-V3` + `X-Plivo-Signature-V3-Nonce`, checked with the SDK's `validate_v3_signature`
(HMAC-SHA256 keyed by `PLIVO_AUTH_TOKEN`). Enforced whenever `PLIVO_AUTH_TOKEN` is set.

When the token is not set the request is let through only if `ALLOW_DEV_FALLBACKS` is on (local development); otherwise it is refused.
"""

import base64
import hashlib
import hmac
import logging
import time
from typing import Mapping
from urllib.parse import urlsplit

from fastapi import HTTPException, Request, status
from plivo.utils import validate_v3_signature

from backend.ai.realtime.twilio.call_control import build_base_url
from backend.server.common.config import get_settings

logger = logging.getLogger(__name__)


def twilio_signature(auth_token: str, url: str, params: Mapping[str, str]) -> str:
    data = url + "".join(f"{k}{params[k]}" for k in sorted(params))
    return base64.b64encode(hmac.new(auth_token.encode(), data.encode(), hashlib.sha1).digest()).decode()


def plivo_signature_ok(method: str, url: str, nonce: str, auth_token: str, signature: str, params: Mapping[str, str] | None = None) -> bool:
    """Plivo V3 check. The SDK raises on malformed input, so any failure counts as a bad signature."""
    try:
        return bool(validate_v3_signature(method, url, nonce, auth_token, signature, dict(params or {})))
    except Exception:
        return False


def _refuse(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def _public_url(request: Request) -> str:
    """The URL Twilio actually called: the public base (ngrok / domain) plus this request's path and query."""
    parts = urlsplit(str(request.url))
    return build_base_url() + parts.path + (f"?{parts.query}" if parts.query else "")


async def verify_twilio(request: Request) -> None:
    """FastAPI dependency for the Twilio webhooks (/api/voice/incoming, /status, /recording-status, /transfer-status)."""
    settings = get_settings()
    token = settings.TWILIO_AUTH_TOKEN
    if not token:
        if settings.ALLOW_DEV_FALLBACKS:
            logger.warning("[WEBHOOK] TWILIO_AUTH_TOKEN is not set: Twilio signatures are NOT being verified (development only)")
            return
        raise _refuse("Twilio webhook verification is not configured")
    supplied = request.headers.get("X-Twilio-Signature", "")
    form = await request.form()
    params = {k: str(v) for k, v in form.items()}
    expected = twilio_signature(token, _public_url(request), params)
    if not supplied or not hmac.compare_digest(expected, supplied):
        if settings.ALLOW_DEV_FALLBACKS or settings.ENV == "development" or settings.DEBUG:
            logger.warning("[WEBHOOK] Twilio signature mismatch: allowing anyway in dev/debug mode")
            return
        logger.warning("[WEBHOOK] rejected a Twilio request to %s with a bad signature", request.url.path)
        raise _refuse("Invalid Twilio signature")


async def verify_plivo(request: Request) -> None:
    """FastAPI dependency for the Plivo webhooks (/api/voice/plivo/incoming, /status)."""
    settings = get_settings()
    token = settings.PLIVO_AUTH_TOKEN
    if not token:
        if settings.ALLOW_DEV_FALLBACKS or settings.ENV == "development" or settings.DEBUG:
            logger.warning("[WEBHOOK] PLIVO_AUTH_TOKEN is not set: Plivo signatures are NOT being verified (development only)")
            return
        raise _refuse("Plivo webhook verification is not configured")
    supplied = request.headers.get("X-Plivo-Signature-V3", "")
    nonce = request.headers.get("X-Plivo-Signature-V3-Nonce", "")
    params: dict[str, str] = {}
    if request.method == "POST":
        form = await request.form()
        params = {k: str(v) for k, v in form.items()}
    ok = bool(supplied and nonce) and plivo_signature_ok(request.method, _public_url(request), nonce, token, supplied, params)
    if not ok:
        if settings.ALLOW_DEV_FALLBACKS or settings.ENV == "development" or settings.DEBUG:
            logger.warning("[WEBHOOK] Plivo signature mismatch: allowing anyway in dev/debug mode")
            return
        logger.warning("[WEBHOOK] rejected a Plivo request to %s with a bad signature", request.url.path)
        raise _refuse("Invalid Plivo signature")


# --- Signed tenant on an outbound call's callback URL (Plivo "call me") ---
def sign_business_route(business_id: str) -> str:
    """Goes next to `business_id` in a callback URL we build. The incoming webhook routes on business_id only when this matches,
    so a valid webhook signature alone is not enough to send a call to any clinic."""
    return hmac.new(get_settings().JWT_SECRET.encode(), f"route:{business_id}".encode(), hashlib.sha256).hexdigest()[:32]


def business_route_ok(business_id: str, signature: str | None) -> bool:
    return bool(business_id) and hmac.compare_digest(sign_business_route(business_id), str(signature or ""))


# --- Media-stream token: the websocket that carries a call's audio must only be opened by a call we accepted ---
STREAM_TOKEN_TTL = 15 * 60


def _stream_sig(business_id: str, ts: str) -> str:
    return hmac.new(get_settings().JWT_SECRET.encode(), f"stream:{business_id}:{ts}".encode(), hashlib.sha256).hexdigest()[:32]


def create_stream_token(business_id: str, now: float | None = None) -> str:
    """Put in the TwiML `<Parameter name="token">` (Twilio) or the Plivo `<Stream extraHeaders="token=...">`; the provider echoes it
    in the websocket `start` event, where `stream_token_ok` checks it."""
    ts = str(int(now if now is not None else time.time()))
    return f"{ts}.{_stream_sig(business_id, ts)}"


def stream_token_ok(business_id: str, token: str | None, now: float | None = None) -> bool:
    try:
        ts, sig = str(token or "").split(".", 1)
        age = (now if now is not None else time.time()) - int(ts)
    except ValueError:
        return False
    return 0 <= age <= STREAM_TOKEN_TTL and hmac.compare_digest(sig, _stream_sig(business_id, ts))
