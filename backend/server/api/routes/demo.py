"""Public demo chat for the landing page: the real agent and model on a made-up clinic, in test mode (server/services/demo_chat.py).

No login (it is the marketing page), so it is rate limited per IP and capped per conversation and per day. When the model cannot
answer, the answer is 503 and the page falls back to its own preview text."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field

from backend.server.common import ratelimit
from backend.server.services.audit import client_ip
from backend.server.services.demo_chat import MAX_MESSAGE_CHARS, DemoUnavailable, demo_chat

router = APIRouter(prefix="/api/public/demo-chat", tags=["public-demo"])

PER_MINUTE = 8
PER_DAY = 60


class DemoChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)
    conversation_id: Optional[str] = Field(default=None, max_length=64)


class DemoChatResponse(BaseModel):
    reply: str
    actions: List[Dict[str, Any]]
    latency_ms: int
    provider: Optional[str]
    turns_left: int
    conversation_id: str


@router.post("", response_model=DemoChatResponse)
async def demo_turn(payload: DemoChatRequest, request: Request) -> DemoChatResponse:
    ip = client_ip(request) or "unknown"
    ratelimit.check("demo-chat-minute", ip, PER_MINUTE, 60)
    ratelimit.check("demo-chat-day", ip, PER_DAY, 24 * 3600)
    conversation = payload.conversation_id or ip
    try:
        out = await demo_chat.turn(conversation, payload.message.strip())
    except DemoUnavailable as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"The live demo is resting right now ({e}).")
    return DemoChatResponse(**out.__dict__, conversation_id=conversation)
