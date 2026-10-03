"use client";

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { TicketItem, TicketList, fetchTicket, fetchTickets, patchTicket, replyTicket } from '@/lib/api';
import { Card, Chip, ErrorBox, INPUT, Loading, PRIMARY, PRIORITY_TONE, STATUS_TONE, errorText, label, when } from '@/components/admin/ui';

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [t, setT] = useState<TicketItem | null>(null);
  const [staff, setStaff] = useState<TicketList['staff']>([]);
  const [options, setOptions] = useState<TicketList['options'] | null>(null);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchTicket(id).then(setT).catch((e: unknown) => setError(errorText(e, 'Could not load the ticket')));
    fetchTickets({}).then((d) => { setStaff(d.staff); setOptions(d.options); }).catch(() => undefined);
  }, [id]);

  async function run(fn: () => Promise<TicketItem>) {
    setBusy(true); setError('');
    try { setT(await fn()); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }

  if (error && !t) return <div className="p-5"><ErrorBox message={error} /></div>;
  if (!t) return <Loading what="ticket" />;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <Link href="/tickets" className="text-xs font-medium text-[#0066FF] hover:underline">&larr; All tickets</Link>
      <header className="mb-4 mt-2 flex flex-wrap items-start justify-between gap-3 border-b border-[#E2E8F0] pb-3">
        <div className="min-w-0"><p className="font-mono text-xs text-[#94A3B8]">#{t.number} &middot; {label(t.category)}</p><h1 className="text-lg font-bold leading-tight text-[#0F172A]">{t.subject}</h1>
          <p className="mt-0.5 text-xs text-[#475569]">{t.business_name}{t.requester ? `, from ${t.requester}` : ''}{t.requester_email ? ` (${t.requester_email})` : ''} &middot; opened {when(t.created_at)}</p></div>
        <div className="flex gap-2"><Chip tone={PRIORITY_TONE[t.priority]}>{t.priority}</Chip><Chip tone={STATUS_TONE[t.status]}>{label(t.status)}</Chip></div>
      </header>
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-3">
          {(t.messages ?? []).map((m) => (
            <Card key={m.id} className={`p-3 ${m.internal ? 'border-amber-200 bg-amber-50' : m.from_staff ? 'border-blue-200 bg-[#F5F9FF]' : ''}`}>
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs"><strong className="text-[#0F172A]">{m.author}</strong>
                {m.internal ? <Chip tone="amber">Internal note</Chip> : <Chip tone={m.from_staff ? 'blue' : 'grey'}>{m.from_staff ? 'AMSh' : 'Clinic'}</Chip>}<span className="text-[#94A3B8]">{when(m.created_at)}</span></div>
              <p className="whitespace-pre-wrap text-sm text-[#1E293B]">{m.body}</p>
            </Card>
          ))}
          <Card className="p-3">
            <label htmlFor="reply" className="text-xs font-medium text-[#475569]">{internal ? 'Internal note (the clinic will not see this)' : 'Reply to the clinic'}</label>
            <textarea id="reply" rows={4} className={`${INPUT} mt-1`} value={text} onChange={(e) => setText(e.target.value)} placeholder={internal ? 'Notes for the team...' : 'Write your reply...'} />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs text-[#475569]"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />Internal note only</label>
              <button className={PRIMARY} disabled={busy || !text.trim()} onClick={() => run(async () => { const r = await replyTicket(t.id, { body: text, internal }); setText(''); return r; })}>{internal ? 'Add note' : 'Send reply'}</button>
            </div>
          </Card>
        </div>

        <aside className="space-y-3">
          <Card className="space-y-3 p-3">
            <label className="block text-xs font-medium text-[#475569]">Status<select className={`${INPUT} mt-1`} value={t.status} disabled={busy} onChange={(e) => run(() => patchTicket(t.id, { status: e.target.value }))}>{(options?.statuses ?? [t.status]).map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></label>
            <label className="block text-xs font-medium text-[#475569]">Priority<select className={`${INPUT} mt-1`} value={t.priority} disabled={busy} onChange={(e) => run(() => patchTicket(t.id, { priority: e.target.value }))}>{(options?.priorities ?? [t.priority]).map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></label>
            <label className="block text-xs font-medium text-[#475569]">Assigned to<select className={`${INPUT} mt-1`} value={t.assignee_id ?? ''} disabled={busy} onChange={(e) => run(() => (e.target.value ? patchTicket(t.id, { assignee_id: e.target.value }) : patchTicket(t.id, { unassign: true })))}><option value="">Unassigned</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          </Card>
          <Card className="p-3 text-xs text-[#475569]"><p>First reply: <strong>{t.first_response_at ? when(t.first_response_at) : 'not yet'}</strong></p><p className="mt-1">Resolved: <strong>{t.resolved_at ? when(t.resolved_at) : 'no'}</strong></p></Card>
        </aside>
      </div>
    </div>
  );
}
