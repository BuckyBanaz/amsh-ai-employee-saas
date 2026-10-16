"""admin_alert_state: each platform admin's unread marker and muted alert categories

Revision ID: 0009
Revises: 0008
Create Date: 2026-10-03
"""
from alembic import op
import sqlalchemy as sa

revision = '0009'
down_revision = '0008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    if "admin_alert_state" not in set(sa.inspect(op.get_bind()).get_table_names()):
        op.create_table(
            "admin_alert_state",
            sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), primary_key=True),
            sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("muted", sa.JSON(), nullable=False, server_default="[]"),
        )


def downgrade() -> None:
    op.drop_table("admin_alert_state")
