"""Platform admin: what the paid tools cost and what is left after revenue. Guarded by `require_platform_admin`; prices need a super admin.

    GET /api/admin/spend?days=30    spend per tool, per clinic and per day, revenue, profit and margin
    GET /api/admin/spend/rates      the rate card (default price, owner's price, whether edited)
    PUT /api/admin/spend/rates      {"prices": {"tts": 0.03, ...}}: save prices (super admin)
"""

from typing import Dict

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.server.auth.security import require_platform_admin, require_super_admin
from backend.server.database.models.user import User
from backend.server.database.session import get_db
from backend.server.services import spend
from backend.server.services.audit import audit, client_ip

router = APIRouter(prefix="/api/admin/spend", tags=["admin-spend"])


class RatesBody(BaseModel):
    prices: Dict[str, float]


@router.get("")
def spend_report(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)):
    return spend.report(db, days)


@router.get("/rates")
def get_rates(db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)):
    return {"currency": spend.CURRENCY, "items": spend.rate_card(db)}


@router.put("/rates")
def put_rates(body: RatesBody, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_super_admin)):
    try:
        spend.set_rates(db, body.prices, admin.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    audit(db, "admin.cost_rates_saved", admin, target_type="cost_rates", ip=client_ip(request), meta={"keys": sorted(body.prices)})
    return {"currency": spend.CURRENCY, "items": spend.rate_card(db)}
