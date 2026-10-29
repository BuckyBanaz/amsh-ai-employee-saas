# 26. What only the owner can do

Everything here needs an account, a password, a payment or a business decision that the code cannot make. Tick them off in this order.
Status as of 2026-10-03.

## A. Security (do first)

| # | Action | Why | Where |
|---|---|---|---|
| 1 | **Reset the Meta App Secret**, then put the new value in `META_APP_SECRET` and restart the API | It was pasted in a chat. WhatsApp webhook checks and token exchange stop working until the new value is in | Meta for Developers, your app, Settings, Basic |
| 2 | Set `EXOTEL_WEBHOOK_SECRET` (a long random value) and **add `?key=<that value>` to the applet URL** in Exotel | Exotel does not sign its requests, so the key in the URL is the only proof the call came from them | Exotel dashboard, your flow |
| 3 | Set `TWILIO_AUTH_TOKEN` if Twilio is used | Twilio webhooks are rejected without it once `ALLOW_DEV_FALLBACKS` is off | `.env` |
| 4 | Production settings: `ENV=production`, `DEBUG=false`, `ALLOW_DEV_FALLBACKS=false`, a random `JWT_SECRET` of 32+ characters, a real `POSTGRES_PASSWORD`, `CORS_ORIGINS`, `PUBLIC_BASE_URL`; start with `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d` | In production the API **refuses to start** with unsafe values; the Security page in the admin portal lists what is still wrong | `.env`, server |
| 5 | Run the database migrations on the real Postgres: `alembic upgrade head` (new: 0006 templates, 0007 SEO, 0008 support and announcements, 0009 alert state, 0010 usage events and cost rates, 0011 policies, 0012 patients, 0013 sign out everywhere) | They were tested on SQLite only | server |
| 6 | Review the GitHub dependency alerts once this branch is merged; two are known and cannot be fixed yet (`braces` in the lint tool, `ecdsa` inside `python-jose`) | The rest were fixed | GitHub, Security |
| 7 | Turn on branch protection so a pull request needs the CI checks to pass | CI now exists (`.github/workflows/ci.yml`) | GitHub, Settings, Branches |

## B. Accounts and money

| # | Action | Symptom today |
|---|---|---|
| 8 | Groq paid tier | The free daily cap is used up after about 100 turns; calls fall back to a "did not hear you" line |
| 9 | Twilio account inactive; Exotel balance empty | Confirmation and reminder SMS fail |
| 10 | Cartesia credits | The voice stops when they run out |
| 11 | Qdrant (or accept the local index) | Knowledge search uses the local index |
| 12 | Configure email (admin portal, Integrations, Email) | New admins and invited clinic staff cannot receive their "choose your password" link until email works |
| 12a | **Check the rate card** (admin, Usage & Limits, bottom) against your Groq, Gemini, Deepgram, Cartesia, Twilio / Exotel, Meta and email invoices, and correct the prices | The defaults are estimates from public price lists; the spend and profit numbers are only as good as these |
| 12b | **Write and publish the policies** (admin, Policies & Privacy): add the starter drafts, have a lawyer complete Terms, Privacy and the DPA / BAA for the regions you sell in, then publish. Check the recording notice wording for each region (AI privacy rules tab) | Until you publish, nobody is asked to accept anything; the starter text is a structure, not legal advice. The AI already says a built-in recording notice on recorded calls |

## C. Tests only a person can do

| # | Test | What it proves |
|---|---|---|
| 13 | **One real phone call** in English and one in Hindi, with an interruption | Response time, barge-in, Hindi, the media-stream token |
| 14 | Click through both apps in a real browser (register, onboard, first call, book, invite a teammate, reset password, admin sign-in, suspend a clinic) | Nobody has done this end to end |
| 15 | Listen to the voices: laughter, fillers, Indian accent | Quality is by ear |
| 15a | In **both** playgrounds (the clinic's and the admin's `/playground`), book, move and cancel an appointment by talking to the AI with a real model key; then check the clinic's calendar is unchanged and the list "What the AI would have done" shows each step | The sandbox is tested with scripted replies; no live model has driven it yet |
| 16 | Send a real WhatsApp message from a real number | The Meta test number works; a clinic number has not been tried |
| 16a | **Voice benchmark: 5 to 10 test calls** (2026-10-26). Plan and pass criteria: `07_...` section 7.2. Save `docker compose logs api` before recreating the container | The latency and interruption changes of 2026-10-25 are not measured; the logs of the 2026-10-26 test call were lost on a container recreate |
| 16b | **Before restarting the API on `version-0.5`:** migration `0016` gives every trial and paid clinic an end date (Demo clinic -> no end, Mayo Clinic -> a month). Read `32_...` section A first | After the end plus 3 days, a clinic's calls are refused |

## D. Decisions

| # | Question | Default used until you decide |
|---|---|---|
| 17 | Patient messages: from a shared AMSh number or the clinic's own? (DOCS/24 question 1) | Whatever channel is connected |
| 18 | May a clinic edit consent and privacy wording? (question 2) | Yes, everything clinic-owned is editable |
| 19 | How long is message text kept? (question 3) | Kept; no deletion job yet |
| 19a | Razorpay auto-recurring (chosen 2026-10-26): enable Subscriptions on the Razorpay account, say whether it accepts USD, create a webhook secret and a public webhook URL, and approve creating plans in the account | Phase 1 (end dates and grace) works with one-off payments |
| 19b | Expiry decisions made in phase 1: paying during a trial ends the trial at once; staff-activated clinics never expire; WhatsApp is not cut off; `pending` clinics still answer calls | As listed |
| 19c | Capacity: host vCPU / RAM / region, replicas, Postgres `max_connections`, and provider plan limits (Twilio, Deepgram, Cartesia, Groq, Gemini) | No capacity number can be given without them (`32_...` section E) |
| 19d | `backup_before_0015.sql` in the repo root is a database dump (likely patient data): keep it out of git, move it somewhere safe | Untracked today |
| 20 | Which regions need registered SMS templates first? (question 4) | India (DLT id field exists) |
| 21 | Charge for messages beyond the plan, or stop at the limit? (question 5) | Reported only, never cut off |
| 22 | **Stop answering calls when a clinic's plan minutes run out?** Set `ENFORCE_VOICE_QUOTA=true` to enable | Off: minutes are shown, calls are never cut |
| 23 | Marketing site: set the Site URL, social image, Google Analytics ID and Search Console code in **Admin, SEO** | The sitemap is empty until the Site URL is set |
| 24 | Price per minute / per clinic (see DOCS/25 section 4) | Not decided |
