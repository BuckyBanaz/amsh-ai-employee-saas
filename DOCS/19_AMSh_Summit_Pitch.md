# Amsh: Summit Pitch Document

> Purpose: talking points for the summit presentation. Facts about what is built come from `04_AMSh_MVP_Scope_and_Roadmap.md`. Do not claim the items in "Roadmap, do not present as live" below.

## 1. One-liner

**Amsh is a virtual front-desk employee for clinics. It answers every call and chat, books appointments, and works 24/7, so no patient is ever left waiting or turned away after hours.**

## 2. The problem

- A clinic's front-desk staff are overloaded: phones ring while they handle walk-ins, billing and paperwork.
- Calls after working hours, on lunch breaks and on weekends go to voicemail or are missed.
- A missed call is usually a lost patient: they call the next clinic.
- Booking, rescheduling and reminders are repetitive work that eats staff time.
- Hiring more receptionists is expensive, and still does not cover nights and holidays.

## 3. The solution

Amsh acts as an always-on virtual employee that:

- **Answers calls** with a natural voice, in real time.
- **Chats on WhatsApp** and other messaging channels.
- **Books, reschedules and cancels appointments** through the clinic's booking system.
- **Gives information** (timings, doctors, services, location, FAQs) any time, even after working hours.
- **Follows up**: missed-call text-back and appointment reminders.
- **Hands off to a human** when needed (transfer / escalation).

One platform, every channel: phone call, WhatsApp, social media, CRM.

## 4. How it works (for the slide)

1. Patient calls or messages the clinic at any hour.
2. Amsh understands the request (speech to text, language understanding).
3. It checks the clinic's data (services, doctors, slots) and takes the action: answer, book, reschedule.
4. It replies in a natural voice or chat message.
5. The clinic sees every conversation and booking in its dashboard.

## 5. Why now

- Voice AI is now fast and natural enough to hold a real conversation.
- Clinics already depend on phone and WhatsApp; patients expect an instant reply.
- Staff shortages make "extra hands that never sleep" an easy decision.

## 6. Who we compare against

| Alternative | What they are | Where they fall short for a clinic |
|---|---|---|
| Human front desk / call center | Real people | Expensive, limited hours, inconsistent, hard to scale |
| Answering services | Human operators taking messages | Take messages only, often cannot book; per-minute cost |
| Generic AI voice platforms | Developer toolkits for building voice agents | Need engineers to set up; no ready clinic workflow |
| Generic chatbots / IVR menus | Scripted flows ("press 1 for...") | Rigid, frustrating, voice experience is poor |
| Big clinic software with add-ons | Large practice-management suites | Heavy, slow to adopt, voice AI is a side feature |

(Before presenting, name 2 or 3 specific competitors the audience knows and verify their current pricing and features. Do not quote competitor numbers from memory.)

## 6.1 What we do differently

1. **Self-serve onboarding: a clinic sets up its own AI receptionist on our platform in a few clicks.** No engineers, no long implementation project. This is the main differentiator.
2. **Built for clinics first.** The workflow (appointments, doctors, services, patient FAQs) is ready out of the box, not a blank toolkit.
3. **One employee, all channels.** Calls, WhatsApp, social and CRM are handled by the same virtual employee with the same knowledge, not separate tools.
4. **Human-like conversation.** Low latency and natural voice, with barge-in so patients can interrupt like on a normal call.
5. **Config-driven platform.** The same engine can later serve other industries without a rebuild.

## 7. Business value for a clinic

- Zero missed calls, including after hours.
- More booked appointments from calls that would have been lost.
- Staff freed from repetitive calls to focus on patients in the clinic.
- A fraction of the cost of an extra full-time employee, available 24/7.
- Consistent, polite answers every time.

(Add real numbers only after pilot clinics give them to you. Do not invent percentages for the slide.)

## 8. MVP scope: where we are

**Target vertical: healthcare only** (clinics, medical centers, hospitals).

Working in the MVP:

- Business sign-up and login, business setup
- Voice call handling with low-latency speech in and out
- WhatsApp AI chat (not yet tried with a real production number)
- Missed-call text-back
- Appointment reminders
- Admin and user dashboards

Roadmap, do not present as live:

- Other verticals (restaurant, salon, hotel, real estate, and so on)
- Outbound calling
- Writing back to patient records / EHR systems
- Cancellation gap auto-filler and waitlist
- Automatic Google review requests
- Daily overnight email digest

## 9. Roadmap (one slide)

1. **Now:** healthcare MVP, pilot with a few clinics.
2. **Next:** deeper integrations (booking systems, CRM), outbound reminders and follow-ups, analytics on captured bookings.
3. **Later:** other verticals on the same engine.

## 10. Suggested slide flow (5 to 7 minutes)

1. Title and one-liner
2. The problem: the missed call
3. The solution: a virtual employee, 24/7
4. Live demo or recorded call (strongest slide)
5. Why we win: few-click onboarding, clinic-first, all channels
6. Competitor comparison
7. Where we are and what is next / the ask

## 11. Likely questions and short answers

- **Is it safe for medical conversations?** It handles booking and information, not diagnosis. Escalation to a human for emergencies is being pulled into scope. Confirm the exact status before you answer.
- **What if the AI does not understand?** It transfers to a human or takes a message.
- **Which languages?** Confirm the current supported list before the summit.
- **How long is setup?** The goal is minutes, in a few clicks, on our platform. Confirm with a live setup run before you promise a number.
- **Does it integrate with our booking system?** Say what is live today. Do not promise EHR write-back.
- **Data privacy?** Prepare a short, accurate answer about where data is stored and who can access it.

## 12. Before the summit checklist

- [ ] Record a clean demo call and a WhatsApp chat
- [ ] Time a real onboarding from sign-up to first answered call
- [ ] Test the WhatsApp channel with a real number
- [ ] Pick 2 or 3 named competitors and verify their claims
- [ ] Confirm languages supported and emergency-escalation status
- [ ] Decide the ask: pilot clinics, investors, partners
