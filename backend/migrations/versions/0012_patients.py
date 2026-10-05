"""patients: saved patient records (edit, remove from list); moves the old "New patient" rows out of transactions

Before this, "New patient" in the dashboard stored a fake appointment (no date, no service) in `transactions`, which showed up
in Appointments. Those rows are recognised by their exact detail keys and become patient records instead.

Revision ID: 0012
Revises: 0011
Create Date: 2026-10-05
"""
import json
import re
import uuid

from alembic import op
import sqlalchemy as sa

revision = '0012'
down_revision = '0011'
branch_labels = None
depends_on = None

# What the old create_customer route wrote, and nothing else (real bookings always carry preferred_date, service_name...).
LEGACY_PATIENT_KEYS = {"customer_name", "phone_number", "email", "notes"}


def _phone_key(phone: str) -> str:
    digits = re.sub(r"\D", "", phone or "")
    return digits[-10:] if len(digits) >= 10 else digits


def upgrade() -> None:
    bind = op.get_bind()
    existing = set(sa.inspect(bind).get_table_names())
    if "patients" not in existing:
        op.create_table(
            "patients",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("business_id", sa.String(36), sa.ForeignKey("businesses.id"), nullable=False),
            sa.Column("phone_key", sa.String(20), nullable=False),
            sa.Column("name", sa.String(255), nullable=False),
            sa.Column("phone_number", sa.String(30), nullable=False),
            sa.Column("email", sa.String(255), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("business_id", "phone_key", name="uq_patient_business_phone"),
        )
        op.create_index("ix_patients_business_id", "patients", ["business_id"])

    rows = bind.execute(sa.text("SELECT id, business_id, details, created_at FROM transactions WHERE type = 'appointment'")).fetchall()
    seen: set[tuple[str, str]] = set()
    for row in rows:
        details = row.details
        if isinstance(details, str):
            try:
                details = json.loads(details)
            except ValueError:
                continue
        if not isinstance(details, dict) or set(details.keys()) != LEGACY_PATIENT_KEYS:
            continue
        key = _phone_key(details.get("phone_number") or "")
        if not key:
            continue  # nothing to match a patient on: leave the row as it was
        if (row.business_id, key) not in seen:
            taken = bind.execute(
                sa.text("SELECT 1 FROM patients WHERE business_id = :b AND phone_key = :k"), {"b": row.business_id, "k": key}
            ).first()
            if not taken:
                bind.execute(
                    sa.text(
                        "INSERT INTO patients (id, business_id, phone_key, name, phone_number, email, notes, created_at, updated_at) "
                        "VALUES (:id, :b, :k, :name, :phone, :email, :notes, :at, :at)"
                    ),
                    {"id": str(uuid.uuid4()), "b": row.business_id, "k": key, "name": details.get("customer_name") or "Patient",
                     "phone": details.get("phone_number"), "email": details.get("email"), "notes": details.get("notes"),
                     "at": row.created_at},
                )
            seen.add((row.business_id, key))
        bind.execute(sa.text("DELETE FROM transactions WHERE id = :id"), {"id": row.id})


def downgrade() -> None:
    op.drop_table("patients")
