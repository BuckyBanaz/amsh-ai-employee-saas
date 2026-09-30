# AMSh AI Receptionist: Features List (for the landing page)

Built from the three target-feature documents (`01_AMSh_Already_Implemented.docx`, `02_AMSh_Missing_Features.docx`,
`03_AMSh_High_Value_Roadmap.docx`) and checked against the code on 2026-09-28. Every feature carries an honest status so the
landing page never promises something the product cannot do yet.

| Tag | Meaning | Safe to put on the landing page? |
|---|---|---|
| ✅ **Ready** | built and covered by automated tests; visible in the product today | Yes |
| 🟡 **Built, verify live** | code exists and is tested with fakes, but has not been tried on a real phone call / real WhatsApp number / real email yet | Yes **after** one real test, or word it softly ("supports") |
| 🔜 **Coming soon** | planned, not built | Only under "Coming soon" |
| ⛔ **Do not claim** | not true today | No |

---

## 1. What the AI can do (landing-page feature list)

Each block: **headline**, one line of copy you can paste, status, and where a visitor or investor can see it.

### Talks like a person

1. **Sounds human, not robotic** ✅
   *"Warm, natural voices with real Indian accents, light humour and the right emotion: sympathetic when you are worried, cheerful when you are."*
   Sentence-by-sentence speech so it starts talking fast; natural voices (several Indian voices); it can laugh, sound sympathetic,
   playful or apologetic. See: AI Studio playground.
2. **Hindi, Hinglish and English, switching mid-call** ✅
   *"Speaks the way your patients speak. Ask it to switch language and it stays in that language for the rest of the call."*
3. **You can interrupt it** ✅ (thresholds still to be tuned on real hardware)
   *"Talk over it like you would with a person. It stops and listens."*
4. **Remembers the conversation** ✅
   Remembers your name, what you asked for and where the booking stands, even after small talk or a jokes detour; if the server
   restarts mid-call the conversation resumes.
5. **Small talk and personality** ✅
   Greets, answers "how are you", takes a joke, then gently steers back. The owner picks the personality (energetic, warm, crisp,
   calm) and can switch small talk off.

5b. **Human little sounds** 🟡
    *"Says \"hmm...\", \"achha...\" and \"one moment...\" the way a person does, instead of going silent."* In Hindi and English, chosen sparingly
    (never for a worried caller). Listen to it on a real call before showing it: how the voice renders these sounds was not checked.

### Handles the front desk

6. **Books, reschedules and cancels appointments** ✅
   *"Books the right doctor at a time that is actually free, reads the details back, and only confirms when the patient says yes."*
   Uses the clinic's real working hours, existing bookings, notice time and doctors. It cannot invent a slot, a doctor or a time
   the caller did not agree to.
7. **Answers questions about your clinic** ✅
   *"Timings, address, services, doctors: answered from your own information, never made up."*
   When it does not know, it says so and offers the front desk instead of guessing.
8. **Answers from your documents and website** 🟡
   *"Upload your price list or FAQs and the AI answers from them."* The search service (Qdrant) was not running at the last
   start-up check, so confirm this works on your environment before showing it.
9. **Sends confirmation SMS** 🟡
   Built but switched off by default in development (it would send real SMS). Try it with a real number first.

9b. **Reminders that cut no-shows** 🟡
    *"Patients get a reminder before their visit, so fewer forget."* SMS reminder a set number of hours before (WhatsApp with an
    approved template). Off until the clinic switches it on; tested with fakes, not yet with a real SMS provider.
9c. **Missed-call text-back and staff alerts** 🟡
    *"A caller who hung up gets a message, and your team is told about bookings, emergencies and missed calls."* Opt-in; there is
    no dashboard switch yet (configured through the agent settings).
9d. **Your bookings in your own calendar** 🟡
    *"Subscribe Google, Outlook or Apple Calendar to your AMSh schedule."* A read-only calendar feed, not two-way sync.

### Keeps patients safe

10. **Recognises emergencies and escalates at once** ✅
    *"Chest pain, cannot breathe, heavy bleeding, unconscious: no small talk, straight to your emergency path."* English and
    Hindi phrases. It escalates and never gives medical advice. It does **not** yet page a doctor or raise a dashboard alert.
11. **Hands over to a human when needed** ✅ / 🟡
    Caller asks for a person, is frustrated, or asks about billing (each rule can be switched on or off by the owner) and the
    call is transferred to the number you set. Transfer on a real phone call has not been re-verified this session.
12. **Honest about being an AI** ✅
    Says it is an AI receptionist when asked; declines topics outside the clinic instead of chatting about anything.

### Works where patients are

13. **Answers every call, 24/7** 🟡
    *"Never miss a patient call, nights and Sundays included."* Phone pipeline (Exotel for India, Twilio for global numbers) is
    built; make one real call before claiming it publicly.
14. **WhatsApp assistant** 🟡
    *"Patients message on WhatsApp and get the same helpful receptionist: questions answered, appointments booked."* Built
    and tested with fakes; needs one real connected WhatsApp number and the Meta app secret.

### Gives the owner control

15. **Test it in your browser before it goes live** ✅
    *"Talk to your AI or type to it, hear the voice, and only then publish."* Voice and text playgrounds; test calls are labelled
    "Test call" and can be hidden from the call list.
16. **Customise everything from one screen** ✅
    Name, greeting, voice, speaking speed, personality, languages (with auto-detect), your own instructions, small talk on/off,
    confirmation on/off, which actions it may take, escalation rules and transfer number, silence timeout and maximum call
    length, recording and transcription on/off, and which AI model it uses.
17. **Call history with transcripts, recordings, summaries and follow-ups** ✅ / 🟡
    *"See exactly what was said."* Transcript for every call; audio recording for browser test calls. Audio for real phone
    calls depends on the provider's recording link (not verified). After each call the AI writes a short summary, the intent, the
    caller's sentiment and follow-ups for staff (checked against a real model on a sample transcript, not yet across many real calls).

### Built to be dependable

18. **Never goes silent because one AI provider is busy** ✅
    Several AI models are tried in order (Groq models first, Gemini as backup).
19. **Your clinic's data stays yours** ✅ (backend) / 🟡
    Each clinic sees only its own data; roles for owner, admin and staff; sign-in protection (lockout after repeated failures),
    password reset, an audit trail of security events, encrypted integration tokens. **Not** a compliance certification (see
    section 4).

---

## 2. The target features from the three documents: where each one stands

### Document 01, "already implemented" (research inventory)
Almost all of these are **admin-portal** screens (tenant dashboard, active businesses, clinics directory, quotas, platform
health, RBAC, audit logs). In our code only four admin screens are real (login, dashboard, businesses with detail, billing / plan catalog); the rest are design mocks
with a "Sample data" banner, so **only those four may be shown as working**, the others not until the admin phase in [`18_AMSh_Completion_Plan_User_and_Admin.md`](18_AMSh_Completion_Plan_User_and_Admin.md)
is done. What does exist: roles, an audit log table (written on sign-ins and password events) and voice configuration per clinic.

### Document 02, "missing features"

| Target feature | Status today | Note |
|---|---|---|
| Audio recording playback and transcript drawer | ✅ / 🟡 | Player and transcript exist; browser test calls are recorded; phone-call audio unverified; no sentiment tags or patient context panel |
| In-browser AI test playground | ✅ | AI Studio (voice + text) and Test Playground |
| Live call intervene / take over | 🔜 | Only "transfer to a human" exists; a staff member cannot join a live AI call from the dashboard |
| Call intent analytics | 🟡 | Every call now gets an intent, sentiment and action items after it ends (shown in `/calls`); the chart / analytics page is not built |
| Peak hours heatmap | 🔜 | Not built (analytics page is static) |
| Auto top-up / usage overage rules | 🔜 | Not built |
| Impersonation ("log in as clinic") | 🔜 | Deliberately left out of the first admin release (security-sensitive) |
| SMS payment links | 🔜 | Razorpay and SMS both exist separately; not connected |
| Missed-call follow-up | 🟡 | Built as an SMS text-back, off until the clinic enables it; try it with a real number first |

### Document 03, "high-value roadmap"

| Target feature | Status today | Note |
|---|---|---|
| AI emergency keyword auto-escalation | ✅ (partly) | Detects and escalates; no doctor notification or high-priority flag in a dashboard yet |
| Cancellation gap auto-filler / virtual waitlist | 🔜 | Not built |
| Estimated revenue captured | 🔜 | Not built |
| Daily 8 AM overnight email digest | 🔜 | Email sending exists (needs a Resend key) and calls now have summaries; the digest job is not built |
| Automatic Google review booster | 🔜 | Not built |
| Super-admin impersonation | 🔜 | See above |

Document 03 itself warns: PMS/EHR write-back, WhatsApp automation, outbound calling and 10+ concurrent calls must be
**verified before being marketed as existing**. Today: WhatsApp is built but unproven with a real number; PMS/EHR write-back and
outbound calling do not exist; concurrent-call capacity has never been load-tested.

---

## 3. Coming soon (safe wording for a "Roadmap" strip)

Waitlist that refills cancelled slots · live call
take-over · morning email digest · call insights charts (busiest hours) · revenue captured · payment links by SMS · Google
review requests · two-way Google Calendar sync.

---

## 4. Claims to avoid, and landing-page copy that needs fixing

I searched the current landing page copy. These statements are **not true of the product today**:

| Where it appears (paraphrased) | Problem | Suggested fix |
|---|---|---|
| "books appointments straight into your calendar" | Bookings go into AMSh's schedule; a read-only calendar feed can be subscribed to from Google / Outlook / Apple; there is no two-way sync | "books into your AMSh schedule, viewable in your own calendar" |
| "sends reminders and follow-ups by WhatsApp or SMS" | SMS reminders and missed-call text-back are built but off by default and untested with a real provider; WhatsApp reminders need an approved template | Keep after one real test, say "SMS reminders"; WhatsApp reminders as coming soon |
| "Custom EHR / EMR webhooks" (plans) | Not built | Remove or mark coming soon |
| "2 / 5 / 15 concurrent patient calls" (plans) | Never load-tested | Keep only if you will enforce and test those limits |
| "24/7 dedicated account manager" | A business promise, not a product feature | Only if you will staff it |
| "transcripts and summaries" | True now: AI-written summaries, intent, sentiment and follow-ups exist (new) | Fine to keep once you have seen real ones on real calls |

Also never claim, until they are true and proven:
- **HIPAA / GDPR compliance or certification.** The documents list these as requirements; nothing has been certified.
- **Any speed, accuracy or "resolution rate" number.** Nothing is measured per call yet.
- **PMS / EHR integration, outbound calling.**
- **"Works in every language".** Hindi, Hinglish and English are the supported ones.

---

## 5. Demo script (what to show, in order)

1. **AI Studio → voice call:** greeting, small talk, a joke (it laughs), then "book an appointment day after tomorrow".
2. **Interrupt it** mid-sentence. **Ask for Hindi**, then switch back.
3. **Complete a booking** and open **Appointments** to show it.
4. Say **"mujhe seene mein dard hai"** to show the emergency path.
5. Open **Calls**: the test call is labelled, the transcript is there, play the recording.
6. **Settings on the AI page:** change the personality or voice and call again.
7. Only after a real WhatsApp number is connected: send it a message from a phone and show the booking.

Use headphones for the interrupt demo (speakers can make the AI hear itself).

---

## 6. Ready-to-paste copy

**Hero line:** Never miss a patient call again.
**Sub-line:** AMSh is an AI receptionist that answers your clinic's calls in Hindi, Hinglish and English, books appointments,
answers questions from your own information, and hands over to your team when it matters.

**Six feature cards**
1. *Sounds like a person.* Natural Indian voices with warmth, humour and the right emotion.
2. *Speaks your patients' language.* Hindi, Hinglish and English, switching whenever they do.
3. *Books it right.* Real doctors, real free slots, read back and confirmed by the patient.
4. *Knows your clinic.* Timings, services and doctors from your own details; says "I'm not sure" instead of guessing.
5. *Safe by design.* Spots emergencies, escalates to a human, never gives medical advice.
6. *You stay in control.* Test it in your browser, set the personality and rules, review every call.

**Coming soon strip:** Reminders · Missed-call follow-up · Waitlist refill · Live take-over · Morning digest · Calendar sync.
