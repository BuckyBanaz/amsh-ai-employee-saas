"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { adminAuth, API_BASE } from '../../../lib/api';
import { ProviderLogo } from '../../../components/admin/ProviderLogo';
import { SmtpConfigDialog } from '../../../components/admin/SmtpConfigDialog';
import { CredentialsDialog } from '../../../components/admin/CredentialsDialog';

type Category = 'All' | 'Voice' | 'AI' | 'Messaging' | 'Email' | 'Payments';
const CATEGORIES: Category[] = ['All', 'Voice', 'AI', 'Messaging', 'Email', 'Payments'];

type ViewMode = 'table' | 'cards';

interface Integration {
  id: string;
  name: string;
  category: string;
  status: string; // Connected | Disconnected | API Error
  is_active_default: boolean;
  latency_ms: number | null;
  error_rate: string;
  last_checked_at: string | null;
  config: Record<string, string>; // env key -> masked preview (read from server env, never in DB)
  message?: string;
  configurable?: boolean;
  managed_by?: string;
  sources?: Record<string, string>;
  overridden?: boolean;
}

type Tone = 'ok' | 'error' | 'idle';

function describe(item: Integration): { label: string; tone: Tone } {
  if (item.status === 'Connected') return { label: 'Connected', tone: 'ok' };
  if (item.status === 'API Error') return { label: 'API Error', tone: 'error' };
  return { label: (item.message || '').startsWith('Not configured') ? 'Needs Setup' : 'Disconnected', tone: 'idle' };
}

function StatusPill({ item }: { item: Integration }) {
  const { label, tone } = describe(item);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
        tone === 'ok'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : tone === 'error'
          ? 'bg-red-50 text-red-700 border-red-200'
          : 'bg-amber-50 text-amber-700 border-amber-200'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          tone === 'ok'
            ? 'bg-emerald-500 animate-pulse'
            : tone === 'error'
            ? 'bg-red-500'
            : 'bg-amber-500'
        }`}
      />
      {label}
    </span>
  );
}

function LatencyBadge({ ms }: { ms: number | null }) {
  if (ms == null) {
    return <span className="text-[#94A3B8] font-mono text-xs">–</span>;
  }
  const rounded = Math.round(ms);
  const color =
    rounded < 150
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : rounded < 450
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-amber-50 text-amber-700 border-amber-200';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-medium border ${color}`}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
      {rounded} ms
    </span>
  );
}

function timeAgo(iso: string | null, now: number): string {
  if (!iso) return 'Never';
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function Spinner({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function AdminIntegrationsPage() {
  const [items, setItems] = useState<Integration[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState<Category>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Connected' | 'Attention'>('All');
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [testing, setTesting] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState('');
  const [details, setDetails] = useState<Integration | null>(null);
  const [smtpOpen, setSmtpOpen] = useState(false);
  const [editing, setEditing] = useState<Integration | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const token = adminAuth.getToken();
    return fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
    });
  }, []);

  const loadRef = useRef<() => Promise<void>>(async () => undefined);
  const load = useCallback(async () => {
    try {
      const res = await request('/admin/integrations');
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
        setLoadError('');
        if (Array.isArray(data) && data.some((i: Integration) => !i.last_checked_at)) {
          window.setTimeout(() => void loadRef.current(), 4000); // poll again until every provider has been checked
        }
      } else {
        setLoadError(
          res.status === 401 || res.status === 403
            ? 'Sign in as a platform admin to see live integration status.'
            : `The server answered ${res.status}.`
        );
      }
    } catch {
      setLoadError('Could not reach the API server.');
    } finally {
      setLoaded(true);
    }
  }, [request]);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    load();
    const refresh = window.setInterval(() => document.visibilityState === 'visible' && load(), 60000);
    const clock = window.setInterval(() => setNow(Date.now()), 15000);
    return () => {
      window.clearInterval(refresh);
      window.clearInterval(clock);
    };
  }, [load]);

  const test = useCallback(
    async (id: string, quiet = false) => {
      setTesting((prev) => new Set(prev).add(id));
      try {
        const res = await request(`/admin/integrations/${id}/test`, { method: 'POST' });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setItems((prev) =>
            prev.map((i) =>
              i.id === id
                ? {
                    ...i,
                    status: data.status,
                    latency_ms: data.latency_ms ?? null,
                    message: data.message,
                    last_checked_at: new Date().toISOString(),
                  }
                : i
            )
          );
          if (!quiet) {
            setNotice(`${data.name}: ${data.status}${data.latency_ms != null ? ` in ${Math.round(data.latency_ms)} ms` : ''}.`);
          }
        } else if (!quiet) {
          setNotice(data.detail || `Check failed (${res.status}).`);
        }
      } catch {
        if (!quiet) setNotice('Could not reach the API server.');
      } finally {
        setTesting((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [request]
  );

  const checkAll = async () => {
    setNotice('Pinging all integration gateways...');
    await Promise.all(items.map((i) => test(i.id, true)));
    setNotice('All provider health checks completed.');
    load();
  };

  const toggleDefault = async (item: Integration) => {
    const next = !item.is_active_default;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_active_default: next } : i)));
    const res = await request(`/admin/integrations/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active_default: next }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_active_default: item.is_active_default } : i)));
      setNotice('Could not update failover default.');
    } else {
      setNotice(`${item.name} default status updated.`);
    }
  };

  const counts = useMemo(() => {
    const out: Record<string, number> = { All: items.length };
    items.forEach((i) => (out[i.category] = (out[i.category] || 0) + 1));
    return out;
  }, [items]);

  const visible = items.filter((i) => {
    const matchCat = tab === 'All' || i.category === tab;
    const matchStatus =
      statusFilter === 'All'
        ? true
        : statusFilter === 'Connected'
        ? i.status === 'Connected'
        : i.status !== 'Connected';
    const q = query.trim().toLowerCase();
    const matchQuery = !q || i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q) || i.category.toLowerCase().includes(q);
    return matchCat && matchStatus && matchQuery;
  });

  const connected = items.filter((i) => i.status === 'Connected');
  const attention = items.filter((i) => i.status !== 'Connected');
  const measured = connected.filter((i) => i.latency_ms != null);
  const avgLatency = measured.length ? Math.round(measured.reduce((sum, i) => sum + (i.latency_ms || 0), 0) / measured.length) : null;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 lg:p-6 w-full animate-in fade-in duration-300">
      {/* Header Section */}
      <header className="mb-4 pb-3.5 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-bold text-[#0F172A] tracking-tight leading-tight">
              Integrations & Infrastructure
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Zero-DB · Pure .env Runtime
            </span>
          </div>
          <p className="text-xs text-[#475569] mt-0.5 font-normal">
            Live provider health, real-time handshake latency, and default routing gateways across all platform voice, AI, and messaging backends.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => load()}
            disabled={!loaded}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#475569] shadow-2xs hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19" />
            </svg>
            Refresh
          </button>

          <button
            type="button"
            onClick={checkAll}
            disabled={!items.length || testing.size > 0}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {testing.size > 0 ? (
              <Spinner className="w-3.5 h-3.5 text-white" />
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.5 15a9 9 0 1 1-2.1-9.4L23 10" />
              </svg>
            )}
            Ping All Gateways
          </button>
        </div>
      </header>

      {/* Error Alert */}
      {loadError && (
        <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 flex items-center justify-between">
          <span>{loadError}</span>
          <button type="button" onClick={() => load()} className="underline font-bold hover:text-red-900">
            Retry
          </button>
        </div>
      )}

      {/* Bento Metric KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {/* Metric 1 */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 sm:p-3.5 shadow-2xs hover:border-[#CBD5E1] transition-all">
          <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
            ACTIVE GATEWAYS
          </div>
          <div className="text-xl font-bold text-[#0F172A] leading-none mb-1 tabular-nums">
            {loaded ? `${connected.length} / ${items.length}` : '–'}
          </div>
          <div className="text-[11px] font-semibold text-[#10B981] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {loaded && items.length > 0
              ? `${Math.round((connected.length / items.length) * 100)}% Operational`
              : 'Connecting...'}
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 sm:p-3.5 shadow-2xs hover:border-[#CBD5E1] transition-all">
          <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
            ATTENTION REQUIRED
          </div>
          <div className="text-xl font-bold text-[#0F172A] leading-none mb-1 tabular-nums">
            {loaded ? `${attention.length} ${attention.length === 1 ? 'Provider' : 'Providers'}` : '–'}
          </div>
          <div className={`text-[11px] font-semibold ${attention.length > 0 ? 'text-[#D97706]' : 'text-[#64748B]'}`}>
            {attention.length > 0 ? 'Missing credentials or unverified' : 'All providers verified'}
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 sm:p-3.5 shadow-2xs hover:border-[#CBD5E1] transition-all">
          <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
            AVG MESH LATENCY
          </div>
          <div className="text-xl font-bold text-[#0F172A] leading-none mb-1 tabular-nums">
            {avgLatency != null ? `${avgLatency} ms` : '–'}
          </div>
          <div className="text-[11px] font-semibold text-[#2563EB] flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            {avgLatency != null && avgLatency < 250 ? 'Optimal Voice Grade' : 'Network Handshake'}
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 sm:p-3.5 shadow-2xs hover:border-[#CBD5E1] transition-all">
          <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
            RUNTIME SECURITY
          </div>
          <div className="text-xl font-bold text-[#0F172A] leading-none mb-1">
            Pure In-Memory
          </div>
          <div className="text-[11px] font-semibold text-[#64748B] flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            No DB Secret Storage
          </div>
        </div>
      </div>

      {/* Filter, Search & View Mode Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-2 sm:p-2.5 mb-4 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative w-full sm:w-[220px]">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-[#94A3B8]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search provider, category..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>

          {/* Category Tabs */}
          <div role="tablist" aria-label="Provider categories" className="flex items-center gap-0.5 bg-[#F1F5F9] p-0.5 rounded-lg border border-[#E2E8F0] overflow-x-auto max-w-full">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                role="tab"
                type="button"
                aria-selected={tab === c}
                onClick={() => setTab(c)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                  tab === c
                    ? 'bg-white text-[#0F172A] shadow-2xs font-bold'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {c}
                <span className="ml-1 text-[10px] text-[#94A3B8]">({counts[c] ?? 0})</span>
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Connected' | 'Attention')}
            className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
            aria-label="Filter by Status"
          >
            <option value="All">All Status</option>
            <option value="Connected">Connected Only</option>
            <option value="Attention">Needs Attention</option>
          </select>
        </div>

        {/* View Switcher: Table vs Cards */}
        <div className="flex items-center gap-1 bg-[#F1F5F9] p-0.5 rounded-lg border border-[#E2E8F0]">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'table' ? 'bg-white text-[#0F172A] shadow-2xs' : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
            title="Table View"
            aria-label="Table View"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'cards' ? 'bg-white text-[#0F172A] shadow-2xs' : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
            title="Cards View"
            aria-label="Cards View"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content: Table or Bento Cards Grid */}
      {viewMode === 'table' ? (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                <tr>
                  <th scope="col" className="py-2.5 px-4 font-bold">Provider & Infrastructure</th>
                  <th scope="col" className="py-2.5 px-4 font-bold">Category</th>
                  <th scope="col" className="py-2.5 px-4 font-bold">Status</th>
                  <th scope="col" className="py-2.5 px-4 font-bold">Latency</th>
                  <th scope="col" className="py-2.5 px-4 font-bold">Last Verified</th>
                  <th scope="col" className="py-2.5 px-4 font-bold text-center">Failover Default</th>
                  <th scope="col" className="py-2.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-xs">
                {!loaded && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[#94A3B8]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Spinner className="w-5 h-5 text-[#2563EB]" />
                        <span>Benchmarking connected provider infrastructure...</span>
                      </div>
                    </td>
                  </tr>
                )}

                {loaded && visible.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[#94A3B8]">
                      No providers match this category or search filter.
                    </td>
                  </tr>
                )}

                {visible.map((item) => {
                  const busy = testing.has(item.id);
                  const missing = Object.values(item.config).filter((v) => v === 'not set').length;

                  return (
                    <tr key={item.id} className="hover:bg-[#F8FAFC]/80 transition-colors group">
                      {/* Provider name and icon */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <ProviderLogo id={item.id} name={item.name} size={36} />
                          <div>
                            <div className="font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-[#64748B] flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] text-[#94A3B8]">{item.id}</span>
                              {missing > 0 && (
                                <span className="inline-flex items-center gap-1 text-[#D97706] font-semibold">
                                  · {missing} key missing
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F1F5F9] text-[#475569]">
                          {item.category}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <StatusPill item={item} />
                      </td>

                      {/* Latency */}
                      <td className="py-3 px-4">
                        <LatencyBadge ms={item.latency_ms} />
                      </td>

                      {/* Last Checked */}
                      <td className="py-3 px-4 text-[#64748B] text-[11px]">
                        {timeAgo(item.last_checked_at, now)}
                      </td>

                      {/* Default Switch */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={item.is_active_default}
                          aria-label={`Toggle default failover provider for ${item.name}`}
                          onClick={() => toggleDefault(item)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 ${
                            item.is_active_default ? 'bg-[#2563EB]' : 'bg-[#CBD5E1]'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              item.is_active_default ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => test(item.id)}
                            disabled={busy}
                            title="Ping provider endpoint"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#E2E8F0] bg-white text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors disabled:opacity-50"
                          >
                            {busy ? <Spinner className="w-3 h-3 text-[#2563EB]" /> : (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="23 4 23 10 17 10" />
                                <path d="M20.5 15a9 9 0 1 1-2.1-9.4L23 10" />
                              </svg>
                            )}
                            Ping
                          </button>

                          <button
                            type="button"
                            onClick={() => (item.id === 'platform_smtp' ? setSmtpOpen(true) : setEditing(item))}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0F172A] hover:bg-[#1E293B] text-xs font-semibold text-white transition-colors shadow-2xs"
                          >
                            Configure
                          </button>

                          <button
                            type="button"
                            onClick={() => setDetails(item)}
                            title="Inspect credentials & diagnostics"
                            className="p-1 rounded-md text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="19" cy="12" r="1" />
                              <circle cx="5" cy="12" r="1" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Bento Integration Cards View (Inspired by 21st.dev Connect Integration Cards) */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {visible.map((item) => {
            const busy = testing.has(item.id);
            const missing = Object.values(item.config).filter((v) => v === 'not set').length;

            return (
              <div
                key={item.id}
                className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs hover:border-[#2563EB]/40 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <ProviderLogo id={item.id} name={item.name} size={42} />
                      <div>
                        <h3 className="text-sm font-bold text-[#0F172A] leading-tight">{item.name}</h3>
                        <span className="inline-flex items-center mt-0.5 text-[10px] font-semibold text-[#64748B] bg-[#F1F5F9] px-1.5 py-0.5 rounded">
                          {item.category}
                        </span>
                      </div>
                    </div>
                    <StatusPill item={item} />
                  </div>

                  {/* Quick Telemetry Info */}
                  <div className="bg-[#F8FAFC] border border-[#F1F5F9] rounded-lg p-2.5 mb-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-[#94A3B8]">Handshake</div>
                      <div className="mt-0.5">
                        <LatencyBadge ms={item.latency_ms} />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-[#94A3B8]">Environment Keys</div>
                      <div className="mt-0.5 font-semibold text-[11px] text-[#475569]">
                        {missing > 0 ? (
                          <span className="text-[#D97706]">{missing} not set in .env</span>
                        ) : (
                          <span className="text-[#10B981]">{Object.keys(item.config).length} loaded</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {item.message && (
                    <p className="text-[11px] text-[#64748B] line-clamp-1 mb-3">
                      {item.message}
                    </p>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={item.is_active_default}
                      onClick={() => toggleDefault(item)}
                      className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        item.is_active_default ? 'bg-[#2563EB]' : 'bg-[#CBD5E1]'
                      }`}
                      title="Default Gateway"
                    >
                      <span
                        className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          item.is_active_default ? 'translate-x-3' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className="text-[11px] font-semibold text-[#64748B]">Default</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => test(item.id)}
                      disabled={busy}
                      className="px-2.5 py-1 rounded-md border border-[#E2E8F0] bg-white text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"
                    >
                      {busy ? <Spinner className="w-3 h-3 text-[#2563EB]" /> : 'Ping'}
                    </button>
                    <button
                      type="button"
                      onClick={() => (item.id === 'platform_smtp' ? setSmtpOpen(true) : setEditing(item))}
                      className="px-2.5 py-1 rounded-md bg-[#0F172A] hover:bg-[#1E293B] text-xs font-semibold text-white transition-colors shadow-2xs"
                    >
                      Configure
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetails(item)}
                      className="p-1 rounded-md text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
                      title="Details"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="19" cy="12" r="1" />
                        <circle cx="5" cy="12" r="1" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast Notification */}
      <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-5 left-1/2 z-50 -translate-x-1/2 px-4">
        {notice && (
          <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-[#0F172A] px-4 py-2.5 text-xs text-white shadow-xl border border-slate-700/50">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="flex-1 font-medium">{notice}</span>
            <button type="button" onClick={() => setNotice('')} aria-label="Dismiss" className="text-slate-400 hover:text-white ml-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Edit Credentials Dialog */}
      {editing && (
        <CredentialsDialog
          provider={editing}
          onClose={() => setEditing(null)}
          onChanged={() => {
            setNotice(`${editing.name} credentials updated in runtime memory.`);
            load();
          }}
        />
      )}

      {/* Platform SMTP Dialog */}
      {smtpOpen && (
        <SmtpConfigDialog
          onClose={() => setSmtpOpen(false)}
          onSaved={() => {
            setNotice('SMTP settings saved. Verifying connection...');
            test('platform_smtp');
          }}
        />
      )}

      {/* Provider Telemetry Slide-over / Modal */}
      {details && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4" onClick={() => setDetails(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${details.name} diagnostics`}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <ProviderLogo id={details.id} name={details.name} size={44} />
                <div>
                  <h2 className="text-base font-bold text-[#0F172A]">{details.name}</h2>
                  <p className="text-xs text-[#64748B]">{details.category} Infrastructure Gateway</p>
                </div>
              </div>
              <StatusPill item={details} />
            </div>

            {details.message && (
              <p className="mt-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-2.5 text-xs text-[#334155] font-medium">
                {details.message}
              </p>
            )}

            <dl className="mt-4 grid grid-cols-3 gap-2.5 text-xs">
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5">
                <dt className="text-[10px] uppercase font-bold text-[#64748B]">Latency</dt>
                <dd className="mt-1 font-semibold tabular-nums text-[#0F172A]">
                  {details.latency_ms != null ? `${Math.round(details.latency_ms)} ms` : '–'}
                </dd>
              </div>
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5">
                <dt className="text-[10px] uppercase font-bold text-[#64748B]">Error Rate</dt>
                <dd className="mt-1 font-semibold tabular-nums text-[#0F172A]">
                  {details.error_rate || '0.0%'}
                </dd>
              </div>
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5">
                <dt className="text-[10px] uppercase font-bold text-[#64748B]">Last Checked</dt>
                <dd className="mt-1 font-semibold text-[#0F172A]">
                  {timeAgo(details.last_checked_at, now)}
                </dd>
              </div>
            </dl>

            <h3 className="mt-5 text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Environment Configuration (.env)
            </h3>
            <ul className="mt-2 divide-y divide-[#F1F5F9] rounded-lg border border-[#E2E8F0] overflow-hidden text-xs">
              {Object.entries(details.config).map(([key, value]) => (
                <li key={key} className="flex items-center justify-between gap-3 px-3 py-2 bg-white">
                  <code className="font-mono text-[11px] text-[#334155] font-semibold">{key}</code>
                  <span className={`font-mono text-[11px] ${value === 'not set' ? 'font-semibold text-[#D97706]' : 'text-[#64748B]'}`}>
                    {value}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-[#94A3B8]">
              Values are loaded from server environment variables into active memory. Keys are never persisted to a database.
            </p>

            <div className="mt-5 flex items-center justify-between gap-2 border-t border-[#F1F5F9] pt-4">
              <button
                type="button"
                onClick={() => {
                  test(details.id);
                  setDetails((prev) => prev ? { ...prev, last_checked_at: new Date().toISOString() } : null);
                }}
                disabled={testing.has(details.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] transition-colors"
              >
                {testing.has(details.id) ? <Spinner className="w-3.5 h-3.5 text-[#2563EB]" /> : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.5 15a9 9 0 1 1-2.1-9.4L23 10" />
                  </svg>
                )}
                Run Handshake Test
              </button>

              <button
                type="button"
                onClick={() => setDetails(null)}
                className="h-8 rounded-lg bg-[#0F172A] px-4 text-xs font-semibold text-white hover:bg-[#1E293B] transition-colors shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
