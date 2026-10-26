# Beauty & Personal Care (vertical key `salon`)

Status: **beta**: implemented and unit / integration tested, **not live-tested**. Definition:
`backend/ai/workflows/definitions/salon.yaml` (v1.0.0, `workflow_runtime: true`). Overlay: `backend/ai/prompts/verticals/salon.json`.
Language configs: `backend/ai/verticals/configs/salon/{en,hi}_salon.yaml`.

## 1. Purpose and subtypes

Books, moves and cancels appointments with an optional stylist preference; answers service and price questions from the
catalogue; reaches the front desk or manager.

| Subtype | Shared workflows | What differs |
|---|---|---|
| `hair_salon` | booking, change, enquiry | long services (colour, treatments); stylist preference common |
| `beauty_salon` | same | beauty services catalogue |
| `barbershop` | same | short services; "anyone available" is typical; front desk only |
| `nail_salon` | same | technician preference optional |
| `lash_brow` | same | patch-test and aftercare questions only from approved information |

All five **genuinely share** the booking process (service, optional person, time, contact); the differences are catalogue,
departments and wording, not the process.

## 2. Personas and goals

Owner (full book, fewer no-shows), front desk (fewer routine calls), client (book or change fast, choose a stylist).

## 3. Onboarding

Salon details (vertical + subtype) → Services and prices (duration, price) → Stylists → Opening hours → AI receptionist →
Policies and FAQs (optional) → Channels (optional) → Review and activate. Readiness: at least one service, agent, time zone.

## 4. Terminology

Client / Clients, Stylist / Stylists, Service / Services, Appointment / Appointments. Departments: `front_desk`, `manager`
(complaints, refunds, special requests; falls back to the front desk).

## 5. Dashboard

Appointments, Clients (`/patients` page, relabelled: the data is the same kind of customer record), Stylists (`/doctors`
page, relabelled), Services, Calls, Conversations, Knowledge.

## 6. Workflow catalogue

`salon.appointment_booking` (booked / not_booked), `salon.appointment_change` (changed / not_found), `salon.enquiry`
(answered / transferred / unresolved).

## 7. States and transitions

Booking: collect (service, optional stylist, date, time, name, phone) → check (availability `ok`) → confirm (read-back,
`booked`). Change: find (lookup by the caller's own number) → change (reschedule / cancel with read-back). Enquiry: answer →
transfer (route to front desk / manager). Diagram 10.

## 8. Intents and slots

Booking order: service, date, time, name, phone (required, in order); stylist optional (never demanded; "anyone" is fine).

## 9. Tools

check_availability, book_appointment, lookup_appointment, cancel_appointment, reschedule_appointment, send_confirmation,
search_knowledge, transfer_to_human, end_call. Not capture_enquiry.

## 10. Departments and transfers

Without a directory: the fallback number / business line (as for clinics). With one: routing, hours and one fallback hop as in
the education document §10-11; when nobody is reachable the model tells the caller the team will follow up (salons have no lead tool).

## 11. Hours and fallbacks

Business hours (and each stylist's free slots) drive availability; transfers as above.

## 12. Data model

Appointments: `transactions` type `appointment`; the stylist is stored in `doctor_name` (historical field name) as the stylist's
name or **"Any available"** (never "Duty Doctor"). Clients: `patients` rows plus everyone who booked.

## 13. Follow-ups

Booking confirmation and reminders through the existing message templates.

## 14. Privacy and safety

Other clients' data never disclosed; read-back before any write; emergency detection on with general wording; no medical advice.

## 15. Backend

`salon.yaml`, `prompts/verticals/salon.json`, `verticals/configs/salon/*`, `capabilities/operations/shared`
(`BookingWriteOperations`), toolbox and agent unchanged otherwise.

## 16. Frontend

Sidebar from the definition; Clients and Stylists headers from terminology; onboarding titles from the definition.

## 17. AI configuration

Overlay: scope (stylists, services and prices, salon info), booking line (optional stylist), terms (salon, client, stylist).

## 18. Tests and acceptance

`test_vertical_runtime`: no clinic words in prompt or tool descriptions; subtype tool set; capture_enquiry refused
(`not_allowed`); `test_workflows`: booking order and optional stylist, real result codes, loop bound. Acceptance for live:
test calls on a demo salon booking, rescheduling and cancelling without the words patient, doctor or clinic.

## 19. Limitations

Beta; no live calls yet. No deposits / prepayment, no waitlist, no client preferences memory beyond the existing returning-caller note.

## 20. Diagram

[`../flowcharts/verticals/10_salon_booking.mmd`](../flowcharts/verticals/10_salon_booking.mmd).
