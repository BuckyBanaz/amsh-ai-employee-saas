# Test report, branch `complete`

*Updated 2026-10-04 for policy management (see its section below). The first run, on 2026-10-03, covered the playground test mode, alerts and spend; its numbers were 451 tests, 35 smoke checks and 18 browser checks.*

Run on 2026-10-03 from a clean checkout of this branch, with `bash testing/run_all.sh`. Environment: Linux container, Python 3.11, Node (Next 16), Chromium 1194 through Playwright.

## Result

| Step | Result | Detail |
|---|---|---|
| Backend offline tests | PASS | 475 tests (`backend/ai/evals`), about 75 s |
| API smoke on the real app | PASS | 54 checks, 7 s. Starts from an empty SQLite database, so migrations 0001 to 0011 ran for real |
| Admin typecheck / lint | PASS | `tsc` clean; eslint 0 errors, 20 warnings |
| User typecheck / lint | PASS | `tsc` clean; eslint 0 errors, 262 warnings (mostly `any` in older code) |
| Admin / user production build | PASS | `next build` both |
| Browser end to end | PASS | 33 checks in Chromium, real login forms, 16 screenshots in `screenshots/` |

## What was covered, by this round of work

**Playground test mode (nothing real).** Tests prove that the agent can book, look up, move and cancel inside one test conversation and that the clinic's `transactions` table stays empty; that changing a real appointment only patches a copy; that transfers are recorded, not placed; that without a sandbox bookings are still real (the live path is unchanged); that a playground call id is always forced to a test prefix; that the playground never falls back to the legacy state machine (which runs real tools). The API smoke confirms the same on the running app: no appointment is created. The browser test confirms both playgrounds show the test-mode banner.

**Admin alerts.** Signups, new clinics, clinic sign-ins, failed and blocked sign-ins, free-trial starts, trial-to-plan moves (distinguished from direct purchases), plan changes, suspensions and reactivations, support tickets. Created by real actions in the smoke and browser tests (register, create business, start trial, log in, change plan, suspend), not only seeded rows. Per-admin unread count, mark-read, category muting, access control.

**Spend and profit.** Every tool is priced from what was recorded and the arithmetic is asserted to the cent: telephony, speech to text, text to speech, both LLM providers, SMS, WhatsApp, email. Failed messages cost nothing; the AI's turns are counted for speech, the caller's are not. Test calls are split out as testing spend, and a browser test call uses no phone line. Revenue ignores free trials and other-currency payments (reported, not converted). Editing a rate reprices history; setting it back to the default removes the edit; unknown or negative prices are refused; only a super admin may edit.

**Policy and privacy management (2026-10-04).** 24 unit tests: scope resolution (country beats framework beats global; vertical match; an unrecognised country gets only global policies), publish and supersede, draft-only policies bind nobody, archive and restore, every change audited, super-admin-only writes, starter drafts added once and never published, sign-up consent (no account is created without it once Terms or Privacy are published; the acceptance row records version and IP), owner-only acceptance, only a current applicable version can be accepted, re-acceptance only when the new version asks for it, payment and trial refused until accepted (before any money moves), the platform's privacy instruction reaching the AI's instructions for that region only, key-by-key rule overrides, length limits, the recording notice added to the greeting in English and Hindi, switched off per region, failing open if the lookup breaks. The API smoke repeats this on the running app and checks the opening line the playground stores (built-in notice, then the edited one). The browser test publishes three policies from the admin page, edits the India rule, then as the clinic owner reads the public pages, sees the AI's region summary on the onboarding review step, finds the next step blocked until acceptance, accepts, and later accepts a new version from the dashboard banner.

## What testing found (and was fixed in this round)

1. **The spend-per-day chart drew no bars.** The type check, lint, build and unit tests all passed; the browser screenshot showed an empty chart (percentage heights inside a flex child with no height). Fixed; the browser test now asserts a bar has height.
2. **A tolerant test was hiding a gap.** "Change plan" appeared to pass because the assertion only ran when the call succeeded; it was returning 400 because the fixture had no plan. Made the assertion strict and seeded the plan.
3. **"1 messages"** in the tool table. Fixed.
4. **Stale `next dev` servers from earlier work** were running on the ports and sharing `.next` with the builds, which made a browser run fail for an unrelated reason. The script now runs each app in its own process group and shuts it down.

## Not covered, and the risks that go with it

- **The starter policies are structures, not law.** They say so at the top and are never published automatically; a lawyer must complete them. Nothing here is legal advice, and the recording notice wording per region is yours to confirm.
- **Enforcement of retention is not built.** Policies can state a retention period in text, but nothing deletes recordings or transcripts on a schedule yet.
- **The notice is spoken by the AI, not played as a separate recording**, and only on calls the AI greets (live phone calls and the playground). A transferred call that a human then records is outside it.
- **The old `localStorage` onboarding review still shows some fixed sample values** (for example the voice line number); only the new policy card is real.

- **A real model booking inside the sandbox.** The sandbox is tested with scripted model replies (deterministic). The API smoke and browser runs have no model key, so the AI answers "I'm having trouble"; a live conversation where the model itself books in test mode has not been run. Run one in each playground before relying on it.
- **Playground for tenants set to the legacy engine** now runs the LLM agent (the legacy state machine would execute real tools). Their live calls are unchanged. This is deliberate but changes what those tenants see when they test.
- **LLM token counts are estimated for streamed replies** (about 4 characters per token), because streamed replies carry no usage from the provider. They are marked "est." in the table. Exact counts need `stream_options.include_usage`, which I did not enable without a way to test it against Groq and Gemini.
- **Default prices are estimates** from public price lists, not read from any invoice. Check them on the rate card.
- **Not tracked in spend yet:** post-call analysis, voice previews, WhatsApp provider fees, phone-number rental.
- **Revenue is cash collected in the period**, so a clinic that pays once a year looks very profitable in the month it pays. Profit is shown for the platform and for each clinic; revenue is earned by a plan, not by a tool, so per-tool rows show cost and share only.
- **Alerts are read from the audit trail, not pushed.** There is no email or phone push for them yet, and a trial that expires without converting does not raise an alert (nothing records the expiry event).
- **Postgres, production config, Razorpay live payments, Twilio/Exotel/Meta delivery, email sending** were not exercised: everything ran on SQLite with providers off.
- **Mobile layouts** of the new admin pages were not screenshotted (desktop 1440 px only).
- **eslint warnings** (20 admin, 262 user) are not fixed; none are errors.
