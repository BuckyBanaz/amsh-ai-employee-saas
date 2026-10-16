"""
Appointment Booking Skill.
Manages multi-turn slot collection, validation, and confirmation
for scheduling appointments with medical/clinic staff.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AppointmentBookingSlotState(BaseModel):
    """Holds accumulated booking slot values for an active call."""
    caller_name: Optional[str] = None
    phone_number: Optional[str] = None
    service_name: Optional[str] = None
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None
    doctor_name: Optional[str] = None
    confirmed: bool = False

    def is_complete(self) -> bool:
        """Required slots check."""
        return bool(
            self.caller_name
            and self.phone_number
            and self.service_name
            and self.preferred_date
            and self.preferred_time
        )

    def next_missing_slot(self) -> Optional[str]:
        """Returns name of next missing slot."""
        if not self.caller_name:
            return "caller_name"
        if not self.phone_number:
            return "phone_number"
        if not self.service_name:
            return "service_name"
        if not self.preferred_date:
            return "preferred_date"
        if not self.preferred_time:
            return "preferred_time"
        return None

    def get_prompt_for_slot(self, slot_name: str) -> str:
        """Standard question for a slot."""
        prompts = {
            "caller_name": "May I please have your full name?",
            "phone_number": "What is the best phone number to confirm your booking?",
            "service_name": "What service or checkup are you visiting us for today?",
            "preferred_date": "What date works best for your visit?",
            "preferred_time": "What time would you prefer?",
        }
        return prompts.get(slot_name, "Could you provide that information?")
