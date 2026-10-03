"""message_templates: editable message wording, delivery log and per-clinic channel preferences (DOCS/24)

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-03

Idempotent per table: skipped when the table already exists (databases that ran `create_all`).
"""
from alembic import op
import sqlalchemy as sa

revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    existing = set(sa.inspect(op.get_bind()).get_table_names())
    if "message_templates" not in existing:
        op.create_table(
            "message_templates",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("scope", sa.String(length=10), nullable=False),
            sa.Column("business_id", sa.String(length=36), sa.ForeignKey("businesses.id"), nullable=True),
            sa.Column("event_key", sa.String(length=60), nullable=False),
            sa.Column("channel", sa.String(length=10), nullable=False),
            sa.Column("language", sa.String(length=8), nullable=False, server_default="en"),
            sa.Column("subject", sa.String(length=200), nullable=True),
            sa.Column("body", sa.Text(), nullable=False, server_default=""),
            sa.Column("status", sa.String(length=10), nullable=False, server_default="draft"),
            sa.Column("whatsapp_name", sa.String(length=100), nullable=True),
            sa.Column("meta_status", sa.String(length=10), nullable=True),
            sa.Column("sms_template_id", sa.String(length=64), nullable=True),
            sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("history", sa.JSON(), nullable=False, server_default="[]"),
            sa.Column("updated_by", sa.String(length=36), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_message_templates_business_id", "message_templates", ["business_id"])
        op.create_index("ix_message_templates_lookup", "message_templates", ["scope", "business_id", "event_key", "channel", "language"])
    if "message_log" not in existing:
        op.create_table(
            "message_log",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("business_id", sa.String(length=36), sa.ForeignKey("businesses.id"), nullable=True),
            sa.Column("event_key", sa.String(length=60), nullable=False),
            sa.Column("channel", sa.String(length=10), nullable=False),
            sa.Column("recipient", sa.String(length=255), nullable=False),
            sa.Column("template_id", sa.String(length=36), nullable=True),
            sa.Column("template_version", sa.Integer(), nullable=True),
            sa.Column("status", sa.String(length=12), nullable=False, server_default="queued"),
            sa.Column("provider", sa.String(length=30), nullable=True),
            sa.Column("provider_message_id", sa.String(length=100), nullable=True),
            sa.Column("error", sa.String(length=500), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_message_log_business_id", "message_log", ["business_id"])
        op.create_index("ix_message_log_event_key", "message_log", ["event_key"])
        op.create_index("ix_message_log_created_at", "message_log", ["created_at"])
    if "message_preferences" not in existing:
        op.create_table(
            "message_preferences",
            sa.Column("business_id", sa.String(length=36), sa.ForeignKey("businesses.id"), primary_key=True),
            sa.Column("data", sa.JSON(), nullable=False, server_default="{}"),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )


def downgrade() -> None:
    for table in ("message_preferences", "message_log", "message_templates"):
        op.drop_table(table)
