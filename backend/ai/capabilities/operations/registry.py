"""Operations registry: which read/write operations a vertical uses.

The engine asks `get_operations(vertical)` instead of importing a vertical's classes, so a new vertical plugs in here (one
entry) without touching the engine. Today only the clinic set exists (MVP is healthcare only). Any other vertical, or none, raises: it is
never quietly run as a clinic.

To add a vertical: write its `<vertical>/read_operations.py` and `write_operations.py` next to the clinic ones and register
them below. The method names the toolbox calls (`get_appointments`, `get_appointment_by_id`, `store_appointment`,
`cancel_appointment`, `reschedule_appointment`) are the contract.
"""

from dataclasses import dataclass
from typing import Dict, Optional, Type

from backend.ai.capabilities.operations.clinic import ClinicReadOperations, ClinicWriteOperations
from backend.ai.verticals.errors import MissingContextError, UnknownVerticalError


@dataclass(frozen=True)
class OperationsSet:
    read: Type
    write: Type


OPERATIONS: Dict[str, OperationsSet] = {
    "clinic": OperationsSet(ClinicReadOperations, ClinicWriteOperations),
}


def get_operations(vertical: Optional[str]) -> OperationsSet:
    """The vertical's operations. A missing or unregistered vertical is an error, never a quiet fallback to the clinic set."""
    key = str(vertical or "").strip().lower()
    if not key:
        raise MissingContextError("No vertical given: cannot choose which operations to run.")
    if key not in OPERATIONS:
        raise UnknownVerticalError(f"No operations registered for vertical {key!r}.")
    return OPERATIONS[key]
