"""Plan usage for the clinic's own dashboard.

    GET /api/businesses/{business_id}/usage   each plan quota with used, limit, percent and state (ok / near / over / unlimited)
"""

from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.server.api.routes._shared import get_business_or_404, require_membership
from backend.server.auth.security import get_current_user
from backend.server.database.models.user import User
from backend.server.database.session import get_db
from backend.server.services import plans as catalog
from backend.server.services import quotas

router = APIRouter(prefix="/api/businesses/{business_id}/usage", tags=["usage"])


@router.get("")
def my_usage(business_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict[str, Any]:
    require_membership(business_id, user)
    business = get_business_or_404(business_id, db)
    plan = catalog.find_by_key(db, business.plan)
    return {"plan": {"key": business.plan, "name": plan.name if plan else business.plan}, "quotas": quotas.status_for(db, business), "period": "this calendar month (UTC)"}
