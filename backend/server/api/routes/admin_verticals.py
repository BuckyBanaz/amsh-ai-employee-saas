"""Platform admin: the industry templates ("verticals") the AI is built from. Read-only: a vertical is a YAML file in
`backend/ai/verticals/configs/<name>/`, reviewed and deployed with the code, so the portal shows what is live but does not edit it.

    GET /api/admin/verticals                list with languages, intents, tools and how many businesses use each
    GET /api/admin/verticals/{name}         one vertical in one language (?language=), including prompt and greeting
"""

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.ai.verticals.errors import UnknownVerticalError
from backend.ai.verticals.loader import VerticalLoader
from backend.ai.verticals.registry import registry
from backend.server.auth.security import require_platform_admin
from backend.server.database.models.business import Business
from backend.server.database.models.user import User
from backend.server.database.session import get_db

router = APIRouter(prefix="/api/admin/verticals", tags=["admin-verticals"])


def _intent(i: Any) -> Dict[str, Any]:
    return {"name": i.name, "description": i.description, "tool": i.target_tool, "confirmation_required": i.confirmation_required,
            "slots": [{"name": s.name, "type": s.type, "required": s.required} for s in i.slots]}


@router.get("")
def list_verticals(db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    usage = {(v or "").lower(): n for v, n in db.execute(select(Business.vertical, func.count()).group_by(Business.vertical)).all()}
    by_name: Dict[str, Dict[str, Any]] = {}
    for cfg in VerticalLoader.load_all().values():
        v = by_name.setdefault(cfg.name, {"name": cfg.name, "languages": {}, "tools": set(), "intents": set()})
        v["languages"][cfg.language] = {"display_name": cfg.display_name, "version": cfg.version, "intents": len(cfg.intents)}
        v["tools"].update(cfg.default_tools)
        v["intents"].update(i.name for i in cfg.intents)
        v["description"] = v.get("description") or cfg.description
        v["terminology"] = cfg.terminology.model_dump()
    items = [{"name": v["name"], "description": v["description"], "languages": v["languages"], "tools": sorted(v["tools"]), "intents": sorted(v["intents"]),
              "terminology": v["terminology"], "businesses": usage.get(v["name"], 0), "status": "live"} for v in by_name.values()]
    unknown = {k: n for k, n in usage.items() if k and k not in by_name}  # businesses that point at a vertical with no configuration
    return {"items": sorted(items, key=lambda x: x["name"]), "unconfigured": [{"name": k, "businesses": n} for k, n in unknown.items()], "editable": False,
            "source": "backend/ai/verticals/configs"}


@router.get("/{name}")
def get_vertical(name: str, language: Optional[str] = "en", admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    try:
        cfg = registry.get_vertical(name, language or "en")
    except UnknownVerticalError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown vertical")
    return {
        "name": cfg.name, "language": cfg.language, "version": cfg.version, "display_name": cfg.display_name, "description": cfg.description,
        "terminology": cfg.terminology.model_dump(), "greeting_template": cfg.greeting_template, "system_prompt_template": cfg.system_prompt_template,
        "default_tools": cfg.default_tools, "intents": [_intent(i) for i in cfg.intents],
        "escalation_rules": [{"keywords": r.trigger_keywords, "action": r.action, "target_role": r.target_role} for r in cfg.escalation_rules],
    }
