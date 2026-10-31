// WhatsApp enabled for Meta Embedded Signup (verification and screen recording).
// Override with NEXT_PUBLIC_ENABLE_WHATSAPP=false in frontend/user/.env.local if needed.
// Every WhatsApp surface is listed in DOCS/13_WhatsApp_Hidden_For_Launch.md.
export const WHATSAPP_ENABLED = process.env.NEXT_PUBLIC_ENABLE_WHATSAPP !== 'false';
