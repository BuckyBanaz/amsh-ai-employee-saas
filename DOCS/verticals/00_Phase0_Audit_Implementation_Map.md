# Phase 0: audit and implementation map (multi-vertical)

Audited on branch `version-0.5` (identical to `version-0.4` at commit `0b89a05`) on 2026-10-25, before any multi-vertical change.
This is the "before" picture; [`../31_AMSh_Multi_Vertical_Architecture.md`](../31_AMSh_Multi_Vertical_Architecture.md) describes what
was built on top of it.

## 1. Repository state at the start

| Item | Finding |
|---|---|
| Branch | `version-0.5` (the user chose it instead of `version-0.4`; same commit `0b89a05`) |
| Working tree | clean, nothing untracked |
| Backend suite | 679 passed, 5 failed, 1 skipped (Python 3.12, `backend/requirements.txt`). The 5 failures existed before this work (§5) |
| Plan in the repo | [`../30_AMSh_Multi_Vertical_Plan.md`](../30_AMSh_Multi_Vertical_Plan.md): status PLAN, nothing built; Phase 0 (prompt split) proposed |

## 2. What existed (checked in code)

| Area | Where | State before this work |
|---|---|---|
| Vertical language configs | `backend/ai/verticals/configs/clinic/*.yaml` | clinic only (en, hi, es, nl). Intents and tool names in the YAML were informational: they named tools (`answer_faq`, `transfer_call`, `hangup`) that the LLM agent does not use |
| Vertical registry | `backend/ai/verticals/registry.py` | refuses an unknown vertical (never silently "clinic") |
| Business fields | `Business.vertical`, `business_type`, `business_subtype` | `business_subtype` was free text (the settings page stored names like "Dental Clinic") |
| Allowed verticals | `routes/businesses.py` `ALLOWED_VERTICALS` | `clinic, hospital, restaurant, gym, salon`: four of the five had no configuration, so a business created with them could not take a call |
| Agent tools | `engine/agent/toolbox.py` `TOOL_SCHEMAS` | 9 tools, all offered to every business, filtered only by the owner's switches |
| Booking order | `engine/agent/controller.py` `SLOT_ORDER` | fixed in code: service, date, time, name, phone |
| Prompt wording | `ai/prompts/receptionist.json`, `engine_notes.json` | clinic words ("clinic", "patient", "doctor") throughout |
| Operations | `capabilities/operations/registry.py` | clinic operations only; any other vertical raised |
| Human transfer | `ai/tools/common/transfer_call.py`, `/api/voice/transfer-status` | one destination (fallback number, business line or the first staff member with a phone); no department directory; no record of transfer outcomes; a missed transfer only spoke a callback line and sent a staff alert |
| Leads / enquiries | none | no table, no tool, no page |
| Rooms / resources | none | bookings held a doctor only |
| Workflow state | none | per-call state lived in memory (`CallState`) only |
| Frontend vertical registry | `frontend/user/business/registry`, `verticals/clinic/config.ts`, `components/navigation/resolver.ts` | clinic only; the resolver and `business.store` were not used anywhere; the sidebar was hardcoded |
| Onboarding | `frontend/user/app/onboarding/*` | fixed step list in `layout.tsx`; vertical select offered restaurant / gym / hospital / salon (unsupported); no subtype; review read localStorage |
| Admin | `frontend/admin/src/app/(admin)/verticals` | read-only template list, status hardcoded "Live" |
| Landing | `frontend/landing-page` | healthcare and dental pages only |

## 3. Reused, not rebuilt

- `VerticalConfig` YAMLs stay the per-language layer; the new workflow definitions sit beside them.
- Appointments remain `transactions` rows of type `appointment` (the F1 audit fix keeps the appointments API to that type);
  customers remain `patients` rows; staff and services keep their tables (services gained `kind`, `attributes`, `resource_kind`).
- The confirmation gate (`ActionGate`, `check_confirmation`), grounding checks, idempotency patterns, `audit()`, the
  `_shared.py` membership helpers and the operations registry are reused as they are.
- `transfer_call` and the Twilio / Plivo `<Dial action>` callbacks are extended, not replaced. Cartesia, Deepgram, Twilio, Plivo
  and the LLM pipeline are untouched.

## 4. Regression risks identified (and how they are covered)

| Risk | Cover |
|---|---|
| Clinic prompt, tools or booking order change during the refactor | `test_clinic_golden.py`: 6 settings combinations, tool schemas, scripted controller notes, every engine message, character for character |
| Clinic transfers change | `test_vertical_runtime.TransfersThroughTheDirectory.test_a_clinic_without_a_directory_transfers_exactly_as_before`; the department path runs only when a business has a directory |
| Prompt overlays drift from the base packs | `overlay_problems()` + `test_prompt_overlays_still_apply_to_the_base_packs` (also catches a changed `{placeholder}`) |
| Unknown vertical treated as clinic | registry and API tests (`UnknownVerticalError`, 422 on create) |
| Migration reinterprets clinic data | 0015 is additive; existing services become `kind="service"`; verified up / down / up on SQLite |

## 5. Failures that existed before this work (not caused by it)

| Test | Cause |
|---|---|
| `test_agent_core::Runtime::test_resolve_mode_prefers_tenant_and_defaults_to_legacy` | default agent mode now `llm_agent` |
| `test_agent_core::GatewayWiring::test_llm_outage_hands_the_turn_back_to_the_state_machine` | same mode change |
| `test_security::PaidVoiceEndpoints::test_call_me_validates_the_number_uses_own_business_and_is_limited` | Exotel to Plivo switch in 0.4 |
| `test_security::NoUnguardedRoutes::test_only_reviewed_routes_are_open` | `GET /api/telephony/available-numbers` is open and not on the reviewed list |
| `test_tenant_hardening::CallsRouteOnlyThroughAssignedNumbers::test_assignments_are_audited_and_removable` | commit `6b76241` on 0.4 added a `business_phone` fallback back into `number_routing.resolve_business` (partly undoes audit fix F3); left as is, it is the owner's change |
| `frontend/user` `next build` type check | `app/(dashboard)/conversations/page.tsx` and `ConversationsSidebar.tsx` type errors; compilation itself succeeds |
