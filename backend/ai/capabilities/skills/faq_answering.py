"""
FAQ Answering Skill.
Enables the AI Receptionist to answer clinic services, doctor specialties,
and general policies dynamically from the database and knowledge base.
"""

from typing import Any, Dict, List, Optional


class FAQAnsweringSkill:
    """Answers customer inquiries mid-flow without disrupting booking state."""

    @staticmethod
    def answer_services_inquiry(services: List[Dict[str, Any]]) -> str:
        """Formulates a spoken response summarizing available services."""
        if not services:
            return "We provide general consultations and medical checkups. Which treatment are you interested in?"

        service_names = [s.get("title") or s.get("name", "") for s in services if s.get("title") or s.get("name")]
        if len(service_names) == 1:
            return f"We offer {service_names[0]}. Would you like to schedule an appointment for that?"
        elif len(service_names) <= 3:
            joined = " and ".join(service_names)
            return f"We offer {joined}. Which one would you like to book today?"
        else:
            top3 = ", ".join(service_names[:3])
            return f"We offer several treatments including {top3}, and more. Which service are you visiting for?"
