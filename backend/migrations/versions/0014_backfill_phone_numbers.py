"""Calls now route only through phone_numbers: give each business whose own business_phone is unambiguous a row there

Before this, an incoming call was matched on `businesses.business_phone`, a field the clinic edits itself. Routing now reads only
`phone_numbers` (numbers the platform assigned), so existing clinics keep receiving calls: a business_phone becomes an active
assignment when its last 10 digits belong to exactly one business and to no existing phone_numbers row. Numbers shared by two
businesses are left for a platform admin to assign, rather than guessed.

Revision ID: 0014
Revises: 0013
Create Date: 2026-10-05
"""
import re
import uuid
from collections import defaultdict
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa

revision = '0014'
down_revision = '0013'
branch_labels = None
depends_on = None


def _key(number):
    digits = re.sub(r"\D", "", number or "")
    return digits[-10:] if len(digits) >= 7 else ""


def upgrade() -> None:
    bind = op.get_bind()
    taken = set()
    for number, forwarded_from in bind.execute(sa.text("SELECT number, forwarded_from FROM phone_numbers")).fetchall():
        taken.update(k for k in (_key(number), _key(forwarded_from)) if k)
    owners = defaultdict(list)
    for business_id, phone in bind.execute(sa.text("SELECT id, business_phone FROM businesses WHERE business_phone IS NOT NULL")).fetchall():
        if _key(phone):
            owners[_key(phone)].append((business_id, phone.strip()))
    now = datetime.now(timezone.utc)
    for key, claims in owners.items():
        if len(claims) != 1 or key in taken:
            continue
        business_id, phone = claims[0]
        if len(phone) > 30:  # phone_numbers.number is 30 wide; leave it for an admin to assign
            continue
        bind.execute(
            sa.text("INSERT INTO phone_numbers (id, business_id, number, mode, forwarded_from, status, provisioned_at) "
                    "VALUES (:id, :b, :n, 'dedicated', NULL, 'active', :t)"),
            {"id": str(uuid.uuid4()), "b": business_id, "n": phone, "t": now},
        )


def downgrade() -> None:
    pass  # the rows are ordinary assignments now; removing them would stop those clinics receiving calls
