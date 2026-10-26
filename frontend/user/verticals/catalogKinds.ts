// What a catalogue item can be, per vertical (matches backend ServiceKind in server/api/routes/services.py).
// A vertical not listed here (healthcare, salons) has one kind: a bookable service, exactly as before.
export const CATALOG_KINDS: Record<string, { value: string; label: string }[]> = {
  education: [
    { value: 'course', label: 'Course or programme (answered and enquired about, not booked)' },
    { value: 'visit', label: 'Campus visit (bookable)' },
    { value: 'counselling', label: 'Counselling session (bookable)' },
    { value: 'demo_class', label: 'Demo or trial class (bookable)' },
  ],
  wellness: [
    { value: 'service', label: 'Treatment' },
    { value: 'package', label: 'Package' },
  ],
};
