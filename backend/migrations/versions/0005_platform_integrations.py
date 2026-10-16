"""platform_integrations: platform-level provider settings for the admin portal

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-03

Creates the `platform_integrations` table behind `PlatformIntegration` (telephony, AI models, TTS, messaging, email, payments as the
superadmin configures them). The model existed without a migration, so on a database managed by Alembic the table was never created
and `/api/admin/integrations` and `/api/admin/health` failed with `relation "platform_integrations" does not exist`.
Idempotent: skipped when the table is already there (databases that ran `create_all`).
"""
from alembic import op
import sqlalchemy as sa

revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "platform_integrations" in inspector.get_table_names():
        return
    op.create_table(
        "platform_integrations",
        sa.Column("id", sa.String(length=50), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="Connected"),
        sa.Column("is_active_default", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("config", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("latency_ms", sa.Float(), nullable=True),
        sa.Column("error_rate", sa.String(length=20), nullable=False, server_default="0.0%"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("platform_integrations")
