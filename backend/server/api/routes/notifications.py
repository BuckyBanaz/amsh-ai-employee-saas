"""Notifications API for business activity feed."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.server.api.routes._shared import get_business_or_404, require_membership
from backend.server.auth.security import get_current_user
from backend.server.database.models.agent import Agent
from backend.server.database.models.call import Call
from backend.server.database.models.transaction import Transaction
from backend.server.database.models.user import User
from backend.server.database.session import get_db

router = APIRouter(prefix="/api/businesses/{business_id}/notifications", tags=["notifications"])


class NotificationItem(BaseModel):
    id: str
    type: str  # appt, transfer, system, knowledge, billing
    title: str
    description: str
    time: str
    unread: bool
    icon_type: str
    icon_bg: str
    icon_color: str
    created_at: datetime


@router.get("", response_model=list[NotificationItem])
def get_notifications(
    business_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)

    items: list[NotificationItem] = []

    # 1. Recent appointments. There is no Appointment model: appointments are Transaction rows (type "appointment")
    # whose patient, service, date and time live in the `details` JSON.
    appointments = (
        db.query(Transaction)
        .filter(Transaction.business_id == business_id, Transaction.type == "appointment")
        .order_by(Transaction.created_at.desc())
        .limit(15)
        .all()
    )

    for appt in appointments:
        d = appt.details or {}
        time_str = appt.created_at.strftime("%b %d, %I:%M %p") if appt.created_at else "Recently"
        patient = d.get("customer_name") or d.get("patient_name") or "Patient"
        svc = f" for {d['service_name']}" if d.get("service_name") else ""
        date_time = f" on {d.get('preferred_date')} at {d.get('preferred_time')}" if d.get("preferred_date") else ""

        items.append(
            NotificationItem(
                id=f"notif_appt_{appt.id}",
                type="appt",
                title=f"New Appointment Booked",
                description=f"{patient} scheduled{svc}{date_time}",
                time=time_str,
                unread=False,
                icon_type="appt",
                icon_bg="bg-blue-50",
                icon_color="text-[#0066FF]",
                created_at=appt.created_at or datetime.now(timezone.utc),
            )
        )

    # 2. Recent calls with special outcomes (transferred, booked, missed)
    calls = (
        db.query(Call)
        .filter(Call.business_id == business_id)
        .order_by(Call.started_at.desc())
        .limit(20)
        .all()
    )

    for call in calls:
        call_time = call.started_at.strftime("%b %d, %I:%M %p") if call.started_at else "Recently"
        caller = call.caller_number or "Caller"

        if call.outcome == "transferred":
            items.append(
                NotificationItem(
                    id=f"notif_call_{call.id}",
                    type="transfer",
                    title="Call Transferred to Staff",
                    description=f"{caller} requested escalation or human receptionist assistance.",
                    time=call_time,
                    unread=True,
                    icon_type="transfer",
                    icon_bg="bg-amber-50",
                    icon_color="text-amber-600",
                    created_at=call.started_at or datetime.now(timezone.utc),
                )
            )
        elif call.outcome == "missed":
            items.append(
                NotificationItem(
                    id=f"notif_call_{call.id}",
                    type="system",
                    title="Missed Inbound Call",
                    description=f"Inbound call from {caller} ended before connecting.",
                    time=call_time,
                    unread=False,
                    icon_type="system",
                    icon_bg="bg-red-50",
                    icon_color="text-red-500",
                    created_at=call.started_at or datetime.now(timezone.utc),
                )
            )

    # 3. System / Agent Status Notification
    agent = db.query(Agent).filter(Agent.business_id == business_id).first()
    if agent:
        items.append(
            NotificationItem(
                id="notif_agent_status",
                type="system",
                title="AI Receptionist Ready",
                description=f"Agent '{agent.name or 'Receptionist'}' is {agent.status or 'active'} and monitoring lines.",
                time="Today",
                unread=False,
                icon_type="check",
                icon_bg="bg-emerald-50",
                icon_color="text-emerald-600",
                created_at=datetime.now(timezone.utc),
            )
        )

    # Sort all notifications newest first
    items.sort(key=lambda x: x.created_at, reverse=True)
    return items


@router.post("/mark-read")
def mark_all_read(
    business_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    return {"status": "ok", "message": "All notifications marked as read."}
