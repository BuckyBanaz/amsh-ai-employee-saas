"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { AdminUser, RateItem, SpendReport, fetchRates, fetchSpend, getUserSnapshot, saveRates, subscribeSession } from '@/lib/api';
import { BTN, Card, Chip, ErrorBox, INPUT, Loading, PRIMARY, PageHeader, errorText } from '@/components/admin/ui';

const PERIODS = [7, 30, 90];
const CHART_W = 700;
const CHART_H = 140;

const TIERS = ['All', 'High', 'Medium', 'Low'] as const;
type Tier = (typeof TIERS)[number];
const TIER_LABEL: Record<Exclude<Tier, 'All'>, string> = { High: 'High (85%+)', Medium: 'Medium (60-84%)', Low: 'Low (<60%)' };
const tierOf = (p: number): Exclude<Tier, 'All'> => (p >= 85 ? 'High' : p >= 60 ? 'Medium' : 'Low');
const tone = (p: number) =>
  p >= 85 ? { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]', bar: 'bg-[#EF4444]' }
    : p >= 60 ? { bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]', bar: 'bg-[#F59E0B]' }
      : { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]', bar: 'bg-[#10B981]' };
const TH = 'px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider';

/** Small amounts need more decimals: a tool can cost a fraction of a cent per use. */
const money = (n: number, currency = 'USD') => {
  const digits = Math.abs(n) >= 100 ? 0 : Math.abs(n) >= 1 ? 2 : 4;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: digits === 4 ? 2 : digits, maximumFractionDigits: digits }).format(n);
};
const qty = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, notation: n >= 1e6 ? 'compact' : 'standard' }).format(n);

function trendPath(values: number[]) {
  const max = Math.max(...values, 0.0001);
  const step = values.length > 1 ? CHART_W / (values.length - 1) : 0;
  return values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${(CHART_H - (v / max) * CHART_H).toFixed(1)}`).join(' ');
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
  const [tier, setTier] = useState<Tier>('All');
  const rawAdmin = useSyncExternalStore(subscribeSession, getUserSnapshot, () => null);
  const canEdit = useMemo(() => { try { const r = (rawAdmin ? (JSON.parse(rawAdmin) as AdminUser) : null)?.role; return r === 'superadmin' || r === 'super_admin'; } catch { return false; } }, [rawAdmin]);

  const load = useCallback((d: number) => fetchSpend(d).then((r) => { setReport(r); setError(''); }).catch((e: unknown) => setError(errorText(e, 'Could not load the spend report'))), []);
  useEffect(() => { void load(days); }, [load, days]);

  if (!report && error) return <div className="p-5"><ErrorBox message={error} /></div>;
  if (!report) return <Loading what="spend and usage" />;
  const t = report.totals;
  const cur = report.currency;

  const calls = report.by_tenant.reduce((n, r) => n + r.calls, 0);
  const minutes = report.by_tenant.reduce((n, r) => n + r.minutes, 0);
  const llm = report.by_tool.filter((r) => r.tool.startsWith('llm.'));
  const tokens = llm.reduce((n, r) => n + r.quantity, 0);
  const providers = Object.values(report.by_tool.reduce<Record<string, { provider: string; spend: number }>>((acc, r) => {
    (acc[r.provider] ??= { provider: r.provider, spend: 0 }).spend += r.cost;
    return acc;
  }, {})).sort((a, b) => b.spend - a.spend);
  const perMinute = minutes > 0 ? t.spend / minutes : null;

  const cards = [
    { label: 'Voice Minutes', value: qty(minutes), footer: `Talk time in ${days} days, real calls only` },
    { label: 'Calls', value: qty(calls), footer: `Across ${report.by_tenant.filter((r) => r.calls > 0).length} clinics` },
    { label: `AI Tokens (${days}d)`, value: qty(tokens), footer: llm.some((r) => r.estimated) ? 'Partly counted from text length' : 'Reported by providers' },
    { label: 'Tool Spend', value: money(t.spend, cur), footer: `${money(t.testing_spend, cur)} of it was testing` },
    { label: 'Profit', value: money(t.profit, cur), footer: t.margin_pct === null ? 'No revenue yet' : `${t.margin_pct}% margin on ${money(t.revenue, cur)}` },
    { label: 'Trial Burn', value: money(t.trial_spend, cur), footer: 'Spend by clinics still on a trial' },
  ];

  const voiceLimits = report.limits.filter((l) => l.key === 'voice_minutes');
  const worst = voiceLimits[0];
  const ranked = report.by_tenant
    .filter((r) => r.calls > 0 || (r.voice_quota?.used ?? 0) > 0)
    .map((r) => ({ ...r, percent: r.voice_quota?.percent ?? null }))
    .sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1) || b.minutes - a.minutes);
  const visible = ranked.filter((r) => tier === 'All' || (r.percent !== null && tierOf(r.percent) === tier));

  const values = report.by_day.map((d) => d.spend);
  const line = trendPath(values);
  const area = `${line} L ${CHART_W} ${CHART_H} L 0 ${CHART_H} Z`;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <PageHeader title="Usage & Capacity" subtitle="Aggregate consumption, plan limits, and platform cost.">
        <div className="flex gap-1" role="tablist" aria-label="Period">
          {PERIODS.map((p) => (
            <button key={p} role="tab" aria-selected={days === p} onClick={() => setDays(p)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${days === p ? 'border-[#0066FF] bg-[#EFF6FF] text-[#0066FF]' : 'border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]'}`}>Last {p} days</button>
          ))}
        </div>
      </PageHeader>
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}

      {worst && (
        <div role="status" className="mb-3.5 flex items-center gap-2 rounded-lg border border-[#F59E0B] bg-[#FEF3C7] p-2.5 text-xs">
          <span className="flex-shrink-0 text-[#92400E]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          </span>
          <span className="font-semibold text-[#92400E]">
            <Link href={`/businesses/${worst.id}`} className="underline">{worst.name}</Link> has used {worst.percent}% of its monthly voice minutes
            {voiceLimits.length > 1 && ` (+${voiceLimits.length - 1} more near a limit)`}.
          </span>
        </div>
      )}

      <div className="mb-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="flex flex-col gap-2 rounded-lg border border-[#E2E8F0] bg-white p-2.5 shadow-2xs sm:p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">{c.label}</div>
            <span className={`text-lg font-bold leading-none ${c.label === 'Profit' && t.profit < 0 ? 'text-red-600' : 'text-[#0F172A]'}`}>{c.value}</span>
            <span className="text-[10px] text-[#94A3B8]">{c.footer}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-3">
        <div className="flex flex-col gap-2.5 rounded-lg border border-[#E2E8F0] bg-white p-3.5 shadow-2xs xl:col-span-2">
          <h2 className="text-xs font-bold text-[#0F172A]">Tool Spend Trend ({days} Days)</h2>
          {t.spend > 0 ? (
            <div className="pb-2 pt-1.5">
              <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="h-[140px] w-full" preserveAspectRatio="none" role="img" aria-label={`Daily tool spend over the last ${days} days`}>
                <defs><linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563EB" stopOpacity="0.18" /><stop offset="100%" stopColor="#2563EB" stopOpacity="0" /></linearGradient></defs>
                {[0, 0.25, 0.5, 0.75, 1].map((r) => <line key={r} x1="0" y1={CHART_H * r} x2={CHART_W} y2={CHART_H * r} stroke="#E2E8F0" strokeWidth="1" />)}
                <path d={area} fill="url(#spendFill)" />
                <path d={line} fill="none" stroke="#2563EB" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </svg>
              <p className="mt-1 text-[10px] text-[#94A3B8]">{report.by_day[0]?.date} to {report.by_day[report.by_day.length - 1]?.date} · peak {money(Math.max(...values), cur)}/day</p>
            </div>
          ) : <p className="py-10 text-center text-xs text-[#94A3B8]">No spend recorded in this period.</p>}
        </div>

        <div className="flex flex-col rounded-lg border border-[#E2E8F0] bg-white shadow-2xs">
          <div className="flex items-baseline justify-between border-b border-[#E2E8F0] p-3">
            <h2 className="text-xs font-bold text-[#0F172A]">Provider Spend</h2>
            <span className="text-sm font-bold text-[#0F172A]">{money(t.spend, cur)}</span>
          </div>
          <div className="flex flex-col gap-2.5 p-3">
            {providers.map((p) => (
              <div key={p.provider} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between"><span className="text-xs font-medium text-[#475569]">{p.provider}</span><span className="text-xs font-semibold text-[#0F172A]">{money(p.spend, cur)}</span></div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F1F5F9]"><div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${t.spend ? (p.spend / t.spend) * 100 : 0}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="mt-auto rounded-b-lg border-t border-[#E2E8F0] bg-[#F8FAFC] p-2.5">
            <div className="flex justify-between text-xs"><span className="text-[#64748B]">Blended cost per minute</span><span className="font-semibold text-[#0F172A]">{perMinute === null ? '—' : money(perMinute, cur)}</span></div>
          </div>
        </div>
      </div>

      <div className="mt-3.5 overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#E2E8F0] p-3">
          <div>
            <h2 className="text-xs font-bold text-[#0F172A]">Top Consuming Businesses</h2>
            <p className="mt-0.5 text-[11px] text-[#64748B]">Limit is each clinic&apos;s plan allowance of voice minutes this calendar month.</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase text-[#94A3B8]">Consumption:</span>
            <select value={tier} onChange={(e) => setTier(e.target.value as Tier)} aria-label="Consumption tier"
              className="cursor-pointer rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1 text-xs font-semibold text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20">
              {TIERS.map((x) => <option key={x} value={x}>{x === 'All' ? 'All Tiers' : TIER_LABEL[x]}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead><tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <th className={TH}>Business</th><th className={TH}>Calls</th><th className={TH}>Minutes ({days}d)</th><th className={TH}>Used this month</th><th className={TH}>Limit</th><th className={TH}>Tier</th><th className={`${TH} w-[120px]`}>Usage %</th>
            </tr></thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {visible.length === 0 ? (
                <tr><td colSpan={7} className="px-3.5 py-6 text-center text-xs text-[#94A3B8]">{ranked.length === 0 ? 'No clinic has made calls in this period.' : 'No businesses in this consumption tier.'}</td></tr>
              ) : visible.map((r) => {
                const tn = r.percent === null ? null : tone(r.percent);
                return (
                  <tr key={r.id} className="transition-colors hover:bg-[#F8FAFC]/70">
                    <td className="whitespace-nowrap px-3.5 py-2 text-xs font-semibold text-[#0F172A]"><Link href={`/businesses/${r.id}`} className="hover:text-[#0066FF]">{r.name}</Link></td>
                    <td className="whitespace-nowrap px-3.5 py-2 text-xs text-[#475569]">{qty(r.calls)}</td>
                    <td className="whitespace-nowrap px-3.5 py-2 text-xs text-[#475569]">{qty(r.minutes)}</td>
                    <td className="whitespace-nowrap px-3.5 py-2 text-xs text-[#475569]">{r.voice_quota ? qty(r.voice_quota.used) : '—'}</td>
                    <td className="whitespace-nowrap px-3.5 py-2 text-xs text-[#475569]">{r.voice_quota?.limit == null ? 'Unlimited' : qty(r.voice_quota.limit)}</td>
                    <td className="whitespace-nowrap px-3.5 py-2">
                      {tn && r.percent !== null ? <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${tn.bg} ${tn.text}`}>{tierOf(r.percent)}</span> : <span className="text-[10px] text-[#94A3B8]">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2">
                      {tn && r.percent !== null ? (
                        <div className="flex items-center gap-1.5">
                          <div className="h-1 w-10 overflow-hidden rounded-full bg-[#E2E8F0]"><div className={`h-full rounded-full ${tn.bar}`} style={{ width: `${Math.min(r.percent, 100)}%` }} /></div>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${tn.bg} ${tn.text}`}>{r.percent}%</span>
                        </div>
                      ) : <span className="text-[10px] text-[#94A3B8]">No cap</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Card className="mt-3.5 overflow-hidden">
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

      <div className="my-3.5"><RateCard canEdit={canEdit} onSaved={() => void load(days)} /></div>

      <Card className="p-4">
        <h2 className="mb-1 text-sm font-bold text-[#0F172A]">How to read this</h2>
        <ul className="list-disc space-y-1 pl-5 text-xs text-[#475569]">{report.notes.map((n) => <li key={n}>{n}</li>)}</ul>
        <p className="mt-2"><button className={BTN} onClick={() => void load(days)}>Refresh</button></p>
      </Card>
    </div>
  );
}
