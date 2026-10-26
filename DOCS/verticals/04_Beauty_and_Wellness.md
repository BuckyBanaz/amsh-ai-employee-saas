# Beauty & Wellness (vertical key `wellness`)

Status: **beta**: implemented and unit / integration tested, **not live-tested**. Definition:
`backend/ai/workflows/definitions/wellness.yaml` (v1.0.0, `workflow_runtime: true`). Overlay:
`backend/ai/prompts/verticals/wellness.json`. Language configs: `backend/ai/verticals/configs/wellness/{en,hi}_wellness.yaml`.

## 1. Purpose and subtypes

Books treatment sessions with an optional therapist **and a free room**, answers from approved business information only,
and hands health questions to a person.

| Subtype | Shared workflows | What differs |
|---|---|---|
| `day_spa` | treatment booking, change, enquiry | packages; rooms shared across treatments |
| `massage_spa` | same | therapist (and gender) preference common; senior therapist for health questions |
| `wellness_centre` | same | programmes and memberships answered from approved information only |
| `sauna` | same | sessions book a room / time slot, usually no therapist |

The booking process is genuinely shared (treatment, optional therapist, time, contact, room). Wellness does **not** share
the salon workflow: it adds rooms, health-concern escalation and a no-outcome-claims rule.

## 2. Personas and goals

Owner (room and therapist utilisation), front desk, client (book a treatment, ask about packages), senior therapist
(receives health-related questions).

## 3. Onboarding

Spa details → Treatments and packages (each may "need a free room") → Therapists (optional) → **Rooms** (name, kind, how many
bookings at once) → Opening hours → AI receptionist → Policies and FAQs → Channels → Review and activate. Readiness **error**:
a treatment needs a room kind but no active room of that kind exists.

## 4. Terminology

Client / Clients, Therapist / Therapists, Treatment / Treatments, Session / Sessions. Departments: `front_desk`, `manager`,
`wellness_lead` (health concern, contraindication, pregnancy, injury; no AI answer; falls back to the front desk).

## 5. Dashboard

Sessions (`/appointments`), Clients, Therapists, Treatments, **Rooms** (`/resources`), Calls, Conversations, Knowledge.

## 6. Workflow catalogue

`wellness.treatment_booking`, `wellness.booking_change`, `wellness.enquiry`.

## 7. States and transitions

Booking: collect (treatment, optional therapist, date, time, name, phone) → check (availability `ok`) → confirm (`no_room`
returns to collect with "offer another time"; `booked` completes). Diagram 11.

## 8. Intents and slots

Order: service (treatment), date, time, name, phone; therapist optional.

## 9. Tools

Same nine booking tools as salons. Room logic is in the operations layer, not a separate tool.

## 10. Rooms and conflicts

`ResourceAwareWriteOperations`: a treatment with `resource_kind` books only if a room of that kind is free for
[start, start + the treatment's duration). The check runs **before** the read-back (the caller is never asked to confirm an
impossible slot) and again inside the booking transaction, with the room rows locked (`SELECT … FOR UPDATE` on Postgres) so two
concurrent calls cannot take the last room. A room's capacity allows several bookings at once. The booked session records
`resource_id` and `resource_name`. Rescheduling re-checks too: the session keeps its room when that room is free at the new
time, else takes another free room of the kind, else `no_room`; the room fields change in the same commit as the time.
Tested: one room, second booking at the same time refused, a later time accepted, a move into a taken slot refused.

## 11. Departments, hours, fallbacks

As salons; health questions route to `wellness_lead` when configured.

## 12. Data model

`transactions` (appointment) + details `resource_id`, `resource_name`; `resources` table; `services.resource_kind`.

## 13. Follow-ups

Booking confirmation and reminders (existing templates).

## 14. Safety

No medical advice and **no claims about treatment results**; contraindications, pregnancy, injuries or medical conditions:
offer the senior therapist instead of answering; emergency detection on with general wording.

## 15. Backend

`wellness.yaml`, `prompts/verticals/wellness.json`, `capabilities/operations/shared` (`free_resource`, `ResourceAwareWriteOperations`),
toolbox `book_appointment` room check, `routes/verticals.py` resources, `routes/services.py` `resource_kind`.

## 16. Frontend

`app/(dashboard)/resources`, `app/onboarding/resources`, `components/verticals/ResourcesManager.tsx`, onboarding services
"Needs a free room" option.

## 17. AI configuration

Overlay: scope (treatments, packages, health questions to the senior therapist, no result promises), booking line, terms
(spa, client, therapist).

## 18. Tests and acceptance

`test_vertical_runtime.RoomsForWellness` (conflict, later time, room recorded, reschedule into a taken room refused, no "Duty Doctor"), wording, tool sets, API kind
validation. Acceptance for live: demo spa calls booking two clients into one room at the same time (second refused) and a
health question routed to the senior therapist.

## 19. Limitations

Beta, not live-tested. **check_availability does not filter by rooms yet**: the AI may offer a time whose room is taken; the
booking then returns `no_room` and the AI offers another time. Packages are catalogue items, not multi-step bookings.

## 20. Diagram

[`../flowcharts/verticals/11_spa_wellness_treatment_booking.mmd`](../flowcharts/verticals/11_spa_wellness_treatment_booking.mmd).
