# Education & EdTech (vertical key `education`)

Status: **beta**: implemented and unit / integration tested, **not live-tested**. Definition:
`backend/ai/workflows/definitions/education.yaml` (v1.0.0, `workflow_runtime: true`). Wording overlay:
`backend/ai/prompts/verticals/education.json`. Language configs: `backend/ai/verticals/configs/education/{en,hi}_education.yaml`.

Education is **not** an appointment workflow: most calls end in an answer, a captured lead or a transfer to the right
department. A campus visit, counselling session or demo class is a separate, explicitly typed booking.

## 1. Purpose and subtypes

| Subtype | Workflows | What differs |
|---|---|---|
| `university` (college or university) | `education.university_enquiry`, `education.campus_visit` | many departments; routing by intent, study level and domestic / international applicant; application status never read by the AI |
| `school` | `education.school_enquiry`, `education.campus_visit` | parents and guardians call; guardian's name and number; child's first name and grade only when needed |
| `coaching` (coaching or training institute) | `education.coaching_enquiry`, `education.demo_class` | course and batch discovery; demo class is a booking of type `demo_class` |
| `edtech` | `education.edtech_enquiry` | no physical visit (a demo is a `demo_request` lead); sales vs technical / learner support; no booking tools at all |

No two subtypes share the same workflow set (asserted in `test_workflows.test_subtypes_do_not_all_share_one_workflow`).
Shared: `campus_visit` between university and school (both are physical campus visits with the same booking process).

## 2. Personas and goals

Admissions office (more qualified leads, fewer repeated questions), department staff (only relevant transfers, with context),
applicants and parents (quick accurate answers, the right person), EdTech sales and support (qualified demo leads, correct support routing).

## 3. Onboarding (steps from the definition)

Institution details (vertical + subtype) → **Courses and programmes** (each item: course = answered, never booked; campus
visit / counselling / demo class = bookable) → **Departments and transfer routing** (suggested list per subtype, each with
the institution's own number; no number = callbacks) → Counsellors (optional) → Office hours → AI receptionist →
Approved information (fees, deadlines, FAQs) → Channels (optional) → Review and activate.

Readiness (server): agent and time zone required; bookable items required when the subtype books (not EdTech); warnings for no
courses, no departments, departments without numbers, no business phone.

## 4. Terminology and example configuration

Enquirer / Enquiries, Counsellor / Counsellors, Course / Courses, Visit / Visits.

```yaml
# a university after onboarding (tenant data, illustrative)
services: [{title: "BSc Computer Science", kind: course, attributes: {level: undergraduate, intake: September}},
           {title: "Campus visit", kind: visit, duration_minutes: 60}]
departments:
  - {key: general_enquiries, name: General enquiries, intents: [general_enquiry, human_request], transfer_phone: "+44...", priority: 10}
  - {key: international_admissions, name: International admissions, intents: [admissions, visa], match: {applicant_type: international},
     transfer_phone: "+44...", fallback_key: general_enquiries, priority: 60}
```

## 5. Dashboard

Enquiries (New / Contacted / Closed, mark contacted, close, reopen), Courses (`/services`), Departments, Visits
(`/appointments`), Transfers (each attempt and its real result), Calls, Conversations, Knowledge. All on real tenant APIs; no
patient pages.

## 6. Workflow catalogue

| Workflow | Entry intents | Ends as |
|---|---|---|
| university_enquiry | programme info, admissions, eligibility, deadlines, fees, scholarships, international admissions, application status, complaint, human request | answered / transferred / lead_captured / not_saved |
| campus_visit | campus visit, counselling | booked / not_booked |
| school_enquiry | admissions, enrolment, timings, term dates, fees, transport, attendance, human request | answered / transferred / lead_captured |
| coaching_enquiry | course selection, programme info, batches, fees, admissions | answered / lead_captured |
| demo_class | demo class, trial class | booked |
| edtech_enquiry | product info, pricing, demo request, technical support, account access, learner support, billing | answered / transferred / lead_captured |

## 7. States and transitions (university, full example)

`identify` (collect topic) → application_status or complaint: `identity` (name, phone) → `route`; otherwise `answer` →
resolved: **answered**; else `context` (applicant_type, study_level, programme; optional) → `route` (transfer, department
`route`) → `transferring`: **transferred** (dial placed; result recorded by the provider callback); unavailable / closed /
unknown / declined: `lead_contact` (name, phone) → `save_lead` (capture_enquiry: needs_confirmation loops; saved or
duplicate: **lead_captured**; bad phone / missing fields back to lead_contact) → else **not_saved**. Diagram 05.

School: `identify` → attendance: guardian details then route; else answer → guardian (grade, guardian name, phone) → route →
save_lead. Coaching: answer → interest (programme, batch, name, phone) → save_lead; demo class: collect → check → confirm.
EdTech: identify → technical support: support_contact (name, phone, email) → route; else answer → qualify (product, name,
phone) → route → save_lead. Diagrams 07, 08, 09.

## 8. Intents and slots

| Slot | Type | Validation (code) |
|---|---|---|
| topic | enum | one of the workflow's topics; anything else refused ("must be one of …") |
| applicant_type | enum | domestic / international |
| study_level | enum | undergraduate / postgraduate / doctoral |
| programme, product, batch_preference, grade | text | non-empty |
| name | name | must occur in what the caller said |
| phone | phone | at least 7 digits; must occur in what the caller said, or the caller agreed to the calling number |
| email | email | address format |
| student_first_name | name, `about_minor` | asked only when the enquiry needs it |

## 9. Tools

University / school / coaching: search_knowledge, capture_enquiry, transfer_to_human, end_call, plus the booking tools for
visits and demo classes. EdTech: search_knowledge, capture_enquiry, transfer_to_human, end_call only. Any other tool call is
refused in code (`not_allowed`).

`capture_enquiry(name, phone_number, kind, topic, subject, applicant_type, study_level, grade, batch_preference, email,
department, notes, confirmed_by_caller)`: read-back first (`needs_confirmation`), save on a later turn; a repeat or the same
open enquiry for the same number, kind and subject returns `duplicate`; never sends an SMS by itself.

## 10. Departments and routing (5.2)

Templates (the business gives each its own number): general_enquiries, ug_admissions (`study_level=undergraduate`),
pg_admissions (`postgraduate`), international_admissions (`applicant_type=international`, priority 60), finance, scholarships
(→ finance), faculty_office, student_support, application_support (no AI answer; name and phone first), campus_visits,
complaints (priority 90, no AI answer), admissions / administration / accounts (schools), counsellor / instructor (coaching),
sales / technical_support (email first) / learner_support / billing (EdTech).

Routing (`services/department_routing.py`, diagram 06): exact key → else intents + context match (highest priority) → else the
general desk. Then the first department in the fallback chain that is **open now** (its hours or the institution's) and has a
valid **E.164** number; chains are bounded and loops impossible. Each department stores: key, name, intents, match, number,
hours, priority, fallback, ring timeout (5-60 s), may-answer, required slots, active.

## 11. Hours, timeouts, fallbacks (diagram 12)

Dial with the department's timeout and an `attempt_id`. Provider result recorded (`completed`, `no_answer`, `busy`, `failed`,
`canceled`). Not answered: one silent fallback dial to the department's fallback if open and not already tried on this call;
otherwise a **callback task** (enquiry kind `callback`, due in 4 hours) and the existing "someone will call you back" line. Closed
or no number before dialling: the attempt is recorded (`closed` / `no_destination`) and the model is told to offer a callback
via capture_enquiry. The AI never claims a transfer succeeded.

## 12. Data model

`enquiries` (lead / callback), `transfer_attempts`, `departments`, `workflow_runs`; visits and demo classes are
`transactions` of type `appointment` (booking type in the workflow); courses are `services` with `kind = course`.

## 13. Follow-ups and notifications

Callback tasks and leads appear in Enquiries with a due time for callbacks; booking confirmations and reminders as for any
appointment. **Not built:** automatic staff notification for new leads, CRM / SIS / LMS integrations.

## 14. Privacy, permissions, safety

Minors: guardian contact; child's details only when needed; no student record, attendance or contact data disclosed. Fees,
deadlines, eligibility only from approved information. Application status never confirmed. Emergency detection stays on
(general wording). Roles: any member reads and works enquiries; owner / admin configure departments.

## 15. Backend files and endpoints

`workflows/definitions/education.yaml`, `prompts/verticals/education.json`, `verticals/configs/education/*`,
`engine/agent/toolbox.py` (`_tool_capture_enquiry`, `_route`), `server/services/department_routing.py`,
`server/api/routes/verticals.py`, `voice.py` / `plivo.py` (`attempt_id`), `database/models/vertical.py`, migration 0015.

## 16. Frontend files

`app/(dashboard)/enquiries|departments|transfers`, `app/onboarding/departments`, `components/verticals/*`,
`verticals/*`, `controllers/vertical.controller.ts`, onboarding business / services / review changes.

## 17. AI configuration

Overlay: scope (approved information only, application status never, minors), booking line (visits only), terms
(institution, counsellor, caller). Workflow block in the prompt lists the subtype's workflows, the tenant's departments (keys,
what they handle, whether the AI may answer) and courses. Per-turn workflow note: current step and the one thing to ask.

## 18. Tests and acceptance

`test_workflows.py` (definitions, engine, university paths, persistence), `test_vertical_runtime.py` (routing incl.
international vs undergraduate, closed and no-number fallbacks, loops; dial, no-answer → fallback → callback; Twilio callback;
lead capture read-back / duplicate / grounding; EdTech tools; no clinic words; APIs). Acceptance for live readiness: a pilot
institution's test calls covering each subtype path, transfers to real department numbers, and leads visible in the dashboard.

## 19. Limitations and readiness

Beta. Not done: live calls; Plivo fallback path not exercised by a test; no lead notifications or CRM sync; no
application-status integration (by design the AI routes instead); the answer / resolved signal is inferred when a later tool is
used; Hindi wording uses the base Hindi layer (no Hindi-specific education phrasing review).

## 20. Diagrams

05 university enquiry, 06 multi-department transfer, 07 school, 08 coaching, 09 EdTech, 12 transfer fallback
(`../flowcharts/verticals/`).
