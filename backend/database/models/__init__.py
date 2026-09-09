"""SQLAlchemy models. Import them all here so Alembic/`Base.metadata` sees
every table when creating tables or generating migrations.
"""
from backend.database.models.business import Business  # noqa: F401
from backend.database.models.user import User  # noqa: F401
from backend.database.models.agent import Agent  # noqa: F401
from backend.database.models.phone_number import PhoneNumber  # noqa: F401
from backend.database.models.call import Call  # noqa: F401
from backend.database.models.message import Message  # noqa: F401
from backend.database.models.transaction import Transaction  # noqa: F401
from backend.database.models.knowledge_base import KnowledgeDocument  # noqa: F401
from backend.database.models.integration import Integration  # noqa: F401
from backend.database.models.usage import Usage  # noqa: F401
