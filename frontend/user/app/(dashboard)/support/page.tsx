"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { PRIORITIES, SupportService, TOPICS, TicketDto } from '../../../services/support.service';

const INPUT = 'w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]';
const BTN = 'px-3 py-1.5 rounded-md border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40';
const PRIMARY = 'px-4 py-1.5 rounded-md bg-[#0066FF] text-white text-xs font-semibold hover:bg-blue-600 transition-colors shadow-xs disabled:opacity-50';
const STATUS: Record<string, { text: string; style: string }> = {
  open: { text: 'Received', style: 'bg-blue-50 text-[#0066FF]' },
  in_progress: { text: 'Being worked on', style: 'bg-amber-50 text-amber-700' },
  waiting: { text: 'Waiting for you', style: 'bg-purple-50 text-purple-700' },
  resolved: { text: 'Resolved', style: 'bg-emerald-50 text-emerald-700' },
  closed: { text: 'Closed', style: 'bg-gray-100 text-gray-500' },
};
const pretty = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const errText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

export default function SupportPage() {
  const [tickets, setTickets] = useState<TicketDto[] | null>(null);
  const [open, setOpen] = useState<TicketDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ subject: '', body: '', category: 'technical', priority: 'normal' });
  const [reply, setReply] = useState('');

  const load = useCallback(async () => {
    try { setTickets((await SupportService.list()).items); setError(''); } catch (e) { setError(errText(e)); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function run(fn: () => Promise<TicketDto | void>, after?: (t: TicketDto | void) => void) {
    setBusy(true); setError('');
    try { const r = await fn(); after?.(r); await load(); } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3.5 animate-in fade-in duration-300 pb-8 w-full max-w-4xl">
      <header className="flex flex-wrap items-center justify-between gap-3 py-1">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight leading-tight">Help &amp; Support</h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Ask the AMSh team for help. Replies appear here, and you can answer in the same place.</p>
        </div>
        {!creating && !open && <button className={PRIMARY} onClick={() => setCreating(true)}>New request</button>}
      </header>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {creating && (
        <form className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)] space-y-3" onSubmit={(e) => { e.preventDefault(); void run(() => SupportService.open(form), (t) => { setCreating(false); setForm({ subject: '', body: '', category: 'technical', priority: 'normal' }); if (t) setOpen(t); }); }}>
          <h2 className="text-sm font-bold text-gray-900">What do you need help with?</h2>
          <label className="block text-xs font-semibold text-gray-700">Short summary<input required minLength={3} maxLength={200} className={`${INPUT} mt-1`} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="For example: the AI does not answer after 6pm" /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-gray-700">Topic<select className={`${INPUT} mt-1`} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{TOPICS.map((t) => <option key={t} value={t}>{pretty(t)}</option>)}</select></label>
            <label className="block text-xs font-semibold text-gray-700">How urgent is it?<select className={`${INPUT} mt-1`} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{PRIORITIES.map((t) => <option key={t} value={t}>{pretty(t)}</option>)}</select></label>
          </div>
          <label className="block text-xs font-semibold text-gray-700">Details<textarea required maxLength={5000} rows={5} className={`${INPUT} mt-1`} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="What happened, when it started, and any phone numbers or names involved." /></label>
          <div className="flex gap-2"><button type="submit" className={PRIMARY} disabled={busy}>{busy ? 'Sending...' : 'Send request'}</button><button type="button" className={BTN} onClick={() => setCreating(false)}>Cancel</button></div>
        </form>
      )}

      {open ? (
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)] space-y-3">
          <button className="text-xs font-semibold text-[#0066FF] hover:underline" onClick={() => { setOpen(null); setReply(''); }}>&larr; All requests</button>
          <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-mono text-[11px] text-gray-400">#{open.number} &middot; {pretty(open.category)}</p><h2 className="text-sm font-bold text-gray-900">{open.subject}</h2></div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS[open.status]?.style}`}>{STATUS[open.status]?.text ?? open.status}</span></div>
          <ul className="space-y-2">
            {(open.messages ?? []).map((m) => (
              <li key={m.id} className={`rounded-lg p-3 text-xs ${m.from_staff ? 'bg-[#F5F9FF] border border-blue-100' : 'bg-gray-50 border border-gray-100'}`}>
                <p className="mb-1 flex items-center gap-2 font-semibold text-gray-900">{m.from_staff ? 'AMSh support' : m.author}<span className="font-normal text-gray-400">{when(m.created_at)}</span></p>
                <p className="whitespace-pre-wrap text-gray-800">{m.body}</p>
              </li>
            ))}
          </ul>
          <form onSubmit={(e) => { e.preventDefault(); void run(() => SupportService.reply(open.id, reply), (t) => { setReply(''); if (t) setOpen(t); }); }} className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700">{open.status === 'resolved' || open.status === 'closed' ? 'Reply to reopen this request' : 'Your reply'}<textarea required maxLength={5000} rows={3} className={`${INPUT} mt-1`} value={reply} onChange={(e) => setReply(e.target.value)} /></label>
            <button type="submit" className={PRIMARY} disabled={busy || !reply.trim()}>Send reply</button>
          </form>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden">
          {!tickets ? <p className="p-6 text-xs text-gray-500">Loading...</p> : tickets.length === 0 ? (
            <p className="p-8 text-center text-xs text-gray-500">No requests yet. Use &quot;New request&quot; when something is not working or you need a hand.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {tickets.map((t) => (
                <li key={t.id}>
                  <button className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50" onClick={() => void run(async () => { setOpen(await SupportService.get(t.id)); })}>
                    <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-gray-900"><span className="mr-1.5 font-mono font-normal text-gray-400">#{t.number}</span>{t.subject}</p><p className="truncate text-[11px] text-gray-500">{t.last_message}</p></div>
                    <span className="hidden text-[11px] text-gray-400 sm:block">{when(t.updated_at)}</span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS[t.status]?.style}`}>{STATUS[t.status]?.text ?? t.status}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
