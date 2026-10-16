"""
Slot Availability (clinic operation).
The one place that says which existing appointments block a slot, and how a doctor's slot is judged. Language-independent:
English, Hindi and every other caller go through the same rule (`engine/agent/availability.is_free` calls it).

EXPECTATIONS (change them here, nowhere else):
1. An appointment blocks its slot while its status is in BLOCKING_STATUSES (confirmed and pending). Cancelled and completed
   ones do not. A "pending" booking is a held slot: it must not be sold twice.
2. Appointments overlap when their start times are less than one slot length apart.
3. A named doctor is free only if (a) they have no overlapping appointment of their own, and (b) the overlapping appointments
   that are NOT theirs (other doctors' and unassigned ones) leave at least one doctor free, because an unassigned booking
   ("Duty Doctor", or no doctor named) will be handed to whichever doctor is free.
4. With no doctor named, the slot is free while overlapping appointments are fewer than the number of doctors (minimum 1).
5. Scaling: a clinic with more doctors needs no code change (the count comes from the business's staff); a new status that
   should hold a slot is one more entry in BLOCKING_STATUSES.
"""

from typing import Iterable, Optional

BLOCKING_STATUSES = ("confirmed", "pending")

# Doctor names that mean "no particular doctor": stored when a booking names nobody (`write_operations` uses "Duty Doctor").
UNASSIGNED_DOCTORS = frozenset({"", "duty doctor", "any", "any doctor", "none", "unassigned", "n/a", "na"})


def is_unassigned(doctor: Optional[str]) -> bool:
    return str(doctor or "").strip().lower().rstrip(".") in UNASSIGNED_DOCTORS


def slot_is_free(overlapping_doctors: Iterable[Optional[str]], doctor: Optional[str], doctor_count: int) -> bool:
    """`overlapping_doctors`: the doctor name on each appointment that overlaps the slot (one entry per appointment).
    `doctor`: the doctor asked for, or None/empty for no preference."""
    names = [str(d or "").strip() for d in overlapping_doctors]
    capacity = max(1, doctor_count)
    if not doctor or is_unassigned(doctor):
        return len(names) < capacity
    wanted = doctor.strip().lower()
    if any(n.lower() == wanted for n in names):
        return False  # this doctor is already booked then
    others = {n.lower() for n in names if not is_unassigned(n)}
    unassigned = sum(1 for n in names if is_unassigned(n))
    return len(others) + unassigned < capacity
