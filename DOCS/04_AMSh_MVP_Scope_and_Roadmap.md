# Amsh: MVP scope and ground rules

> Trimmed on 2026-09-28. The old audit, feature checklist and "next steps" described a product with no backend; all of that is history.
> Current status: [`README.md`](README.md). Plan: [`18_AMSh_Completion_Plan_User_and_Admin.md`](18_AMSh_Completion_Plan_User_and_Admin.md).
> Percentages: [`../.brain/progress.md`](../.brain/progress.md). Change log: [`17_AMSh_Claude_Change_Tracker.md`](17_AMSh_Claude_Change_Tracker.md).

## 0. Ground rules (already decided, do not re-litigate)

1. **The product name is Amsh.** Do not use AuraHealth, Aira or any other name. The Figma file still says "Aura Health"; the owner will rename it.
2. **MVP vertical = healthcare only**: clinics, medical centers, hospitals. Restaurant, salon, hotel, real estate and so on are a later phase.
3. **The architecture stays vertical-agnostic and config-driven** (no `if businessType == "clinic"` in the engine), but no MVP time goes to other verticals.

## 4. What is explicitly not MVP

From `03_AMSh_High_Value_Roadmap.docx` and the PRD's multi-vertical vision; only after the healthcare MVP proves the core engine:

- Additional verticals (restaurant, retail, salon/spa, real estate, gym, hotel, service centers). The admin `verticals` page is a mock; do not wire it yet.
- Auto top-up and usage overage rules
- Super-admin impersonation ("log in as clinic")
- Automated SMS payment links
- Cancellation gap auto-filler and virtual waitlist
- Estimated revenue captured metric
- Daily 8 AM overnight email digest
- Automatic Google review booster
- Outbound calling, PMS/EHR write-back (doc 03 says these are not verified as built anywhere; do not market them as existing)

Now built (no longer "future"): missed-call text-back, WhatsApp AI chat (not tried with a real number), appointment reminders.

**Judgment call:** AI emergency keyword escalation is "Roadmap" in doc 03, but for a healthcare receptionist it is arguably a safety requirement.
Recommended to pull into MVP scope. The owner's call.
