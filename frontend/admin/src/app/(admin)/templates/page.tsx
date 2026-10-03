"use client";

import { useCallback, useEffect, useState } from 'react';
import { MessageLogRow, TemplateChannel, TemplateGrid, TemplateGridCell, TemplateMeta, fetchMessageLog, fetchTemplateGrid, fetchTemplateMeta } from '@/lib/api';
import { TemplateEditor } from '@/components/admin/templates/TemplateEditor';
import { Card, Chip, Empty, ErrorBox, Loading, PageHeader, Tone, errorText, label, when } from '@/components/admin/ui';

const CHANNEL_NAME: Record<string, string> = { email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp', push: 'In-app' };
const CELL_STYLE: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  draft: 'bg-amber-50 text-amber-700 border-amber-200',
  default: 'bg-slate-50 text-slate-600 border-slate-200',
  missing: 'bg-white text-[#94A3B8] border-dashed border-[#CBD5E1]',
};
const CELL_TEXT: Record<string, string> = { active: 'Active', draft: 'Draft', default: 'Built-in', missing: 'Add' };
const LOG_TONE: Record<string, Tone> = { queued: 'grey', sent: 'blue', delivered: 'green', read: 'green', failed: 'red' };

type Sel = { event: string; channel: TemplateChannel } | null;

export default function TemplatesPage() {
  const [meta, setMeta] = useState<TemplateMeta | null>(null);
  const [grid, setGrid] = useState<TemplateGrid | null>(null);
  const [error, setError] = useState('');
  const [sel, setSel] = useState<Sel>(null);
  const [tab, setTab] = useState<'templates' | 'log'>('templates');

  const loadGrid = useCallback(() => fetchTemplateGrid().then((g) => { setGrid(g); setError(''); }).catch((e: unknown) => setError(errorText(e, 'Could not load templates'))), []);
  useEffect(() => { void loadGrid(); fetchTemplateMeta().then(setMeta).catch(() => undefined); }, [loadGrid]);

  if (error && !grid) return <div className="p-5"><ErrorBox message={error} /></div>;
  if (!grid) return <Loading what="message templates" />;
  const channels = (meta?.channels ?? ['email', 'sms', 'whatsapp', 'push']) as TemplateChannel[];
  const groups = Array.from(new Set(grid.items.map((i) => i.group)));

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <PageHeader title="Message Templates" subtitle="The wording AMSh and its clinics send by Email, SMS, WhatsApp and in-app. Clinics can override the patient and staff messages; this is the default for everyone.">
        <nav className="flex gap-1 rounded-lg border border-[#E2E8F0] bg-white p-1 text-xs font-medium" aria-label="Sections">
          {([['templates', 'Templates'], ['log', 'Delivery log']] as const).map(([id, text]) => (
            <button key={id} onClick={() => setTab(id)} aria-current={tab === id} className={`rounded-md px-3 py-1.5 ${tab === id ? 'bg-[#0066FF] text-white' : 'text-[#475569] hover:bg-slate-50'}`}>{text}</button>
          ))}
        </nav>
      </PageHeader>
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}

      {tab === 'log' ? <DeliveryLog /> : (
        <>
          <p className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">Cells marked <strong>Live</strong> are what the app sends today: booking confirmations, appointment reminders, the missed-call follow-up and staff alerts. The other messages (sign-in and billing emails, in-app notices, rescheduled / cancelled / feedback) are saved and versioned here but the app still sends the wording written in code.</p>
          <div className={`grid gap-4 ${sel ? 'xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]' : ''}`}>
            <Card className="min-w-0 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead><tr className="border-b border-[#E2E8F0] bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]"><th className="px-4 py-2.5">Event</th>{channels.map((c) => <th key={c} className="px-3 py-2.5">{CHANNEL_NAME[c]}</th>)}</tr></thead>
                <tbody>
                  {groups.map((g) => (
                    <GroupRows key={g} group={g} items={grid.items.filter((i) => i.group === g)} channels={channels} sel={sel} onSelect={(event, channel) => setSel({ event, channel })} />
                  ))}
                </tbody>
              </table>
            </Card>
            {sel && <TemplateEditor key={`${sel.event}|${sel.channel}`} eventKey={sel.event} channel={sel.channel} onClose={() => setSel(null)} onChanged={() => void loadGrid()} />}
          </div>
        </>
      )}
    </div>
  );
}

function GroupRows({ group, items, channels, sel, onSelect }: { group: string; items: TemplateGrid['items']; channels: TemplateChannel[]; sel: Sel; onSelect: (e: string, c: TemplateChannel) => void }) {
  return (
    <>
      <tr className="bg-slate-50/70"><td colSpan={channels.length + 1} className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">{group}</td></tr>
      {items.map((e) => (
        <tr key={e.key} className="border-t border-[#F1F5F9]">
          <td className="px-4 py-2.5"><p className="font-medium text-[#1E293B]">{e.label}</p><p className="text-[11px] text-[#94A3B8]">to {e.to}{e.owner === 'business' ? ', clinics can override' : ''}</p></td>
          {channels.map((c) => {
            const cell: TemplateGridCell | undefined = e.cells[c];
            if (!cell) return <td key={c} className="px-3 py-2 text-xs text-[#CBD5E1]" aria-label="Not sent by this channel">-</td>;
            const active = sel?.event === e.key && sel.channel === c;
            return (
              <td key={c} className="px-3 py-2">
                <button onClick={() => onSelect(e.key, c)} aria-pressed={active} className={`flex w-full min-w-[84px] flex-col items-start gap-0.5 rounded-md border px-2 py-1 text-left text-[11px] font-semibold transition-shadow hover:shadow-sm ${CELL_STYLE[cell.status]} ${active ? 'ring-2 ring-[#0066FF]' : ''}`}>
                  <span className="flex w-full items-center justify-between gap-1"><span>{CELL_TEXT[cell.status]}</span>{cell.live && <span className="rounded bg-emerald-600 px-1 text-[9px] font-bold uppercase leading-4 text-white">Live</span>}</span>
                  <span className="font-normal text-[#64748B]">{cell.languages.map((l) => l.toUpperCase()).join(' / ')}{c === 'whatsapp' && cell.meta_status ? ` / ${cell.meta_status}` : ''}</span>
                </button>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

function DeliveryLog() {
  const [rows, setRows] = useState<MessageLogRow[] | null>(null);
  const [error, setError] = useState('');
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  useEffect(() => { fetchMessageLog({ channel, status, limit: 100 }).then((d) => { setRows(d.items); setError(''); }).catch((e: unknown) => setError(errorText(e, 'Could not load the delivery log'))); }, [channel, status]);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <label className="text-xs font-medium text-[#475569]">Channel<select className="mt-1 block rounded-md border border-[#E2E8F0] bg-white px-2 py-1.5 text-sm" value={channel} onChange={(e) => setChannel(e.target.value)}><option value="">Any</option>{Object.entries(CHANNEL_NAME).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="text-xs font-medium text-[#475569]">Status<select className="mt-1 block rounded-md border border-[#E2E8F0] bg-white px-2 py-1.5 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Any</option>{['queued', 'sent', 'delivered', 'read', 'failed'].map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></label>
      </div>
      {error && <ErrorBox message={error} />}
      <Card className="overflow-x-auto">
        {!rows ? <Empty>Loading...</Empty> : rows.length === 0 ? <Empty>No messages recorded yet. Sent messages are listed here once events are switched over to the template system.</Empty> : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead><tr className="border-b border-[#E2E8F0] bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]"><th className="px-4 py-2.5">When</th><th className="px-3">Message</th><th className="px-3">To</th><th className="px-3">Channel</th><th className="px-3">Status</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="border-t border-[#F1F5F9]"><td className="whitespace-nowrap px-4 py-2.5 text-[#64748B]">{when(r.created_at)}</td><td className="px-3 py-2.5 font-medium text-[#1E293B]">{r.event}</td><td className="px-3 py-2.5 font-mono text-xs text-[#64748B]">{r.recipient}</td><td className="px-3 py-2.5 text-[#475569]">{CHANNEL_NAME[r.channel] ?? r.channel}</td>
                <td className="px-3 py-2.5"><Chip tone={LOG_TONE[r.status] ?? 'grey'}>{r.status}</Chip>{r.error && <span className="ml-2 text-xs text-red-600">{r.error}</span>}</td></tr>
            ))}</tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
