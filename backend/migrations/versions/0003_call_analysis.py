"""call analysis: sentiment, action items, analysed_at

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-28

Idempotent (checks what exists first), like 0002.
"""
from alembic import op
import sqlalchemy as sa

revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    existing = {c['name'] for c in sa.inspect(op.get_bind()).get_columns('calls')}
    with op.batch_alter_table('calls', schema=None) as batch_op:
        if 'sentiment' not in existing:
            batch_op.add_column(sa.Column('sentiment', sa.String(length=20), nullable=True))
        if 'action_items' not in existing:
            batch_op.add_column(sa.Column('action_items', sa.JSON(), nullable=True))
        if 'analyzed_at' not in existing:
            batch_op.add_column(sa.Column('analyzed_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('calls', schema=None) as batch_op:
        batch_op.drop_column('analyzed_at')
        batch_op.drop_column('action_items')
        batch_op.drop_column('sentiment')
