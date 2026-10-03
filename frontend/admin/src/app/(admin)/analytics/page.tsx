"use client";
import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/api';
import type { Analytics } from '@/lib/analyticsTypes';
import { buildSampleAnalytics } from '@/lib/analyticsSample';
import { AreaLines, BarsWithLines, COLORS, Donut, Funnel, GroupedBars, Sparkline, StackedBars, downsample } from '../../../components/admin/AnalyticsCharts';

const RANGES = [
  { days: 7, label: '7D' },
  { days: 30, label: '30D' },
  { days: 90, label: '90D' },
  { days: 365, label: '1Y' },
];
const PLAN_COLORS = [COLORS.blue, COLORS.green, COLORS.purple, COLORS.orange, COLORS.red, COLORS.slate];
const STATUS_COLORS: Record<string, string> = { active: COLORS.green, trial: COLORS.lightBlue, pending: COLORS.orange, paused: COLORS.slate, suspended: COLORS.red };
const STATUS_PILL: Record<string, string> = { active: 'bg-[#D1FAE5] text-[#065F46]', trial: 'bg-[#DBEAFE] text-[#1D4ED8]', pending: 'bg-[#FEF3C7] text-[#92400E]', paused: 'bg-[#F1F5F9] text-[#475569]', suspended: 'bg-[#FEE2E2] text-[#B91C1C]' };

const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);
const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const money = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: value >= 1000 ? 0 : 2 }).format(value);
  } catch {
    return `${currency} ${value}`;
  }
};
const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 1000) / 10}%` : '–');
const change = (current: number, previous: number) => (previous === 0 ? (current === 0 ? null : `${current} new`) : `${current >= previous ? '+' : ''}${Math.round(((current - previous) / previous) * 100)}% vs previous`);

function Card({ title, children, className = '', action }: { title: string; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <section className={`min-w-0 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-2xs ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-[#1E293B]">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Legend({ items }: { items: { name: string; color: string; line?: boolean }[] }) {
  return (
    <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
      {items.map((i) => (
        <span key={i.name} className="inline-flex items-center gap-1.5 text-[11px] text-[#64748B]">
          <span className={i.line ? 'h-0.5 w-3 rounded' : 'h-2 w-2 rounded-sm'} style={{ backgroundColor: i.color }} />
          {i.name}
        </span>
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-xs text-[#94A3B8]">{text}</p>;
}

function Pill({ status }: { status: string }) {
  const key = status.toLowerCase();
  return <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${STATUS_PILL[key] || STATUS_PILL.paused}`}>{cap(key)}</span>;
}

function MiniTable({ head, rows, empty }: { head: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (!rows.length) return <Empty text={empty} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
          <tr>
            {head.map((h) => (
              <th key={h} className="pb-2 pr-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F1F5F9]">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td key={j} className={`py-2 pr-3 ${j === 0 ? 'font-semibold text-[#1E293B]' : 'text-[#64748B]'}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [sample, setSample] = useState(false);
  const [live, setLive] = useState<Analytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const load = () =>
      adminFetch<Analytics>(`/admin/analytics?days=${days}`)
        .then((d) => alive && (setLive(d), setError('')))
        .catch(() => alive && setError('Could not load analytics from the API.'));
    load();
    const timer = window.setInterval(() => document.visibilityState === 'visible' && load(), 60000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [days]);

  const data = useMemo(() => (sample ? buildSampleAnalytics(days) : live), [sample, days, live]);

  const derived = useMemo(() => {
    if (!data) return null;
    const growth = downsample(data.growth, 45, (c) => c[c.length - 1]);
    const revenue = downsample(data.revenueSeries, 45, (c) => ({ date: c[c.length - 1].date, revenue: c.reduce((s, x) => s + x.revenue, 0), cumulative: c[c.length - 1].cumulative }));
    const calls = downsample(data.calls.series, 45, (c) => {
      const n = c.reduce((s, x) => s + x.calls, 0);
      const weighted = (key: 'aiRate' | 'transferRate') => (n ? Math.round(c.reduce((s, x) => s + (x[key] ?? 0) * x.calls, 0) / n) : null);
      return { date: c[c.length - 1].date, calls: n, aiRate: weighted('aiRate'), transferRate: weighted('transferRate') };
    });
    return { growth, revenue, calls };
  }, [data]);

  const exportCsv = () => {
    if (!data) return;
    const lines = [
      `AMSh analytics,${data.range.from} to ${data.range.to}`,
      '',
      'Metric,Value',
      `Total businesses,${data.kpis.totalBusinesses}`,
      `Trial businesses,${data.kpis.trial}`,
      `Paid businesses,${data.kpis.paid}`,
      `Converted from trial,${data.kpis.converted}`,
      `Inactive businesses,${data.kpis.inactive}`,
      ...Object.entries(data.kpis.revenue).map(([c, v]) => `Revenue collected (${c}),${v}`),
      `Calls,${data.calls.total}`,
      `AI answer rate %,${data.calls.aiRate ?? ''}`,
      `Human transfer rate %,${data.calls.transferRate ?? ''}`,
      '',
      'Date,Calls,AI answer rate %,Transfer rate %,Revenue,Businesses',
      ...data.calls.series.map((c, i) => `${c.date},${c.calls},${c.aiRate ?? ''},${c.transferRate ?? ''},${data.revenueSeries[i]?.revenue ?? 0},${data.growth[i]?.total ?? ''}`),
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `amsh-analytics-${data.range.from}-to-${data.range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const k = data?.kpis;
  const showError = error && !sample;
  const revenueText = k ? (Object.keys(k.revenue).length ? Object.entries(k.revenue).map(([c, v]) => money(v, c)).join(' + ') : money(0, data!.currency)) : '–';
  const mrrText = k && Object.keys(k.mrr).length ? Object.entries(k.mrr).map(([c, v]) => money(v, c)).join(' + ') : null;
  const planData = data ? Object.entries(data.planMix).sort((a, b) => b[1] - a[1]).map(([name, value], i) => ({ name, value, color: PLAN_COLORS[i % PLAN_COLORS.length] })) : [];
  const verticals = data ? Object.entries(data.calls.byVertical).sort((a, b) => b[1] - a[1]) : [];
  const verticalTotal = verticals.reduce((s, [, n]) => s + n, 0);

  const kpiCards = data && k ? [
    { name: 'Total Businesses', value: String(k.totalBusinesses), sub: change(k.newBusinesses, k.newBusinessesPrevious) || 'no new in period', tone: COLORS.green, color: COLORS.blue, spark: data.growth.map((g) => g.total), icon: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h2m2 0h2M9 13h2m2 0h2M9 17h2m2 0h2' },
    { name: 'Trial Businesses', value: String(k.trial), sub: `${pct(k.trial, k.totalBusinesses)} of total`, tone: '#64748B', color: COLORS.purple, spark: data.growth.map((g) => g.trial), icon: 'M12 8v4l3 2M12 3a9 9 0 100 18 9 9 0 000-18z' },
    { name: 'Active (Paid)', value: String(k.paid), sub: `${pct(k.paid, k.totalBusinesses)} of total`, tone: '#64748B', color: COLORS.green, spark: data.growth.map((g) => g.paid), icon: 'M5 13l4 4L19 7' },
    { name: 'Converted from Trial', value: String(k.converted), sub: data.funnel.trial ? `${pct(k.converted, data.funnel.trial)} trial → paid rate` : 'no trials yet', tone: COLORS.green, color: COLORS.purple, spark: data.weekly.map((w) => w.converted), icon: 'M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z' },
    { name: 'Inactive', value: String(k.inactive), sub: `${pct(k.inactive, k.totalBusinesses)} of total`, tone: k.inactive ? COLORS.red : '#64748B', color: COLORS.red, spark: [], icon: 'M12 8v5m0 4h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z' },
    { name: 'Revenue (collected)', value: revenueText, sub: mrrText ? `plan value ${mrrText}/mo` : change(Object.values(k.revenue)[0] ?? 0, k.revenuePrevious) || 'no payments in period', tone: '#64748B', color: COLORS.blue, spark: data.revenueSeries.map((r) => r.cumulative), icon: 'M12 8c-1.7 0-3 .9-3 2s1.3 2 3 2 3 .9 3 2-1.3 2-3 2m0-8V6m0 12v-2' },
  ] : [];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold leading-tight tracking-tight text-[#0F172A]">Analytics</h1>
          <p className="mt-0.5 text-xs text-[#475569]">Growth, usage, revenue and AI performance across the platform, counted live from the database.</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {data && <span className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#475569] shadow-2xs">{shortDate(data.range.from)} – {shortDate(data.range.to)}</span>}
          <div role="tablist" aria-label="Period" className="inline-flex gap-1 rounded-lg bg-[#F1F5F9] p-1">
            {RANGES.map((r) => (
              <button key={r.days} role="tab" aria-selected={days === r.days} onClick={() => setDays(r.days)} className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${days === r.days ? 'bg-white text-[#2563EB] shadow-2xs' : 'text-[#475569] hover:text-[#0F172A]'}`}>
                {r.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={sample}
            onClick={() => setSample((v) => !v)}
            className={`inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${sample ? 'border-[#F59E0B] bg-[#FEF3C7] text-[#92400E]' : 'border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]'}`}
          >
            <span className={`h-2 w-2 rounded-full ${sample ? 'bg-[#F59E0B]' : 'bg-[#CBD5E1]'}`} />
            Sample data {sample ? 'on' : 'off'}
          </button>
          <button onClick={exportCsv} disabled={!data} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 disabled:opacity-50">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
            </svg>
            Export report
          </button>
        </div>
      </header>

      {showError && <p role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p>}
      {!data && !showError && <p className="text-sm text-[#94A3B8]">Loading analytics...</p>}

      {data && k && derived && (
        <div className="space-y-3.5">
          <dl className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            {kpiCards.map((c) => (
              <div key={c.name} className="flex min-w-0 items-stretch justify-between gap-2 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-2xs">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${c.color}1A`, color: c.color }}>
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={c.icon} />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <dt className="text-[11px] font-medium leading-tight text-[#64748B]">{c.name}</dt>
                    <dd className="mt-0.5 text-[22px] font-bold leading-tight tabular-nums tracking-tight text-[#0F172A]">{c.value}</dd>
                    <p className="mt-0.5 text-[11px] font-medium leading-tight" style={{ color: c.tone }}>{c.sub}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-end">
                  <Sparkline values={c.spark} color={c.color} />
                </div>
              </div>
            ))}
          </dl>

          <div className="grid gap-3.5 lg:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr]">
            <Card title="Business Growth" className="lg:col-span-2 xl:col-span-1">
              <Legend items={[{ name: 'Paid', color: COLORS.green }, { name: 'Trial', color: COLORS.lightBlue }, { name: 'Other', color: COLORS.blue }]} />
              <StackedBars
                labels={derived.growth.map((g) => shortDate(g.date))}
                data={[
                  { name: 'Paid', color: COLORS.green, values: derived.growth.map((g) => g.paid) },
                  { name: 'Trial', color: COLORS.lightBlue, values: derived.growth.map((g) => g.trial) },
                  { name: 'Other', color: COLORS.blue, values: derived.growth.map((g) => g.total - g.paid - g.trial) },
                ]}
              />
              <p className="mt-1 text-[10px] text-[#94A3B8]">Cumulative businesses by sign-up date, split by their status today.</p>
            </Card>

            <Card title="Plan Distribution">
              {k.totalBusinesses === 0 ? (
                <Empty text="No businesses yet." />
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-start">
                  <Donut data={planData} total={k.totalBusinesses} centerLabel="Businesses" />
                  <ul className="min-w-[140px] flex-1 space-y-2">
                    {planData.map((p) => (
                      <li key={p.name} className="flex items-center justify-between gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 text-[#475569]">
                          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: p.color }} />
                          {p.name}
                        </span>
                        <span className="font-semibold tabular-nums text-[#0F172A]">
                          {p.value} <span className="font-normal text-[#94A3B8]">{pct(p.value, k.totalBusinesses)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            <Card title="Business Conversion Funnel">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Funnel
                  steps={[
                    { label: 'Total signups', value: data.funnel.signups, color: COLORS.lightBlue },
                    { label: 'Started trial', value: data.funnel.trial, color: COLORS.blue },
                    { label: 'Converted to paid', value: data.funnel.converted, color: COLORS.purple },
                    { label: 'Active paid', value: data.funnel.paid, color: COLORS.green },
                  ]}
                />
                <ul className="min-w-[150px] flex-1 text-xs">
                  {[
                    ['Total signups', data.funnel.signups],
                    ['Started trial', data.funnel.trial],
                    ['Converted to paid', data.funnel.converted],
                    ['Active paid', data.funnel.paid],
                  ].map(([label, value]) => (
                    <li key={label as string} className="flex h-12 items-center justify-between gap-2">
                      <span className="leading-tight text-[#64748B]">{label}</span>
                      <span className="whitespace-nowrap font-bold tabular-nums text-[#0F172A]">
                        {value} <span className="ml-1 font-normal text-[#94A3B8]">{pct(value as number, data.funnel.signups)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>

          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            <Card title="Revenue Trend" className="md:col-span-2 xl:col-span-1">
              <Legend items={[{ name: `Revenue collected (${data.currency})`, color: COLORS.blue }, { name: 'Cumulative', color: COLORS.green, line: true }]} />
              <BarsWithLines
                labels={derived.revenue.map((r) => shortDate(r.date))}
                bars={derived.revenue.map((r) => r.revenue)}
                barColor={COLORS.blue}
                barName={data.currency}
                lineScale="own"
                barFmt={(v) => money(v, data.currency)}
                lines={[{ name: 'Cumulative', color: COLORS.green, values: derived.revenue.map((r) => r.cumulative) }]}
              />
              <p className="mt-1 text-[10px] text-[#94A3B8]">
                {Object.values(k.revenue).every((v) => v === 0) ? 'No payments were recorded in this period. ' : ''}
                {mrrText ? `Plan value of active paying businesses: ${mrrText} / month (list price, not collected).` : ''}
              </p>
            </Card>

            <Card title="Retention & Churn">
              <Legend items={[{ name: 'Active', color: COLORS.green }, { name: 'Churned / inactive', color: COLORS.red }]} />
              <AreaLines
                labels={derived.growth.map((g) => shortDate(g.date))}
                series={[
                  { name: 'Active', color: COLORS.green, values: derived.growth.map((g) => g.total - g.inactive) },
                  { name: 'Churned / inactive', color: COLORS.red, values: derived.growth.map((g) => g.inactive) },
                ]}
              />
              <p className="mt-1 text-[10px] text-[#94A3B8]">
                {Object.entries(data.byStatus).map(([st, n]) => `${cap(st)} ${n}`).join(' · ')}. Plotted by sign-up date and today&apos;s status: the platform keeps no status history.
              </p>
            </Card>

            <Card title="Trial vs Paid Businesses">
              <Legend items={[{ name: 'Trial started', color: COLORS.lightBlue }, { name: 'Converted to paid', color: COLORS.green }]} />
              <GroupedBars labels={data.weekly.map((w) => w.label)} data={[{ name: 'Trial started', color: COLORS.lightBlue, values: data.weekly.map((w) => w.trials) }, { name: 'Converted', color: COLORS.green, values: data.weekly.map((w) => w.converted) }]} />
              {data.weekly.every((w) => w.trials === 0 && w.converted === 0) && <p className="mt-1 text-[10px] text-[#94A3B8]">No trials started or converted in this period.</p>}
            </Card>
          </div>

          <div className="grid gap-3.5 lg:grid-cols-2 xl:grid-cols-[1.6fr_1fr_1.2fr]">
            <Card title="Call Volume & AI Performance" className="lg:col-span-2 xl:col-span-1">
              {(
                <>
                  <Legend items={[{ name: 'Total calls', color: COLORS.lightBlue }, { name: 'AI answer rate', color: COLORS.blue, line: true }, { name: 'Human transfer rate', color: COLORS.orange, line: true }]} />
                  <BarsWithLines
                    labels={derived.calls.map((c) => shortDate(c.date))}
                    bars={derived.calls.map((c) => c.calls)}
                    barColor={COLORS.blue}
                    barName="calls"
                    lines={[
                      { name: 'AI answer rate', color: COLORS.blue, values: derived.calls.map((c) => c.aiRate) },
                      { name: 'Transfer rate', color: COLORS.orange, values: derived.calls.map((c) => c.transferRate) },
                    ]}
                  />
                  <p className="mt-1 text-[10px] text-[#94A3B8]">
                    {data.calls.total} calls · AI resolved or booked {data.calls.aiRate ?? '–'}% · handed to a human {data.calls.transferRate ?? '–'}% (finished calls)
                  </p>
                </>
              )}
            </Card>

            <Card title="Calls by Vertical">
              {verticals.length === 0 ? (
                <Empty text="No calls in this period." />
              ) : (
                <ul className="space-y-2.5">
                  {verticals.map(([name, n], i) => (
                    <li key={name}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-[#475569]">{name}</span>
                        <span className="font-semibold tabular-nums text-[#0F172A]">
                          {n.toLocaleString()} <span className="font-normal text-[#94A3B8]">{pct(n, verticalTotal)}</span>
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded bg-[#F1F5F9]">
                        <div className="h-full rounded" style={{ width: `${(n / verticalTotal) * 100}%`, backgroundColor: PLAN_COLORS[i % PLAN_COLORS.length] }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Top Performing Businesses" action={<Link href="/businesses" className="text-xs font-medium text-[#2563EB] hover:underline">View all</Link>}>
              <MiniTable
                head={['Business', 'Calls', 'AI bookings', 'Conversion']}
                empty="No calls in this period."
                rows={data.topBusinesses.map((b) => [<span key="n" className="inline-flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#EFF6FF] text-[9px] font-bold text-[#2563EB]">{b.name.slice(0, 1).toUpperCase()}</span>{b.name}</span>, b.calls.toLocaleString(), b.appointments, `${b.conversion}%`])}
              />
            </Card>
          </div>

          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            <Card title="Recent Signups" action={<Link href="/businesses" className="text-xs font-medium text-[#2563EB] hover:underline">View all</Link>}>
              <MiniTable
                head={['Business', 'Vertical', 'Plan', 'Signed up', 'Status']}
                empty="No businesses yet."
                rows={data.recentSignups.map((b) => [b.name, b.vertical || '–', b.plan, b.createdAt ? shortDate(b.createdAt) : '–', <Pill key="s" status={b.status} />])}
              />
            </Card>
            <Card title="Trial Expiring Soon">
              <MiniTable
                head={['Business', 'Days left', 'Calls', 'Plan']}
                empty="No businesses are on a trial right now."
                rows={data.trialExpiring.map((b) => [b.name, b.daysLeft ?? '–', b.calls, b.plan])}
              />
              <p className="mt-2 text-[10px] text-[#94A3B8]">Trials last {data.trialDays} days from the free-trial activation.</p>
            </Card>
            <Card title="Recently Converted to Paid">
              <MiniTable
                head={['Business', 'To plan', 'Converted on']}
                empty="No trial has converted to a paid plan yet."
                rows={data.recentlyConverted.map((b) => [b.name, b.toPlan, shortDate(b.convertedAt)])}
              />
            </Card>
          </div>

          {sample && <p role="note" className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-1.5 text-[11px] font-medium text-[#92400E]">Showing invented sample numbers for preview. Switch Sample data off to see the live platform.</p>}
          <p className="text-[10px] text-[#94A3B8]">Updated {new Date(data.generatedAt).toLocaleTimeString()} · refreshes every minute. Revenue is the sum of recorded payment amounts; it stays zero until a payment is recorded.</p>
        </div>
      )}
    </div>
  );
}
