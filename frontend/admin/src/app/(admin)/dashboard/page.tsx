"use client";
import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { AdminUser, fetchOverview, getUserSnapshot, Overview, subscribeSession } from '../../../lib/api';

const REFRESH_MS = 60_000;
const SYMBOL: Record<string, string> = { USD: '$', INR: '₹', EUR: '€', GBP: '£' };
const money = (byCurrency: Record<string, number>) => {
  const parts = Object.entries(byCurrency).map(([c, v]) => `${SYMBOL[c] ?? c + ' '}${Math.round(v).toLocaleString('en-US')}`);
  return parts.length ? parts.join(' · ') : '—';
};
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const ago = (iso: string | null) => {
  if (!iso) return '';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`;
  return `${Math.round(minutes / 1440)} d ago`;
};
const delta = (now: number, before: number) => {
  const d = now - before;
  return { text: `${d >= 0 ? '+' : ''}${d} vs previous 24 h`, positive: d >= 0 };
};

const StatCard = ({ title, value, note, positive = true, href }: { title: string; value: string; note?: string; positive?: boolean; href?: string }) => {
  const content = (
    <div className={`bg-white border border-gray-200 rounded-lg p-3.5 shadow-2xs h-full transition-all ${href ? 'hover:border-[#2563EB]/40 hover:shadow-xs cursor-pointer' : ''}`}>
      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{title}</h3>
      <div className="text-xl font-extrabold text-gray-900 tracking-tight leading-none">{value}</div>
      {note && <div className={`mt-1.5 text-[11px] font-semibold ${positive ? 'text-[#059669]' : 'text-red-500'}`}>{note}</div>}
    </div>
  );
  return href ? <Link href={href} className="block">{content}</Link> : content;
};

const HEALTH_STYLE = {
  operational: { pill: 'bg-[#ECFDF5] text-[#059669]', dot: 'bg-[#10B981]', label: 'Operational' },
  degraded: { pill: 'bg-amber-50 text-amber-600', dot: 'bg-amber-500', label: 'Degraded' },
  not_configured: { pill: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400', label: 'Not set up' },
} as const;

export default function AdminDashboard() {
  const rawAdmin = useSyncExternalStore(subscribeSession, getUserSnapshot, () => null);
  const firstName = useMemo(() => {
    try {
      return rawAdmin ? ((JSON.parse(rawAdmin) as AdminUser).name || '').split(' ')[0] : '';
    } catch {
      return '';
    }
  }, [rawAdmin]);

  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<{ key: number; data?: Overview; error?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchOverview()
      .then((data) => {
        if (!cancelled) setResult({ key: reload, data });
      })
      .catch((err: unknown) => {
        if (!cancelled) setResult({ key: reload, error: err instanceof Error ? err.message : 'Could not load the dashboard.' });
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  useEffect(() => {
    const timer = setInterval(() => setReload((n) => n + 1), REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  const data = result?.data;
  const refreshing = result === null || result.key !== reload;
  const t = data?.tenants;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <header className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-tight">Welcome back{firstName ? `, ${firstName}` : ''}</h1>
          <p className="text-xs text-gray-500 mt-0.5">Platform overview. Every number here is read from the live system.</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          {data && <span>Updated {clock(data.generated_at)}</span>}
          <button
            onClick={() => setReload((n) => n + 1)}
            disabled={refreshing}
            className="border border-gray-200 rounded-md py-1.5 px-2.5 text-xs font-semibold text-gray-700 bg-white shadow-2xs hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>

      {result?.error && (
        <div role="alert" className="mb-3 flex items-center justify-between text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <span>{result.error}</span>
          <button type="button" onClick={() => setReload((n) => n + 1)} className="font-semibold underline">Try again</button>
        </div>
      )}

      <div className="mb-4">
        <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2">Quick Actions</h4>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/businesses" className="bg-white border border-gray-200 rounded-md py-1 px-2.5 text-xs font-semibold text-gray-700 shadow-2xs hover:border-[#2563EB] hover:text-[#2563EB] transition-colors">Manage businesses</Link>
          <Link href="/billing" className="bg-white border border-gray-200 rounded-md py-1 px-2.5 text-xs font-semibold text-gray-700 shadow-2xs hover:border-[#2563EB] hover:text-[#2563EB] transition-colors">Billing and plans</Link>
        </div>
      </div>

      {!data && !result?.error && <p className="text-xs text-gray-400 mb-4">Loading the dashboard...</p>}

      {data && t && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <StatCard title="Total businesses" value={String(t.total)} note={`${t.new_7d} new this week`} href="/businesses" />
            <StatCard
              title="Active businesses"
              value={String(t.active)}
              note={`${t.total ? Math.round((100 * t.active) / t.total) : 0}% of all · ${t.pending} pending · ${t.paused + t.suspended} paused or suspended`}
              href="/businesses"
            />
            <StatCard title="With an AI receptionist" value={String(t.with_ai)} note={`of ${t.total} businesses`} />
            <StatCard title="Calls (24 h)" value={String(data.calls.last_24h)} note={delta(data.calls.last_24h, data.calls.previous_24h).text} positive={delta(data.calls.last_24h, data.calls.previous_24h).positive} />

            <StatCard title="Appointments booked (24 h)" value={String(data.appointments.booked_24h)} note={delta(data.appointments.booked_24h, data.appointments.previous_24h).text} positive={delta(data.appointments.booked_24h, data.appointments.previous_24h).positive} />
            <StatCard title="Active on a paid plan" value={String(data.revenue.paying_businesses)} note="active businesses whose plan has a price" href="/billing" />
            <StatCard title="Est. monthly revenue" value={money(data.revenue.monthly_estimate)} note="estimate from plan prices, not payments" href="/billing" />
            <StatCard
              title="AI resolution rate (30 d)"
              value={data.calls.resolution_rate_30d === null ? '—' : `${data.calls.resolution_rate_30d}%`}
              note={data.calls.resolution_sample ? `${data.calls.resolution_sample} finished calls` : 'no finished calls yet'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-2xs flex flex-col overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xs font-bold text-gray-900 tracking-tight">Busiest active businesses (30 days)</h3>
                <Link href="/businesses" className="text-xs font-semibold text-[#2563EB] hover:underline">View all →</Link>
              </div>
              {data.top_businesses.length === 0 ? (
                <p className="p-4 text-xs text-gray-400">No business is active yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        {['Business', 'Type', 'Country', 'AI receptionist', 'Calls', 'Appts', 'Plan', 'Status'].map((h) => (
                          <th key={h} className="px-3.5 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.top_businesses.map((b) => (
                        <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-3.5 py-2.5 text-xs font-semibold text-gray-900 whitespace-nowrap">
                            <Link href={`/businesses/${b.id}`} className="hover:text-[#2563EB] transition-colors">{b.name}</Link>
                          </td>
                          <td className="px-3.5 py-2.5 text-xs text-gray-500 whitespace-nowrap">{b.type}</td>
                          <td className="px-3.5 py-2.5 text-xs text-gray-500 whitespace-nowrap">{b.country || '—'}</td>
                          <td className="px-3.5 py-2.5 text-xs whitespace-nowrap">
                            {b.ai_name ? (
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${b.ai_status === 'active' ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-amber-50 text-amber-600'}`}>
                                {b.ai_name} · {b.ai_status}
                              </span>
                            ) : (
                              <span className="text-gray-400">Not set up</span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-xs text-gray-600 whitespace-nowrap">{b.calls_30d}</td>
                          <td className="px-3.5 py-2.5 text-xs text-gray-600 whitespace-nowrap">{b.appointments_30d}</td>
                          <td className="px-3.5 py-2.5 text-xs text-gray-500 whitespace-nowrap capitalize">{b.plan}</td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#ECFDF5] text-[#059669]">{capital(b.status)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-2xs">
                <h3 className="text-xs font-bold text-gray-900 tracking-tight mb-3">Platform health</h3>
                {data.health.map((h) => {
                  const style = HEALTH_STYLE[h.status];
                  return (
                    <div key={h.name} className="flex items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
                      <span className="text-xs font-semibold text-gray-900">{h.name}</span>
                      <span title={h.detail} className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${style.pill}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
                        {style.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-2xs">
                <h3 className="text-xs font-bold text-gray-900 tracking-tight mb-3">Recent platform activity</h3>
                {data.recent_activity.length === 0 ? (
                  <p className="text-xs text-gray-400">Nothing recorded yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.recent_activity.map((a, i) => (
                      <li key={i} className="text-xs flex justify-between gap-2">
                        <span className="min-w-0">
                          <span className="font-mono text-[11px] text-gray-900">{a.action}</span>
                          <span className="text-gray-400"> · {a.actor || 'system'}</span>
                          {a.outcome !== 'success' && <span className="text-red-500"> · {a.outcome}</span>}
                        </span>
                        <span className="text-gray-400 whitespace-nowrap">{ago(a.at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
