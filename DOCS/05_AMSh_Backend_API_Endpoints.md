# Amsh — Backend API Plan
Derived by mapping `AI_Receptionist_Project_Structure_Spec.md`'s backend structure against what the **actual built frontend** (`frontend/admin`, `frontend/user`) needs. This is the concrete "what APIs do we build" list — not abstract, tied to real screens I've already implemented/reviewed.

Every endpoint below is REST unless marked **WS** (WebSocket) or **Worker** (async job, not request/response).

---

## 0. How this maps to the structure spec

The spec's `backend/api/routes/` only lists 9 files (`auth, businesses, agents, calls, knowledge, transactions, integrations, billing, verticals`). The real admin app alone has 19 screens — several don't fit cleanly into those 9 files. **Gap-fill route files needed** (not in the original spec, but required by the actual UI):

- `users.py` — covers business-users, admin-users, and team (spec only names `businesses.py`/generic `auth.py`)
- `tickets.py` — Support Tickets screen
- `announcements.py` — Announcements screen
- `audit.py` — Audit Logs screen
- `security.py` — Security Events screen
- `health.py` — System Health screen
- `analytics.py` — Analytics screens (both apps)
- `usage.py` — Usage & Limits screen
- `notifications.py` — Notifications screen (user app)
- `services.py`, `doctors.py`, `patients.py` — or fold these into `transactions.py`/`businesses.py` as sub-resources; listed separately below since the UI treats them as distinct resources

---

## 1. `auth.py`
| Endpoint | Purpose | Powers |
|---|---|---|
| `POST /api/auth/register` | Business owner signup | user: `register` |
| `POST /api/auth/login` | Login (business + admin, role-scoped) | both apps' `login` |
| `POST /api/auth/logout` | Invalidate session/token | both |
| `POST /api/auth/forgot-password` | Send reset link | user: `forgot-password` |
| `POST /api/auth/reset-password` | Consume reset token | user |
| `POST /api/auth/verify-email` | Confirm email | user: `verify-email` |
| `POST /api/auth/accept-invite` | Team/admin invite acceptance | user: `accept-invite`, admin: Invite Admin modal |
| `GET /api/auth/me` | Current session/user + role | both, on every page load |
| `POST /api/auth/impersonate/{businessId}` | Admin "log in as business" (post-MVP, doc 02) | admin (future) |

## 2. `businesses.py` (tenants)
| Endpoint | Purpose | Powers |
|---|---|---|
| `POST /api/businesses` | Create tenant (onboarding: business step) | user: `onboarding/business` |
| `GET /api/businesses` | List all tenants, filters (country/plan/status/vertical) | admin: `businesses` |
| `GET /api/businesses/{id}` | Tenant detail (metrics, config, subscription) | admin: `businesses/[id]` |
| `PATCH /api/businesses/{id}` | Update tenant (hours, contact, etc.) | user: `onboarding/hours`, admin edit |
| `POST /api/businesses/{id}/suspend` | Suspend tenant | admin: Suspend Business modal |
| `DELETE /api/businesses/{id}` | Delete tenant | admin: Delete Business modal |
| `PATCH /api/businesses/{id}/subscription` | Change plan | admin: Change Subscription modal |
| `GET /api/businesses/{id}/dashboard` | Aggregated KPIs for owner dashboard | user: `dashboard` |

## 2a. Onboarding Flow APIs (Dedicated Paths)
To clearly distinguish API calls that are part of the initial onboarding wizard vs general CRUD, the onboarding steps are grouped under the `/api/onboarding` prefix.

| Endpoint | Purpose | Powers |
|---|---|---|
| `POST /api/onboarding/businesses` | Create tenant | user: `onboarding/business` |
| `POST /api/onboarding/businesses/{id}/services` | Add initial service | user: `onboarding/services` |
| `POST /api/onboarding/businesses/{id}/staff` | Add initial staff | user: `onboarding/staff` |
| `POST /api/onboarding/businesses/{id}/agents` | Create initial AI config | user: `onboarding/ai-receptionist` |
| `POST /api/onboarding/businesses/{id}/knowledge` | Add initial knowledge docs | user: `onboarding/knowledge` |
| `POST /api/onboarding/businesses/{id}/integrations` | Add initial integrations | user: `onboarding/integrations` |

## 3. `users.py` (gap-fill — business users, admin users, team)
✅ = built and curl-tested this session (2026-09-09).
| Endpoint | Purpose | Powers |
|---|---|---|
| ✅ `GET /api/businesses/{id}/users` | Staff directory for one clinic (any member of that business) | admin: `business-users`, user: `team` |
| ✅ `POST /api/businesses/{id}/users` | Owner/admin invites staff (admin/manager/doctor/receptionist) — creates an inactive user + returns an invite token | user: `onboarding/staff`, `team` |
| ✅ `POST /api/auth/accept-invite` | Invitee sets their password via the token, account activates, auto-logs-in (see `auth.py`) | user: `accept-invite` page |
| `PATCH /api/users/{id}` | Edit role/permissions | admin: `business-users/[id]` |
| `POST /api/users/{id}/reset-password` | Admin-triggered reset | admin: Business User Detail |
| `POST /api/users/{id}/suspend` | Suspend access | admin |
| `POST /api/users/{id}/unlock` | 1-click unlock after failed logins | admin |
| `POST /api/users/{id}/revoke-sessions` | Kill all active JWTs | admin |
| `GET /api/admin-users` | Platform admin directory | admin: `admin-users` |
| `POST /api/admin-users` | Add admin (Owner/Admin/Support/Finance/Ops/Dev) | admin: `admin-users` |
| `PATCH /api/admin-users/{id}` | Edit admin | admin |

## 4. `agents.py` (AI Receptionists)
| Endpoint | Purpose | Powers |
|---|---|---|
| `GET /api/agents` | List all AI receptionists (platform-wide) | admin: `receptionists` |
| `GET /api/businesses/{id}/agent` | This business's AI config | user: `ai` (Overview tab) |
| `PATCH /api/businesses/{id}/agent` | Save Behavior/Voice/Languages/Call Handling/Appointments/Escalation | user: all `ai-tabs/*` |
| `POST /api/businesses/{id}/agent/pause` | Pause AI | user: "Pause AI" button |
| `POST /api/agents/{id}/pause` \| `/resume` | Admin pause/resume | admin: receptionists table |
| `GET /api/agents/{id}` | Agent detail (KPIs, config summary, knowledge sources) | admin: `receptionists` detail |
| **`POST /api/agents/{id}/test`** | **Run a real simulated test call against the actual engine** (text-in/text-out or audio) | user: **AI Test Playground** — currently a pure frontend mockup; this is the endpoint that makes it real |
| `GET /api/agents/{id}/test/{sessionId}` | Poll/stream a running test session's transcript + evaluation | same |

## 4a. `phone_numbers.py` (gap-fill — was missing from both the structure spec's route list AND my first backend pass; the DB model itself, `phone_number.py`, is also new)
**Don't forget this one** — flagged explicitly by the user (2026-09-09): the AI needs an actual phone number to receive calls on, distinct from the business's own number.
- **MVP mode = "forwarding":** business keeps its existing number, forwards it to a Twilio number we provision for their AI. Zero porting friction, fastest to launch.
- **Later mode = "dedicated":** business gives out the Twilio number directly as the AI's own line. Upgrade path, not required at MVP launch.
- UI for this exists now (mockup) in `frontend/user`'s AI → Call Handling tab: shows the AI's number + forwarding instructions + a disabled "Request a Number" button for the dedicated-number upgrade path.

| Endpoint | Purpose | Powers |
|---|---|---|
| `POST /api/businesses/{id}/phone-numbers` | Provision a Twilio number for this business (mode: forwarding \| dedicated) | user: `ai` Call Handling tab "Request a Number" |
| `GET /api/businesses/{id}/phone-numbers` | Current number(s) + status (pending/active/failed) | user: `ai` Call Handling tab, admin business detail |
| `PATCH /api/phone-numbers/{id}` | Switch forwarding → dedicated, update `forwarded_from` | user |
| `POST /api/phone-numbers/{id}/verify` | Confirm forwarding is actually working (e.g. test-call ping) | user (future) |

## 5. `calls.py`
| Endpoint | Purpose | Powers |
|---|---|---|
| `GET /api/calls` | List calls, filters (business/status/intent/date) | admin: `calls`, user: `calls` |
| `GET /api/calls/{id}` | Call detail: summary, metadata | both |
| `GET /api/calls/{id}/transcript` | Full transcript (+ per-turn sentiment) | admin Active Call Inspection, user call detail |
| `GET /api/calls/{id}/recording` | Signed audio URL for playback/download | admin waveform player |
| `GET /api/calls/live` | Currently in-progress calls | admin: **Live** badge/filter I just added |
| **`POST /api/calls/{id}/takeover`** | **Hand a live call from AI to a human** — needs realtime signaling into `realtime/twilio/media_stream.py`, not just a DB write | admin: **Take Over Call** button I just added |
| `GET /api/calls/{id}/technical-metadata` | Latency, voice engine, error code | admin call detail |

## 6. `conversations.py` (gap-fill, or fold into `calls.py`)
Non-voice channels (WhatsApp/SMS/Web chat) — PRD calls these out separately from phone calls.
| Endpoint | Purpose | Powers |
|---|---|---|
| `GET /api/conversations` | List omnichannel conversations | admin: `conversations`, user: `conversations` |
| `GET /api/conversations/{id}` | Thread detail: turns, tool calls, RAG traces | both `[id]` detail pages |

## 7. `transactions.py` (generic — PRD's `Transaction` model; appointments for the Clinic vertical)
| Endpoint | Purpose | Powers |
|---|---|---|
| `GET /api/appointments` | Platform-wide list, filters | admin: `appointments` |
| `GET /api/businesses/{id}/appointments` | This clinic's appointments | user: `appointments` |
| `POST /api/appointments` | Create (also called internally by the `book_appointment` tool) | tool-triggered + manual staff booking |
| `PATCH /api/appointments/{id}` | Reschedule/cancel/confirm | both |
| `GET /api/appointments/{id}` | Detail: recording, transcript, timeline, patient card | admin + user `appointments/[id]` |

## 8. Patients/Customers, Doctors/Staff, Services (sub-resources under `businesses`)
| Endpoint | Purpose | Powers |
|---|---|---|
| `GET /api/businesses/{id}/patients` | Patient directory (masked per HIPAA/GDPR) | user: `patients`, admin: `customers` |
| `GET /api/customers` | Platform-wide masked customer view | admin: `customers` |
| `GET /api/businesses/{id}/doctors` | Doctor/staff roster + schedule | user: `doctors` |
| `GET /api/businesses/{id}/services` | Services catalog (duration, price) | user: `services`, admin: `services` |
| `POST/PATCH /api/businesses/{id}/services` | Add/edit a service | user onboarding + `services` |

## 9. `knowledge.py` (RAG)
| Endpoint | Purpose | Powers |
|---|---|---|
| `POST /api/businesses/{id}/knowledge/documents` | Upload doc (FAQ, policy, menu) | user: `onboarding/knowledge`, `knowledge` |
| `GET /api/businesses/{id}/knowledge/documents` | List uploaded docs + index status | user: `knowledge` |
| `DELETE /api/knowledge/documents/{id}` | Remove doc | user |
| `POST /api/knowledge/documents/{id}/reindex` | Worker trigger | **Worker**: `ingest_document.py`, `generate_embeddings.py` |

## 10. `integrations.py`
| Endpoint | Purpose | Powers |
|---|---|---|
| `GET /api/businesses/{id}/integrations` | Connected integrations (calendar, POS, etc.) | user: `onboarding/integrations`, `integrations`, admin: `integrations` |
| `POST /api/businesses/{id}/integrations/{provider}/connect` | OAuth/connect flow | user |
| `POST /api/businesses/{id}/integrations/{provider}/disconnect` | admin: Disconnect Integration modal |
| `GET /api/integrations/{id}/config` | Detail view | admin: Integration Config Detail |

## 11. `billing.py`
| Endpoint | Purpose | Powers |
|---|---|---|
| `GET /api/businesses/{id}/billing` | Current plan, invoices, payment method | user: `billing`, admin: `billing` (per-tenant) |
| `POST /api/businesses/{id}/billing/subscribe` | Change plan (Stripe) | user pricing tiers |
| `GET /api/billing/invoices` | Platform-wide billing (admin) | admin: `billing` |
| `POST /api/businesses/{id}/billing/payment-method` | Update card | user |

## 12. `usage.py` (gap-fill)
| Endpoint | Purpose | Powers |
|---|---|---|
| `GET /api/businesses/{id}/usage` | API/minutes/storage usage + quota | admin: `usage`, user (settings) |
| `PATCH /api/businesses/{id}/usage/overage-policy` | stop-at-limit / allow-overage / auto-purchase (doc 02, P1) | admin `usage` (future) |

## 13. `analytics.py` (gap-fill)
| Endpoint | Purpose | Powers |
|---|---|---|
| `GET /api/analytics/platform` | Admin platform-wide KPIs, charts | admin: `analytics` |
| `GET /api/businesses/{id}/analytics` | Per-clinic call volume, outcomes, peak hours | user: `analytics` |

## 14. `verticals.py`
| Endpoint | Purpose | Powers |
|---|---|---|
| `GET /api/verticals` | List vertical templates (Clinic/Restaurant/...) | admin: `verticals` (currently a static mockup) |
| `GET /api/verticals/{slug}/config` | Fetch YAML config | admin "Edit Config (YAML)" button |
| `PATCH /api/verticals/{slug}/config` | Update config (post-MVP — only Clinic needed now) | admin |

## 15. Admin-only gap-fill modules
| File | Endpoint | Powers |
|---|---|---|
| `tickets.py` | `GET/POST/PATCH /api/tickets` | admin: `tickets` |
| `announcements.py` | `GET/POST /api/announcements` | admin: `announcements` |
| `audit.py` | `GET /api/audit-logs` | admin: `audit` |
| `security.py` | `GET /api/security-events` | admin: `security` |
| `health.py` | `GET /api/system-health` | admin: `health` (API/Voice/Appointment Engine/DB status) |
| `notifications.py` | `GET /api/notifications`, `POST /api/notifications/{id}/read` | user: `notifications` |

## 16. Realtime (not REST — `backend/realtime/`)
| Channel | Purpose |
|---|---|
| `POST /webhook/twilio/voice` | Twilio inbound call webhook → returns TwiML |
| **WS** `/ws/media-stream/{callId}` | Twilio bidirectional audio stream ↔ STT/LLM/TTS pipeline |
| **WS** `/ws/calls/{callId}/takeover` | Signaling channel for **Live Call Take Over** — bridges a human agent's audio into an in-progress Twilio call |
| **WS** `/ws/admin/live-calls` | Push live-call list updates to the admin `calls` page instead of polling |

## 17. Workers (async, `backend/workers/`)
| Job | Trigger | Powers |
|---|---|---|
| `ingest_document.py` / `generate_embeddings.py` | Knowledge upload | RAG |
| `summarize_call.py` | After call ends | Call summary shown in transcripts |
| `send_followup.py` | Missed call (doc 02, P1) | future |
| `calculate_usage.py` | Scheduled | `usage.py` quota numbers |

---

## 18. Suggested build order (ties back to `04_AMSh_MVP_Scope_and_Roadmap.md` §5)

1. `auth.py` + `businesses.py` (steps 2–3 of the spec's "First Build Sequence")
2. Twilio webhook + media stream + STT/LLM/TTS adapters (spec steps 3–7) — this is what makes **any** call feature real
3. `agents.py` (config) + `verticals/configs/clinic.yaml` + `tools/vertical/clinic/*` (book/cancel/reschedule/check_availability)
4. `calls.py` + `transactions.py` (appointments) — once real calls produce real data, these two endpoints unlock almost every screen in both frontends at once
5. `agents.py`'s `POST /api/agents/{id}/test` — turns the **AI Test Playground** from mockup into real (this was today's ask)
6. Live-call WS + `POST /api/calls/{id}/takeover` — turns **Live Call Take Over** from mockup into real
7. `knowledge.py` + RAG pipeline
8. Everything else (`billing`, `usage`, `analytics`, `integrations`, admin gap-fill modules) — lower urgency, each is a straightforward CRUD layer once the DB models exist
