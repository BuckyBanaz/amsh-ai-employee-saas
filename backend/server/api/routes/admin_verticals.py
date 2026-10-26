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
    defs = _definitions(db)
    items = [{"name": v["name"], "description": v["description"], "languages": v["languages"], "tools": sorted(v["tools"]), "intents": sorted(v["intents"]),
              "terminology": v["terminology"], "businesses": usage.get(v["name"], 0),
              "status": (defs.get(v["name"]) or {}).get("status", "live"), "definition": defs.get(v["name"])} for v in by_name.values()]
    unknown = {k: n for k, n in usage.items() if k and k not in by_name}  # businesses that point at a vertical with no configuration
    return {"items": sorted(items, key=lambda x: x["name"]), "unconfigured": [{"name": k, "businesses": n} for k, n in unknown.items()], "editable": False,
            "source": "backend/ai/verticals/configs"}


def _definitions(db: Session) -> Dict[str, Any]:
    """The workflow definitions (backend/ai/workflows/definitions): subtypes, workflows with version and implementation status,
    department templates, plus how many businesses use each subtype and how many activated. Validation runs at load: a broken
    definition stops the API from starting, so a loaded registry is a valid one (reported as validation: "ok")."""
    from backend.ai.workflows.registry import workflow_registry
    from sqlalchemy import func as sa_func

    registry = workflow_registry()
    subtype_use = {(v or "", s or ""): n for v, s, n in db.execute(
        select(Business.vertical, Business.business_subtype, sa_func.count()).group_by(Business.vertical, Business.business_subtype)).all()}
    activated: Dict[str, int] = {}
    for vertical, settings in db.execute(select(Business.vertical, Business.vertical_settings)).all():
        if (settings or {}).get("status") == "active":
            activated[vertical] = activated.get(vertical, 0) + 1
    out: Dict[str, Any] = {}
    for key, v in registry.verticals.items():
        out[key] = {
            "name": v.name, "version": v.version, "status": v.status, "workflow_runtime": v.workflow_runtime, "validation": "ok",
            "safety": v.safety.model_dump(), "activated_businesses": activated.get(key, 0),
            "subtypes": [{"key": s.key, "name": s.name, "workflows": list(s.workflows), "departments": list(s.departments),
                          "differences": list(s.differences), "businesses": subtype_use.get((key, s.key), 0)} for s in v.subtypes],
            "workflows": [{"id": w.id, "title": w.title, "version": w.version, "status": w.status, "tools": list(w.tools),
                           "entry_intents": list(w.entry_intents), "booking_type": w.booking_type, "slot_order": w.slot_order,
                           "transfer_departments": list(w.transfer.departments)}
                          for w in registry.workflows.values() if w.id.startswith(key + ".")],
            "departments": [d.model_dump() for d in v.departments],
        }
    return out


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
