# 28. Pending work: status on 2026-10-05 (branch `version-0.1`)

Every "pending" item from `18_...` (completion plan), `23_...` (system audit) and `26_...` (owner actions) checked against the
code, not against the docs. Three groups: done in this pass, still to build, and what only the owner can do.

Checks on the final commit: backend offline suite **509 passed**, API smoke **54/54**, browser e2e **46/46** (both apps built, real
login forms, real clicks), `tsc` and `eslint --quiet` clean in both apps, both production builds pass.

## 1. Done in this pass

| Item | What was wrong | Now |
|---|---|---|
| CI: admin app | `package-lock.json` out of sync (`npm ci` failed); 10 lint errors in the Voice Studio | Lockfile synced; refs sync in effects; 0 lint errors |
| Patients (P1-10, part) | "New patient" stored a **fake appointment** (no date, no service) that showed in Appointments; every patient read "1 booking"; no edit, delete or history | `patients` table (migration 0012) moves the old fake rows into patient records; real booking counts, last and next visit, active / inactive; edit, remove (hides until they book again; appointments kept), history (appointments and calls); 8 tests incl. other-clinic denial |
| Sign out everywhere (Phase 1) | Not built | Tokens carry issued-at; `users.sessions_revoked_at` (migration 0013); `POST /api/auth/logout-all`; password change signs out other devices, password reset signs out everyone; Settings, Security button; 7 tests |
| STT stream auth | `/api/voice/stt-stream` only checked the token signature (a deleted, deactivated or suspended account could still use Deepgram) | Checks the account, suspension and sign-out |
| Team invites (Phase 1) | The invite token was returned to nobody, no email was sent, `/accept-invite` was a static form: **an invited teammate had no way in**. A member deactivated after joining could reuse the old link to switch themselves back on. The "Staff Member" role was refused by the server | Invite and resend email the link and return it to share; `GET /api/auth/invite`; accept needs a pending invite, 8+ characters and an active clinic; accept page wired; team list shows Active / Invite pending / Deactivated with Resend; role is Practice Manager; 6 tests + browser test |
| Payments | `create-order` and `verify` were sent **without the login**: every payment (onboarding and dashboard upgrade) got 401 and logged the user out. Onboarding voices had the same bug | Both send the login |
| Onboarding plans (Phase 2) | Hardcoded cards and prices; picking a non-selected plan checked out the previously selected one | Reads `GET /api/plans` (names, prices, currency, quotas, features, real yearly saving) |
| Checkout | Showed its own INR / USD table, not what the server charges; **any payment error marked onboarding done and showed success without paying** | Shows the catalog price the server charges; errors are shown; the server's own test mode goes through `verify` |
| API keys and webhooks card | A sample key `sk_live_...4f9a`, Generate / Revoke / Save buttons that did nothing | Says "Coming soon" (same as two-factor) |
| Browser e2e | Still drove the removed admin `/playground` page and the old bar chart | Drives the Voice Studio (always test mode) and the line chart; covers patients, sign out everywhere, invites, plans, checkout |
| Patients page | Two "Add Patient" buttons | One |

Already done before this pass and confirmed in code: billing page on real data, cross-tenant admin lists, admin password reset by a super
admin ("setup link"), quotas, suspension, policies, dashboard real numbers, CI. The admin Customers page and Playground were removed on
purpose in commit `b354ccb`, so they are no longer pending.

## 2. Still to build (code), biggest first

| # | Item | Notes |
|---|---|---|
| 1 | **Real appointments table** (`date`, `time`, `doctor_id`, `patient_id`) and slot queries in SQL (`23_...` P1-10) | Appointments still live in `transactions.details` JSON; the AI booking path (`write_operations.py`, owned by Gemini per `17_...`) must move with it. The patient entity from this pass is the first half |
| 2 | **PII and retention** (`23_...` P0-5) | Transcripts and recordings stored plain, no deletion job. Needs the owner's answer to `26_...` D19 (how long to keep) first |
| 3 | Two-factor sign-in (TOTP) | Settings shows "Coming soon" |
| 4 | API keys and outgoing webhooks | The Business plan lists "API Access"; nothing public exists yet (now marked "Coming soon") |
| 5 | WhatsApp: Meta template submission, media, delivery webhooks, human take-over; live take-over of a phone call | Phase 5 |
| 6 | Retire the legacy `state_machine` engine (`ai/engine/conversation/*`) | Only after a real call passes on `llm_agent` (owner test C13) |
| 7 | Prompt diet: move clinic and Hinglish text into vertical YAML and language packs | Prompt budget 8,000 characters |
| 8 | Overage billing, per-role permissions beyond staff management, outbound campaigns | |
| 9 | Deepgram in the browser playgrounds (relay done, adapter missing) | |
| 10 | Admin "forgot password" on the admin login page | Today a super admin sends a setup link; the user-app reset link also works for admins |

## 3. Landing page and pricing claims to fix (owner decides the wording)

`features_list.md` marks these "do not claim" or "not built", but the current landing page or plans say them:

- "HIPAA & Security" footer link, any HIPAA / SOC 2 wording: nothing is certified.
- Epic / HL7 FHIR in the partners section, "Custom EHR / EMR" in plans: not built.
- "Meta Business Partner" badge: only if AMSh is actually in Meta's partner programme.
- "Systems 99.99% Operational" beacon and latency numbers ("<45ms", "<180ms TTFT"): not measured on a real call.
- Checkout "14-Day Practice Guarantee ... instant full refund": no refund flow exists; keep only if it is a real policy.
- Business plan "API Access": see 2.4.

## 4. Only the owner can do

Unchanged from `26_AMSh_Owner_Actions.md`: rotate the Meta secret, set the webhook secrets and production settings, run
`alembic upgrade head` on the real Postgres (now **through 0013**: `0012_patients`, `0013_session_revocation`), provider accounts and
credits (Groq, Twilio / Exotel, Cartesia), configure email (**needed for invite and reset emails**; until then share the invite link from
the dashboard), the real phone call and browser tests, and the decisions D17 to D24.
