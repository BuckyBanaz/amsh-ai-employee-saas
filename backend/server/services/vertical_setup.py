"""Activation readiness (DOCS/31 §7 "Review, validate and activate"): what must be configured before a business's AI goes live
for its vertical and subtype. Errors block activation; warnings are shown on the review screen.

Checks read real tenant data only (services, courses, departments, resources, agent, hours); nothing here is inferred.
"""

from typing import Any, Dict, List

from sqlalchemy.orm import Session

from backend.ai.verticals.errors import UnknownVerticalError
from backend.ai.workflows.registry import workflow_registry
from backend.server.database.models.agent import Agent
from backend.server.database.models.business import Business
from backend.server.database.models.service import Service
from backend.server.database.models.vertical import Department, Resource


def _p(level: str, code: str, message: str) -> Dict[str, str]:
    return {"level": level, "code": code, "message": message}


def readiness(db: Session, business: Business) -> List[Dict[str, str]]:
    problems: List[Dict[str, str]] = []
    registry = workflow_registry()
    try:
        vertical = registry.vertical(business.vertical)
    except UnknownVerticalError:
        return [_p("error", "unsupported_vertical", f"The business type {business.vertical!r} is not supported. Choose a supported one.")]
    sub = vertical.subtype(business.business_subtype)
    if sub is None:
        level = "warning" if not vertical.workflow_runtime else "error"  # healthcare keeps working on its default subtype
        problems.append(_p(level, "no_subtype", f"Choose what kind of {vertical.name.lower()} business this is."))
    workflows = registry.workflows_for(vertical.key, sub.key if sub else None)
    tools = set(registry.tools_for(vertical.key, sub.key if sub else None))

    if not (business.timezone or "").strip():
        problems.append(_p("error", "no_timezone", "Set the time zone."))
    if not business.working_hours:
        problems.append(_p("warning", "no_hours", "Opening hours are not set: callers cannot be offered times and departments use no hours."))
    if not db.query(Agent.id).filter(Agent.business_id == business.id).first():
        problems.append(_p("error", "no_agent", "Set up the AI receptionist (name, voice and language)."))

    rows = db.query(Service).filter(Service.business_id == business.id).all()
    bookable = [s for s in rows if (s.kind or "service") != "course"]
    if "book_appointment" in tools and not bookable:
        what = vertical.terminology.offerings.lower() if vertical.key != "education" else "bookable visits, counselling sessions or demo classes"
        problems.append(_p("error", "no_bookable_services", f"Add at least one of your {what}."))
    if vertical.key == "education" and not any(s.kind == "course" for s in rows):
        problems.append(_p("warning", "no_courses", "No courses or programmes are listed: the AI can only answer about them from your documents."))

    departments = db.query(Department).filter(Department.business_id == business.id, Department.active.is_(True)).all()
    wants_departments = any(len(w.transfer.departments) > 1 or "route" in w.transfer.departments for w in workflows) and vertical.workflow_runtime
    if wants_departments and not departments:
        problems.append(_p("warning", "no_departments", "No departments are set up: every transfer goes to the main line."))
    for d in departments:
        if not d.transfer_phone:
            problems.append(_p("warning", "department_without_number",
                               f"{d.name} has no transfer number: callers asking for it get a callback instead."))
    keys = {d.key for d in departments}
    for d in departments:
        if d.fallback_key and d.fallback_key not in keys:
            problems.append(_p("error", "fallback_missing", f"{d.name} falls back to {d.fallback_key!r}, which is not an active department."))

    needed_kinds = {s.resource_kind for s in bookable if s.resource_kind}
    for kind in sorted(needed_kinds):
        if not db.query(Resource.id).filter(Resource.business_id == business.id, Resource.kind == kind, Resource.active.is_(True)).first():
            problems.append(_p("error", "no_resources", f"Some treatments need a {kind}, but no active {kind} is set up."))
    if not (business.business_phone or "").strip():
        problems.append(_p("warning", "no_business_phone", "No business phone is set: callers cannot be given a number to call back."))
    return problems
