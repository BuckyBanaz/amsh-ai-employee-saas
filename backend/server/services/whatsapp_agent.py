"""WhatsApp inbound chat: Meta webhook -> tenant -> the same AgentEngine as phone calls (text channel) -> Graph API reply.

Each patient gets one conversation per day (call id `wa_<business>_<number>_<date>`), stored like a call so it shows up in
/calls with its transcript. The engine is rebuilt from the saved transcript after a restart (`AgentEngine.restore`).
Meta retries a webhook until it gets a 200, so messages are de-duplicated by id and answered in a background task.
"""

import asyncio
import hashlib
import hmac
import logging
from collections import OrderedDict
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from sqlalchemy import select

from backend.server.auth.crypto import CryptoManager
from backend.server.common.config import get_settings
from backend.server.database.models.business import Business
from backend.server.database.models.integration import Integration
from backend.server.database.session import SessionLocal
from backend.server.services.call_recorder import load_call_turns, record_call_start, record_call_turn

logger = logging.getLogger(__name__)

NOT_TEXT_REPLY = "Thanks for your message! I can only read text messages here for now. Could you type what you need?"
TROUBLE_REPLY = "Sorry, I am having trouble right now. Please try again in a minute, or call the clinic directly."


@dataclass
class Inbound:
    phone_number_id: str
    sender: str
    message_id: str
    text: str  # empty for anything that is not a text message
    sender_name: Optional[str] = None


def verify_signature(raw_body: bytes, header: Optional[str], app_secret: Optional[str]) -> bool:
    """Meta signs every webhook: `X-Hub-Signature-256: sha256=<hmac of the raw body with the app secret>`.
    Without a configured secret (local development) the check is skipped."""
    if not app_secret:
        return True
    if not header or not header.startswith("sha256="):
        return False
    expected = hmac.new(app_secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header.split("=", 1)[1])


def extract_messages(payload: Dict[str, Any]) -> List[Inbound]:
    """Every user message in a Meta webhook payload (status updates and other events are ignored)."""
    out: List[Inbound] = []
    for entry in payload.get("entry") or []:
        for change in entry.get("changes") or []:
            value = change.get("value") or {}
            phone_number_id = str((value.get("metadata") or {}).get("phone_number_id") or "")
            names = {c.get("wa_id"): (c.get("profile") or {}).get("name") for c in value.get("contacts") or []}
            for msg in value.get("messages") or []:
                sender = str(msg.get("from") or "")
                if not (phone_number_id and sender and msg.get("id")):
                    continue
                text = (msg.get("text") or {}).get("body", "") if msg.get("type") == "text" else ""
                out.append(Inbound(phone_number_id, sender, str(msg["id"]), text.strip(), names.get(sender)))
    return out


def conversation_id(business_id: str, sender: str, now: Optional[datetime] = None) -> str:
    now = now or datetime.now(timezone.utc)
    return f"wa_{business_id[:8]}_{sender}_{now:%Y%m%d}"


def find_whatsapp_integration(db: Any, phone_number_id: str) -> Optional[Integration]:
    rows = db.scalars(select(Integration).where(Integration.provider == "whatsapp", Integration.status == "connected")).all()
    return next((r for r in rows if str((r.config or {}).get("phone_number_id")) == phone_number_id), None)


async def send_text(config: Dict[str, Any], to: str, body: str) -> bool:
    """Send a free-form WhatsApp text (valid inside the 24 h window after the patient's message)."""
    try:
        token = CryptoManager.decrypt(config["access_token"])
        url = f"https://graph.facebook.com/{get_settings().META_GRAPH_VERSION}/{config['phone_number_id']}/messages"
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                url,
                headers={"Authorization": f"Bearer {token}"},
                json={"messaging_product": "whatsapp", "to": to, "type": "text", "text": {"body": body[:4000]}},
            )
        if resp.status_code != 200:
            logger.warning("[WHATSAPP] send failed (%s): %s", resp.status_code, resp.text[:200])
        return resp.status_code == 200
    except Exception as e:
        logger.warning("[WHATSAPP] send failed: %s", e)
        return False


class WhatsAppAgent:
    def __init__(self) -> None:
        self._runtimes: Dict[str, Any] = {}
        self._seq: Dict[str, int] = {}
        self._locks: Dict[str, asyncio.Lock] = {}
        self._seen: "OrderedDict[str, None]" = OrderedDict()
        self.send = send_text  # replaced in tests

    def _is_duplicate(self, message_id: str) -> bool:
        if message_id in self._seen:
            return True
        self._seen[message_id] = None
        while len(self._seen) > 1000:
            self._seen.popitem(last=False)
        return False

    async def _runtime(self, call_id: str, business_id: str, sender: str, sender_name: Optional[str]) -> Any:
        rt = self._runtimes.get(call_id)
        if rt:
            return rt
        from backend.ai.engine.agent.runtime import AgentRuntime
        from backend.ai.verticals.registry import registry as vertical_registry

        def load() -> Optional[str]:
            with SessionLocal() as db:
                business = db.get(Business, business_id)
                return business.vertical if business else None

        vertical = await asyncio.to_thread(load) or "clinic"
        rt = await AgentRuntime.create(
            business_id, call_id, sender, vertical_registry.get_vertical(vertical), None, force_agent=True, channel="chat"
        )
        if rt is None:
            return None
        prior = await asyncio.to_thread(load_call_turns, call_id)
        if prior:
            rt.engine.restore(prior)
        else:
            await asyncio.to_thread(record_call_start, call_id, business_id, sender, sender_name, None)
        self._seq[call_id] = len(prior)
        self._runtimes[call_id] = rt
        return rt

    async def handle(self, msg: Inbound) -> Optional[str]:
        """Answer one inbound message. Returns the reply text (None when ignored)."""
        if self._is_duplicate(msg.message_id):
            return None

        def lookup() -> Optional[Dict[str, Any]]:
            with SessionLocal() as db:
                row = find_whatsapp_integration(db, msg.phone_number_id)
                return {"business_id": row.business_id, "config": dict(row.config or {})} if row else None

        tenant = await asyncio.to_thread(lookup)
        if not tenant:
            logger.warning("[WHATSAPP] No connected business for phone_number_id %s", msg.phone_number_id)
            return None
        business_id, config = tenant["business_id"], tenant["config"]

        if not msg.text:
            await self.send(config, msg.sender, NOT_TEXT_REPLY)
            return NOT_TEXT_REPLY

        call_id = conversation_id(business_id, msg.sender)
        lock = self._locks.setdefault(call_id, asyncio.Lock())
        async with lock:  # one message at a time per patient, in order
            try:
                rt = await self._runtime(call_id, business_id, msg.sender, msg.sender_name)
                if rt is None:
                    raise RuntimeError("agent engine unavailable")
                turn = await rt.engine.turn(msg.text)
                reply = (turn.reply or "").strip() or TROUBLE_REPLY
                if turn.degraded and not turn.reply:
                    reply = TROUBLE_REPLY
                self._seq[call_id] = self._seq.get(call_id, 0) + 1
                await asyncio.to_thread(record_call_turn, call_id, msg.text, reply, self._seq[call_id])
            except Exception as e:
                logger.warning("[WHATSAPP] turn failed for %s: %s", call_id, e)
                reply = TROUBLE_REPLY
        await self.send(config, msg.sender, reply)
        return reply


whatsapp_agent = WhatsAppAgent()
