"""Multi-vertical workflows: departments, transfer attempts, enquiries, workflow runs, resources; services.kind / attributes /
resource_kind; businesses.vertical_settings

Additive only. Every existing service becomes kind "service" (bookable, exactly what it was), every existing business keeps its
vertical and gets empty settings. Nothing is renamed, moved or reinterpreted (DOCS/31 §9).

Revision ID: 0015
Revises: 0014
Create Date: 2026-10-25
"""
from alembic import op
import sqlalchemy as sa

revision = '0015'
down_revision = '0014'
branch_labels = None
depends_on = None


def _tables():
    return set(sa.inspect(op.get_bind()).get_table_names())


def _columns(table):
    return {c["name"] for c in sa.inspect(op.get_bind()).get_columns(table)}


def upgrade() -> None:
    tables = _tables()
    if "departments" not in tables:
        op.create_table(
            "departments",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("business_id", sa.String(36), sa.ForeignKey("businesses.id"), nullable=False, index=True),
            sa.Column("key", sa.String(50), nullable=False),
            sa.Column("name", sa.String(120), nullable=False),
            sa.Column("intents", sa.JSON(), nullable=False),
            sa.Column("match", sa.JSON(), nullable=False),
            sa.Column("transfer_phone", sa.String(30), nullable=True),
            sa.Column("hours", sa.JSON(), nullable=True),
            sa.Column("priority", sa.Integer(), nullable=False),
            sa.Column("fallback_key", sa.String(50), nullable=True),
            sa.Column("timeout_seconds", sa.Integer(), nullable=False),
            sa.Column("may_answer", sa.Boolean(), nullable=False),
            sa.Column("required_slots", sa.JSON(), nullable=False),
            sa.Column("active", sa.Boolean(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint("business_id", "key", name="uq_department_business_key"),
        )
    if "transfer_attempts" not in tables:
        op.create_table(
            "transfer_attempts",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("business_id", sa.String(36), sa.ForeignKey("businesses.id"), nullable=False, index=True),
            sa.Column("call_id", sa.String(64), nullable=True, index=True),
            sa.Column("department_key", sa.String(50), nullable=False),
            sa.Column("requested_key", sa.String(50), nullable=True),
            sa.Column("destination_tail", sa.String(8), nullable=True),
            sa.Column("reason", sa.String(255), nullable=True),
            sa.Column("status", sa.String(20), nullable=False),
            sa.Column("outcome_detail", sa.String(255), nullable=True),
            sa.Column("enquiry_id", sa.String(36), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        )
    if "enquiries" not in tables:
        op.create_table(
            "enquiries",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("business_id", sa.String(36), sa.ForeignKey("businesses.id"), nullable=False, index=True),
            sa.Column("call_id", sa.String(64), nullable=True),
            sa.Column("source", sa.String(20), nullable=False),
            sa.Column("workflow_id", sa.String(80), nullable=True),
            sa.Column("kind", sa.String(30), nullable=False),
            sa.Column("topic", sa.String(50), nullable=True),
            sa.Column("subject", sa.String(255), nullable=True),
            sa.Column("contact_name", sa.String(255), nullable=False),
            sa.Column("contact_phone", sa.String(30), nullable=False),
            sa.Column("contact_phone_key", sa.String(20), nullable=False, index=True),
            sa.Column("contact_email", sa.String(255), nullable=True),
            sa.Column("details", sa.JSON(), nullable=False),
            sa.Column("department_key", sa.String(50), nullable=True),
            sa.Column("status", sa.String(20), nullable=False),
            sa.Column("idempotency_key", sa.String(80), nullable=False),
            sa.Column("follow_up_due_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint("business_id", "idempotency_key", name="uq_enquiry_idempotency"),
        )
    if "workflow_runs" not in tables:
        op.create_table(
            "workflow_runs",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("business_id", sa.String(36), sa.ForeignKey("businesses.id"), nullable=False, index=True),
            sa.Column("conversation_id", sa.String(80), nullable=False),
            sa.Column("workflow_id", sa.String(80), nullable=False),
            sa.Column("workflow_version", sa.String(20), nullable=False),
            sa.Column("state", sa.String(50), nullable=False),
            sa.Column("status", sa.String(20), nullable=False),
            sa.Column("outcome", sa.String(50), nullable=True),
            sa.Column("slots", sa.JSON(), nullable=False),
            sa.Column("visits", sa.JSON(), nullable=False),
            sa.Column("history", sa.JSON(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint("business_id", "conversation_id", "workflow_id", name="uq_workflow_run"),
        )
    if "resources" not in tables:
        op.create_table(
            "resources",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("business_id", sa.String(36), sa.ForeignKey("businesses.id"), nullable=False, index=True),
            sa.Column("name", sa.String(120), nullable=False),
            sa.Column("kind", sa.String(30), nullable=False),
            sa.Column("capacity", sa.Integer(), nullable=False),
            sa.Column("active", sa.Boolean(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )

    services = _columns("services")
    with op.batch_alter_table("services") as batch:
        if "kind" not in services:
            batch.add_column(sa.Column("kind", sa.String(20), nullable=False, server_default="service"))
        if "attributes" not in services:
            batch.add_column(sa.Column("attributes", sa.JSON(), nullable=True))
        if "resource_kind" not in services:
            batch.add_column(sa.Column("resource_kind", sa.String(30), nullable=True))
    if "vertical_settings" not in _columns("businesses"):
        with op.batch_alter_table("businesses") as batch:
            batch.add_column(sa.Column("vertical_settings", sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("businesses") as batch:
        batch.drop_column("vertical_settings")
    with op.batch_alter_table("services") as batch:
        batch.drop_column("resource_kind")
        batch.drop_column("attributes")
        batch.drop_column("kind")
    for table in ("resources", "workflow_runs", "enquiries", "transfer_attempts", "departments"):
        op.drop_table(table)
