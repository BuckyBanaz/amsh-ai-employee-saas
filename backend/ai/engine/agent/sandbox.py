"""Test mode for the playground: the agent really talks, reads the clinic's real data and runs its real tools, but nothing it
"does" is saved.

A booking, cancellation or reschedule made in the playground lands in a per-session ledger held in memory. Reads see the
clinic's real appointments with the ledger laid over them, so the agent can book a slot, look it up, move it and cancel it
within one test conversation, while the clinic's calendar, patients and SMS stay untouched. The session ends and the ledger goes.

`dry_run` (shadow mode) cannot do this: it validates and returns without recording anything, so a test could never exercise the
look-up -> reschedule -> cancel path.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional

SANDBOX_ID_PREFIX = "sandbox-"


class SandboxLedger:
    """What the agent did in this test session. Nothing here is persisted."""

    def __init__(self) -> None:
        self.rows: Dict[str, Dict[str, Any]] = {}  # appointments the agent created, by id
        self.overrides: Dict[str, Dict[str, Any]] = {}  # real appointments the agent changed, by id (a patched copy)
        self.actions: List[Dict[str, Any]] = []  # shown to the tester: what would have happened

    def record(self, kind: str, summary: str, **detail: Any) -> None:
        self.actions.append({"kind": kind, "summary": summary, "at": datetime.now(timezone.utc).isoformat(), **detail})

    def snapshot(self) -> List[Dict[str, Any]]:
        return list(self.actions)


def _matches(row: Dict[str, Any], date: Optional[str], status: Optional[str], doctor_name: Optional[str], statuses: Optional[Iterable[str]]) -> bool:
    if status and row.get("status") != status:
        return False
    if statuses and row.get("status") not in set(statuses):
        return False
    if date and row.get("preferred_date") != date:
        return False
    if doctor_name and doctor_name.lower() != "all doctors" and doctor_name.lower() not in (row.get("doctor_name") or "").lower():
        return False
    return True


class SandboxRead:
    """The vertical's read operations with the session ledger laid over the real data."""

    def __init__(self, real: Any, ledger: SandboxLedger) -> None:
        self._real = real
        self._ledger = ledger

    def __getattr__(self, name: str) -> Any:  # doctors, services, patient history: straight from the clinic
        return getattr(self._real, name)

    def get_appointments(self, db, business_id, date=None, status=None, doctor_name=None, statuses=None) -> List[Dict[str, Any]]:
        # Fetch unfiltered by status: an override can change a row's status, so filter after the overlay.
        rows = self._real.get_appointments(db, business_id)
        merged = [dict(self._ledger.overrides.get(r["id"], r)) for r in rows]
        merged = list(self._ledger.rows.values()) + merged
        return [dict(r) for r in merged if _matches(r, date, status, doctor_name, statuses)]

    def get_appointment_by_id(self, db, business_id, appointment_id) -> Optional[Dict[str, Any]]:
        if appointment_id in self._ledger.rows:
            return dict(self._ledger.rows[appointment_id])
        if appointment_id in self._ledger.overrides:
            return dict(self._ledger.overrides[appointment_id])
        row = self._real.get_appointment_by_id(db, business_id, appointment_id)
        return dict(row) if row else None


class SandboxWrite:
    """Writes go to the ledger. No Transaction row, no SMS, no calendar entry."""

    def __init__(self, real: Any, read: SandboxRead, ledger: SandboxLedger) -> None:
        self._real = real
        self._read = read
        self._ledger = ledger

    def store_appointment(self, db, business_id, patient_name, phone_number, service_name="General Consultation", preferred_date="",
                          preferred_time="10:00 AM", doctor_name=None, notes=None, source="manual_dashboard", call_id=None, status="confirmed") -> Dict[str, Any]:
        row = {
            "id": f"{SANDBOX_ID_PREFIX}{uuid.uuid4().hex[:10]}", "business_id": business_id, "call_id": None, "type": "appointment",
            "status": status, "customer_name": patient_name, "phone_number": phone_number, "service_name": service_name,
            "doctor_name": doctor_name, "preferred_date": preferred_date, "preferred_time": preferred_time, "notes": notes,
            "created_at": datetime.now(timezone.utc).isoformat(), "channel": "playground", "channel_label": "Playground (test)", "details": {},
        }
        self._ledger.rows[row["id"]] = row
        self._ledger.record("book", f"Would book {service_name} for {patient_name} on {preferred_date} at {preferred_time}", appointment_id=row["id"])
        return dict(row)

    def _patch(self, db, business_id, appointment_id, **changes: Any) -> Optional[Dict[str, Any]]:
        row = self._read.get_appointment_by_id(db, business_id, appointment_id)
        if not row:
            return None
        row = {**row, **changes}
        if appointment_id in self._ledger.rows:
            self._ledger.rows[appointment_id] = row
        else:
            self._ledger.overrides[appointment_id] = row
        return dict(row)

    def cancel_appointment(self, db, business_id, appointment_id) -> Optional[Dict[str, Any]]:
        row = self._patch(db, business_id, appointment_id, status="cancelled")
        if row:
            self._ledger.record("cancel", f"Would cancel {row.get('customer_name')}'s {row.get('service_name')} on {row.get('preferred_date')}", appointment_id=appointment_id)
        return row

    def reschedule_appointment(self, db, business_id, appointment_id, date_iso, time_text) -> Optional[Dict[str, Any]]:
        row = self._patch(db, business_id, appointment_id, preferred_date=date_iso, preferred_time=time_text)
        if row:
            self._ledger.record("reschedule", f"Would move {row.get('customer_name')}'s appointment to {date_iso} at {time_text}", appointment_id=appointment_id)
        return row

    def __getattr__(self, name: str) -> Any:  # anything else a vertical offers is refused rather than run for real
        raise AttributeError(f"{name} is not available in test mode")


class SandboxOperations:
    """Drop-in for `OperationsSet`: same `.read` / `.write`, backed by the ledger."""

    def __init__(self, real_ops: Any, ledger: SandboxLedger) -> None:
        self.ledger = ledger
        self.read = SandboxRead(real_ops.read, ledger)
        self.write = SandboxWrite(real_ops.write, self.read, ledger)
