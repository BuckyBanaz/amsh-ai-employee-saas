"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TicketList, fetchTickets } from '@/lib/api';
import { Card, Chip, Empty, ErrorBox, INPUT, PRIORITY_TONE, PageHeader, STATUS_TONE, errorText, label, when } from '@/components/admin/ui';

export default function SupportTicketsPage() {
  const [data, setData] = useState<TicketList | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [assignee, setAssignee] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchTickets({ status, priority, category, assignee, q })
      .then((d) => { if (!cancelled) { setData(d); setError(''); } })
      .catch((e: unknown) => { if (!cancelled) setError(errorText(e, 'Could not load tickets')); });
    return () => { cancelled = true; };
  }, [status, priority, category, assignee, q]);

  const tabs = ['', 'open', 'in_progress', 'waiting', 'resolved', 'closed'];
  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <PageHeader title="Support Tickets" subtitle="Requests from clinics. Reply, assign and resolve here; the clinic sees public replies only." />
      {error && <ErrorBox message={error} />}

      <div className="mb-3 flex flex-wrap gap-1 rounded-lg border border-[#E2E8F0] bg-white p-1 text-xs font-medium" role="tablist" aria-label="Status">
        {tabs.map((t) => (
          <button key={t || 'all'} role="tab" aria-selected={status === t} onClick={() => setStatus(t)} className={`rounded-md px-3 py-1.5 ${status === t ? 'bg-[#0066FF] text-white' : 'text-[#475569] hover:bg-slate-50'}`}>
            {t ? label(t) : 'All'} <span className={status === t ? 'text-blue-100' : 'text-[#94A3B8]'}>{t ? data?.counts[t] ?? 0 : data?.total ?? 0}</span>
          </button>
        ))}
      </div>

      <Card className="mb-4 p-3">
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); setQ(search.trim()); }}>
          <label className="min-w-[200px] flex-1 text-xs font-medium text-[#475569]">Search<input className={`${INPUT} mt-1`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Subject or #number" /></label>
          <label className="text-xs font-medium text-[#475569]">Priority<select className={`${INPUT} mt-1`} value={priority} onChange={(e) => setPriority(e.target.value)}><option value="">Any</option>{(data?.options.priorities ?? []).map((p) => <option key={p} value={p}>{label(p)}</option>)}</select></label>
          <label className="text-xs font-medium text-[#475569]">Topic<select className={`${INPUT} mt-1`} value={category} onChange={(e) => setCategory(e.target.value)}><option value="">Any</option>{(data?.options.categories ?? []).map((c) => <option key={c} value={c}>{label(c)}</option>)}</select></label>
          <label className="text-xs font-medium text-[#475569]">Assigned to<select className={`${INPUT} mt-1`} value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="">Anyone</option><option value="me">Me</option><option value="unassigned">Unassigned</option>{(data?.staff ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <button type="submit" className="rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#334155] hover:bg-slate-50">Search</button>
        </form>
      </Card>

      {!data && !error && <p className="p-5 text-sm text-[#475569]">Loading tickets...</p>}
      {data && (
        <Card className="overflow-x-auto">
          {data.items.length === 0 ? <Empty>{data.total === 0 ? 'No tickets yet. They appear here when a clinic asks for help.' : 'No tickets match these filters.'}</Empty> : (
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead><tr className="border-b border-[#E2E8F0] bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]"><th className="px-4 py-2.5">Ticket</th><th className="px-3">Business</th><th className="px-3">Topic</th><th className="px-3">Priority</th><th className="px-3">Status</th><th className="px-3">Assigned</th><th className="px-3">Updated</th></tr></thead>
              <tbody>
                {data.items.map((t) => (
                  <tr key={t.id} className="border-t border-[#F1F5F9] hover:bg-slate-50">
                    <td className="max-w-[280px] px-4 py-2.5"><Link href={`/tickets/${t.id}`} className="font-medium text-[#0F172A] hover:text-[#0066FF]"><span className="mr-1.5 font-mono text-xs text-[#94A3B8]">#{t.number}</span>{t.subject}</Link><p className="truncate text-xs text-[#94A3B8]">{t.last_message}</p></td>
                    <td className="px-3 py-2.5 text-[#475569]">{t.business_name}</td>
                    <td className="px-3 py-2.5 text-[#475569]">{label(t.category)}</td>
                    <td className="px-3 py-2.5"><Chip tone={PRIORITY_TONE[t.priority]}>{t.priority}</Chip></td>
                    <td className="px-3 py-2.5"><Chip tone={STATUS_TONE[t.status]}>{label(t.status)}</Chip></td>
                    <td className="px-3 py-2.5 text-[#475569]">{t.assignee ?? <span className="text-[#94A3B8]">Unassigned</span>}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[#64748B]">{when(t.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
