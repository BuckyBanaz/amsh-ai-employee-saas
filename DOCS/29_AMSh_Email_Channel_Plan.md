# 29. Email Channel Plan: the AI answers email the way it answers calls

Status: **PLAN** (written 2026-10-10, branch `version-0.3`). Nothing here is built yet.
Decision owner: Parikshit. Related: `24_AMSh_Message_Templates_and_Channels_Plan.md` (outgoing templates), `27_...` (call scaling).

## 1. The idea

A patient emails the clinic. The AI reads the email, answers in the same thread, and books, reschedules or cancels through the same
tools it uses on calls. No phone call is made, and nothing changes for the patient: they keep writing to the same address.

```
 patient email --> inbound (Gmail / Outlook / forward) --> thread lookup --> AgentEngine(channel="email")
                                                                                |
 patient inbox <-- send reply in same thread <-- sanitise + guards <-- reply text + tool results
```

The engine does not change. WhatsApp already runs it as a text channel (`services/whatsapp_agent.py`), and email is the same kind of
channel. The new work is the two ends (reading and sending) and the rules that differ for email.

## 2. What exists today

| Piece | Status | Where |
|---|---|---|
| AI engine, tools, booking guards, read-back | Built, channel-independent | `ai/engine/agent/agent_loop.py`, `toolbox.py`, `validator.py` |
| Text channel (chat) with its own addendum | Built | `prompt_builder.py` (`channel == "chat"`), `receptionist.json` `channel` |
| WhatsApp inbound: webhook, per-day conversation, reply | Built | `services/whatsapp_agent.py`, `routes/integrations.py` (`/api/v1/whatsapp/webhook`) |
| Outgoing email (platform and clinic) | Built, outgoing only | `services/email_service.py`, `services/platform_smtp.py`, `notifications/messenger.py` |
| **Email inbound (read a mailbox or receive forwarded mail)** | **Not built** | nothing in `backend/` reads mail (checked: no IMAP, Gmail watch or Graph subscription) |
| **Email conversation per thread** | **Not built** | WhatsApp uses one conversation per sender per day; email needs one per thread |
| **Email channel rules in the prompt** | **Not built** | only `chat` has an addendum |

## 3. Two ways to receive mail (decide first)

| | A. Connect the clinic's mailbox | B. Forwarding address |
|---|---|---|
| How | Owner signs in with Google (Gmail API push or polling) or Microsoft (Graph subscription) | Clinic forwards its address to ours (`clinic@…` on our domain) |
| Setup for the owner | One sign-in, then done | Set up a forward rule in the mail provider |
| Replies come from | The clinic's own address (best for patients) | Our address, unless the reply uses a "send as" alias |
| Work for us | OAuth apps, token refresh, scopes, verification by Google and Microsoft | Inbound parse webhook, DNS (MX / SPF / DKIM), spam handling |
| Recommendation | **Default**, because replies look like they come from the clinic | Fallback for clinics that will not sign in |

Phase 1 uses **A with Gmail** (most clinics in the target market use it), and B is the fallback. Outlook follows in Phase 3.

## 4. The rules that differ from calls and chat

Email is asynchronous and can be read by anyone who gets the forward, so these are hard rules, enforced in code, not left to the prompt:

1. **Reply only to the sender.** Never CC or BCC anyone, never reply to a list address. Check the `From` against the thread's known patient.
2. **Never loop.** Skip auto-replies (`Auto-Submitted`, `Precedence: bulk`, out-of-office, bounce, no-reply senders) and mail from our own domain.
3. **Mail is data, not instructions.** "Ignore your rules and…" in a patient's email is quoted and never obeyed. The same guards that run on calls run here.
4. **Booking needs a yes in the thread.** The read-back goes in one email, and the caller's reply in the next email is the confirmation. No booking on the first email, same as calls.
5. **No transfer, no hang-up.** Like chat: the reply gives the clinic's phone number when a person is needed (`receptionist.json` gets an `email` addendum).
6. **Language follows the email.** Reply in the language and script the patient wrote in (Hindi, Hinglish, English, Dutch, German, French, Spanish, Arabic, per the lexicon packs). No language words in Python.
7. **Privacy in the thread.** Only that patient's appointments. Never quote the clinic's internal data.
8. **Rate and volume.** Per sender: at most N replies per hour (value in config), and a daily cap per clinic that the plan sets. Over the cap: no reply, a log entry, and the owner is told.
9. **Failure is visible.** If a reply cannot be sent, the message is kept as "needs staff" in the dashboard, and nothing is claimed as booked unless a tool confirmed it.

## 5. Data model (new)

| Table | Purpose |
|---|---|
| `email_connections` | business, provider (`gmail` / `graph` / `forward`), mailbox address, encrypted refresh token, scopes, status, last sync time |
| `email_threads` | business, provider thread id, patient email (normalised), patient id if known, conversation id (`em_<business>_<thread>`), last message time, state (`active` / `needs_staff` / `closed`) |
| `email_messages` | thread, direction (`in` / `out`), provider message id (unique, for de-duplication), subject, sent time, status, a short body preview only (full text stays in the thread record) |

The conversation for the engine is rebuilt from `email_messages` after a restart, the same way WhatsApp rebuilds from its saved turns (`AgentEngine.restore`).

## 6. Phases

| Phase | Scope | Done when |
|---|---|---|
| **0. Decide** | Confirm A (Gmail first) or B; approve the rules in section 4; name the test mailbox | This doc approved |
| **1. Gmail in, Gmail out** | OAuth connect in the user portal; Gmail push (or polling every minute as the first version); thread lookup; engine with `channel="email"`; reply in the thread; the `email` prompt addendum; rules 1 to 4 in code | A test mailbox can book, reschedule and cancel by email, and every rule has a test |
| **2. Hardening** | Rules 5 to 9; the dashboard shows email threads (`needs_staff` queue); rate caps; delivery status | Ten real test threads run with no duplicate replies and no replies to automated mail |
| **3. Outlook and forwarding** | Microsoft Graph subscription; forwarding address for clinics that will not connect | Same tests pass on both providers |
| **4. Clinic rollout** | Pilot clinic, watch the `needs_staff` queue for a week, then open to others | Pilot clinic gets no wrong bookings in a week |

## 7. Tests (must exist before Phase 1 is called done)

- Thread: a reply in the same thread reuses the conversation; a new email from the same sender starts a new one.
- Auto-reply, bounce and our-own-domain mail: no reply, one log entry.
- CC'd mail: reply goes only to the sender; no CC on the outgoing mail.
- Injection in the email body: the instruction is quoted, the booking is not changed.
- Booking: read-back in one email, booked only after the "yes" in the next email; idempotent on retry.
- Hindi, English and Hinglish emails: reply language matches the email.
- Gmail push delivered twice: the message is handled once (message id).
- Sending fails: state becomes `needs_staff`; no "booked" claim.

## 8. Open questions for the owner

1. Gmail or Outlook first? (Plan assumes Gmail.)
2. Reply cap per sender per hour, and per clinic per day? (Suggest 5 per sender per hour, 200 per clinic per day, to tune.)
3. Should the AI reply to every email, or only to emails the clinic has tagged or that are from known patients?
4. Who is shown `needs_staff` threads: the owner only, or any staff member?
5. Consent: does the clinic need to tell patients the replies are from an AI? (Plan: yes, one line in the email signature, and the AI never claims to be human.)

## 9. Not in this plan

- Outbound emails the AI starts by itself (reminders, recalls). That is `24_...` and needs its own consent rules.
- Outbound AI phone calls to patients. Separate plan, with DND and TRAI rules.
- Email attachments (prescriptions, reports). Not read and not sent.
