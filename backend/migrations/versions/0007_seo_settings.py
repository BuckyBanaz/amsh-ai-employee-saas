"""seo_settings: site-wide and per-page SEO configuration for the marketing site (admin portal)

Revision ID: 0007
Revises: 0006
Create Date: 2026-10-03
"""
from alembic import op
import sqlalchemy as sa

revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    if "seo_settings" in sa.inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        "seo_settings",
        sa.Column("key", sa.String(length=140), primary_key=True),
        sa.Column("data", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("updated_by", sa.String(length=36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("seo_settings")
