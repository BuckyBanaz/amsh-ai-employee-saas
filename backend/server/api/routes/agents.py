"""Onboarding "AI Receptionist" step: frontend/user/app/onboarding/ai-receptionist/page.tsx.
`personality`, `capabilities`, `transfer_phone`, and `escalation` all live inside
Agent.config rather than as their own columns."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from backend.server.api.routes._shared import get_business_or_404, require_membership, require_owner_or_admin
from backend.server.auth.security import get_current_user
from backend.server.database.models.agent import Agent
from backend.server.database.models.user import User
from backend.server.database.session import get_db

router = APIRouter(prefix="/api/onboarding/businesses/{business_id}/agents", tags=["agents"])

# Config sections several dashboard tabs write to (e.g. `toggles` holds Behavior's small_talk/confirm, Appointments'
# allow_cancel/allow_reschedule and Call Handling's record/transcribe). They must merge, not replace, or saving one
# tab silently erases the others' settings.
_SHARED_CONFIG_SECTIONS = ("toggles", "limits", "voice_settings", "tts_provider", "capabilities", "alerts", "reminders")


def merge_agent_config(current: dict | None, update: dict) -> dict:
    merged = dict(current or {})
    for key, value in update.items():
        if key in _SHARED_CONFIG_SECTIONS and isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = {**merged[key], **value}
        else:
            merged[key] = value
    return merged


class AgentCreate(BaseModel):
    name: str
    greeting_message: str = ""
    languages: list[str] = []
    voice_provider: str = "elevenlabs"
    voice_model: str = "default"
    primary_language: str = "en"
    config: dict = {}  # {personality, capabilities: {id: bool}, transfer_phone, escalation}


class AgentUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    greeting_message: str | None = None
    languages: list[str] | None = None
    voice_provider: str | None = None
    voice_model: str | None = None
    primary_language: str | None = None
    config: dict | None = None


class AgentOut(BaseModel):
    id: str
    business_id: str
    name: str
    status: str
    voice_provider: str
    voice_model: str
    languages: list
    primary_language: str
    greeting_message: str
    config: dict
    created_at: datetime

    model_config = {"from_attributes": True}


@router.post("", response_model=AgentOut, status_code=status.HTTP_201_CREATED)
def create_agent(
    business_id: str,
    payload: AgentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    agent = Agent(business_id=business_id, **payload.model_dump())
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent


@router.get("", response_model=list[AgentOut])
def list_agents(business_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    return db.query(Agent).filter(Agent.business_id == business_id).order_by(Agent.created_at.asc()).all()


def _get_agent_or_404(business_id: str, agent_id: str, db: Session) -> Agent:
    agent = db.get(Agent, agent_id)
    if not agent or agent.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    return agent


@router.patch("/{agent_id}", response_model=AgentOut)
def update_agent(
    business_id: str,
    agent_id: str,
    payload: AgentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    agent = _get_agent_or_404(business_id, agent_id, db)
    update_data = payload.model_dump(exclude_unset=True)
    if "config" in update_data and update_data["config"] is not None:
        agent.config = merge_agent_config(agent.config, update_data["config"])
        flag_modified(agent, "config")
        del update_data["config"]

    for field, value in update_data.items():
        setattr(agent, field, value)
    db.commit()
    db.refresh(agent)
    return agent


dashboard_router = APIRouter(prefix="/api/businesses/{business_id}/agent", tags=["agents"])


@dashboard_router.get("", response_model=AgentOut)
def get_dashboard_agent(
    business_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    from backend.ai.verticals.compliance import get_regional_compliance
    compliance = get_regional_compliance(
        vertical=biz.vertical or "clinic",
        country=biz.country or "",
        timezone=biz.timezone or "UTC",
        currency=biz.currency or "USD",
    )
    agent = db.query(Agent).filter(Agent.business_id == business_id).order_by(Agent.created_at.asc()).first()
    if not agent:
        greeting = compliance["default_greeting"].replace("{business_name}", biz.name)
        agent = Agent(
            business_id=business_id,
            name="Aura AI Receptionist",
            greeting_message=greeting,
            voice_provider="cartesia",
            voice_model="default",
            primary_language="hi" if compliance["region"] == "India" else "en",
            languages=["en", "hi"] if compliance["region"] == "India" else ["en", "es"],
            config={
                "personality": "empathetic & calm",
                "temperature": 20,
                "system_prompt": compliance["default_system_prompt"],
                "compliance": compliance,
                "capabilities": {
                    "faq": True,
                    "book": True,
                    "reschedule": True,
                    "cancel": True,
                    "details": True,
                    "services": True,
                    "hours": True,
                    "transfer": True,
                    "messages": True,
                },
                "toggles": {
                    "small_talk": True,
                    "confirm": True,
                    "record": True,
                    "transcribe": True,
                },
                "limits": {
                    "max_duration_minutes": 15,
                    "silence_timeout_seconds": 10,
                    "buffer_minutes": 15,
                    "notice_hours": 24,
                },
                "transfer_phone": biz.business_phone or "+919811223344",
                "escalation_triggers": [
                    {"id": "human_request", "label": "Caller explicitly asks for a human agent", "active": True},
                    {"id": "emergency", "label": "Urgent medical symptoms or emergency indicators", "active": True},
                    {"id": "complex", "label": "Complex medical inquiries outside knowledge base", "active": True},
                    {"id": "frustration", "label": "Caller exhibits repeated frustration or anger", "active": True},
                ],
            },
        )
        db.add(agent)
        db.commit()
        db.refresh(agent)
    else:
        # Ensure agent has dynamic compliance information attached to config
        if not agent.config or not agent.config.get("compliance"):
            cfg = dict(agent.config or {})
            cfg["compliance"] = compliance
            agent.config = cfg
            flag_modified(agent, "config")
            db.commit()
            db.refresh(agent)
    return agent


@dashboard_router.patch("", response_model=AgentOut)
def update_dashboard_agent(
    business_id: str,
    payload: AgentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    agent = db.query(Agent).filter(Agent.business_id == business_id).order_by(Agent.created_at.asc()).first()
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "config" in update_data and update_data["config"] is not None:
        agent.config = merge_agent_config(agent.config, update_data["config"])
        flag_modified(agent, "config")
        del update_data["config"]

    for field, value in update_data.items():
        setattr(agent, field, value)

    db.commit()
    db.refresh(agent)
    return agent

