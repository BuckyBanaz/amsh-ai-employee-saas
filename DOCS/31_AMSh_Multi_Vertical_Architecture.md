# 31. Multi-vertical architecture: shared platform, vertical workflows

Status as of 2026-10-25 (branch `version-0.5`, uncommitted working tree). Supersedes the "nothing built" status of
[`30_AMSh_Multi_Vertical_Plan.md`](30_AMSh_Multi_Vertical_Plan.md); the decisions in that plan (clinic unchanged, golden test first,
education's outcome is a lead) are kept.

**Rule above everything else, kept: the healthcare (clinic) behaviour is unchanged.** It is proven by
`backend/ai/evals/test_clinic_golden.py` (character-for-character, captured before any change).

## Index

| Document | What it covers |
|---|---|
| This file | architecture, repository responsibilities, data model, registry and schemas, workflow engine, API contracts, frontend, auth, providers, versioning, testing, deployment, rollback, observability, **status matrix** |
| [`verticals/00_Phase0_Audit_Implementation_Map.md`](verticals/00_Phase0_Audit_Implementation_Map.md) | what existed before, what was reused, risks, failures that existed before this work |
| [`verticals/01_Healthcare.md`](verticals/01_Healthcare.md) | dental practice, general clinic, hospital (compatibility baseline) |
| [`verticals/02_Education_and_EdTech.md`](verticals/02_Education_and_EdTech.md) | university, school, coaching institute, EdTech; department routing |
| [`verticals/03_Beauty_and_Personal_Care.md`](verticals/03_Beauty_and_Personal_Care.md) | hair / beauty salon, barbershop, nail salon, lash & brow |
| [`verticals/04_Beauty_and_Wellness.md`](verticals/04_Beauty_and_Wellness.md) | day spa, massage spa, wellness centre, sauna; rooms |
| [`flowcharts/verticals/README.md`](flowcharts/verticals/README.md) | the 16 Mermaid diagrams (sources, all validated with mermaid-cli 11) |

## 1. Concepts (each one its own type)

| Concept | Meaning | Where |
|---|---|---|
| vertical | the industry (`Business.vertical`: `clinic`, `education`, `salon`, `wellness`) | `VerticalDefinition` |
| subtype | a business type inside it (`Business.business_subtype`) | `SubtypeSpec`: picks its own workflows |
| workflow | the process run for an intent | `WorkflowSpec`: slots, steps, tools, transfer policy, outcome, version |
| department | a human team a call can be routed to | template `DepartmentTemplate`; tenant row `departments` |
| resource | capacity-limited thing a booking holds | kinds in the definition; tenant rows `resources` (rooms, stations, campus) |
| intent | what the caller wants | `WorkflowSpec.entry_intents`, `DepartmentTemplate.intents` |
| tool | an application operation | `AgentToolbox._tool_<name>`; a workflow lists the tools it may use |
| policy | constraints on the AI | `SafetyPolicy`, `TransferPolicy`, `answer_constraints`, the confirmation gate |

`healthcare` is the vertical's display name; its key stays `clinic` so no existing tenant or row is renamed.

## 2. Architecture

Diagram: [`flowcharts/verticals/01_system_architecture.mmd`](flowcharts/verticals/01_system_architecture.mmd).

| Repository area | Responsibility in this design |
|---|---|
| `backend/ai/workflows/` | **new.** `schema.py` (typed, `extra="forbid"`), `registry.py` (load + validate), `engine.py` (run state machine + store), `session.py` (one call's runs), `definitions/*.yaml` (reviewed platform data) |
| `backend/ai/verticals/` | per-language configs (`configs/<vertical>/<lang>_<vertical>.yaml`, now also education / salon / wellness in en + hi), `BusinessContext` |
| `backend/ai/prompts/` | base packs unchanged in wording; `verticals/<key>.json` overlays (edits, whole-word terms, sets); `workflow_block` templates |
| `backend/ai/engine/agent/` | `AgentEngine` reads the business's workflows: tool allowlist, booking order, vertical wording, workflow session |
| `backend/ai/capabilities/operations/` | `shared/`: `BookingWriteOperations` (salon, education), `ResourceAwareWriteOperations` (wellness rooms) |
| `backend/server/api/routes/verticals.py` | **new.** catalog, vertical-config (validate / activate), departments, enquiries, transfers, resources |
| `backend/server/services/department_routing.py` | **new.** routing, hours, fallback chain, attempts, callbacks |
| `backend/server/services/vertical_setup.py` | **new.** activation readiness |
| `frontend/user` | typed registry (`verticals/`), catalog-driven onboarding, conditional steps, new pages, vertical-aware sidebar |
| `frontend/admin` | read-only definition view (subtypes, workflows, versions, activation) |
| `frontend/landing-page` | beta verticals offered as **pilot** options only (no production claims) |

Shared platform vs vertical-specific: everything in the table is shared code; what is vertical-specific is **data**
(definitions, overlays, language configs) plus three typed handlers (`capture_enquiry`, department routing, room assignment)
that any vertical can enable by listing them. There is no `if vertical == ...` branch in the engine: the one behavioural switch
is the definition flag `workflow_runtime` (false for healthcare).

## 3. Data model and tenant isolation

Migration `backend/migrations/versions/0015_multi_vertical.py` (additive, idempotent, up/down verified on SQLite; **not yet
run on Postgres**):

| Table / column | Purpose |
|---|---|
| `departments` | tenant directory: key (unique per business), name, intents, match, transfer_phone (E.164), hours, priority, fallback_key, timeout_seconds, may_answer, required_slots, active |
| `transfer_attempts` | each dial: department, requested key, last 4 digits only, status (initiated, completed, no_answer, busy, failed, canceled, closed, no_destination), outcome, linked callback |
| `enquiries` | leads and follow-ups: kind (enquiry, admission, callback, demo_request, support), contact, subject, details, department, status (new, contacted, closed), idempotency key (unique per business), follow-up due |
| `workflow_runs` | one row per (business, conversation, workflow): state, status, outcome, slots, visits, history (last 50) |
| `resources` | rooms / stations / campus: kind, capacity, active |
| `services.kind` / `attributes` / `resource_kind` | `service` (default, every existing row), `course` (never booked), `visit`, `counselling`, `demo_class`, `package`; a service may need a free resource of a kind |
| `businesses.vertical_settings` | `{status: draft or active, definition_version, activated_at, activated_by, warnings}` |

Isolation: every new row carries `business_id`; every route calls `require_membership` (and `require_owner_or_admin` for
configuration writes) and returns **404** for another tenant's id. The agent never takes `business_id` from model arguments.
Tenant delete (`admin_tenant_manage.delete_tenant`) discovers the new tables automatically (`_business_tables`). Diagram 13.

## 4. Vertical registry and configuration schema

`workflow_registry()` loads `backend/ai/workflows/definitions/*.yaml` once and **refuses to start** on any invalid definition,
listing every problem:

- unknown tool (not in `KNOWN_TOOLS`, which a test keeps equal to the toolbox handlers), or a step tool missing from the workflow's allowlist;
- a start, step or transition that points at a missing step; a non-terminal step without an exit; a last transition that is conditional;
- **a loop without a bounded exit**: every step must reach a `complete` / `fail` step, and every step has `max_visits` (1-10);
- a slot used by a step, condition or transfer policy that the workflow does not declare; an invalid validation regex;
- a transfer to a department the vertical does not define; a department falling back to itself or to an undefined one;
- a subtype naming an unknown workflow, another vertical's workflow, an unknown department or resource kind; any unknown field (typo).

Nothing in a definition is executed: conditions are data matched by code (`slots_present`, `slot_equals`, `tool_code_in`, `resolved`).
Definitions are platform data reviewed in pull requests; tenants cannot edit them (they configure subtype, catalogue,
departments, resources, hours and agent only).

## 5. Workflow engine

Diagram 04 and 14. `WorkflowEngine` (pure) + `WorkflowStore` (persistence) + `WorkflowSession` (per call):

- **Inputs are trusted observations only**: the toolbox's own audit trail (tool, parsed args, real result code) and the controller's
  code-parsed slots. Slot values are validated against the slot spec (enum values, regex, phone, email) before they count.
- A `collect` step advances when its required slots are present; `answer` on a resolved / not-resolved observation; `tool`,
  `confirm`, `transfer` only on **that** tool's real result code.
- Each step entry is counted; exceeding `max_visits` ends the run `failed / loop_exceeded`.
- Runs are saved after every change on one ordered background thread (upsert by business + conversation + workflow), so a new
  turn, a reconnect or another worker resumes; a failed save or load never breaks the call.
- Per turn, the session adds a short note (current step, the one slot to ask, rules) to the model's messages.
- **Healthcare does not run a session** (`workflow_runtime: false`): its controller and notes are exactly today's.

LLM vs code: the model words replies and proposes tool calls; code decides which tools exist (allowlist enforced in
`AgentToolbox.execute`, result `not_allowed`), validates slots, enforces read-back confirmation, grounds names and numbers in
what the caller said, routes departments, checks hours, rooms and idempotency.

## 6. API contracts (all need a login)

| Method and path | Who | Notes |
|---|---|---|
| `GET /api/verticals`, `GET /api/verticals/{key}` | any signed-in user | catalogue; detail includes workflows; 404 for an unknown vertical |
| `GET /api/businesses/{id}/vertical-config` | member | vertical, subtype, terminology, dashboard nav, onboarding steps, resources, workflows, tools, status |
| `PUT /api/businesses/{id}/vertical-config` `{vertical?, subtype}` | owner / admin | 422 unknown vertical / subtype; 409 vertical change after activation (platform staff only) or on a clinic that has patients / appointments; audited |
| `POST .../vertical-config/validate` | member | `{ready, problems[{level, code, message}]}` |
| `POST .../vertical-config/activate` | owner / admin | 422 with problems if any error; sets status active; audited |
| `GET, POST /api/businesses/{id}/departments`; `POST .../departments/from-template`; `PATCH, DELETE .../departments/{dept_id}` | read: member; write: owner / admin | E.164 numbers, slug intents, no self or looping fallback, cannot delete a department another one falls back to; templates never carry a number; audited |
| `GET, POST /api/businesses/{id}/enquiries`; `GET, PATCH .../enquiries/{enquiry_id}` | member | double submit returns the first (200, `duplicate: true`); status new / contacted / closed; audited |
| `GET /api/businesses/{id}/transfers` | member | attempts and counts by status |
| `GET, POST /api/businesses/{id}/resources`; `PATCH, DELETE .../resources/{rid}` | read: member; write: owner / admin | kind must be one of the vertical's resource kinds |
| `POST /api/onboarding/businesses` | signed in | `vertical` must be a defined one (legacy `hospital` → clinic / hospital); `business_subtype` validated (healthcare keeps free text) |
| services create / update | owner / admin | new optional `kind`, `attributes`, `resource_kind` (validated) |
| `GET /api/admin/verticals` | platform admin | each item now carries `definition` (version, status, validation, subtypes with business counts, workflows, departments, activated count) |
| `POST /api/voice/transfer-status`, `/api/voice/plivo/transfer`, `/plivo/transfer-status` | provider (signature-verified) | new optional `attempt_id`: records the real result, one fallback dial, else a callback task |

## 7. Frontend architecture

- `frontend/user/verticals/types.ts`: typed mirror of the API; `useVerticalConfig()` (memory cache per business, refreshed on
  `business_updated`; **the server is the source of truth**); `onboardingSteps.ts` derives the steps from the definition;
  `catalogKinds.ts` lists catalogue item kinds per vertical.
- Onboarding: the business step reads `/api/verticals` (only supported types are offered, beta ones marked) and requires a
  subtype; steps (and their titles) follow the definition, adding Departments (education) and Rooms (wellness); the review step
  runs the server's readiness check and activates. Healthcare keeps its exact flow.
- Dashboard: the sidebar's main group comes from the definition for non-healthcare verticals (Enquiries, Departments, Visits,
  Transfers, Rooms, ...); patients and staff pages take the vertical's words (Clients, Stylists, Therapists). New pages
  `/enquiries`, `/departments`, `/transfers`, `/resources` use only real, tenant-scoped APIs, with loading, empty and
  retryable error states.
- Admin: Vertical Templates shows definitions read-only (no editor was added: definitions are reviewed code).

## 8. Authentication, authorisation, providers

Unchanged auth (JWT). Roles: members read; owner / admin configure; platform admin sees definitions and may change a live
business's vertical. Providers: Twilio and Plivo `<Dial>` callbacks carry `attempt_id` (signature verification unchanged);
Deepgram, Cartesia and the LLM pipeline are untouched. A transfer is reported to the model as `transferring` (dial placed);
whether anyone answered is only ever recorded from the provider's callback.

## 9. Versioning and migrations

Each definition and workflow has a semver `version`; activation stores the definition version on the business. Changing a
workflow: bump its version, update tests, deploy; the admin portal shows versions. Runs keep the version they started with.
Migration 0015 is additive; `downgrade()` drops the new tables and columns (data in them is lost).

## 10. Testing, deployment, rollback, observability

| Suite | Count | What |
|---|---|---|
| `test_clinic_golden.py` | 4 (6 subtests) | clinic unchanged, character for character |
| `test_workflows.py` | 25 | definitions valid; healthcare = today's 9 tools and order; invalid definitions refused (12 cases); engine order, validation, loops; persistence and resume |
| `test_vertical_runtime.py` | 30 | routing (key, intent + context, fallback, closed, loops), transfers through the directory and the Twilio callback, lead capture (read-back, duplicate, grounding, allowlist), rooms, no clinic words for other verticals, APIs (roles, 404 isolation, validation, activation), admin visibility |
| Full backend suite | 738 passed, 5 failed, 1 skipped (the 5 existed before, see Phase 0 §5); API smoke 54/54 | |

Deployment: run migration 0015, deploy API (startup validates definitions), deploy frontends. Rollback: previous images;
0015 can stay (additive) or be downgraded. Observability: `workflow_runs` (state history per call), `transfer_attempts`
(dial outcomes), `enquiries`, audit log events (`business.vertical_configured`, `business.vertical_activated`, `department.*`,
`resource.*`, `enquiry.*`), logs `[WORKFLOW]`, `[VOICE TRANSFER]`, `[PLIVO TRANSFER]`. Diagram 16.

## 11. Status matrix

Designed = specified in definitions and docs. Implemented = code and wiring exist. Unit-tested = offline tests. Integration-tested
= exercised through the HTTP API or provider callback in tests. Live-tested = real calls. **No new capability is live-tested.**

| Capability | Designed | Implemented | Unit-tested | Integration-tested | Live-tested |
|---|---|---|---|---|---|
| Healthcare unchanged (golden) | ✔ | ✔ | ✔ | ✔ (existing suites) | as before this work |
| Typed definitions, validator, registry | ✔ | ✔ | ✔ | ✔ (API start) | n/a |
| Workflow runs: tracking, bounded loops, persistence, resume | ✔ | ✔ | ✔ | – | ✘ |
| Per-vertical wording (overlays) and tool allowlists | ✔ | ✔ | ✔ | – | ✘ |
| Education: university, school, coaching, EdTech workflows | ✔ | ✔ | ✔ | – | ✘ |
| Lead capture (`capture_enquiry`) | ✔ | ✔ | ✔ | ✔ (API) | ✘ |
| Department routing, hours, fallback chain | ✔ | ✔ | ✔ | ✔ (Twilio callback) | ✘ |
| Transfer outcome records, one-hop provider fallback, callback task | ✔ | ✔ | ✔ | ✔ (Twilio); Plivo not tested | ✘ |
| Salon booking, change, enquiry | ✔ | ✔ | ✔ | – | ✘ |
| Wellness booking with rooms | ✔ | ✔ (at booking) | ✔ | – | ✘ |
| Room-aware availability (`check_availability`) | ✔ | ✘ | ✘ | ✘ | ✘ |
| Catalog / config / departments / enquiries / transfers / resources APIs | ✔ | ✔ | ✔ | ✔ | ✘ |
| Activation readiness and activate | ✔ | ✔ | ✔ | ✔ | ✘ |
| Dynamic onboarding (catalog, subtype, conditional steps, activation panel) | ✔ | ✔ | ✘ (no frontend unit tests in repo) | tsc + build compile | ✘ |
| Dashboard pages and vertical sidebar | ✔ | ✔ | ✘ | tsc + build compile | ✘ |
| Admin definition view | ✔ | ✔ | ✔ (API) | admin `next build` ✔ | ✘ |
| Landing: beta verticals as pilot options | ✔ | ✔ | ✘ | ✘ (landing has no node_modules here) | ✘ |
| Activation gating live calls | ✔ | ✘ (activation is informational; calls are not blocked) | – | – | – |
| Application-status lookups, student records, SIS / LMS integrations | ✔ (as "never") | not supported | – | – | – |
| Gyms, restaurants | – | not supported (refused at creation) | ✔ | ✔ | – |
