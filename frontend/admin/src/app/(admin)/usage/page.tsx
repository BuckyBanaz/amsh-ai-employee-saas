"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { AdminUser, RateItem, SpendReport, fetchRates, fetchSpend, getUserSnapshot, saveRates, subscribeSession } from '@/lib/api';
import { BTN, Card, Chip, Empty, ErrorBox, INPUT, Loading, PRIMARY, PageHeader, Tone, errorText } from '@/components/admin/ui';

const PERIODS = [7, 30, 90];
const STATUS_TONE: Record<string, Tone> = { active: 'green', trial: 'blue', pending: 'grey', paused: 'amber', suspended: 'red' };

/** Small amounts need more decimals: a tool can cost a fraction of a cent per use. */
const money = (n: number, currency = 'USD') => {
  const digits = Math.abs(n) >= 100 ? 0 : Math.abs(n) >= 1 ? 2 : 4;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: digits === 4 ? 2 : digits, maximumFractionDigits: digits }).format(n);
};
const qty = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, notation: n >= 1e6 ? 'compact' : 'standard' }).format(n);

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'good' | 'bad' }) {
  return (
    <Card className="p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">{label}</p>
      <p className={`mt-1 text-lg font-bold leading-none ${tone === 'bad' ? 'text-red-600' : tone === 'good' ? 'text-emerald-600' : 'text-[#0F172A]'}`}>{value}</p>
      {hint && <p className="mt-1.5 text-[10px] text-[#94A3B8]">{hint}</p>}
    </Card>
  );
}

function DailyBars({ days }: { days: { date: string; spend: number }[] }) {
  const max = Math.max(...days.map((d) => d.spend), 0.0001);
  return (
    <div className="flex h-28 items-end gap-[2px]" role="img" aria-label="Daily spend">
      {days.map((d) => (
        <div key={d.date} className="group relative flex h-full flex-1 items-end" title={`${d.date}: ${money(d.spend)}`}>
          <div className="w-full rounded-t bg-[#2563EB]/80 group-hover:bg-[#2563EB]" style={{ height: `${Math.max(2, (d.spend / max) * 100)}%` }} />
        </div>
      ))}
    </div>
  );
}

function RateCard({ canEdit, onSaved }: { canEdit: boolean; onSaved: () => void }) {
  const [items, setItems] = useState<RateItem[] | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => fetchRates().then((d) => { setItems(d.items); setDraft({}); }).catch((e: unknown) => setError(errorText(e, 'Could not load the rate card'))), []);
  useEffect(() => { void load(); }, [load]);

  async function save() {
    const prices: Record<string, number> = {};
    for (const [k, v] of Object.entries(draft)) { const n = Number(v); if (v.trim() === '' || Number.isNaN(n) || n < 0) { setError(`"${v}" is not a valid price`); return; } prices[k] = n; }
    setBusy(true); setError(''); setNote('');
    try { const d = await saveRates(prices); setItems(d.items); setDraft({}); setNote('Saved. The report above now uses these prices, for past days too.'); onSaved(); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  if (!items) return error ? <ErrorBox message={error} /> : <Loading what="rate card" />;
  return (
    <Card className="p-4">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-[#0F172A]">Rate card</h2>
        {canEdit && <button className={PRIMARY} onClick={save} disabled={busy || !Object.keys(draft).length}>Save prices</button>}
      </div>
      <p className="mb-3 text-xs text-[#475569]">What each tool charges us, in US dollars. These start as estimates from public price lists: check them against your invoices.{!canEdit && ' Only a super admin can change them.'}</p>
      {error && <div className="mb-2"><ErrorBox message={error} /></div>}
      {note && <p role="status" className="mb-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{note}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead><tr className="border-b border-[#E2E8F0] text-[10px] uppercase tracking-wider text-[#94A3B8]"><th className="py-1.5 pr-3">Tool</th><th className="pr-3">Provider</th><th className="pr-3">Unit</th><th className="pr-3">Price (USD)</th><th>Default</th></tr></thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.key} className="border-b border-[#F1F5F9]">
                <td className="py-1.5 pr-3 font-medium text-[#0F172A]">{r.label}{r.edited && <span className="ml-1.5"><Chip tone="blue">edited</Chip></span>}</td>
                <td className="pr-3 text-[#475569]">{r.provider}</td>
                <td className="pr-3 text-[#475569]">{r.unit}</td>
                <td className="pr-3">
                  {canEdit
                    ? <input aria-label={`${r.label} price`} className={`${INPUT} w-24`} inputMode="decimal" value={draft[r.key] ?? String(r.price)} onChange={(e) => setDraft((d) => ({ ...d, [r.key]: e.target.value }))} />
                    : <span className="font-semibold">{r.price}</span>}
                </td>
                <td className="text-[#94A3B8]">{r.default}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function UsageAndLimitsPage() {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<SpendReport | null>(null);
  const [error, setError] = useState('');
  const rawAdmin = useSyncExternalStore(subscribeSession, getUserSnapshot, () => null);
  const canEdit = useMemo(() => { try { const r = (rawAdmin ? (JSON.parse(rawAdmin) as AdminUser) : null)?.role; return r === 'superadmin' || r === 'super_admin'; } catch { return false; } }, [rawAdmin]);

  const load = useCallback((d: number) => fetchSpend(d).then((r) => { setReport(r); setError(''); }).catch((e: unknown) => setError(errorText(e, 'Could not load the spend report'))), []);
  useEffect(() => { void load(days); }, [load, days]);

  if (!report && error) return <div className="p-5"><ErrorBox message={error} /></div>;
  if (!report) return <Loading what="spend and usage" />;
  const t = report.totals;
  const cur = report.currency;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <PageHeader title="Usage & Limits" subtitle="What every paid tool costs us, what is left after revenue, and which clinics are near their plan limits.">
        <div className="flex gap-1" role="tablist" aria-label="Period">
          {PERIODS.map((p) => (
            <button key={p} role="tab" aria-selected={days === p} onClick={() => setDays(p)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${days === p ? 'border-[#0066FF] bg-[#EFF6FF] text-[#0066FF]' : 'border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]'}`}>Last {p} days</button>
          ))}
        </div>
      </PageHeader>
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}

      <div className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Tool spend" value={money(t.spend, cur)} hint={`last ${report.days} days`} />
        <Stat label="Revenue" value={money(t.revenue, cur)} hint="cash collected" />
        <Stat label="Profit" value={money(t.profit, cur)} tone={t.profit < 0 ? 'bad' : t.revenue > 0 ? 'good' : undefined} hint="revenue − spend" />
        <Stat label="Margin" value={t.margin_pct === null ? 'No revenue yet' : `${t.margin_pct}%`} tone={t.margin_pct !== null && t.margin_pct < 0 ? 'bad' : undefined} />
        <Stat label="Trial burn" value={money(t.trial_spend, cur)} hint="spend by clinics on a trial" />
        <Stat label="Testing" value={money(t.testing_spend, cur)} hint="playground and test calls" />
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <div className="border-b border-[#F1F5F9] px-4 py-3"><h2 className="text-sm font-bold text-[#0F172A]">Spend by tool</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[10px] uppercase tracking-wider text-[#94A3B8]"><th className="px-4 py-2">Tool</th><th className="px-2">Used</th><th className="px-2 text-right">Spend</th><th className="px-4">Share</th></tr></thead>
              <tbody>
                {report.by_tool.map((r) => (
                  <tr key={r.tool} className="border-b border-[#F1F5F9]">
                    <td className="px-4 py-2"><span className="font-semibold text-[#0F172A]">{r.label}</span><span className="block text-[10px] text-[#94A3B8]">{r.provider}</span></td>
                    <td className="px-2 text-[#475569]">{qty(r.quantity)} {r.quantity === 1 ? r.unit.replace(/s$/, '') : r.unit}{r.estimated && <span className="ml-1 text-[10px] text-amber-600" title="Counted from text length, not reported by the provider">est.</span>}</td>
                    <td className="px-2 text-right font-semibold text-[#0F172A]">{money(r.cost, cur)}</td>
                    <td className="px-4"><div className="flex items-center gap-2"><div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#E2E8F0]"><div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${r.share_pct}%` }} /></div><span className="w-9 text-[#475569]">{r.share_pct}%</span></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-bold text-[#0F172A]">Spend per day</h2>
          {t.spend > 0 ? <DailyBars days={report.by_day} /> : <p className="py-8 text-center text-xs text-[#94A3B8]">No spend recorded in this period.</p>}
          <p className="mt-2 text-[10px] text-[#94A3B8]">{report.by_day[0]?.date} to {report.by_day[report.by_day.length - 1]?.date}</p>
        </Card>
      </div>

      <Card className="mb-4 overflow-hidden">
        <div className="border-b border-[#F1F5F9] px-4 py-3">
          <h2 className="text-sm font-bold text-[#0F172A]">Profit by clinic</h2>
          <p className="text-xs text-[#475569]">Clinics that cost the most compared with what they paid come first.</p>
        </div>
        {report.by_tenant.length === 0 ? <Empty>No clinic activity or payments in this period.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[10px] uppercase tracking-wider text-[#94A3B8]"><th className="px-4 py-2">Clinic</th><th className="px-2">Plan</th><th className="px-2 text-right">Calls</th><th className="px-2 text-right">Minutes</th><th className="px-2 text-right">Spend</th><th className="px-2 text-right">Revenue</th><th className="px-4 text-right">Profit</th></tr></thead>
              <tbody>
                {report.by_tenant.map((r) => (
                  <tr key={r.id} className="border-b border-[#F1F5F9]">
                    <td className="px-4 py-2"><Link href={`/businesses/${r.id}`} className="font-semibold text-[#0F172A] hover:text-[#0066FF]">{r.name}</Link> {r.status && <Chip tone={STATUS_TONE[r.status] ?? 'grey'}>{r.status}</Chip>}</td>
                    <td className="px-2 text-[#475569]">{r.plan ?? '—'}</td>
                    <td className="px-2 text-right text-[#475569]">{r.calls}</td>
                    <td className="px-2 text-right text-[#475569]">{r.minutes}</td>
                    <td className="px-2 text-right text-[#0F172A]">{money(r.spend, cur)}{r.test_spend > 0 && <span className="block text-[10px] text-[#94A3B8]">{money(r.test_spend, cur)} testing</span>}</td>
                    <td className="px-2 text-right text-[#0F172A]">{money(r.revenue, cur)}</td>
                    <td className={`px-4 text-right font-bold ${r.profit < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{money(r.profit, cur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mb-4 overflow-hidden">
        <div className="border-b border-[#F1F5F9] px-4 py-3"><h2 className="text-sm font-bold text-[#0F172A]">Near or over a plan limit this month</h2></div>
        {report.limits.length === 0 ? <Empty>No clinic is near a plan limit.</Empty> : (
          <ul className="divide-y divide-[#F1F5F9]">
            {report.limits.map((l) => (
              <li key={`${l.id}:${l.key}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-xs">
                <span><Link href={`/businesses/${l.id}`} className="font-semibold text-[#0F172A] hover:text-[#0066FF]">{l.name}</Link> <span className="text-[#94A3B8]">· {l.plan}</span></span>
                <span className="flex items-center gap-2 text-[#475569]">{l.label}: {qty(l.used)} of {l.limit === null ? 'unlimited' : qty(l.limit)} {l.unit}<Chip tone={l.state === 'over' ? 'red' : 'amber'}>{l.percent}%</Chip></span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mb-4"><RateCard canEdit={canEdit} onSaved={() => void load(days)} /></div>

      <Card className="p-4">
        <h2 className="mb-1 text-sm font-bold text-[#0F172A]">How to read this</h2>
        <ul className="list-disc space-y-1 pl-5 text-xs text-[#475569]">{report.notes.map((n) => <li key={n}>{n}</li>)}</ul>
        <p className="mt-2"><button className={BTN} onClick={() => void load(days)}>Refresh</button></p>
      </Card>
    </div>
  );
}
