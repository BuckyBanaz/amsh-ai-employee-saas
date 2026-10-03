# 24. Message Templates and Channels Plan (Email, SMS, WhatsApp, In-app)

Status: **PARTLY BUILT** (written 2026-10-03). Owner of the decision: Parikshit.
Built: admin Templates and clinic Settings > Messages screens (design previews with sample data, not yet connected), and the backend API
(section 11). Not built: moving the hardcoded senders onto it, the single `dispatcher.send()`, Meta template sync, delivery webhooks, plan caps.
Why: today every outgoing message is a string inside Python code. The admin cannot change a wording, a clinic cannot make a reminder sound
like itself, and there is no record of what was sent. This plan gives both portals one template system over four channels.

## 1. The idea in one picture

```
 EVENT happens                 TEMPLATE chosen               CHANNEL chosen              SENT + LOGGED
 (booking confirmed,    -->    business override first,  --> by the clinic's preference  --> adapter (SMTP / SMS /
  reminder due, trial          else platform template,       order, with fallback and       WhatsApp / in-app),
  ending, password reset)      else built-in default         quiet hours                    message_log row, delivery status
```

Two owners, one editor design:

| | Admin portal (platform) | User portal (business / clinic) |
|---|---|---|
| Whose messages | AMSh to its customers: business owners and staff | The clinic to its patients and its own staff |
| Channels | **Email, SMS, WhatsApp, In-app notification** (all four) | The same four; the platform decides which are switched on for a plan |
| Templates | Platform templates: the default for everyone | Overrides of a platform template; "Reset to default" always available |
| Channel setup | Email SMTP (done), SMS provider, WhatsApp number and Meta template sync | Pick which channel sends which event, in what order, quiet hours |
| Extras | Delivery log for the whole platform, template approval status | Delivery log for the clinic, test send to own phone |

## 2. What exists today (from the code, 2026-10-03)

| Message | Where it is hardcoded | Channel today |
|---|---|---|
| Verify email, password reset, team invite | `server/api/routes/auth.py` (`send_email`) | Email (portal SMTP, else Resend, else log) |
| Staff alerts: escalation, booking, missed call | `server/notifications/dispatcher.py` `notify_staff` | SMS and email |
| Booking confirmation to the patient | `dispatcher.dispatch_booking_confirmation` | SMS and dashboard push |
| Appointment reminder | `server/workers/jobs/reminders.py` `reminder_text` | SMS / WhatsApp |
| WhatsApp chat replies and templates | `server/services/whatsapp_agent.py` `send_text`, `send_template` | WhatsApp |
| SMS tool used by the AI | `ai/tools/common/send_sms.py` | SMS (Exotel, Twilio) |
| Post-call summary | `server/services/post_call.py` | dashboard |

Step zero of the work is to move all of these strings into default templates, with no change in wording (checked by a golden comparison like
the one used for the prompt refactor).

## 3. Events (the catalogue)

Each event has a fixed list of allowed variables, so a template can never reference something that does not exist.

| Group | Event key | Goes to | Variables (examples) |
|---|---|---|---|
| Account (admin owns) | `auth.verify_email`, `auth.password_reset`, `team.invite` | owner / staff | `name`, `link`, `business_name` |
| Billing (admin owns) | `billing.trial_ending`, `billing.payment_receipt`, `billing.plan_limit_reached` | owner | `days_left`, `plan`, `amount`, `invoice_link` |
| Patient messages (clinic owns) | `booking.confirmed`, `booking.rescheduled`, `booking.cancelled`, `booking.reminder`, `call.missed_followup`, `feedback.request` | patient | `patient_name`, `service`, `doctor`, `date`, `time`, `clinic_name`, `clinic_phone`, `manage_link` |
| Staff alerts (clinic owns) | `alert.escalation`, `alert.booking`, `alert.missed_call`, `call.summary` | clinic staff | `caller`, `reason`, `summary`, `call_link` |
| Platform alerts (admin owns) | `platform.provider_down`, `platform.signup` | platform admins | `provider`, `message` |

## 4. Data model

`message_templates`

| Column | Meaning |
|---|---|
| `id`, `scope` | `platform` or `business` |
| `business_id` | null for platform templates |
| `event_key`, `channel`, `language` | one row per event x channel x language (`email`, `sms`, `whatsapp`, `push`; language codes from `ai/locales`) |
| `subject`, `body`, `html_body` | subject and html only for email; `body` is plain text for every channel |
| `status` | `draft`, `active`, `archived` |
| `whatsapp_name`, `meta_status` | Meta template name and `pending` / `approved` / `rejected` (WhatsApp only) |
| `sms_template_id` | regulator template id where required (India DLT) |
| `version`, `updated_by`, `updated_at` | every edit makes a version; edits are audited |

`message_log`: `id`, `business_id`, `event_key`, `channel`, `recipient` (masked in the UI), `template_id` + `version`, `status` (`queued`, `sent`,
`delivered`, `read`, `failed`), `provider`, `provider_message_id`, `error`, `created_at`. No message body stored for patients beyond the rendered
text that was sent, kept for a limited period (retention is an open question).

`channel_preferences` (per business, in settings JSON): for each event, an ordered list such as `["whatsapp", "sms"]`, an on/off switch, quiet
hours in the business timezone.

## 5. How a message is resolved and sent

1. **Find the template**: business override (event, channel, language) then platform template (same) then platform template in English then the
   built-in default. The first active one wins. The language is the patient's, falling back to the business language (see `DOCS/22`).
2. **Render**: `{{variable}}` placeholders only, from the event's allow-list; no code, no loops. Email html is escaped. A missing variable fails the
   render loudly in tests and falls back to an empty string in production with a log line.
3. **Check the channel rules**:
   - SMS: length and segments shown in the editor; DLT template id where the region needs it.
   - WhatsApp: inside the 24-hour window free text is allowed; outside it only an **approved Meta template** may be sent, with the body variables
     mapped to `{{1}}`, `{{2}}`. A template that is not approved is never sent; the next channel in the order is used.
   - Email: subject, sender name and logo from the platform SMTP settings (done).
   - In-app: written to the notifications feed (the existing SSE push and `/notifications` page).
4. **Respect the person**: opt-out (a STOP reply on SMS / WhatsApp), consent flag on the patient, quiet hours, one retry on failure, then fall
   through to the next channel.
5. **Log** a `message_log` row; provider webhooks (Meta statuses, Twilio / Exotel callbacks) update the status later.

The one entry point replaces the scattered senders: `NotificationDispatcher.send(event, recipient, context, business_id)`.

## 6. Admin portal screens

- **Templates**: a grid of events (rows) by channel (columns: Email, SMS, WhatsApp, In-app), each cell showing active / draft / missing and the
  language. Opening a cell gives the editor: body, subject (email), variable chips that insert `{{name}}`, a live preview on a sample
  patient, character and segment counter, WhatsApp approval status, version history with restore, and "Send test to me".
- **Channels**: the existing Integrations page extended with the channel view: Email (SMTP, done), SMS (Twilio / Exotel sender and default
  provider), WhatsApp (platform number, Meta template sync), In-app. Each shows live status and today's volume.
- **Delivery log**: filter by business, event, channel, status; click a row for the rendered message and the provider response.
- **Notifications** (exists): platform alerts such as a provider down; becomes the in-app channel of the same system.

## 7. User portal screens

- **Settings, Messages**: the same editor, scoped to the clinic. A template starts as "Using the AMSh default"; "Customize" copies it to the
  clinic's own version; "Reset to default" deletes the override. Only events marked clinic-owned appear.
- **Channels and timing**: per event, switch on or off and choose the order of channels; quiet hours; which number or sender is used.
- **WhatsApp templates**: "Submit for approval" sends the template to Meta and shows pending / approved / rejected with the reason.
- **Message log**: this clinic's last messages and their delivery status.
- Preview uses the clinic's own name, doctor and language; the AI receptionist and the templates use the same language packs.

## 8. Plan limits and compliance

- A plan can cap SMS and WhatsApp messages per month (usage counted from `message_log`); email is not capped.
- India: SMS needs registered templates and a sender id (DLT); WhatsApp business-initiated messages need approved templates. UAE and other regions
  have their own SMS sender rules. These are per-region switches stored with the region policy (`ai/verticals/compliance.py`).
- Patient privacy: no medical detail in SMS or WhatsApp bodies beyond what the clinic chose; masked numbers in logs; templates cannot contain
  secrets; admin edits to platform templates are audited like other admin actions.

## 9. Order of work

| Phase | Work | Result |
|---|---|---|
| P0 | Tables and migration; move every hardcoded string into default templates (same wording, golden check); renderer with allow-lists; `message_log`; one dispatcher entry point | Nothing changes for users; everything is now data |
| P1 | Admin Templates + Channels + Delivery log for platform events (verify, reset, invite, trial, receipt, alerts) | Admin edits platform email / SMS / WhatsApp / in-app wording |
| P2 | Business overrides and the User portal Messages screens for reminders, confirmations, cancellations, missed-call follow-up | Each clinic sounds like itself |
| P3 | WhatsApp Meta template sync and approval states; SMS regulator template ids; opt-out handling | Compliant business-initiated messages |
| P4 | Delivery webhooks to statuses, usage caps per plan, template analytics (sent, delivered, read, replies) | Measurable messaging |

## 10. Open questions for Parikshit

1. Is the patient SMS / WhatsApp sender a shared AMSh number, or the clinic's own number (WhatsApp Embedded Signup already supports the clinic's own)?
2. May a clinic edit the wording of legally sensitive messages (consent, privacy notices), or are those locked platform templates?
3. How long is the message body kept in `message_log` (30, 90 days, or only metadata)?
4. Which regions need regulator-registered SMS templates first (India DLT is the known one)?
5. Should the platform charge per SMS / WhatsApp beyond the plan quota, or stop at the limit?

## 11. Backend API (built 2026-10-03)

Code: `server/database/models/message_template.py` (tables `message_templates`, `message_log`, `message_preferences`, migration `0006`),
`server/services/message_templates.py` (event catalogue, built-in defaults, renderer, resolver), `server/api/routes/message_templates.py`.
Tests: `ai/evals/test_message_templates.py` (16, including tenant isolation and role checks).

| Who | Endpoint |
|---|---|
| Platform admin | `GET /api/admin/message-templates/meta`, `GET /api/admin/message-templates` (grid), `GET / PUT / DELETE /api/admin/message-templates/{event}/{channel}`, `POST .../preview`, `POST .../restore`, `GET /api/admin/message-log` |
| Clinic (members read, owner / admin write) | `GET /api/businesses/{id}/message-templates`, `GET / PUT / DELETE .../message-templates/{event}/{channel}`, `POST .../preview`, `POST .../restore`, `GET / PUT .../message-preferences`, `GET .../message-log` |

Rules in code: only the event's own `{{variables}}` are accepted (400 otherwise); an email needs a subject; length limits per channel; every save
makes a version (20 kept) and is audited; a clinic can only touch clinic-owned events (account, billing and platform alerts are admin-only, 403);
editing WhatsApp text clears its Meta approval; a draft is never sent; resolution is clinic override, platform template, same in English,
built-in default. The log masks phone numbers and emails.

Still to do on the backend: `NotificationDispatcher.send(event, recipient, context, business_id)` that uses `resolve()`, `render()`,
the channel order and quiet hours from `message_preferences`, and writes `message_log`; move each hardcoded string over (with a golden check);
Meta template submission (the screens' "Submit for approval" has no endpoint yet); "send test to me"; provider status webhooks; plan caps;
`html_body` for email. Open: message-log retention (question 3 below).
