"use client";

import { useEffect, useRef, useState } from 'react';
import { TenantItem, adminFetch, fetchTenants } from '@/lib/api';
import { BTN, Card, Chip, ErrorBox, INPUT, PRIMARY, PageHeader, errorText } from '@/components/admin/ui';

interface TestAction { kind: string; summary: string; at?: string }
interface Turn { who: 'you' | 'ai'; text: string; ms?: number; provider?: string }
interface SimResult { call_id: string; bot_response: string; latency_ms?: number; llm_provider?: string; test_actions?: TestAction[]; should_transfer?: boolean }

const newCallId = () => `sim_admin_${Math.random().toString(36).slice(2, 9)}`;
const KIND_LABEL: Record<string, string> = { book: 'Booking', cancel: 'Cancellation', reschedule: 'Reschedule', transfer: 'Transfer' };

export default function PlaygroundPage() {
  const [tenants, setTenants] = useState<TenantItem[] | null>(null);
  const [businessId, setBusinessId] = useState('');
  const [callId, setCallId] = useState(newCallId);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [actions, setActions] = useState<TestAction[]>([]);
  const [text, setText] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTenants({}).then((d) => setTenants(d.items)).catch((e: unknown) => setError(errorText(e, 'Could not load the clinics')));
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [turns, busy]);

  const reset = () => { setTurns([]); setActions([]); setCallId(newCallId()); setError(''); };
  const pick = (id: string) => { setBusinessId(id); reset(); };

  async function send() {
    const message = text.trim();
    if (!message || !businessId || busy) return;
    setText(''); setError(''); setBusy(true);
    setTurns((t) => [...t, { who: 'you', text: message }]);
    try {
      const r = await adminFetch<SimResult>('/voice/simulate', {
        method: 'POST',
        body: JSON.stringify({ business_id: businessId, call_id: callId, caller_number: phone.trim(), user_transcript: message }),
      });
      setTurns((t) => [...t, { who: 'ai', text: r.bot_response, ms: r.latency_ms, provider: r.llm_provider }]);
      setActions(r.test_actions ?? []);
    } catch (e) {
      setError(errorText(e, 'The AI could not answer'));
    } finally { setBusy(false); }
  }

  const tenant = tenants?.find((t) => t.id === businessId);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <PageHeader title="Playground" subtitle="Talk to any clinic's AI as a caller. It reads that clinic's real settings and calendar, but nothing it does is saved or sent.">
        <button className={BTN} onClick={reset} disabled={!turns.length && !actions.length}>New conversation</button>
      </PageHeader>
      <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900" data-testid="test-mode-banner">
        <strong>Test mode.</strong> Bookings, cancellations, reschedules and transfers only appear in the right-hand list. No appointment is created, no SMS or WhatsApp is sent, no call is placed, and this conversation stays out of the clinic&apos;s call logs and analytics.
      </p>
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="flex min-h-[420px] flex-col p-4">
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-[#475569]">Clinic
              <select className={`${INPUT} mt-1`} value={businessId} onChange={(e) => pick(e.target.value)} disabled={!tenants}>
                <option value="">{tenants ? 'Choose a clinic…' : 'Loading clinics…'}</option>
                {(tenants ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}{t.status !== 'active' ? ` (${t.status})` : ''}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-[#475569]">Caller number (optional)
              <input className={`${INPUT} mt-1`} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91… (the AI asks if empty)" disabled={turns.length > 0} />
            </label>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto rounded-md border border-[#F1F5F9] bg-[#F8FAFC] p-3" style={{ maxHeight: 420 }} data-testid="chat">
            {!turns.length && <p className="py-10 text-center text-xs text-[#94A3B8]">{businessId ? `Say something as a caller to ${tenant?.name ?? 'the clinic'}'s AI, for example “I want to book a checkup tomorrow”.` : 'Choose a clinic to start.'}</p>}
            {turns.map((t, i) => (
              <div key={i} className={`flex ${t.who === 'you' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${t.who === 'you' ? 'bg-[#0066FF] text-white' : 'border border-[#E2E8F0] bg-white text-[#0F172A]'}`}>
                  {t.text}
                  {t.who === 'ai' && t.ms != null && <div className="mt-1 text-[10px] text-[#94A3B8]">{t.provider ? `${t.provider} · ` : ''}{(t.ms / 1000).toFixed(1)}s</div>}
                </div>
              </div>
            ))}
            {busy && <p className="text-xs text-[#94A3B8]">The AI is thinking…</p>}
            <div ref={endRef} />
          </div>

          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(); }}>
            <input className={`${INPUT} flex-1`} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type what the caller says…" disabled={!businessId || busy} aria-label="Caller message" />
            <button type="submit" className={PRIMARY} disabled={!businessId || busy || !text.trim()}>Send</button>
          </form>
        </Card>

        <Card className="h-fit p-4">
          <h2 className="mb-1 text-sm font-bold text-[#0F172A]">What the AI would have done</h2>
          <p className="mb-3 text-xs text-[#475569]">Nothing below was saved.</p>
          {!actions.length ? <p className="text-xs text-[#94A3B8]">No bookings, changes or transfers yet.</p> : (
            <ul className="space-y-2" data-testid="test-actions">
              {actions.map((a, i) => (
                <li key={i} className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs text-[#0F172A]">
                  <Chip tone={a.kind === 'cancel' ? 'red' : a.kind === 'transfer' ? 'amber' : 'green'}>{KIND_LABEL[a.kind] ?? a.kind}</Chip>
                  <p className="mt-1">{a.summary}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
