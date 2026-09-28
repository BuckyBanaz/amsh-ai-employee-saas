"""audit log and email verification

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-28

Idempotent on purpose: databases created before Alembic may already have `audit_logs` (an earlier startup ran create_all
after the model was added) but never had the new `users` column, so each step checks what exists first.
"""
from alembic import op
import sqlalchemy as sa

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if 'audit_logs' not in inspector.get_table_names():
        op.create_table(
            'audit_logs',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('actor_user_id', sa.String(length=36), nullable=True),
            sa.Column('actor_email', sa.String(length=255), nullable=True),
            sa.Column('business_id', sa.String(length=36), nullable=True),
            sa.Column('action', sa.String(length=80), nullable=False),
            sa.Column('target_type', sa.String(length=50), nullable=True),
            sa.Column('target_id', sa.String(length=64), nullable=True),
            sa.Column('outcome', sa.String(length=20), nullable=False),
            sa.Column('ip', sa.String(length=64), nullable=True),
            sa.Column('meta', sa.JSON(), nullable=False),
            sa.ForeignKeyConstraint(['actor_user_id'], ['users.id'], ),
            sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ),
            sa.PrimaryKeyConstraint('id'),
        )
        with op.batch_alter_table('audit_logs', schema=None) as batch_op:
            batch_op.create_index(batch_op.f('ix_audit_logs_action'), ['action'], unique=False)
            batch_op.create_index(batch_op.f('ix_audit_logs_actor_user_id'), ['actor_user_id'], unique=False)
            batch_op.create_index(batch_op.f('ix_audit_logs_business_id'), ['business_id'], unique=False)
            batch_op.create_index(batch_op.f('ix_audit_logs_created_at'), ['created_at'], unique=False)

    if 'email_verified_at' not in {c['name'] for c in inspector.get_columns('users')}:
        with op.batch_alter_table('users', schema=None) as batch_op:
            batch_op.add_column(sa.Column('email_verified_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('email_verified_at')
    with op.batch_alter_table('audit_logs', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_audit_logs_created_at'))
        batch_op.drop_index(batch_op.f('ix_audit_logs_business_id'))
        batch_op.drop_index(batch_op.f('ix_audit_logs_actor_user_id'))
        batch_op.drop_index(batch_op.f('ix_audit_logs_action'))
    op.drop_table('audit_logs')
