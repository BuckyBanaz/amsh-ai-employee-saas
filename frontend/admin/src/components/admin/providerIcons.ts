// Vendored high-fidelity provider brand icons for AMSh Admin Console.

export interface ProviderIcon {
  viewBox: string;
  markup: string;
  source: string;
}

export const PROVIDER_ICONS: Record<string, ProviderIcon> = {
  gemini: {
    viewBox: "0 0 24 24",
    markup: `<path d="M12 24C12 17.3726 6.62742 12 0 12C6.62742 12 12 6.62742 12 0C12 6.62742 17.3726 12 24 12C17.3726 12 12 17.3726 12 24Z" fill="url(#gemini-grad)"/>
    <defs>
      <linearGradient id="gemini-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop stop-color="#4285F4"/>
        <stop offset="0.3" stop-color="#9B51E0"/>
        <stop offset="0.7" stop-color="#E91E63"/>
        <stop offset="1" stop-color="#F2994A"/>
      </linearGradient>
    </defs>`,
    source: "Google Gemini Sparkle"
  },
  groq: {
    viewBox: "0 0 24 24",
    markup: `<path fill="#F55036" fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1 14.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm-5-3.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z"/>`,
    source: "Groq LPU"
  },
  elevenlabs: {
    viewBox: "0 0 24 24",
    markup: `<path fill="#0F172A" d="M6 3h4v18H6V3zm8 0h4v18h-4V3z"/>`,
    source: "ElevenLabs"
  },
  cartesia: {
    viewBox: "0 0 24 24",
    markup: `<path fill="url(#cartesia-grad)" d="M4 12a1 1 0 011-1h14a1 1 0 110 2H5a1 1 0 01-1-1zm2-5a1 1 0 011-1h10a1 1 0 110 2H7a1 1 0 01-1-1zm4-5a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm-4 15a1 1 0 011-1h10a1 1 0 110 2H7a1 1 0 01-1-1zm4 5a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z"/>
    <defs>
      <linearGradient id="cartesia-grad" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
        <stop stop-color="#7C3AED"/>
        <stop offset="1" stop-color="#2563EB"/>
      </linearGradient>
    </defs>`,
    source: "Cartesia Sonic Audio"
  },
  deepgram: {
    viewBox: "0 0 24 24",
    markup: `<path fill="#13EF93" d="M11.2 24H1.5a.36.36 0 01-.26-.62l6.24-6.28a.36.36 0 01.26-.1h3.52c2.72 0 5.03-2.13 5.11-4.85a5 5 0 00-5-5.15H7.61v4.65c0 .2-.16.36-.36.36H.97a.36.36 0 01-.36-.36V.36C.6.16.77 0 .97 0h10.42c6.68 0 12.11 5.48 12.01 12.19C23.29 18.77 17.79 24 11.2 24z"/>`,
    source: "Deepgram"
  },
  whatsapp: {
    viewBox: "0 0 24 24",
    markup: `<path fill="#25D366" d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.21-.24-.58-.49-.5-.67-.51-.17 0-.37 0-.57 0-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.78h-.01a9.87 9.87 0 01-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 01-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 012.89 6.99c0 5.45-4.44 9.88-9.89 9.88zM20.46 3.48A11.82 11.82 0 0012.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L0 24l6.3-1.65a11.88 11.88 0 005.69 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.41z"/>`,
    source: "WhatsApp"
  },
  platform_smtp: {
    viewBox: "0 0 24 24",
    markup: `<path fill="#2563EB" d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z"/>`,
    source: "Transactional Mail SMTP"
  },
  razorpay: {
    viewBox: "0 0 24 24",
    markup: `<path fill="#0C2451" d="M22.44 0l-11.91 7.77-1.17 4.28 6.62-4.3L11.65 24h4.39l6.4-24zM14.26 10.1L3.39 17.17 1.56 24h9.01l3.69-13.9z"/>`,
    source: "Razorpay"
  },
  stripe: {
    viewBox: "0 0 24 24",
    markup: `<path fill="#635BFF" d="M13.98 9.15c-2.17-.8-3.36-1.42-3.36-2.4 0-.84.68-1.31 1.9-1.31 2.23 0 4.52.86 6.09 1.63l.89-5.49C18.25.98 15.7 0 12.17 0 9.67 0 7.59.65 6.1 1.87 4.56 3.15 3.76 4.99 3.76 7.22c0 4.04 2.47 5.76 6.48 7.22 2.58.92 3.44 1.57 3.44 2.58 0 .98-.84 1.55-2.35 1.55-1.88 0-4.97-.92-6.99-2.11l-.9 5.56C5.18 22.99 8.39 24 11.71 24c2.64 0 4.84-.62 6.33-1.81 1.66-1.31 2.53-3.24 2.53-5.73 0-4.13-2.53-5.85-6.6-7.31z"/>`,
    source: "Stripe"
  },
  twilio: {
    viewBox: "0 0 24 24",
    markup: `<circle cx="12" cy="12" r="11" fill="#F22F46"/><circle cx="8.5" cy="8.5" r="2.2" fill="#FFF"/><circle cx="15.5" cy="8.5" r="2.2" fill="#FFF"/><circle cx="8.5" cy="15.5" r="2.2" fill="#FFF"/><circle cx="15.5" cy="15.5" r="2.2" fill="#FFF"/>`,
    source: "Twilio Telephony"
  },
  exotel: {
    viewBox: "0 0 24 24",
    markup: `<rect x="2" y="2" width="20" height="20" rx="6" fill="#4F46E5"/>
    <path d="M7 17V7h10M7 12h8" stroke="#FFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    source: "Exotel Telephony"
  }
};
