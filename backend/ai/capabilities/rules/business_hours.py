"""
Business Hours Rule.
Says whether the business is open right now and when it opens next, from the dashboard's working hours
({"Monday": [{"start": "09:00", "end": "17:00"}], ...} or "9 AM - 5 PM" strings). The agent's prompt gets the one-line
`describe()` result, so it never offers a same-day visit to a closed clinic without saying so.
"""

from datetime import date, datetime, timedelta
from typing import Any, Dict, Optional, Tuple

from backend.ai.engine.agent.availability import day_ranges
from backend.ai.engine.agent.datetime_utils import format_time, local_now, to_minutes

_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


class BusinessHoursRule:
    """Evaluates the working-hours schedule against the business's local time."""

    @staticmethod
    def describe(working_hours: Optional[Dict[str, Any]], now: datetime) -> str:
        """One line for the model, e.g. "OPEN NOW until 06:00 PM today." / "CLOSED NOW; next opens Tuesday at 09:00 AM."
        Empty when no hours are configured (the prompt already says so)."""
        today = now.date()
        todays = day_ranges(working_hours, today)
        if not todays.configured:
            return ""
        minute = now.hour * 60 + now.minute
        for start, end in todays.ranges:
            if to_minutes(start) <= minute < to_minutes(end):
                return f"OPEN NOW until {format_time(end)} today."
        for start, _ in todays.ranges:  # later today
            if to_minutes(start) > minute:
                return f"CLOSED NOW; opens today at {format_time(start)}."
        for ahead in range(1, 8):
            d: date = today + timedelta(days=ahead)
            nxt = day_ranges(working_hours, d)
            if nxt.ranges:
                when = "tomorrow" if ahead == 1 else _DAYS[d.weekday()]
                return f"CLOSED NOW; next opens {when} at {format_time(nxt.ranges[0][0])}."
        return "CLOSED NOW; no opening hours in the coming week."

    @staticmethod
    def is_open(working_hours: Optional[Dict[str, Any]], timezone_str: str = "UTC") -> Tuple[bool, str]:
        """(is_open_now, description). Open by default when no hours are configured."""
        text = BusinessHoursRule.describe(working_hours, local_now(timezone_str))
        return (not text.startswith("CLOSED"), text or "Open now")
