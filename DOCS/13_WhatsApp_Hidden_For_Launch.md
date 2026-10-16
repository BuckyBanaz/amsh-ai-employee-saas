# WhatsApp: "Coming soon" for launch

**Update:** the three integration surfaces below now stay visible and show a disabled **Coming soon** state instead of disappearing. The other rows are still hidden.

Launching without WhatsApp until Meta Embedded Signup works. Everything is behind one flag, so nothing was deleted.

**Show it again:** put `NEXT_PUBLIC_ENABLE_WHATSAPP=true` in `frontend/user/.env.local` and restart `npm run dev`.
Flag lives in `frontend/user/utils/features.ts` (`WHATSAPP_ENABLED`, default off).

## Hidden when the flag is off (frontend/user)

| File | What is hidden |
|---|---|
| `app/onboarding/integrations/page.tsx` | **Coming soon**: card stays, badge + disabled button, never shown as connected |
| `app/onboarding/integrations/whatsapp/page.tsx` | Whole setup page: redirects to `/onboarding/integrations` |
| `app/onboarding/review/page.tsx` | **Coming soon**: row stays, shows "Coming soon" |
| `components/dashboard/IntegrationsGrid.tsx` | **Coming soon**: card stays, "Coming soon" pill instead of Connect |
| `hooks/useWhatsappEmbeddedSignup.ts` | Does not load the Facebook SDK or call the backend (used by the grid and the WhatsApp page) |
| `components/dashboard/PricingTiers.tsx` | "WhatsApp Channel" feature row (two plans) |
| `components/dashboard/settings/NotificationSettings.tsx` | "WhatsApp template" and "Template language" fields; copy now says reminders go by SMS |

## Copy changed (text only, not behind the flag)

| File | Change |
|---|---|
| `app/onboarding/ai-receptionist/page.tsx`, `components/dashboard/ai-tabs/BehaviorTab.tsx` | "Send appointment details by WhatsApp / SMS" is now "...by SMS". Restore the old wording when you enable WhatsApp |
| `app/(dashboard)/messages/page.tsx` | Subtitle no longer lists WhatsApp |

## Still mentions WhatsApp (left on purpose)

- **Marketing/landing:** `app/landing/**`, `components/landing/**`, `app/docs/page.tsx`, `utils/strings/en.ts` (HERO_DESC, unused MOCK_DATA). These are public copy: decide separately whether to claim WhatsApp before it ships.
- **Data display:** `ChannelBadge`, `AppointmentSourcesChart`, `AppointmentsTable`, `CallDetailPanel`, `CallLogsTable`, `RecentAIConversations`, `MessagesWorkspace`, `utils/channels.ts`, `controllers/dashboard.controller.ts`: they label existing records by channel and show nothing if there are none.
- **Admin app** (`frontend/admin`): appointments, billing, conversations, receptionists, templates, SEO. Not touched.

## Backend (untouched, still running)

- `backend/server/api/routes/integrations.py`: `POST .../whatsapp/embedded-signup`, `POST .../whatsapp/test-message`, and the webhook `/api/v1/whatsapp/webhook`.
- `backend/server/services/whatsapp_agent.py`.
- Generic `/connect` already refuses `whatsapp`.
- To stop inbound traffic entirely, unsubscribe the webhook in the Meta app dashboard.
