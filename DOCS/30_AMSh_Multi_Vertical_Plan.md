# 30. Multi-Vertical Plan: education and SMB (salon, spa) next to healthcare

Status: **PLAN** (written 2026-10-17). Nothing here is built yet.
Decision owner: Parikshit. Related: `04_AMSh_MVP_Scope_and_Roadmap.md` (healthcare-first MVP), `21_AMSh_Language_Layer_and_Slot_Rules.md`
(BusinessContext, slot rules), `22_AMSh_Language_Packs_and_Runtime_Context.md` (vertical / language / region dimensions),
`20_AMSh_Returning_Patient_Memory_and_Privacy.md` (memory and privacy rules).

## 1. Why

The incubation team suggested adding education (universities, schools, institutes) and SMB (salons, spas) to the MVP. The
pitch becomes "healthcare live, salon/spa ready, education in pilot" instead of a single vertical.

**Rule above everything else: the clinic workflow and behaviour must not change.** Every business type has its own workflow,
so each vertical gets its own; healthcare keeps exactly the one it has today.

## 2. What exists today (checked in code, 2026-10-17)

| Piece | Status | Where |
|---|---|---|
| Vertical schema: intents, slots, terminology, escalation rules, prompt template | Built | `backend/ai/verticals/schemas.py` |
| Vertical configs | Clinic only, in en / hi / es / nl | `backend/ai/verticals/configs/clinic/*.yaml` |
| Registry: loads configs, refuses an unknown vertical (never silently "clinic") | Built | `backend/ai/verticals/registry.py` |
| Per-business vertical, read on every call / chat | Built | `Business.vertical`, `load_vertical_name` (gateway), `whatsapp_agent.py` |
| Compliance rules per region + vertical | Built | `server/services/policies.py`, `facts.py` (`compliance_clause`) |
| Language packs (all spoken wording is data) | Built, 7 languages | `backend/ai/locales/lexicon/*.json`, `backend/ai/locales/*.json` |
| Tools: availability, booking, reschedule, cancel, transfer, memory | Built, not tied to a vertical | `backend/ai/engine/agent/toolbox.py` |
| **LLM agent prompts** | **Clinic-worded**: "clinic / patient / doctor / medical" about 51 times in `receptionist.json` + `engine_notes.json`, about 73 more in the agent code (46 of them in `toolbox.py`) | `backend/ai/prompts/receptionist.json`, `engine_notes.json`, `toolbox.py` messages |
| **Booking order** | **Fixed in code**: service, date, time, name, phone | `backend/ai/engine/agent/controller.py:28` (`SLOT_ORDER`) |
| Medical emergency rule, "returning patient" memory wording | Clinic-specific, applied to every business | `capabilities/rules/safety_emergency.py`, `engine_notes.json` (`known_patient`) |
| Frontend vertical config | Clinic only (Patient / Doctor / Treatment); `BusinessType` already lists `salon`, `gym`, ... | `frontend/user/business/registry/index.ts`, `frontend/user/verticals/clinic/config.ts` |

So the platform layer (registry, configs, compliance, languages, tools, telephony) is already vertical-aware. What is
clinic-only is what the AI is told to say and the booking order.

## 3. How the verticals differ

| | Healthcare (today) | SMB: salon, spa | Education: school, coaching, university |
|---|---|---|---|
| Main job of a call | Book / move / cancel an appointment | Same as healthcare | Enquiry and admission questions; campus visit or counselling |
| Customer / staff / offer | Patient / Doctor / Treatment | Client / Stylist or Therapist / Service | Student and Parent / Counsellor / Course or Program |
| Workflow (one item per turn) | service, date, time, name, phone | service, stylist (optional), date, time, name, phone | course or class, student name, parent, phone, then a visit time if wanted |
| Main outcome | Appointment | Appointment | **Lead** (enquiry), sometimes a visit booking |
| Special rules | Medical emergency, health privacy (HIPAA / DPDP) | None medical; normal "talk to staff" escalation | Minors' data: ask only what is needed, parent's number first |
| Reuse of today's engine | 100% | About 90%: wording, workflow config | About 60%: needs an enquiry tool and an Enquiries view |

## 4. Guardrails (every phase)

1. **Golden test before anything changes**: save the full clinic system prompt, the booking flow and the tool messages as they are
   today. After every change the clinic output must be identical, character for character. Any difference fails the build.
2. **The existing suite stays green**: 327 agent tests plus the voice, security, policy and language suites. Known failures
   (2 agent, 4 security, 1 tenant routing, as of 2026-10-17) are tracked separately and must not grow.
3. **New verticals only on new businesses**: Demo clinic and Mayo stay `clinic`. Each new vertical is tested on its own demo business.
4. **Language rules unchanged**: vertical wording goes into packs and prompt files, never into Python; en + hi at minimum.
5. **Clinic is the default**: a business whose vertical is `clinic` gets exactly today's configuration.

## 5. Phases

### Phase 0: make the engine vertical-aware (clinic unchanged)

1. Split `receptionist.json` in two:
   - **Common rules** for every vertical: sound human, one question per turn, never invent dates or times, language rules, offer
     the calling number, and so on. Keeping these in one place means a fix reaches every vertical at once.
   - **Vertical file** `backend/ai/prompts/verticals/healthcare.json`: role ("receptionist of a clinic"), terminology, privacy,
     emergency wording. Only what is specific to the vertical.
2. Move the clinic words in `engine_notes.json` and the toolbox messages (patient, doctor, returning patient) into the vertical file
   behind placeholders such as `{customer}`, `{staff}`, `{service}`, `{booking}`.
3. Move `SLOT_ORDER` from `controller.py` into the vertical config. Healthcare's default is today's order.
4. The prompt builder joins common rules + the business's vertical file. The prompt budget (8,000 characters) applies to the result.
5. The medical emergency line and health-privacy rule apply only where the vertical says so. Emergency *detection* stays on for
   every vertical (an emergency can happen anywhere); only the wording changes.

Done when: the golden test is identical, every suite is as green as before, and 3 to 4 test calls on Demo clinic show no difference.

A quicker alternative was discussed: rename `receptionist.json` to `healthcare_receptionist.json` and copy it per vertical. It has
zero risk for the clinic, but every shared rule would then live in several files and drift apart as fixes land in one and not the
others. The split above is preferred; the copy approach is acceptable only as a short-term step.

### Phase 1: SMB (salon, spa)

1. `salon` vertical: YAML configs (en, hi), prompt file, terminology (Client, Stylist / Therapist, Service, Appointment).
   Spa is a `sub_type` preset of the same vertical, not a separate vertical.
2. Workflow: service, stylist (optional), date, time, name, phone.
3. Escalation: "connect you to our staff" instead of the doctor / medical wording.
4. Frontend: `salonConfig`, vertical choice in onboarding, dashboard labels (Clients instead of Patients).
5. A demo salon (services with duration and price, stylists, hours) and test calls on it.

Done when: a full booking call on the demo salon never says "patient", "doctor" or "clinic", and the clinic golden test and suites are unchanged.

### Phase 2: Education (pilot)

1. New intents: enquiry / admission, information (fees, courses, eligibility, deadlines), campus visit or counselling booking, callback.
2. New tool `capture_enquiry`: saves student name, parent, class or course, phone and the question as a lead
   (`Transaction` of type `enquiry`).
3. Workflow: course or class, student name, parent, phone, then a visit time if they want one.
4. Privacy for minors: ask only what the enquiry needs; the parent's number is the primary contact.
5. Dashboard "Enquiries" page: staff see each lead and mark the callback done.
6. Sub-type presets: school, coaching institute, university (defaults and wording only, one code path).

Done when: an enquiry call on a demo school creates a lead visible in the dashboard. Then a pilot with one real school or institute.

### Phase 3: launch

- Landing page: SEO pages and use cases for education and salons.
- Pricing per vertical, if needed.
- Pitch line: "Healthcare live, salon/spa ready, education in pilot".

## 6. Risks

| Risk | Where | Mitigation |
|---|---|---|
| Clinic behaviour changes during the split | Phase 0 prompt refactor | Golden test, existing suites, test calls before any new vertical work |
| Shared prompt budget (8,000 characters) | Common + vertical text | Measured per vertical; the vertical file holds only what differs |
| Medical wording leaking into other verticals | Emergency and privacy lines | Per-vertical wording, shared detection |
| Education needs a different outcome (lead, not booking) | Phase 2 | New tool and Enquiries view; pilot with one real customer first |
| Shared rules drifting between verticals | Copy-per-vertical approach | Common rules file (Phase 0 split) |

## 7. Open decisions

1. Education's first customer type: school, coaching institute or university? The workflow is built for that type first.
2. SMB scope now: salon and spa only, or also gyms and others?
3. A pilot school or institute for Phase 2, possibly through the incubator's network.
4. Order: Phase 0, then SMB, then education (recommended: SMB reuses the booking flow almost entirely).
