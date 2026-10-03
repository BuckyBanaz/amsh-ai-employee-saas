"use client";

import { useState } from 'react';
import { CHANNELS, EVENTS, TEMPLATES, Channel, Template, TemplateStatus, cellKey } from '@/components/admin/templates/catalog';
import { TemplateEditor } from '@/components/admin/templates/TemplateEditor';

const CHIP: Record<TemplateStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  draft: 'bg-amber-50 text-amber-700 border-amber-200',
  missing: 'bg-white text-[#94A3B8] border-dashed border-[#CBD5E1]',
};

const CHANNEL_STATUS = [
  { key: 'email', name: 'Email', detail: 'SMTP connected', tone: 'ok', volume: '184 today' },
  { key: 'sms', name: 'SMS', detail: 'Twilio account inactive', tone: 'bad', volume: '0 today' },
  { key: 'whatsapp', name: 'WhatsApp', detail: 'Meta test number', tone: 'warn', volume: '37 today' },
  { key: 'push', name: 'In-app', detail: 'Live (SSE)', tone: 'ok', volume: '212 today' },
] as const;
const DOT = { ok: 'bg-emerald-500', warn: 'bg-amber-500', bad: 'bg-red-500' };

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Record<string, Template>>(TEMPLATES);
  const [sel, setSel] = useState<{ event: string; channel: Channel } | null>({ event: 'booking.reminder', channel: 'whatsapp' });
  const groups = Array.from(new Set(EVENTS.map((e) => e.group)));

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2.5 border-b border-[#E2E8F0] pb-3">
        <div>
          <h1 className="text-lg font-bold leading-tight tracking-tight text-[#0F172A]">Message Templates</h1>
          <p className="mt-0.5 text-xs font-normal text-[#475569]">The wording AMSh and its clinics send by Email, SMS, WhatsApp and in-app. Clinics can override a template; this is the default for everyone.</p>
        </div>
        <nav className="flex gap-1 rounded-lg border border-[#E2E8F0] bg-white p-1 text-xs font-medium" aria-label="Sections">
          <span className="rounded-md bg-[#0066FF] px-3 py-1.5 text-white">Templates</span>
          <span className="rounded-md px-3 py-1.5 text-[#94A3B8]" title="Next phase">Channels</span>
          <span className="rounded-md px-3 py-1.5 text-[#94A3B8]" title="Next phase">Delivery log</span>
        </nav>
      </header>

      <section aria-label="Channel status" className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {CHANNEL_STATUS.map((c) => (
          <div key={c.key} className="rounded-lg border border-[#E2E8F0] bg-white p-3 shadow-2xs">
            <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${DOT[c.tone]}`} /><span className="text-sm font-bold text-[#1E293B]">{c.name}</span></div>
            <p className="mt-1 text-xs text-[#475569]">{c.detail}</p>
            <p className="text-xs text-[#94A3B8]">{c.volume}</p>
          </div>
        ))}
      </section>

      <div className={`grid gap-4 ${sel ? 'xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]' : ''}`}>
        <div className="min-w-0 overflow-x-auto rounded-lg border border-[#E2E8F0] bg-white shadow-2xs">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                <th className="px-4 py-2.5">Event</th>
                {CHANNELS.map((c) => <th key={c.key} className="px-3 py-2.5">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <GroupRows key={g} group={g} templates={templates} sel={sel} onSelect={(event, channel) => setSel({ event, channel })} />
              ))}
            </tbody>
          </table>
        </div>

        {sel && (
          <TemplateEditor
            key={cellKey(sel.event, sel.channel)}
            eventKey={sel.event}
            channel={sel.channel}
            template={templates[cellKey(sel.event, sel.channel)]}
            onClose={() => setSel(null)}
            onChange={(t) => setTemplates((prev) => ({ ...prev, [cellKey(sel.event, sel.channel)]: t }))}
          />
        )}
      </div>
    </div>
  );
}

function GroupRows({ group, templates, sel, onSelect }: {
  group: string;
  templates: Record<string, Template>;
  sel: { event: string; channel: Channel } | null;
  onSelect: (event: string, channel: Channel) => void;
}) {
  return (
    <>
      <tr className="bg-slate-50/70"><td colSpan={5} className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">{group}</td></tr>
      {EVENTS.filter((e) => e.group === group).map((e) => (
        <tr key={e.key} className="border-t border-[#F1F5F9]">
          <td className="px-4 py-2.5"><p className="font-medium text-[#1E293B]">{e.label}</p><p className="text-[11px] text-[#94A3B8]">to {e.to}</p></td>
          {CHANNELS.map((c) => {
            const t = templates[cellKey(e.key, c.key)];
            const status: TemplateStatus = t?.status ?? 'missing';
            const active = sel?.event === e.key && sel.channel === c.key;
            return (
              <td key={c.key} className="px-3 py-2">
                <button onClick={() => onSelect(e.key, c.key)} aria-pressed={active} className={`flex w-full min-w-[84px] flex-col items-start gap-0.5 rounded-md border px-2 py-1 text-left text-[11px] font-semibold capitalize transition-shadow hover:shadow-sm ${CHIP[status]} ${active ? 'ring-2 ring-[#0066FF]' : ''}`}>
                  <span>{status === 'missing' ? 'Add' : status}</span>
                  {t && <span className="font-normal normal-case text-[#64748B]">{t.languages.join(' · ') || 'EN'}{c.key === 'whatsapp' && t.meta ? ` · ${t.meta}` : ''}</span>}
                </button>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
