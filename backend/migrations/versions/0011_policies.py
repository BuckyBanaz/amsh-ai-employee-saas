"""policies, policy_versions, policy_acceptances, policy_rules: policy and privacy management

Revision ID: 0011
Revises: 0010
Create Date: 2026-10-04
"""
from alembic import op
import sqlalchemy as sa

revision = '0011'
down_revision = '0010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    existing = set(sa.inspect(op.get_bind()).get_table_names())
    now = sa.func.now()
    if "policies" not in existing:
        op.create_table(
            "policies",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("key", sa.String(40), nullable=False),
            sa.Column("title", sa.String(160), nullable=False),
            sa.Column("scope_region", sa.String(20), nullable=False, server_default="*"),
            sa.Column("scope_vertical", sa.String(30), nullable=False, server_default="*"),
            sa.Column("requires_acceptance", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("status", sa.String(10), nullable=False, server_default="active"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=now),
            sa.UniqueConstraint("key", "scope_region", "scope_vertical", name="uq_policy_key_scope"),
        )
        op.create_index("ix_policies_key", "policies", ["key"])
    if "policy_versions" not in existing:
        op.create_table(
            "policy_versions",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("policy_id", sa.String(36), sa.ForeignKey("policies.id"), nullable=False),
            sa.Column("version", sa.Integer(), nullable=False),
            sa.Column("body", sa.Text(), nullable=False, server_default=""),
            sa.Column("summary", sa.String(500), nullable=False, server_default=""),
            sa.Column("status", sa.String(12), nullable=False, server_default="draft"),
            sa.Column("requires_reacceptance", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=now),
            sa.Column("published_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
            sa.UniqueConstraint("policy_id", "version", name="uq_policy_version"),
        )
        op.create_index("ix_policy_versions_policy_id", "policy_versions", ["policy_id"])
    if "policy_acceptances" not in existing:
        op.create_table(
            "policy_acceptances",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("policy_id", sa.String(36), sa.ForeignKey("policies.id"), nullable=False),
            sa.Column("version_id", sa.String(36), sa.ForeignKey("policy_versions.id"), nullable=False),
            sa.Column("version", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("business_id", sa.String(36), sa.ForeignKey("businesses.id"), nullable=True),
            sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=False, server_default=now),
            sa.Column("ip", sa.String(64), nullable=True),
            sa.Column("user_agent", sa.String(300), nullable=True),
            sa.UniqueConstraint("user_id", "version_id", name="uq_policy_acceptance"),
        )
        op.create_index("ix_policy_acceptances_policy_id", "policy_acceptances", ["policy_id"])
        op.create_index("ix_policy_acceptances_version_id", "policy_acceptances", ["version_id"])
        op.create_index("ix_policy_acceptances_user_id", "policy_acceptances", ["user_id"])
        op.create_index("ix_policy_acceptances_business_id", "policy_acceptances", ["business_id"])
    if "policy_rules" not in existing:
        op.create_table(
            "policy_rules",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("scope_region", sa.String(20), nullable=False, server_default="*"),
            sa.Column("scope_vertical", sa.String(30), nullable=False, server_default="*"),
            sa.Column("data", sa.JSON(), nullable=False, server_default="{}"),
            sa.Column("updated_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=now),
            sa.UniqueConstraint("scope_region", "scope_vertical", name="uq_policy_rule_scope"),
        )


def downgrade() -> None:
    for t in ("policy_rules", "policy_acceptances", "policy_versions", "policies"):
        op.drop_table(t)
