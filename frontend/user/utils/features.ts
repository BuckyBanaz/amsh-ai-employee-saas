// WhatsApp stays hidden until Meta Embedded Signup is approved/working.
// Turn it back on with NEXT_PUBLIC_ENABLE_WHATSAPP=true in frontend/user/.env.local (restart `npm run dev`).
// Every WhatsApp surface is listed in DOCS/13_WhatsApp_Hidden_For_Launch.md.
export const WHATSAPP_ENABLED = process.env.NEXT_PUBLIC_ENABLE_WHATSAPP === 'true';
