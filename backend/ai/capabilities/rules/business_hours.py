"""
Business Hours Rule.
Determines if an incoming call arrives during active clinic/business operating hours.
"""

from datetime import datetime, time
import logging
from typing import Any, Dict, Optional, Tuple
import pytz

logger = logging.getLogger(__name__)


class BusinessHoursRule:
    """Evaluates operating schedule against caller's local timestamp."""

    @staticmethod
    def is_open(
        working_hours: Optional[Dict[str, Any]],
        timezone_str: str = "Asia/Kolkata"
    ) -> Tuple[bool, str]:
        """
        Returns (is_open_now, schedule_summary_message).
        """
        if not working_hours:
            # Default open 24/7 if not specified
            return True, "Open now"

        try:
            tz = pytz.timezone(timezone_str)
            now = datetime.now(tz)
        except Exception:
            now = datetime.now()

        day_name = now.strftime("%A").lower()  # monday, tuesday...
        day_config = working_hours.get(day_name) or working_hours.get(day_name[:3])

        if not day_config or day_config.get("closed", False):
            return False, f"We are currently closed on {day_name.capitalize()}s."

        open_str = day_config.get("open", "09:00")
        close_str = day_config.get("close", "18:00")

        try:
            open_time = datetime.strptime(open_str, "%H:%M").time()
            close_time = datetime.strptime(close_str, "%H:%M").time()
            current_time = now.time()

            if open_time <= current_time <= close_time:
                return True, f"Open today until {close_str}"
            else:
                return False, f"Our operating hours today are from {open_str} to {close_str}."
        except Exception as e:
            logger.warning("Failed to parse business hours: %s", e)
            return True, "Open now"
