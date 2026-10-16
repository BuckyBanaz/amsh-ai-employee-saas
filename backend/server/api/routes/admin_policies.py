"""Platform admin: policy documents and AI privacy rules. Reading needs a platform admin; every change needs a super admin and is audited.

    GET    /api/admin/policies                     all policies with their published version and acceptance counts
    POST   /api/admin/policies                     new policy + first draft
    POST   /api/admin/policies/starters            add starter drafts (terms, privacy, DPA for GDPR / DPDP, BAA for HIPAA) for any that are missing
    GET    /api/admin/policies/{id}                the policy and every version
    PUT    /api/admin/policies/{id}/draft          save the draft (text, summary, whether people must accept again)
    POST   /api/admin/policies/{id}/publish        publish the draft
    POST   /api/admin/policies/{id}/archive        stop applying the policy (acceptances are kept)  |  /restore
    GET    /api/admin/policies/{id}/acceptances    who accepted, for which business, when
    GET    /api/admin/policies/rules               AI rules by region, and what the AI says today
    PUT    /api/admin/policies/rules               save the privacy instruction and recording notice for a region + vertical
"""

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.server.auth.security import require_platform_admin, require_super_admin
from backend.server.database.models.policy import Policy
from backend.server.database.models.user import User
from backend.server.database.session import get_db
from backend.server.services import policies as svc
from backend.server.services.audit import audit, client_ip

router = APIRouter(prefix="/api/admin/policies", tags=["admin-policies"])


class NewPolicy(BaseModel):
    key: str
    title: str
    scope_region: str = "*"
    scope_vertical: str = "*"
    requires_acceptance: bool = True
    body: str = ""
    summary: str = ""


class DraftBody(BaseModel):
    title: Optional[str] = None
    body: str
    summary: str = ""
    requires_reacceptance: bool = True


class RuleBody(BaseModel):
    scope_region: str = "*"
    scope_vertical: str = "*"
    data: Dict[str, Any] = {}


def _get(db: Session, policy_id: str) -> Policy:
    p = db.get(Policy, policy_id)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")
    return p


def _bad(e: ValueError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.get("")
def list_all(db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)):
    return {"items": svc.list_policies(db), "regions": svc.REGION_CHOICES}


@router.post("", status_code=status.HTTP_201_CREATED)
def create(body: NewPolicy, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_super_admin)):
    try:
        p = svc.create_policy(db, admin, body.key, body.title, body.scope_region, body.scope_vertical, body.requires_acceptance, body.body, body.summary)
    except ValueError as e:
        raise _bad(e)
    audit(db, "admin.policy_created", admin, target_type="policy", target_id=p.id, ip=client_ip(request), meta={"key": p.key, "region": p.scope_region, "vertical": p.scope_vertical})
    return svc.policy_detail(db, p)


@router.post("/starters")
def starters(request: Request, db: Session = Depends(get_db), admin: User = Depends(require_super_admin)):
    made = svc.seed_starters(db, admin)
    if made:
        audit(db, "admin.policy_starters_added", admin, target_type="policy", ip=client_ip(request), meta={"count": made})
    return {"created": made, "items": svc.list_policies(db)}


@router.get("/rules")
def rules(db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)):
    return svc.rules_overview(db)


@router.put("/rules")
def put_rule(body: RuleBody, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_super_admin)):
    try:
        row = svc.save_rule(db, admin, body.scope_region, body.scope_vertical, body.data)
    except ValueError as e:
        raise _bad(e)
    audit(db, "admin.policy_rule_saved", admin, target_type="policy_rule", target_id=row.id if row else None, ip=client_ip(request),
          meta={"region": body.scope_region, "vertical": body.scope_vertical, "cleared": row is None, "keys": sorted((row.data if row else {}).keys())})
    return svc.rules_overview(db)


@router.get("/{policy_id}")
def detail(policy_id: str, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)):
    return svc.policy_detail(db, _get(db, policy_id))


@router.put("/{policy_id}/draft")
def save_draft(policy_id: str, body: DraftBody, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_super_admin)):
    p = _get(db, policy_id)
    svc.save_draft(db, admin, p, body.body, body.summary, body.requires_reacceptance, body.title)
    audit(db, "admin.policy_draft_saved", admin, target_type="policy", target_id=p.id, ip=client_ip(request), meta={"key": p.key})
    return svc.policy_detail(db, p)


@router.post("/{policy_id}/publish")
def publish(policy_id: str, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_super_admin)):
    p = _get(db, policy_id)
    try:
        v = svc.publish(db, admin, p)
    except ValueError as e:
        raise _bad(e)
    audit(db, "admin.policy_published", admin, target_type="policy", target_id=p.id, ip=client_ip(request), meta={"key": p.key, "version": v.version, "reacceptance": v.requires_reacceptance})
    return svc.policy_detail(db, p)


@router.post("/{policy_id}/archive")
def archive(policy_id: str, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_super_admin)):
    p = _get(db, policy_id)
    p.status = "archived"
    db.commit()
    audit(db, "admin.policy_archived", admin, target_type="policy", target_id=p.id, ip=client_ip(request), meta={"key": p.key})
    return svc.policy_detail(db, p)


@router.post("/{policy_id}/restore")
def restore(policy_id: str, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_super_admin)):
    p = _get(db, policy_id)
    p.status = "active"
    db.commit()
    audit(db, "admin.policy_restored", admin, target_type="policy", target_id=p.id, ip=client_ip(request), meta={"key": p.key})
    return svc.policy_detail(db, p)


@router.get("/{policy_id}/acceptances")
def list_acceptances(policy_id: str, version_id: Optional[str] = None, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)):
    _get(db, policy_id)
    return {"items": svc.acceptances(db, policy_id, version_id)}
