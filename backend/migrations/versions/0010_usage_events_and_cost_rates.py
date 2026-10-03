"""usage_events (LLM token metering) and cost_rates (owner-edited prices) for the admin spend and profit report

Revision ID: 0010
Revises: 0009
Create Date: 2026-10-03
"""
from alembic import op
import sqlalchemy as sa

revision = '0010'
down_revision = '0009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    existing = set(sa.inspect(op.get_bind()).get_table_names())
    if "usage_events" not in existing:
        op.create_table(
            "usage_events",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("business_id", sa.String(36), sa.ForeignKey("businesses.id"), nullable=True),
            sa.Column("tool", sa.String(20), nullable=False),
            sa.Column("provider", sa.String(80), nullable=False),
            sa.Column("input_units", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("output_units", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("estimated", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("source", sa.String(10), nullable=False, server_default="live"),
            sa.Column("call_id", sa.String(64), nullable=True),
            sa.Column("meta", sa.JSON(), nullable=False, server_default="{}"),
        )
        op.create_index("ix_usage_events_created_at", "usage_events", ["created_at"])
        op.create_index("ix_usage_events_business_id", "usage_events", ["business_id"])
        op.create_index("ix_usage_events_tool", "usage_events", ["tool"])
    if "cost_rates" not in existing:
        op.create_table(
            "cost_rates",
            sa.Column("key", sa.String(60), primary_key=True),
            sa.Column("price", sa.Float(), nullable=False),
            sa.Column("updated_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )


def downgrade() -> None:
    op.drop_table("cost_rates")
    op.drop_table("usage_events")
