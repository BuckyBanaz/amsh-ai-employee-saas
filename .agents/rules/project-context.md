# Amsh Project Memory

This file serves as the core "brain" for the Amsh platform to persist context across AI sessions.

## Project Details
- **Project Name:** Amsh (Do NOT use AuraHealth, Aira, or any other name)
- **Architecture Overview:** 
  - Monorepo containing `frontend/user` (User Portal) and `frontend/admin` (Admin Dashboard).
  - Built with Next.js App Router, TailwindCSS, React.
  - Multi-tenant architecture using Capability-Driven configuration for various verticals (Clinic, Restaurant, etc.).

## What Has Been Completed So Far
### User Frontend (`frontend/user`)
- Moved all hardcoded UI strings to a centralized `utils/strings/en.ts` dictionary.
- Completed refactor for `(auth)` group and `(dashboard)` Settings page to use the localized strings.

### Admin Frontend (`frontend/admin`)
- Built `login/page.tsx` with a clean, centered card design.
- Re-architected `(admin)/layout.tsx` and `Sidebar.tsx` to a Light Theme matching the `Plus Jakarta Sans` typography.
- Fully implemented the `dashboard/page.tsx` based on the Figma mockup.
- Dashboard includes 8 metric cards, Quick Actions bar, Active Businesses table, and AI Platform Health panel.

## Key Instructions
- **String Management:** For `frontend/user`, ALWAYS use `utils/strings/en.ts` for any user-facing text. Do not hardcode strings in components.
- **Styling:** Rely on Light Themes with subtle grays and blues unless otherwise specified. Use `Plus Jakarta Sans` for fonts where applicable.
