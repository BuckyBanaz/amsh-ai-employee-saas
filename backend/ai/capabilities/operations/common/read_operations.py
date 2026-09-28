"""
Common Read Operations.
Read-only lookups shared by every vertical. Anything that only reads lives in `operations/*/read_operations.py`;
anything that changes data or contacts the outside world lives in `write_operations.py`.
"""

from typing import Optional

from sqlalchemy.orm import Session

from backend.server.database.models.agent import Agent
from backend.server.database.models.business import Business


class CommonReadOperations:
    """Business-level reads used by the voice agent and the dashboard."""

    @staticmethod
    def get_agent(db: Session, business_id: str) -> Optional[Agent]:
        """The agent whose settings apply to the business. A business can end up with several agents (re-onboarding);
        the OLDEST one is the one the dashboard shows and edits, so every reader must use this rule to agree."""
        return db.query(Agent).filter(Agent.business_id == business_id).order_by(Agent.created_at.asc()).first()

    @staticmethod
    def get_business(db: Session, business_id: str) -> Optional[Business]:
        return db.get(Business, business_id)
