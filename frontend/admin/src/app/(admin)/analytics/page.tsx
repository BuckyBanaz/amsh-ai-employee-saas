"use client";
import React, { useMemo, useState } from 'react';

type RangeOption = '1D' | '7D' | '30D' | '90D' | '1Y' | 'Custom';

interface RangeMetrics {
  revenue: number;
  revenueDelta: number;
  newSales: number;
  salesDelta: number;
  grossProfit: number;
  profitDelta: number;
  grossMargin: number;
  marginDelta: number;
  usageMinutes: number;
  soldMinutes: number;
  limitAlerts: number;
  criticalAlerts: number;
  activeBusinesses: number;
  businessDelta: number;
  churn: number;
  churnDelta: number;
}

interface RangeSeries {
  label: string;
  compare: string;
  points: string[];
  revenue: number[];
  profit: number[];
  usage: number[];
  previousRevenue: number[];
  metrics: RangeMetrics;
  funnel: { label: string; value: number }[];
  verticalSales: { label: string; value: number; color: string }[];
}

const rangeOptions: { id: RangeOption; label: string }[] = [
  { id: '1D', label: 'Today' },
  { id: '7D', label: '7D' },
  { id: '30D', label: '30D' },
  { id: '90D', label: '90D' },
  { id: '1Y', label: '1Y' },
  { id: 'Custom', label: 'Custom' },
];

/** Fixed reference date keeps SSR and client output identical while the data is still mocked. */
const REFERENCE_DATE = new Date('2026-01-30T00:00:00Z');

const verticalPalette = ['#2563EB', '#10B981', '#F59E0B', '#0EA5E9', '#64748B'];
const verticalNames = ['Clinics', 'Restaurants', 'Salons', 'Fitness', 'Retail'];

const buildVerticals = (counts: number[]) =>
  counts.map((value, index) => ({
    label: verticalNames[index],
    value,
    color: verticalPalette[index],
  }));

const rangeData: Record<Exclude<RangeOption, 'Custom'>, RangeSeries> = {
  '1D': {
    label: 'Today',
    compare: 'vs yesterday',
    points: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
    revenue: [0.2, 0.4, 1.1, 1.6, 1.9, 2.1],
    profit: [0.1, 0.3, 0.8, 1.2, 1.4, 1.5],
    usage: [0.3, 0.6, 1.4, 2.0, 2.3, 2.6],
    previousRevenue: [0.2, 0.5, 1.0, 1.4, 1.7, 1.8],
    metrics: {
      revenue: 2100,
      revenueDelta: 4.8,
      newSales: 420,
      salesDelta: 10.5,
      grossProfit: 1540,
      profitDelta: 3.9,
      grossMargin: 73.3,
      marginDelta: -0.3,
      usageMinutes: 1640,
      soldMinutes: 6200,
      limitAlerts: 3,
      criticalAlerts: 1,
      activeBusinesses: 128,
      businessDelta: 0.8,
      churn: 2.1,
      churnDelta: 0,
    },
    funnel: [
      { label: 'Site Leads', value: 48 },
      { label: 'Demos Booked', value: 12 },
      { label: 'Trials Started', value: 5 },
      { label: 'Paid Tenants', value: 2 },
    ],
    verticalSales: buildVerticals([2, 1, 1, 0, 0]),
  },
  '7D': {
    label: 'Last 7 days',
    compare: 'vs previous 7 days',
    points: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    revenue: [1.8, 2.0, 2.2, 2.1, 2.4, 1.6, 1.4],
    profit: [1.3, 1.4, 1.6, 1.5, 1.8, 1.1, 1.0],
    usage: [2.2, 2.5, 2.7, 2.6, 2.9, 1.9, 1.7],
    previousRevenue: [1.6, 1.8, 2.0, 1.9, 2.1, 1.5, 1.3],
    metrics: {
      revenue: 13500,
      revenueDelta: 6.2,
      newSales: 3100,
      salesDelta: 12.4,
      grossProfit: 9900,
      profitDelta: 5.1,
      grossMargin: 73.3,
      marginDelta: -0.6,
      usageMinutes: 11400,
      soldMinutes: 43400,
      limitAlerts: 5,
      criticalAlerts: 1,
      activeBusinesses: 128,
      businessDelta: 2.4,
      churn: 2.1,
      churnDelta: -0.1,
    },
    funnel: [
      { label: 'Site Leads', value: 296 },
      { label: 'Demos Booked', value: 74 },
      { label: 'Trials Started', value: 33 },
      { label: 'Paid Tenants', value: 9 },
    ],
    verticalSales: buildVerticals([8, 4, 3, 2, 1]),
  },
  '30D': {
    label: 'Last 30 days',
    compare: 'vs previous 30 days',
    points: ['W1', 'W2', 'W3', 'W4', 'W5'],
    revenue: [8.4, 9.6, 11.2, 12.1, 12.8],
    profit: [6.1, 7.0, 8.2, 8.9, 9.4],
    usage: [9.8, 10.6, 12.4, 13.1, 14.0],
    previousRevenue: [7.8, 8.6, 10.1, 10.8, 11.2],
    metrics: {
      revenue: 42800,
      revenueDelta: 8.4,
      newSales: 12600,
      salesDelta: 18.2,
      grossProfit: 31400,
      profitDelta: 6.9,
      grossMargin: 73.4,
      marginDelta: -1.1,
      usageMinutes: 48291,
      soldMinutes: 186000,
      limitAlerts: 7,
      criticalAlerts: 2,
      activeBusinesses: 128,
      businessDelta: 12,
      churn: 2.1,
      churnDelta: -0.4,
    },
    funnel: [
      { label: 'Site Leads', value: 1240 },
      { label: 'Demos Booked', value: 318 },
      { label: 'Trials Started', value: 142 },
      { label: 'Paid Tenants', value: 41 },
    ],
    verticalSales: buildVerticals([32, 18, 14, 11, 8]),
  },
  '90D': {
    label: 'Last 90 days',
    compare: 'vs previous 90 days',
    points: ['Nov', 'Dec', 'Jan'],
    revenue: [34.1, 38.6, 42.8],
    profit: [24.8, 28.1, 31.4],
    usage: [39.2, 44.0, 48.3],
    previousRevenue: [28.4, 31.2, 34.0],
    metrics: {
      revenue: 115500,
      revenueDelta: 14.6,
      newSales: 33200,
      salesDelta: 21.7,
      grossProfit: 84300,
      profitDelta: 12.8,
      grossMargin: 73.0,
      marginDelta: -1.8,
      usageMinutes: 131500,
      soldMinutes: 520000,
      limitAlerts: 14,
      criticalAlerts: 3,
      activeBusinesses: 128,
      businessDelta: 26,
      churn: 2.3,
      churnDelta: -0.2,
    },
    funnel: [
      { label: 'Site Leads', value: 3480 },
      { label: 'Demos Booked', value: 902 },
      { label: 'Trials Started', value: 401 },
      { label: 'Paid Tenants', value: 112 },
    ],
    verticalSales: buildVerticals([84, 47, 38, 29, 21]),
  },
  '1Y': {
    label: 'Last 12 months',
    compare: 'vs previous year',
    points: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'],
    revenue: [18, 22, 24, 31, 29, 36, 42, 45, 51, 57, 64, 72],
    profit: [12, 15, 16, 21, 20, 25, 31, 33, 37, 41, 45, 53],
    usage: [21, 24, 28, 30, 35, 38, 41, 46, 49, 51, 54, 59],
    previousRevenue: [11, 13, 15, 17, 18, 21, 24, 26, 29, 32, 35, 39],
    metrics: {
      revenue: 491000,
      revenueDelta: 68.4,
      newSales: 142000,
      salesDelta: 74.1,
      grossProfit: 356000,
      profitDelta: 61.2,
      grossMargin: 72.5,
      marginDelta: -2.4,
      usageMinutes: 476000,
      soldMinutes: 1980000,
      limitAlerts: 38,
      criticalAlerts: 6,
      activeBusinesses: 128,
      businessDelta: 96,
      churn: 2.6,
      churnDelta: -1.1,
    },
    funnel: [
      { label: 'Site Leads', value: 14200 },
      { label: 'Demos Booked', value: 3640 },
      { label: 'Trials Started', value: 1580 },
      { label: 'Paid Tenants', value: 421 },
    ],
    verticalSales: buildVerticals([310, 176, 141, 108, 79]),
  },
};

/** Capacity ceilings are point-in-time facts, so they stay outside the range selection. */
const capacityLimits = [
  { label: 'Twilio channels', used: 340, limit: 500 },
  { label: 'AI provider TPM', used: 38, limit: 100 },
  { label: 'Vector storage (GB)', used: 42, limit: 200 },
];

const rangeDays: Record<Exclude<RangeOption, 'Custom'>, number> = {
  '1D': 1,
  '7D': 7,
  '30D': 30,
  '90D': 90,
  '1Y': 365,
};

const toISODate = (date: Date) => date.toISOString().slice(0, 10);

const shiftDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const formatDate = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

const daysBetween = (from: string, to: string) => {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 1;
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
};

const compact = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${Math.round(value)}`;
};

const signed = (value: number, suffix = '%') => `${value > 0 ? '+' : ''}${Number(value.toFixed(1))}${suffix}`;

const chartPath = (values: number[], width: number, height: number) => {
  if (values.length === 0) return '';
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = values.length === 1 ? width : width / (values.length - 1);
  return values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / span) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
};

const toneClass = (tone: 'positive' | 'warning' | 'neutral') => {
  if (tone === 'positive') return 'text-[#10B981]';
  if (tone === 'warning') return 'text-[#F59E0B]';
  return 'text-[#64748B]';
};

const limitTone = (percent: number) => {
  if (percent >= 85) return 'bg-[#EF4444]';
  if (percent >= 60) return 'bg-[#F59E0B]';
  return 'bg-[#2563EB]';
};

const money = (value: number) => `${value < 0 ? '-' : ''}€${Math.abs(Math.round(value)).toLocaleString('en-US')}`;

const scaleSeries = (series: RangeSeries, factor: number): RangeSeries => {
  const m = series.metrics;
  return {
    ...series,
    revenue: series.revenue.map((v) => v * factor),
    profit: series.profit.map((v) => v * factor),
    usage: series.usage.map((v) => v * factor),
    previousRevenue: series.previousRevenue.map((v) => v * factor),
    funnel: series.funnel.map((step) => ({ ...step, value: Math.max(1, Math.round(step.value * factor)) })),
    verticalSales: series.verticalSales.map((item) => ({ ...item, value: Math.round(item.value * factor) })),
    metrics: {
      ...m,
      revenue: m.revenue * factor,
      newSales: m.newSales * factor,
      grossProfit: m.grossProfit * factor,
      usageMinutes: Math.round(m.usageMinutes * factor),
      soldMinutes: Math.round(m.soldMinutes * factor),
      limitAlerts: Math.max(0, Math.round(m.limitAlerts * factor)),
      criticalAlerts: Math.max(0, Math.round(m.criticalAlerts * factor)),
    },
  };
};

const CHART_WIDTH = 700;
const CHART_HEIGHT = 220;

export default function AnalyticsPage() {
  const [activeRange, setActiveRange] = useState<RangeOption>('30D');
  const [customFrom, setCustomFrom] = useState(toISODate(shiftDays(REFERENCE_DATE, -13)));
  const [customTo, setCustomTo] = useState(toISODate(REFERENCE_DATE));

  const { series, fromLabel, toLabel, dayCount, invalidCustom } = useMemo(() => {
    if (activeRange === 'Custom') {
      const span = daysBetween(customFrom, customTo);
      const invalid = new Date(customFrom).getTime() > new Date(customTo).getTime();
      const base = rangeData['30D'];
      return {
        series: scaleSeries({ ...base, label: 'Custom range', compare: 'vs preceding equal period' }, span / 30),
        fromLabel: formatDate(customFrom),
        toLabel: formatDate(customTo),
        dayCount: span,
        invalidCustom: invalid,
      };
    }

    const days = rangeDays[activeRange];
    const from = shiftDays(REFERENCE_DATE, -(days - 1));
    return {
      series: rangeData[activeRange],
      fromLabel: formatDate(toISODate(from)),
      toLabel: formatDate(toISODate(REFERENCE_DATE)),
      dayCount: days,
      invalidCustom: false,
    };
  }, [activeRange, customFrom, customTo]);

  const m = series.metrics;
  const costTotal = m.revenue - m.grossProfit;
  const burnPercent = Math.round((m.usageMinutes / m.soldMinutes) * 100);

  const kpiCards = [
    { label: 'Revenue', value: `\u20ac${compact(m.revenue)}`, change: signed(m.revenueDelta), tone: 'positive' as const, subtext: `Billed in ${series.label.toLowerCase()}` },
    { label: 'New Sales', value: `\u20ac${compact(m.newSales)}`, change: signed(m.salesDelta), tone: 'positive' as const, subtext: 'New subscriptions in period' },
    { label: 'Gross Profit', value: `\u20ac${compact(m.grossProfit)}`, change: signed(m.profitDelta), tone: 'positive' as const, subtext: 'Revenue minus provider costs' },
    { label: 'Gross Margin', value: `${m.grossMargin}%`, change: signed(m.marginDelta), tone: m.marginDelta < 0 ? ('warning' as const) : ('positive' as const), subtext: 'Watch voice provider spend' },
    { label: 'Usage Burn', value: `${compact(m.usageMinutes)} min`, change: `${burnPercent}% of sold`, tone: 'neutral' as const, subtext: 'Consumed vs tenant minutes sold' },
    { label: 'Limit Alerts', value: `${m.limitAlerts}`, change: `${m.criticalAlerts} critical`, tone: 'warning' as const, subtext: 'Tenants above 85% allowance' },
    { label: 'Active Businesses', value: `${m.activeBusinesses}`, change: signed(m.businessDelta), tone: 'positive' as const, subtext: 'Snapshot, not period scoped' },
    { label: 'Churn Risk', value: `${m.churn}%`, change: signed(m.churnDelta), tone: 'positive' as const, subtext: 'Predicted logo churn' },
  ];

  const providerCosts = [
    { label: 'Revenue', value: m.revenue, color: '#2563EB' },
    { label: 'Telephony', value: -(costTotal * 0.539), color: '#EF4444' },
    { label: 'AI / TTS', value: -(costTotal * 0.372), color: '#F59E0B' },
    { label: 'Infra', value: -(costTotal * 0.089), color: '#64748B' },
    { label: 'Profit', value: m.grossProfit, color: '#10B981' },
  ];
  const waterfallMax = Math.max(...providerCosts.map((line) => Math.abs(line.value)));

  const usageLimits = [
    ...capacityLimits,
    { label: 'Sold minutes burn', used: m.usageMinutes, limit: m.soldMinutes },
  ];

  const revenuePath = chartPath(series.revenue, CHART_WIDTH, CHART_HEIGHT);
  const profitPath = chartPath(series.profit, CHART_WIDTH, CHART_HEIGHT);
  const usagePath = chartPath(series.usage, CHART_WIDTH, CHART_HEIGHT);
  const previousPath = chartPath(series.previousRevenue, CHART_WIDTH, CHART_HEIGHT);
  const barMax = Math.max(...series.revenue);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-8 animate-in fade-in duration-500">
      <header className="mb-6 pb-5 border-b border-[#E2E8F0] flex justify-between items-center">
        <div>
          <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight leading-tight">Analytics</h1>
          <p className="text-[14px] text-[#475569] mt-1 font-normal">
            Revenue, sales, usage limits, and profit intelligence for the platform.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border border-[#E2E8F0] rounded-lg py-2 px-3 text-[13px] font-medium text-[#475569] bg-white shadow-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            {fromLabel} - {toLabel}
          </div>
          <button className="flex items-center justify-center border border-[#E2E8F0] rounded-full w-9 h-9 text-[#475569] bg-white shadow-sm hover:bg-gray-50 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 mb-2">
        <div className="inline-flex items-center gap-1 bg-[#F1F5F9] rounded-lg p-1">
          {rangeOptions.map((range) => (
            <button
              key={range.id}
              onClick={() => setActiveRange(range.id)}
              className={`px-4 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${
                activeRange === range.id ? 'bg-white text-[#2563EB] shadow-sm' : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        {activeRange === 'Custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[12px] font-semibold text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
              aria-label="Start date"
            />
            <span className="text-[12px] text-[#94A3B8]">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[12px] font-semibold text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
              aria-label="End date"
            />
          </div>
        )}
      </div>

      <p className="text-[12px] text-[#94A3B8] mb-6">
        Showing <span className="font-semibold text-[#475569]">{series.label}</span> ({dayCount} {dayCount === 1 ? 'day' : 'days'}): {fromLabel} - {toLabel} · compared {series.compare}
      </p>

      {invalidCustom && (
        <div className="mb-6 rounded-lg border border-[#F59E0B] bg-[#FEF3C7] px-3 py-2 text-[13px] font-semibold text-[#92400E]">
          Start date is after end date. Adjust the range to see accurate figures.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
        {kpiCards.map((card) => (
          <div key={card.label} className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-col gap-3 min-h-[128px]">
            <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">{card.label}</div>
            <div>
              <div className="text-[22px] font-bold text-[#0F172A] leading-none">{card.value}</div>
              <div className={`text-[12px] font-semibold mt-2 ${toneClass(card.tone)}`}>{card.change}</div>
            </div>
            <div className="text-[11px] text-[#64748B] mt-auto">{card.subtext}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <section className="xl:col-span-2 bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[14px] font-bold text-[#0F172A]">Revenue, Profit & Usage Trend</h2>
              <p className="text-[12px] text-[#64748B] mt-0.5">Solid lines are the selected range, dashed line is the previous period.</p>
            </div>
            <div className="flex items-center gap-3 text-[12px] font-semibold">
              <span className="text-[#2563EB]">Revenue</span>
              <span className="text-[#10B981]">Profit</span>
              <span className="text-[#F59E0B]">Usage</span>
              <span className="text-[#94A3B8]">Previous</span>
            </div>
          </div>
          <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="w-full h-[260px]" preserveAspectRatio="none" role="img" aria-label="Revenue, profit and usage trend versus the previous period">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
              <line key={ratio} x1="0" x2={CHART_WIDTH} y1={CHART_HEIGHT * ratio} y2={CHART_HEIGHT * ratio} stroke="#E2E8F0" strokeWidth="1" />
            ))}
            <path d={previousPath} fill="none" stroke="#94A3B8" strokeWidth="2" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" />
            <path d={revenuePath} fill="none" stroke="#2563EB" strokeWidth="3" vectorEffect="non-scaling-stroke" />
            <path d={profitPath} fill="none" stroke="#10B981" strokeWidth="3" vectorEffect="non-scaling-stroke" />
            <path d={usagePath} fill="none" stroke="#F59E0B" strokeWidth="3" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="flex justify-between mt-2 text-[11px] text-[#94A3B8]">
            {series.points.map((point) => (
              <span key={point}>{point}</span>
            ))}
          </div>
        </section>

        <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
          <h2 className="text-[14px] font-bold text-[#0F172A] mb-1">Revenue by Period</h2>
          <p className="text-[12px] text-[#64748B] mb-5">Bar view of the same range for period-on-period reading.</p>
          <div className="flex items-end justify-between gap-2 h-[200px]">
            {series.revenue.map((value, index) => (
              <div key={series.points[index]} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-[11px] font-semibold text-[#475569]">{value.toFixed(1)}</span>
                <div className="w-full bg-[#2563EB] rounded-t-md min-h-[4px]" style={{ height: `${(value / barMax) * 100}%` }} />
                <span className="text-[10px] text-[#94A3B8]">{series.points[index]}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
          <h2 className="text-[14px] font-bold text-[#0F172A] mb-1">Revenue to Profit Flow</h2>
          <p className="text-[12px] text-[#64748B] mb-5">Waterfall of what remains after provider spend.</p>
          <div className="space-y-3">
            {providerCosts.map((line) => (
              <div key={line.label} className="grid grid-cols-[84px_1fr_88px] items-center gap-3">
                <span className="text-[12px] font-semibold text-[#475569]">{line.label}</span>
                <div className="h-8 bg-[#F8FAFC] rounded-lg overflow-hidden flex items-center">
                  <div
                    className="h-full rounded-lg"
                    style={{
                      width: `${Math.max((Math.abs(line.value) / waterfallMax) * 100, 4)}%`,
                      backgroundColor: line.color,
                    }}
                  />
                </div>
                <span className={`text-[12px] font-bold text-right ${line.value < 0 ? 'text-[#EF4444]' : 'text-[#0F172A]'}`}>
                  {money(line.value)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
          <h2 className="text-[14px] font-bold text-[#0F172A] mb-1">Usage &amp; Limit Pressure</h2>
          <p className="text-[12px] text-[#64748B] mb-5">Capacity rows are live ceilings; burn row follows the selected range.</p>
          <div className="space-y-4">
            {usageLimits.map((limit) => {
              const percent = Math.round((limit.used / limit.limit) * 100);
              return (
                <div key={limit.label} className="space-y-1.5">
                  <div className="flex justify-between text-[12px]">
                    <span className="font-medium text-[#475569]">{limit.label}</span>
                    <span className="font-semibold text-[#0F172A]">{percent}%</span>
                  </div>
                  <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${limitTone(percent)}`} style={{ width: `${Math.min(percent, 100)}%` }} />
                  </div>
                  <div className="text-[11px] text-[#94A3B8]">
                    {limit.used.toLocaleString('en-US')} / {limit.limit.toLocaleString('en-US')}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
          <h2 className="text-[14px] font-bold text-[#0F172A] mb-1">Sales Funnel Flow</h2>
          <p className="text-[12px] text-[#64748B] mb-5">Lead to paid conversion in the selected range.</p>
          <div className="space-y-3">
            {series.funnel.map((step, index) => {
              const width = (step.value / series.funnel[0].value) * 100;
              const next = series.funnel[index + 1];
              const conversion = next ? Math.round((next.value / step.value) * 100) : null;
              return (
                <div key={step.label}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#EFF6FF] text-[#2563EB] text-[12px] font-bold flex items-center justify-center flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-[12px] mb-1">
                        <span className="font-semibold text-[#0F172A]">{step.label}</span>
                        <span className="font-bold text-[#475569]">{step.value.toLocaleString('en-US')}</span>
                      </div>
                      <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  </div>
                  {conversion !== null && (
                    <div className="ml-4 my-1.5 pl-8 border-l border-dashed border-[#CBD5E1] text-[11px] text-[#94A3B8]">
                      {conversion}% conversion
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm mb-4">
        <h2 className="text-[14px] font-bold text-[#0F172A] mb-1">Sales by Vertical</h2>
        <p className="text-[12px] text-[#64748B] mb-5">New paid tenants by business category in the selected range.</p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {series.verticalSales.map((item) => {
            const top = Math.max(...series.verticalSales.map((v) => v.value)) || 1;
            return (
              <div key={item.label} className="space-y-1.5">
                <div className="flex justify-between text-[12px]">
                  <span className="font-medium text-[#475569]">{item.label}</span>
                  <span className="font-semibold text-[#0F172A]">{item.value}</span>
                </div>
                <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(item.value / top) * 100}%`, backgroundColor: item.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0]">
          <h2 className="text-[14px] font-bold text-[#0F172A]">Executive Summary</h2>
          <p className="text-[12px] text-[#64748B] mt-0.5">Operator read for {series.label.toLowerCase()}.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0]">
          <div className="p-4">
            <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Revenue</div>
            <p className="text-[13px] text-[#475569] leading-relaxed">
              {money(m.revenue)} billed, {signed(m.revenueDelta)} {series.compare}. Expansion should target high-usage clinics where ROI is already proven.
            </p>
          </div>
          <div className="p-4">
            <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Usage</div>
            <p className="text-[13px] text-[#475569] leading-relaxed">
              {burnPercent}% of sold minutes consumed. Channel capacity is the tightest technical constraint, not the sold quota.
            </p>
          </div>
          <div className="p-4">
            <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Profit</div>
            <p className="text-[13px] text-[#475569] leading-relaxed">
              {money(m.grossProfit)} gross profit at {m.grossMargin}% margin ({signed(m.marginDelta)}). Watch telephony and TTS spend before adding cheaper plans.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
