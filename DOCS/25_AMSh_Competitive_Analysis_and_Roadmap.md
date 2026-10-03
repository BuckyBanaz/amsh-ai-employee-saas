# 25. Competing with Vapi and the other voice-AI platforms

Written 2026-10-03. Competitor figures come from public pages and independent comparisons (links at the end), are quoted as published and
**have not been tested by us**; they move often, so re-check before putting a number in a pitch. AMSh's own numbers below are only
what the repository proves; anything not measured is marked *unmeasured*.

## 1. Who we are up against

| | What they sell | Who buys it |
|---|---|---|
| **Vapi** | A developer toolkit: you assemble speech-to-text, the language model, text-to-speech and the phone line, and pay for each piece | Engineering teams building their own voice agent |
| **Retell AI** | The same idea with more built in (analytics, compliance included in self-serve) | Engineering and ops teams |
| **Bland AI** | A flat per-minute price that covers the models, aimed at outbound calling | Sales and ops teams |
| **AMSh** | A finished AI receptionist for clinics: answers calls and WhatsApp, books and moves appointments, reminds patients, hands over to staff; with an admin portal and a clinic dashboard | A clinic owner who wants it to work on Monday, not a developer |

The platforms are *ingredients*. AMSh is the *meal*. We should not fight them on being the cheapest or most flexible toolkit; we win
by being the thing a clinic can switch on without a developer, in the languages its patients actually speak.

## 2. What the market publishes (as of this writing)

| Topic | Vapi | Retell | Bland |
|---|---|---|---|
| Headline price | about $0.05 per minute for hosting only; speech, model, voice and phone are extra, so real calls land around $0.07 to $0.33 per minute | from about $0.07 per minute, including voice infrastructure | about $0.14 per minute, models included |
| Cost at 10,000 calls a month (one comparison) | about $7,200 to $8,800 | about $2,800 | about $3,600 to $4,400 |
| Typical response time (median) | about 500 to 700 ms when tuned | about 600 ms | about 700 to 900 ms |
| HIPAA | a $2,000 per month add-on | included, self-serve | available with a signed agreement |
| Other compliance | SOC 2, SSO and access roles on the top plan | SOC 2 and GDPR included | SOC 2, GDPR, PCI |

## 3. Where AMSh stands today

| Area | AMSh today | Honest comparison |
|---|---|---|
| **Built for clinics** | Booking rules (no double booking, change means move, never a second appointment), reminders, missed-call text-back, escalation, staff alerts, patient memory | Ahead: the platforms leave all of this for the customer to build |
| **Hindi, Hinglish, English** | A dedicated conversation layer, Devanagari-aware checks, Indian voices, STT chosen for Hindi | Likely ahead for Indian clinics; the platforms can speak Hindi through their speech providers, but nothing in their product is tuned for it (not verified by us) |
| **WhatsApp with the same brain** | Live on the Meta test number | Ahead of the voice-only platforms; not yet on a real clinic number |
| **Owner tools** | Admin portal (tenants, plans, audit, security, SEO, tickets, announcements), clinic dashboard, editable message templates | Ahead of a developer dashboard for a non-technical buyer |
| **Response time** | Built for speed (sentence streaming, barge-in), **unmeasured on a real phone call** | Unknown. This is the number a buyer will ask for first |
| **Price per minute** | **Not worked out.** Our real cost per minute (speech, model, voice, phone) has never been measured | We cannot price against them until we know this |
| **HIPAA / data-protection** | Webhooks verified, rate limits, audit trail, quotas; transcripts and recordings are still stored in plain form and there is no signed agreement | Behind. Retell includes it free, Vapi charges $2,000 per month; a clinic will ask |
| **Reliability** | Model fallback chain (Groq then Gemini); provider accounts currently out of credit or inactive | Behind until providers are paid and a failure drill has been run |
| **Developer API and webhooks** | Not offered | Behind, but not our buyer's need |
| **Outbound campaigns** | Test call only | Behind (Bland's strength); lower priority for clinics |
| **Analytics on calls** | Call summary, intent, mood, follow-ups after every call; admin analytics | On par for a clinic; no per-turn quality scoring yet |

## 4. What to do about it, in order

1. **Measure the real response time on a real phone call** and show P50 and P95 on the dashboard. Everything else in a pitch depends on it. (Owner: one test call; code: latency log already exists.)
2. **Work out the true cost per minute**: add up speech-to-text, model, voice and phone minutes from a week of real calls. Then price per clinic (calls included, a clear overage) and compare with the table above. Do not publish a per-minute price before this.
3. **Data protection pack for clinics**: consent line at the start of a call, retention settings, encrypt transcripts and recordings at rest, a data-processing agreement, delete-on-request. This closes the gap that costs Vapi's customers $2,000 per month.
4. **Reliability drill**: pay the model and phone accounts, switch off one provider on purpose, confirm calls still get answered, and publish an uptime target only after a month of data.
5. **Finish WhatsApp on a real clinic number** (templates approved by Meta), because chat is where Indian patients already are.
6. **A second vertical** (dental chain, diagnostics, salon) using the vertical configuration, to show the product is not clinic-only. Keep clinics as the focus.
7. **Outbound reminders and recalls** (clinic-flavoured outbound) before general outbound campaigns.
8. **Public API and webhooks** for clinics with their own software, after the above.

## 5. How to talk about it

* "Vapi gives you the parts. AMSh answers your clinic's phone on day one, in Hindi, Hinglish and English, and books the appointment."
* Lead with outcomes (calls answered, appointments booked, no-shows reduced), not model names.
* Avoid claims we cannot prove today: a specific response time, "HIPAA compliant", "99.9% uptime", a per-minute price.

## Sources

* [Vapi pricing guide (Layer3 Labs)](https://www.layer3labs.io/guides/vapi-pricing)
* [Vapi AI review 2026 (CloudTalk)](https://www.cloudtalk.io/blog/vapi-ai-reviews/)
* [Retell vs Bland vs Vapi vs ElevenLabs: benchmark data (Retell)](https://www.retellai.com/blog/retell-vs-bland-vs-vapi-vs-elevenlabs)
* [Vapi vs Retell vs Bland vs ElevenLabs: price per minute (StackBinary)](https://stackbinary.io/insights/voice-ai-pricing-per-minute-2026)
* [Retell AI vs Vapi 2026: which costs less at 10,000 minutes (Macha)](https://www.getmacha.com/blog/retell-ai-vs-vapi)
