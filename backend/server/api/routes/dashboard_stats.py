"""
Dashboard Stats API Route.
Returns top KPI metric cards and overview analytics for the tenant dashboard.
"""

from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.server.api.routes._shared import get_business_or_404, require_membership
from backend.server.auth.security import get_current_user
from backend.server.services.dashboard_metrics import compute as compute_metrics
from backend.server.database.models.user import User
from backend.server.database.session import get_db

router = APIRouter(prefix="/api/businesses/{business_id}/dashboard", tags=["dashboard"])


@router.get("", response_model=Dict[str, Any])
@router.get("/stats", response_model=Dict[str, Any])
def get_dashboard_stats(
    business_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Get aggregated metrics and recent activity for the tenant dashboard."""
    require_membership(business_id, current_user)
    business = get_business_or_404(business_id, db)
    return compute_metrics(db, business)
