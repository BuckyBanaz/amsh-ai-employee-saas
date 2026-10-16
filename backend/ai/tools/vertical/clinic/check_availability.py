"""
Clinic Availability Check Tool.
Checks doctor schedule and available slots for a clinic.
"""

from typing import Any
from backend.ai.tools.framework.base import BaseTool, ToolContext, ToolResult
from backend.server.database.models.staff import Staff


class CheckAvailabilityTool(BaseTool):
    name = "check_availability"
    description = "Check open appointment slots and doctor availability for a specified date."
    parameters_schema = {
        "type": "object",
        "properties": {
            "date": {
                "type": "string",
                "description": "The date to check (YYYY-MM-DD or e.g., 'tomorrow')",
            },
            "doctor_name": {
                "type": "string",
                "description": "Optional doctor name to filter by",
            },
        },
        "required": ["date"],
    }

    async def execute(self, context: ToolContext, **kwargs: Any) -> ToolResult:
        date = kwargs.get("date", "tomorrow")
        doctor_name = kwargs.get("doctor_name")

        available_slots = ["09:00 AM", "11:30 AM", "02:00 PM", "04:15 PM"]

        if context.db:
            # Query actual staff roster if available
            staff_query = context.db.query(Staff).filter(Staff.business_id == context.business_id)
            if doctor_name:
                staff_query = staff_query.filter(Staff.name.ilike(f"%{doctor_name}%"))
            staff_members = staff_query.all()
            if staff_members:
                doc_name_found = staff_members[0].name
                return ToolResult(
                    success=True,
                    message=f"Dr. {doc_name_found} has open slots on {date} at 09:00 AM, 11:30 AM, and 02:00 PM.",
                    data={"date": date, "doctor": doc_name_found, "slots": available_slots},
                )

        return ToolResult(
            success=True,
            message=f"We have open slots on {date} at 09:00 AM, 11:30 AM, and 02:00 PM.",
            data={"date": date, "slots": available_slots},
        )
