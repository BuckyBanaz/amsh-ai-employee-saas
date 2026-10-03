"""support_tickets, ticket_messages, announcements for the admin portal's Support section

Revision ID: 0008
Revises: 0007
Create Date: 2026-10-03
"""
from alembic import op
import sqlalchemy as sa

revision = '0008'
down_revision = '0007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    existing = set(sa.inspect(op.get_bind()).get_table_names())
    now = sa.func.now()
    if "support_tickets" not in existing:
        op.create_table(
            "support_tickets",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("number", sa.Integer(), nullable=False),
            sa.Column("business_id", sa.String(36), sa.ForeignKey("businesses.id"), nullable=False),
            sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("subject", sa.String(200), nullable=False),
            sa.Column("category", sa.String(20), nullable=False, server_default="other"),
            sa.Column("priority", sa.String(10), nullable=False, server_default="normal"),
            sa.Column("status", sa.String(12), nullable=False, server_default="open"),
            sa.Column("assignee_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=now),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=now),
            sa.Column("first_response_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_support_tickets_number", "support_tickets", ["number"])
        op.create_index("ix_support_tickets_business_id", "support_tickets", ["business_id"])
        op.create_index("ix_support_tickets_status", "support_tickets", ["status"])
        op.create_index("ix_support_tickets_created_at", "support_tickets", ["created_at"])
    if "ticket_messages" not in existing:
        op.create_table(
            "ticket_messages",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("ticket_id", sa.String(36), sa.ForeignKey("support_tickets.id"), nullable=False),
            sa.Column("author_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("author_name", sa.String(255), nullable=False),
            sa.Column("from_staff", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("internal", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=now),
        )
        op.create_index("ix_ticket_messages_ticket_id", "ticket_messages", ["ticket_id"])
    if "announcements" not in existing:
        op.create_table(
            "announcements",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("title", sa.String(160), nullable=False),
            sa.Column("body", sa.Text(), nullable=False, server_default=""),
            sa.Column("level", sa.String(10), nullable=False, server_default="info"),
            sa.Column("status", sa.String(10), nullable=False, server_default="draft"),
            sa.Column("audience", sa.JSON(), nullable=False, server_default="{}"),
            sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=now),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=now),
        )
        op.create_index("ix_announcements_status", "announcements", ["status"])


def downgrade() -> None:
    for table in ("announcements", "ticket_messages", "support_tickets"):
        op.drop_table(table)
