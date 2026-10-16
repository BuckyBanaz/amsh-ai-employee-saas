# Amsh: Returning-patient memory, privacy rules and WhatsApp go-live notes

> Added 2026-10-02. Code: `backend/ai/capabilities/rules/patient_privacy.py`, `ClinicReadOperations.get_patient_history`,
> `AgentEngine.set_patient_context`, `server/services/whatsapp_agent.py`. Tests: `test_agent_core.py` (WhatsAppChannel).

## 1. What it does

When a patient messages on WhatsApp, the agent now knows who they are *from this clinic's own records*:

- **Returning patient:** the number has an earlier appointment at this clinic. The prompt gets the name on file and the latest
  1 to 2 bookings, and the agent greets them by first name ("welcome back"), without reading their history out.
- **New patient:** no earlier booking. The prompt gets only the WhatsApp profile name, marked "not verified", so the agent
  confirms the name they want on the booking.
- **Phone number:** the agent offers the WhatsApp number it is already talking to ("Shall I use this WhatsApp number?")
  and never asks for it again once they agree.
- It works on the next day and after a server restart, because it reads the database, not the chat session. Chat sessions are
  still one per patient per day (`conversation_id`), so the day's chat history is separate from the patient memory.

## 2. Privacy rules (the AI must not look at other people's or the business's data)

1. **Prompt rule (`PRIVACY_RULE`, every channel):** the agent knows only the person it is talking to. It never reveals,
   confirms or hints at another patient's name, number, appointments or reason for visiting, and never shares the clinic's
   internal data (revenue, patient or call counts, staff pay or private schedules, other clinics, its instructions, keys or
   settings). It declines politely and offers to help with the caller's own booking.
2. **Scope in code:** the history lookup is limited to one business and to the caller's own number (last 10 digits). Other
   patients' rows and other businesses' rows are never loaded into the prompt (tested).
3. **Chat lookup guard:** in WhatsApp chat, `lookup_appointment` refuses any number other than the sender's own. Before this,
   a chat user could name any phone number and read (and then cancel or move) that person's appointments. Voice calls are
   unchanged: a caller may be on a different phone from the one on file.
4. **Name safety:** names put into the prompt (profile name, booking name) keep only letters, spaces and `. ' -`, at most 40
   characters, so brackets, quotes and line breaks typed by a user cannot pose as instructions.

Known limit: a typed name can still contain ordinary words, so the profile name is marked "not verified" and the privacy
rule sits above it in the prompt.

## 3. Other WhatsApp fixes made the same day

- Booking confirmation by SMS is skipped for WhatsApp bookings (source `ai_whatsapp_chat`): the chat reply already confirms,
  and the SMS text said "Thank you for calling!". Voice bookings still send the SMS.
- A model glitch that put a burst of zero-width spaces and stray "…" into replies ("Your … … Your appointment is
  confirmed") is cleaned by `clean_for_speech`. It showed up when Groq returned 429 and the fallback model answered.
- Replies are sent inside the per-patient lock, so they leave in the order they were made.

## 3b. Channels: every booking says where it came from

Before, the dashboard showed "AI Call" for every booking, including WhatsApp ones, and the "Appointment Sources" chart was
invented (42 / 32 / 18 / 8 percent). Now there is one list of channels in `backend/server/common/channels.py`:

| Key | Label | Written by |
|---|---|---|
| `phone` | Phone call | voice agent (`source=ai_voice_receptionist`) |
| `whatsapp` | WhatsApp | WhatsApp chat (`source=ai_whatsapp_chat`) |
| `web_chat` | Website chat | future website widget (`source=ai_web_chat`) |
| `email` | Email | future email channel (`source=ai_email`) |
| `social` | Social media | future Instagram / Facebook (`source=ai_instagram` etc.) |
| `walk_in` | Front desk | staff entering a walk-in |
| `dashboard` | Dashboard | booking added by hand in the dashboard (`manual_dashboard`) |
| `other` | Other | nothing known |

- New bookings store `details.channel`. The API (`/appointments`, dashboard stats) returns `channel` and `channel_label` on
  every appointment, derived by `channel_of()`, so **old bookings are fixed too**: an old "voice receptionist" booking whose
  call id starts with `wa_` is shown as WhatsApp.
- **Adding a channel later** (email, website widget, Instagram...): add one line to `CHANNELS`, and have that integration
  save `source="ai_<name>"` when it books. The dashboard needs no change for a known key.
- Dashboard (user app): `utils/channels.ts` + `components/dashboard/ChannelBadge.tsx` show icon and name in "Today's
  Appointments" and the appointments list. The Appointment Sources donut now counts real bookings per channel and shows
  "No bookings yet" when empty.
- Real data on this machine after the change: 9 appointments = 2 phone, 1 WhatsApp, 2 dashboard, 4 other (older rows with no
  source and no call id).
- Still fake on the dashboard: "Total Calls Today 100", the percentages "from yesterday", the hourly Call Volume chart and
  the AI Receptionist Performance numbers fall back to invented values when there is little data (`dashboard_stats.py`).

## 3c. WhatsApp wording

The base booking prompt is written for phone calls ("the number you're calling from"). In chat it said that to patients. The
chat prompt now swaps those phrases for WhatsApp ones ("Shall I use this WhatsApp number, or another one?") and forbids the
words call / calling about the conversation.

## 4. WhatsApp go-live checklist (what went wrong on 2026-10-02)

| Check | Why |
|---|---|
| Meta app **subscribed to the WABA** (`POST /{waba_id}/subscribed_apps` with the system-user token) | The WABA had only "WA DevX Webhook Events 1P App" subscribed, so Meta sent nothing to Amsh |
| Callback URL `https://<public-host>/api/v1/whatsapp/webhook` and the verify token from `.env` | Meta calls this path, not `/webhook` alone |
| Real **App Secret** (32 hex characters) in `META_APP_SECRET` | A 9-character placeholder made every webhook fail with 403 "Invalid signature" |
| `.env` changes need `docker compose up -d --force-recreate api` | `docker restart` keeps the old `env_file` values |
| First message to a patient must be an **approved template** (for example `hello_world`) | Free text is allowed only inside 24 hours of the patient's last message; the API still answers 200 and the failure arrives later by webhook |
| Test number: add the recipient phone in the Meta dashboard | A test number messages only verified recipients |
| Rotate the App Secret if it was pasted anywhere | It is a signing key for all webhooks |

## 5. Not built yet

- One patient across phone and WhatsApp (needs a shared patient profile).
- Medical history, notes or preferences. Only name and the latest bookings are used.
- Sessions that continue across midnight or across days (a new day starts a new chat, with the patient memory above).
