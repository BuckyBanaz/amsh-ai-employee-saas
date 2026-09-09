"use client";
import React, { useState } from 'react';

interface CapacityMetric {
  id: string;
  label: string;
  value: string;
  delta: string;
  deltaTone: 'up' | 'down' | 'neutral';
  /** Footer describes a real upstream constraint or a cost figure, never a self-imposed plan quota. */
  footer: string;
  /** Percentage of a genuine provider/infra ceiling. Null when no real ceiling exists. */
  utilization: number | null;
}

const capacityMetrics: CapacityMetric[] = [
  {
    id: 'voice-minutes',
    label: 'Voice Minutes Consumed',
    value: '48,291',
    delta: '+8.2% vs last month',
    deltaTone: 'up',
    footer: '186,000 min sold to tenants · 26% utilized',
    utilization: 26,
  },
  {
    id: 'calls-today',
    label: 'Calls Today',
    value: '4,892',
    delta: '+12% vs last week',
    deltaTone: 'up',
    footer: 'Peak concurrency 340 / 500 Twilio channels',
    utilization: 68,
  },
  {
    id: 'ai-tokens',
    label: 'AI Tokens (30d)',
    value: '2.4M',
    delta: '+15% vs last month',
    deltaTone: 'up',
    footer: 'Provider rate limit 38% of sustained TPM',
    utilization: 38,
  },
  {
    id: 'knowledge-docs',
    label: 'Knowledge Docs Indexed',
    value: '1,284',
    delta: 'Active indices',
    deltaTone: 'neutral',
    footer: 'Vector storage 42 GB / 200 GB provisioned',
    utilization: 21,
  },
  {
    id: 'appointments',
    label: 'Appointments Booked',
    value: '12,847',
    delta: 'Automated',
    deltaTone: 'neutral',
    footer: '98.2% completed without human handoff',
    utilization: null,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp Messages',
    value: '3,421',
    delta: '99.1% delivered',
    deltaTone: 'neutral',
    footer: 'Est. spend €41 this month',
    utilization: null,
  },
];

interface CostLine {
  provider: string;
  spend: number;
  share: number;
}

const costBreakdown: CostLine[] = [
  { provider: 'Twilio (telephony)', spend: 3863, share: 54 },
  { provider: 'OpenAI + Groq (inference)', spend: 1642, share: 23 },
  { provider: 'ElevenLabs (TTS)', spend: 1024, share: 14 },
  { provider: 'Infrastructure & storage', spend: 641, share: 9 },
];

interface TenantUsage {
  id: string;
  business: string;
  calls: number;
  minutes: number;
  aiTokens: string;
  minuteLimit: number;
}

const tenantUsage: TenantUsage[] = [
  { id: 'b-1', business: 'Smile Dental Business', calls: 1248, minutes: 13050, aiTokens: '840K', minuteLimit: 15000 },
  { id: 'b-2', business: 'Amsterdam Dental Care', calls: 982, minutes: 8920, aiTokens: '610K', minuteLimit: 15000 },
  { id: 'b-3', business: 'Berlin Health Center', calls: 450, minutes: 6900, aiTokens: '290K', minuteLimit: 10000 },
  { id: 'b-4', business: 'Bella Rosa Ristorante', calls: 386, minutes: 3240, aiTokens: '210K', minuteLimit: 10000 },
  { id: 'b-5', business: 'Glow & Shine Salon', calls: 274, minutes: 2180, aiTokens: '150K', minuteLimit: 10000 },
];

const tokenTrend = [
  42, 48, 45, 52, 61, 58, 55, 67, 72, 69, 74, 81, 78, 85, 92,
  88, 95, 101, 97, 104, 112, 108, 115, 121, 118, 126, 133, 129, 138, 145,
];

const trendPath = (values: number[], width: number, height: number) => {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  return values
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${(height - ((v - min) / span) * height).toFixed(1)}`)
    .join(' ');
};

const usageTone = (percent: number) => {
  if (percent >= 85) return { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]', bar: 'bg-[#EF4444]' };
  if (percent >= 60) return { bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]', bar: 'bg-[#F59E0B]' };
  return { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]', bar: 'bg-[#10B981]' };
};

const usageTiers = ['All', 'High', 'Medium', 'Low'] as const;
type UsageTier = (typeof usageTiers)[number];

const tierOf = (percent: number): Exclude<UsageTier, 'All'> => {
  if (percent >= 85) return 'High';
  if (percent >= 60) return 'Medium';
  return 'Low';
};

const tierLabel: Record<Exclude<UsageTier, 'All'>, string> = {
  High: 'High (85%+)',
  Medium: 'Medium (60-84%)',
  Low: 'Low (<60%)',
};

const CHART_WIDTH = 700;
const CHART_HEIGHT = 200;

export default function UsageAndLimitsPage() {
  const [selectedTier, setSelectedTier] = useState<UsageTier>('All');

  const totalSpend = costBreakdown.reduce((sum, line) => sum + line.spend, 0);
  const linePath = trendPath(tokenTrend, CHART_WIDTH, CHART_HEIGHT);
  const areaPath = `${linePath} L ${CHART_WIDTH} ${CHART_HEIGHT} L 0 ${CHART_HEIGHT} Z`;

  const rankedTenants = tenantUsage.map((tenant) => {
    const percent = Math.round((tenant.minutes / tenant.minuteLimit) * 100);
    return { ...tenant, percent, tier: tierOf(percent) };
  });

  const visibleTenants = rankedTenants.filter(
    (tenant) => selectedTier === 'All' || tenant.tier === selectedTier
  );

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-8 animate-in fade-in duration-500">
      {/* Header */}
      <header className="mb-6 pb-5 border-b border-[#E2E8F0] flex justify-between items-center">
        <div>
          <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight leading-tight">
            Usage &amp; Capacity
          </h1>
          <p className="text-[14px] text-[#475569] mt-1 font-normal">
            Aggregate consumption, upstream capacity, and platform cost.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-[#E2E8F0] rounded-lg py-2 px-3 text-[13px] font-medium text-[#475569] bg-white shadow-sm hover:bg-gray-50 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Jan 1 - Jan 30, 2026
          </button>
          <button className="flex items-center justify-center border border-[#E2E8F0] rounded-full w-9 h-9 text-[#475569] bg-white shadow-sm hover:bg-gray-50 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>
        </div>
      </header>

      {/* Tenant threshold alert */}
      <div className="flex items-center gap-2.5 bg-[#FEF3C7] border border-[#F59E0B] rounded-lg p-3 mb-6">
        <span className="text-[#92400E] flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </span>
        <span className="text-[14px] font-semibold text-[#92400E]">
          Smile Dental Business has used 87% of its contracted monthly voice minutes.
        </span>
      </div>

      {/* Consumption & capacity cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {capacityMetrics.map((metric) => (
          <div key={metric.id} className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-col gap-3">
            <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
              {metric.label}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-end justify-between gap-2">
                <span className="text-[22px] font-bold text-[#0F172A] leading-none">{metric.value}</span>
                <span
                  className={`text-[12px] font-semibold ${
                    metric.deltaTone === 'up'
                      ? 'text-[#10B981]'
                      : metric.deltaTone === 'down'
                        ? 'text-[#EF4444]'
                        : 'text-[#64748B]'
                  }`}
                >
                  {metric.delta}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {metric.utilization !== null && (
                  <div className="h-1.5 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        metric.utilization >= 85 ? 'bg-[#EF4444]' : metric.utilization >= 60 ? 'bg-[#F59E0B]' : 'bg-[#2563EB]'
                      }`}
                      style={{ width: `${metric.utilization}%` }}
                    />
                  </div>
                )}
                <span className="text-[11px] text-[#94A3B8]">{metric.footer}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Trend chart */}
        <div className="xl:col-span-2 bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-bold text-[#0F172A]">
              AI Tokens &amp; API Usage Trend (30 Days)
            </h2>
            <span className="text-[12px] font-semibold text-[#10B981]">+245% growth</span>
          </div>
          <div className="pt-2.5 pb-5">
            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              className="w-full h-[200px]"
              preserveAspectRatio="none"
              role="img"
              aria-label="AI token consumption over the last 30 days, trending upward"
            >
              <defs>
                <linearGradient id="tokenTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                <line
                  key={ratio}
                  x1="0"
                  y1={CHART_HEIGHT * ratio}
                  x2={CHART_WIDTH}
                  y2={CHART_HEIGHT * ratio}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                />
              ))}
              <path d={areaPath} fill="url(#tokenTrendFill)" />
              <path d={linePath} fill="none" stroke="#2563EB" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
        </div>

        {/* Cost breakdown */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm flex flex-col">
          <div className="p-4 border-b border-[#E2E8F0] flex items-baseline justify-between">
            <h2 className="text-[14px] font-bold text-[#0F172A]">Provider Spend (MTD)</h2>
            <span className="text-[16px] font-bold text-[#0F172A]">
              €{totalSpend.toLocaleString('en-US')}
            </span>
          </div>
          <div className="p-4 flex flex-col gap-3.5">
            {costBreakdown.map((line) => (
              <div key={line.provider} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-[12px] font-medium text-[#475569]">{line.provider}</span>
                  <span className="text-[12px] font-semibold text-[#0F172A]">
                    €{line.spend.toLocaleString('en-US')}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${line.share}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-auto p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] rounded-b-xl">
            <div className="flex justify-between text-[12px]">
              <span className="text-[#64748B]">Blended cost per minute</span>
              <span className="font-semibold text-[#0F172A]">€0.148</span>
            </div>
          </div>
        </div>
      </div>

      {/* Per-tenant contracted limits */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden mt-4">
        <div className="p-4 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[14px] font-bold text-[#0F172A]">Top Consuming Businesses</h2>
            <p className="text-[12px] text-[#64748B] mt-0.5">
              Limits below are contractual tenant allowances enforced by the platform.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-[#94A3B8] uppercase">Consumption:</span>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value as UsageTier)}
              className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[12px] font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 cursor-pointer"
            >
              {usageTiers.map((tier) => (
                <option key={tier} value={tier}>
                  {tier === 'All' ? 'All Tiers' : tierLabel[tier]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-4 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wider">Business</th>
                <th className="px-4 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wider">Calls</th>
                <th className="px-4 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wider">Minutes</th>
                <th className="px-4 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wider">AI Tokens</th>
                <th className="px-4 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wider">Limit</th>
                <th className="px-4 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wider">Tier</th>
                <th className="px-4 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wider w-[120px]">Usage %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {visibleTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-[#94A3B8]">
                    No businesses in this consumption tier.
                  </td>
                </tr>
              ) : (
                visibleTenants.map((tenant) => {
                  const tone = usageTone(tenant.percent);
                  return (
                    <tr key={tenant.id} className="hover:bg-[#F8FAFC]/70 transition-colors">
                      <td className="px-4 py-3 text-[13px] font-semibold text-[#0F172A] whitespace-nowrap">
                        {tenant.business}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#475569] whitespace-nowrap">
                        {tenant.calls.toLocaleString('en-US')}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#475569] whitespace-nowrap">
                        {tenant.minutes.toLocaleString('en-US')}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#475569] whitespace-nowrap">{tenant.aiTokens}</td>
                      <td className="px-4 py-3 text-[13px] text-[#475569] whitespace-nowrap">
                        {tenant.minuteLimit.toLocaleString('en-US')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-semibold ${tone.bg} ${tone.text}`}>
                          {tenant.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-[52px] h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.min(tenant.percent, 100)}%` }} />
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-[12px] font-semibold ${tone.bg} ${tone.text}`}>
                            {tenant.percent}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
