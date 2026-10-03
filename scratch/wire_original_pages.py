"""Keep the ORIGINAL receptionists / appointments / conversations designs and swap only the data source: the inline mock array
becomes state filled from the real admin API. Nothing in the markup or styling is touched."""
import pathlib
import re

ROOT = pathlib.Path(r"C:\Users\Parikshit\Desktop\saas")
PAGES = ROOT / "frontend" / "admin" / "src" / "app" / "(admin)"

# ---------------- backend: phone numbers for receptionists
bp = ROOT / "backend" / "server" / "api" / "routes" / "admin_platform_data.py"
b = bp.read_text(encoding="utf-8")
if "PhoneNumber" not in b:
    b = b.replace("from backend.server.database.models.message import Message\n", "from backend.server.database.models.message import Message\nfrom backend.server.database.models.phone_number import PhoneNumber\n", 1)
    b = b.replace("    stats = {}\n    if ids:", """    numbers = {}
    for pn in db.scalars(select(PhoneNumber).where(PhoneNumber.business_id.in_([b.id for _, b in rows])).order_by(PhoneNumber.provisioned_at.asc())).all() if rows else []:
        numbers.setdefault(pn.business_id, pn)
    stats = {}
    if ids:""", 1)
    b = b.replace('            "engine": cfg.get("engine"),\n            "greeting": a.greeting_message,', '            "engine": cfg.get("engine"),\n            "greeting": a.greeting_message,\n            "aiNumber": numbers[b.id].number if b.id in numbers else None,\n            "forwardedFrom": (numbers[b.id].forwarded_from if b.id in numbers else None) or b.business_phone,', 1)
    bp.write_text(b, encoding="utf-8")


def take_out_array(src: str, name: str) -> str:
    start = src.index(f"const {name}: ")
    end = src.index("\n];\n", start) + len("\n];\n")
    return src[:start] + src[end:]


def inject(src: str, component: str, block: str) -> str:
    marker = f"export default function {component}() {{\n"
    assert src.count(marker) == 1, component
    return src.replace(marker, marker + block, 1)


HEAD_OLD = "import React, { useState } from 'react';"
HEAD_NEW = "import React, { useState, useEffect } from 'react';\nimport { adminFetch } from '@/lib/api';"

HELPERS = '''
const cap = (v: string | null | undefined) => (v ? v.replace(/_/g, ' ').replace(/^\\w/, (c) => c.toUpperCase()) : '');
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '–');
const ago = (iso: string | null) => {
  if (!iso) return 'No calls yet';
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return `${Math.floor(s / 86400)} d ago`;
};
'''

# ---------------- receptionists
p = PAGES / "receptionists" / "page.tsx"
s = p.read_text(encoding="utf-8")
s = s.replace(HEAD_OLD, HEAD_NEW, 1)
s = take_out_array(s, "receptionistsData")
LANG = "const LANGUAGE_NAMES: Record<string, string> = { en: 'English', hi: 'Hindi', nl: 'Dutch', es: 'Spanish', ar: 'Arabic', fr: 'French', de: 'German', pt: 'Portuguese', ta: 'Tamil', te: 'Telugu', bn: 'Bengali', mr: 'Marathi', gu: 'Gujarati' };\nconst AVATARS = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500', 'bg-teal-500'];\n"
s = s.replace("export default function ReceptionistsPage() {", HELPERS + LANG + "\nexport default function ReceptionistsPage() {", 1)
s = inject(s, "ReceptionistsPage", '''  const [receptionistsData, setReceptionistsData] = useState<ReceptionistItem[]>([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let alive = true;
    const load = () =>
      adminFetch<{ items: any[] }>('/admin/receptionists')
        .then((r) => {
          if (!alive) return;
          setLoadError('');
          setReceptionistsData(
            r.items.map((a, i) => ({
              id: a.id,
              name: a.name,
              avatarColor: AVATARS[i % AVATARS.length],
              businessId: a.businessId,
              businessName: a.businessName,
              businessType: a.businessType || 'Business',
              voiceProvider: cap(a.voiceProvider),
              voiceModel: a.voiceModel,
              languages: (a.languages?.length ? a.languages : [a.primaryLanguage]).map((c: string) => LANGUAGE_NAMES[c] || c.toUpperCase()),
              callsHandled: a.callsHandled,
              resolutionRate: a.resolutionRate ?? 0,
              status: (a.status === 'active' ? 'Active' : a.status === 'testing' ? 'Testing' : 'Paused') as ReceptionistItem['status'],
              lastCall: ago(a.lastCallAt),
              greetingText: a.greeting || '',
              aiNumber: a.aiNumber || '–',
              forwardedFrom: a.forwardedFrom || '–',
            }))
          );
        })
        .catch(() => alive && setLoadError('Could not load receptionists from the API.'));
    load();
    const t = window.setInterval(() => document.visibilityState === 'visible' && load(), 60000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);

''')
p.write_text(s, encoding="utf-8")

# ---------------- appointments
p = PAGES / "appointments" / "page.tsx"
s = p.read_text(encoding="utf-8")
s = s.replace(HEAD_OLD, HEAD_NEW, 1)
s = take_out_array(s, "appointmentsData")
s = s.replace("status: 'Confirmed' | 'Completed' | 'Cancelled' | 'No-show';", "status: 'Scheduled' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No-show';", 1)
STATUS = "const STATUS_VIEW: Record<string, { label: AppointmentItem['status']; color: { bg: string; text: string } }> = {\n  confirmed: { label: 'Confirmed', color: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' } },\n  completed: { label: 'Completed', color: { bg: 'bg-[#DBEAFE]', text: 'text-[#1D4ED8]' } },\n  cancelled: { label: 'Cancelled', color: { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]' } },\n  pending: { label: 'Scheduled', color: { bg: 'bg-[#FFEDD5]', text: 'text-[#C2410C]' } },\n  no_show: { label: 'No-show', color: { bg: 'bg-[#FFEDD5]', text: 'text-[#C2410C]' } },\n};\nconst SOURCE_VIEW: Record<string, { label: AppointmentItem['source']; color: { bg: string; text: string } }> = {\n  phone: { label: 'AI', color: { bg: 'bg-[#EFF6FF]', text: 'text-[#2563EB]' } },\n  playground: { label: 'AI', color: { bg: 'bg-[#EFF6FF]', text: 'text-[#2563EB]' } },\n  whatsapp: { label: 'WhatsApp', color: { bg: 'bg-emerald-50', text: 'text-emerald-700' } },\n  manual: { label: 'Staff', color: { bg: 'bg-gray-100', text: 'text-gray-700' } },\n};\n"
s = s.replace("export default function AppointmentsPage() {", HELPERS + STATUS + "\nexport default function AppointmentsPage() {", 1)
s = inject(s, "AppointmentsPage", '''  const [appointmentsData, setAppointmentsData] = useState<AppointmentItem[]>([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let alive = true;
    const load = () =>
      adminFetch<{ items: any[] }>('/admin/appointments')
        .then((r) => {
          if (!alive) return;
          setLoadError('');
          setAppointmentsData(
            r.items.map((a) => {
              const st = STATUS_VIEW[a.status] || STATUS_VIEW.pending;
              const src = SOURCE_VIEW[a.source] || SOURCE_VIEW.manual;
              const day = a.date ? new Date(`${a.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
              return {
                id: a.id,
                businessId: a.businessId,
                businessName: a.businessName,
                patientName: a.patient || '–',
                doctorName: a.doctor || '–',
                serviceName: a.service || '–',
                dateTime: [day, a.time].filter(Boolean).join(', ') || when(a.createdAt),
                status: st.label,
                statusColor: st.color,
                source: src.label,
                sourceColor: src.color,
                businessType: a.businessType || 'Business',
              };
            })
          );
        })
        .catch(() => alive && setLoadError('Could not load appointments from the API.'));
    load();
    const t = window.setInterval(() => document.visibilityState === 'visible' && load(), 30000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);

''')
p.write_text(s, encoding="utf-8")

# ---------------- conversations
p = PAGES / "conversations" / "page.tsx"
s = p.read_text(encoding="utf-8")
s = s.replace(HEAD_OLD, HEAD_NEW, 1)
s = take_out_array(s, "conversationsData")
s = s.replace("sentiment: 'Positive' | 'Neutral' | 'Frustrated';", "sentiment: 'Positive' | 'Neutral' | 'Frustrated' | 'Not analysed';", 1)
SENT = "const SENTIMENT_VIEW: Record<string, { label: ConversationItem['sentiment']; color: { bg: string; text: string } }> = {\n  positive: { label: 'Positive', color: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' } },\n  neutral: { label: 'Neutral', color: { bg: 'bg-gray-100', text: 'text-gray-700' } },\n  negative: { label: 'Frustrated', color: { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]' } },\n};\nconst CHANNEL_VIEW: Record<string, ConversationItem['channel']> = { phone: 'Voice Call', whatsapp: 'WhatsApp', playground: 'Web Chat' };\nconst length = (sec: number) => (sec >= 60 ? `${Math.floor(sec / 60)}m ${sec % 60}s` : `${sec}s`);\n"
s = s.replace("export default function ConversationsPage() {", HELPERS + SENT + "\nexport default function ConversationsPage() {", 1)
s = inject(s, "ConversationsPage", '''  const [conversationsData, setConversationsData] = useState<ConversationItem[]>([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let alive = true;
    const load = () =>
      adminFetch<{ items: any[] }>('/admin/conversations')
        .then((r) => {
          if (!alive) return;
          setLoadError('');
          setConversationsData(
            r.items.map((c) => {
              const sent = SENTIMENT_VIEW[c.sentiment] || { label: 'Not analysed' as const, color: { bg: 'bg-gray-50', text: 'text-gray-500' } };
              return {
                id: c.id,
                businessId: c.businessId,
                businessName: c.businessName,
                businessType: c.businessType || 'Business',
                channel: CHANNEL_VIEW[c.channel] || 'Voice Call',
                user: c.callerName || c.callerNumber || 'Unknown',
                userPhone: c.callerNumber || '–',
                topic: c.topic ? cap(c.topic) : c.summary ? String(c.summary).slice(0, 48) : '–',
                turns: c.messages,
                duration: length(c.durationSeconds),
                sentiment: sent.label,
                sentimentColor: sent.color,
                date: when(c.startedAt),
              };
            })
          );
        })
        .catch(() => alive && setLoadError('Could not load conversations from the API.'));
    load();
    const t = window.setInterval(() => document.visibilityState === 'visible' && load(), 30000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);

''')
p.write_text(s, encoding="utf-8")
print("wired the three original pages")
