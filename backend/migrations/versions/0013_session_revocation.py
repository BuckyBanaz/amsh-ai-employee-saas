"""users.sessions_revoked_at: "sign out everywhere", and password changes and resets end other sessions

Revision ID: 0013
Revises: 0012
Create Date: 2026-10-05
"""
from alembic import op
import sqlalchemy as sa

revision = '0013'
down_revision = '0012'
branch_labels = None
depends_on = None


def upgrade() -> None:
    columns = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("users")}
    if "sessions_revoked_at" not in columns:
        op.add_column("users", sa.Column("sessions_revoked_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.drop_column("sessions_revoked_at")
