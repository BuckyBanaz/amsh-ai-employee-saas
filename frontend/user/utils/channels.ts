// Where a booking / conversation came from. Mirrors backend/server/common/channels.py: the API sends `channel` (key) and
// `channel_label`; `normalizeChannel` also understands older free-text sources ("AI Call", "Website", "ai_voice_receptionist").

export type ChannelKey = 'phone' | 'whatsapp' | 'web_chat' | 'email' | 'social' | 'walk_in' | 'dashboard' | 'other';

export const CHANNEL_META: Record<ChannelKey, { label: string; text: string; icon: string }> = {
  phone: { label: 'Phone call', text: 'text-[#0066FF]', icon: 'phone' },
  whatsapp: { label: 'WhatsApp', text: 'text-emerald-700', icon: 'chat' },
  web_chat: { label: 'Website chat', text: 'text-violet-700', icon: 'globe' },
  email: { label: 'Email', text: 'text-pink-700', icon: 'mail' },
  social: { label: 'Social media', text: 'text-cyan-700', icon: 'share' },
  walk_in: { label: 'Front desk', text: 'text-amber-700', icon: 'desk' },
  dashboard: { label: 'Dashboard', text: 'text-slate-600', icon: 'desk' },
  other: { label: 'Other', text: 'text-gray-500', icon: 'dot' },
};

export function normalizeChannel(raw?: string | null, hasCallId = false): ChannelKey {
  const s = (raw || '').toLowerCase().replace(/\s+/g, '_');
  if (s in CHANNEL_META) return s as ChannelKey;
  if (s.includes('whatsapp')) return 'whatsapp';
  if (s.includes('web') || s.includes('widget')) return 'web_chat';
  if (s.includes('mail')) return 'email';
  if (/instagram|facebook|messenger|social/.test(s)) return 'social';
  if (s.includes('walk') || s.includes('front_desk')) return 'walk_in';
  if (s.includes('manual') || s.includes('dashboard')) return 'dashboard';
  if (/voice|phone|call/.test(s)) return 'phone';
  return hasCallId ? 'phone' : 'other';
}

/** Channel key for an appointment row from the API (prefers the backend's `channel`). */
export function channelOfAppointment(a: { channel?: string; details?: { source?: string; channel?: string }; call_id?: string | null }): ChannelKey {
  return normalizeChannel(a.channel || a.details?.channel || a.details?.source, Boolean(a.call_id));
}
