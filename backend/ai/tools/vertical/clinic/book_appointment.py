"""
Clinic Book Appointment Tool.
Saves patient appointment transaction into the database.
"""

from typing import Any
from backend.ai.tools.framework.base import BaseTool, ToolContext, ToolResult
from backend.server.database.models.transaction import Transaction


class BookAppointmentTool(BaseTool):
    name = "book_appointment"
    description = "Confirm and book an appointment for a patient in the clinic database."
    parameters_schema = {
        "type": "object",
        "properties": {
            "patient_name": {
                "type": "string",
                "description": "Full name of the patient",
            },
            "phone_number": {
                "type": "string",
                "description": "Contact phone number",
            },
            "preferred_date": {
                "type": "string",
                "description": "Date of appointment",
            },
            "preferred_time": {
                "type": "string",
                "description": "Time of appointment",
            },
            "service_name": {
                "type": "string",
                "description": "Reason for visit or service",
            },
            "doctor_name": {
                "type": "string",
                "description": "Doctor name if specified",
            },
        },
        "required": ["patient_name", "preferred_date", "preferred_time"],
    }

    async def execute(self, context: ToolContext, **kwargs: Any) -> ToolResult:
        patient_name = kwargs.get("patient_name", "Patient")
        phone_number = kwargs.get("phone_number") or context.caller_number
        preferred_date = kwargs.get("preferred_date")
        preferred_time = kwargs.get("preferred_time")
        service_name = kwargs.get("service_name", "Consultation")
        doctor_name = kwargs.get("doctor_name", "Available Doctor")

        details = {
            "patient_name": patient_name,
            "phone_number": phone_number,
            "date": preferred_date,
            "time": preferred_time,
            "service": service_name,
            "doctor": doctor_name,
        }

        if context.db:
            call_fk = None
            if context.call_id:
                from backend.server.database.models.call import Call
                if context.db.get(Call, context.call_id):
                    call_fk = context.call_id

            trx = Transaction(
                business_id=context.business_id,
                call_id=call_fk,
                type="appointment",
                details=details,
                status="confirmed",
            )
            context.db.add(trx)
            context.db.commit()
            context.db.refresh(trx)
            details["appointment_id"] = trx.id

        return ToolResult(
            success=True,
            message=(
                f"Your appointment with {doctor_name} has been booked for "
                f"{preferred_date} at {preferred_time}. We look forward to seeing you, {patient_name}!"
            ),
            data=details,
        )
