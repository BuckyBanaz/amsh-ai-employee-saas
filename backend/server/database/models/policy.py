import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from backend.server.database.session import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _id() -> str:
    return str(uuid.uuid4())


class Policy(Base):
    """A policy document the platform publishes (Terms, Privacy Policy, a data processing addendum...). It applies to businesses by
    region (`*`, a country code like IN, or a privacy framework like GDPR) and vertical (`*` or clinic...). Its text lives in versions."""

    __tablename__ = "policies"
    __table_args__ = (UniqueConstraint("key", "scope_region", "scope_vertical", name="uq_policy_key_scope"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    key: Mapped[str] = mapped_column(String(40), index=True)  # terms | privacy | dpa | any slug
    title: Mapped[str] = mapped_column(String(160))
    scope_region: Mapped[str] = mapped_column(String(20), default="*")
    scope_vertical: Mapped[str] = mapped_column(String(30), default="*")
    requires_acceptance: Mapped[bool] = mapped_column(Boolean, default=True)  # the business owner must accept it before launching
    status: Mapped[str] = mapped_column(String(10), default="active")  # active | archived
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class PolicyVersion(Base):
    """One edition of a policy. At most one draft and one published version per policy; publishing supersedes the previous one."""

    __tablename__ = "policy_versions"
    __table_args__ = (UniqueConstraint("policy_id", "version", name="uq_policy_version"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    policy_id: Mapped[str] = mapped_column(ForeignKey("policies.id"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    body: Mapped[str] = mapped_column(Text, default="")  # markdown
    summary: Mapped[str] = mapped_column(String(500), default="")  # what changed, for the history and the re-accept notice
    status: Mapped[str] = mapped_column(String(12), default="draft")  # draft | published | superseded
    requires_reacceptance: Mapped[bool] = mapped_column(Boolean, default=True)  # when published, those who accepted before must accept again
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    published_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class PolicyAcceptance(Base):
    """Proof that a person accepted a specific version: who, for which business, when, from where."""

    __tablename__ = "policy_acceptances"
    __table_args__ = (UniqueConstraint("user_id", "version_id", name="uq_policy_acceptance"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    policy_id: Mapped[str] = mapped_column(ForeignKey("policies.id"), index=True)
    version_id: Mapped[str] = mapped_column(ForeignKey("policy_versions.id"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    business_id: Mapped[str | None] = mapped_column(ForeignKey("businesses.id"), nullable=True, index=True)  # empty when accepted at sign-up, before a business exists
    accepted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(300), nullable=True)


class PolicyRule(Base):
    """How the AI behaves for a region and vertical, edited by the platform: the privacy clause in its instructions and the recording
    notice it speaks. Missing keys fall back to the built-in text (verticals/compliance.py, services/policies.py)."""

    __tablename__ = "policy_rules"
    __table_args__ = (UniqueConstraint("scope_region", "scope_vertical", name="uq_policy_rule_scope"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    scope_region: Mapped[str] = mapped_column(String(20), default="*")
    scope_vertical: Mapped[str] = mapped_column(String(30), default="*")
    data: Mapped[dict] = mapped_column(JSON, default=dict)  # compliance_clause, recording_notice {en, hi}, recording_notice_enabled
    updated_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
