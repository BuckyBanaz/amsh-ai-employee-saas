"""plans: admin-defined subscription plans

Revision ID: 0004
Revises: 0003
Create Date: 2026-09-28

Creates the `plans` table (idempotent) and seeds the three self-serve plans the product already showed, so businesses that are
on "starter" keep a matching plan. Seeding only happens when the table is empty.
"""
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa

revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None

_QUOTAS = lambda vm, msg, cc, tok, docs, audio, vec, ret, seats: {  # noqa: E731
    "voice_minutes": vm, "messages": msg, "concurrent_calls": cc, "ai_tokens_millions": tok, "knowledge_docs": docs,
    "audio_storage_gb": audio, "vector_storage_gb": vec, "conversation_retention_days": ret, "seats": seats,
}

SEED = [
    dict(key="starter", name="Starter", description="For a single small practice getting started.", price=99.0, price_yearly=990.0, highlighted=False, sort_order=10,
         quotas=_QUOTAS(500, 1000, 2, 1, 50, 5, 1, 30, 3), overage={"per_minute": 0.22, "per_message": 0.02, "per_gb": 0.5}, features=["calendar_sync"]),
    dict(key="professional", name="Professional", description="For busy clinics with calls and WhatsApp every day.", price=199.0, price_yearly=1990.0, highlighted=True, sort_order=20,
         quotas=_QUOTAS(2000, 5000, 5, 4, 250, 25, 5, 90, 10), overage={"per_minute": 0.18, "per_message": 0.015, "per_gb": 0.4},
         features=["call_recording", "multi_language", "calendar_sync", "whatsapp", "advanced_analytics"]),
    dict(key="business", name="Business", description="For multi-doctor clinics and hospitals.", price=399.0, price_yearly=3990.0, highlighted=False, sort_order=30,
         quotas=_QUOTAS(6000, 20000, 15, 12, 1000, 100, 20, 180, 25), overage={"per_minute": 0.15, "per_message": 0.012, "per_gb": 0.3},
         features=["call_recording", "multi_language", "custom_voice", "api_access", "advanced_analytics", "calendar_sync", "payments_integration", "whatsapp"]),
]


def upgrade() -> None:
    bind = op.get_bind()
    if 'plans' not in sa.inspect(bind).get_table_names():
        op.create_table(
            'plans',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('key', sa.String(length=40), nullable=False),
            sa.Column('name', sa.String(length=80), nullable=False),
            sa.Column('description', sa.String(length=300), nullable=True),
            sa.Column('kind', sa.String(length=20), nullable=False),
            sa.Column('client', sa.String(length=120), nullable=True),
            sa.Column('price', sa.Float(), nullable=False),
            sa.Column('cycle', sa.String(length=10), nullable=False),
            sa.Column('price_yearly', sa.Float(), nullable=True),
            sa.Column('currency', sa.String(length=3), nullable=False),
            sa.Column('custom_pricing', sa.Boolean(), nullable=False),
            sa.Column('status', sa.String(length=20), nullable=False),
            sa.Column('highlighted', sa.Boolean(), nullable=False),
            sa.Column('sort_order', sa.Integer(), nullable=False),
            sa.Column('quotas', sa.JSON(), nullable=False),
            sa.Column('overage', sa.JSON(), nullable=False),
            sa.Column('features', sa.JSON(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint('id'),
        )
        with op.batch_alter_table('plans', schema=None) as batch_op:
            batch_op.create_index(batch_op.f('ix_plans_key'), ['key'], unique=True)

    plans = sa.table(
        'plans', sa.column('id', sa.String), sa.column('key', sa.String), sa.column('name', sa.String), sa.column('description', sa.String),
        sa.column('kind', sa.String), sa.column('client', sa.String), sa.column('price', sa.Float), sa.column('cycle', sa.String),
        sa.column('price_yearly', sa.Float), sa.column('currency', sa.String), sa.column('custom_pricing', sa.Boolean), sa.column('status', sa.String),
        sa.column('highlighted', sa.Boolean), sa.column('sort_order', sa.Integer), sa.column('quotas', sa.JSON), sa.column('overage', sa.JSON),
        sa.column('features', sa.JSON), sa.column('created_at', sa.DateTime(timezone=True)), sa.column('updated_at', sa.DateTime(timezone=True)),
    )
    if bind.execute(sa.text('select count(*) from plans')).scalar() == 0:
        import uuid

        now = datetime.now(timezone.utc)
        op.bulk_insert(plans, [
            {**s, "id": str(uuid.uuid4()), "kind": "catalog", "client": None, "cycle": "monthly", "currency": "USD",
             "custom_pricing": False, "status": "active", "created_at": now, "updated_at": now}
            for s in SEED
        ])


def downgrade() -> None:
    with op.batch_alter_table('plans', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_plans_key'))
    op.drop_table('plans')
