# Multi-vertical diagrams

Mermaid sources (`.mmd`), one diagram per file. All 16 were rendered without errors by `@mermaid-js/mermaid-cli` 11 on
2026-10-25. Each file's first comment says whether it shows **implemented** behaviour or a limitation still open. Architecture
and status: [`../../31_AMSh_Multi_Vertical_Architecture.md`](../../31_AMSh_Multi_Vertical_Architecture.md).

| # | Diagram | Shows |
|---|---|---|
| 01 | [System architecture](01_system_architecture.mmd) | frontends, server routes and services, AI registry / engine / toolbox, tables |
| 02 | [Signup and dynamic onboarding](02_signup_dynamic_onboarding.mmd) | catalog, subtype, steps per vertical, validate, activate |
| 03 | [Vertical resolution](03_vertical_resolution.mmd) | business → definitions → tools, booking order, wording |
| 04 | [Workflow engine execution](04_workflow_engine_execution.mmd) | step kinds, transitions, bounded visits, persistence |
| 05 | [University admissions enquiry](05_university_admissions_enquiry.mmd) | `education.university_enquiry` |
| 06 | [University multi-department transfer](06_university_multi_department_transfer.mmd) | routing by key / intent / context, hours, fallback chain |
| 07 | [School enquiry](07_school_enquiry.mmd) | `education.school_enquiry`, minors' privacy |
| 08 | [Coaching enquiry and demo booking](08_coaching_enquiry_demo_booking.mmd) | lead vs `demo_class` booking |
| 09 | [EdTech sales and support](09_edtech_sales_support.mmd) | sales vs technical support, demo as a lead |
| 10 | [Salon booking](10_salon_booking.mmd) | `salon.appointment_booking`, change |
| 11 | [Spa / wellness treatment booking](11_spa_wellness_treatment_booking.mmd) | rooms, health escalation, known limit |
| 12 | [Human transfer and fallback](12_human_transfer_fallback.mmd) | attempts, provider callback, one-hop fallback, callback task |
| 13 | [Tenant isolation and data flow](13_tenant_isolation_data_flow.mmd) | membership, roles, 404 isolation, call-scoped business |
| 14 | [Workflow error / retry](14_workflow_error_retry.mmd) | tool errors, read-back, loops, save / load failures, idempotency, room race |
| 15 | [Activation / publication](15_activation_publication.mmd) | platform definitions vs tenant activation |
| 16 | [Test and deployment](16_test_deployment_flow.mmd) | suites, golden, migration, builds, live tests (pending) |

Re-validate after an edit:

```bash
npm i @mermaid-js/mermaid-cli@11   # with PUPPETEER_SKIP_DOWNLOAD=1 and a Chromium executablePath in a puppeteer config
npx mmdc -p puppeteer.json -i 05_university_admissions_enquiry.mmd -o /tmp/out.svg
```
