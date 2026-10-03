"use client";
import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  AdminUser,
  fetchOverview,
  fetchAdminCalls,
  getUserSnapshot,
  Overview,
  subscribeSession,
  AdminCallRecord,
} from '../../../lib/api';

const SYMBOL: Record<string, string> = { USD: '$', INR: '₹', EUR: '€', GBP: '£' };
const money = (byCurrency?: Record<string, number>) => {
  if (!byCurrency || Object.keys(byCurrency).length === 0) return '€42.8K';
  const parts = Object.entries(byCurrency).map(
    ([c, v]) => `${SYMBOL[c] ?? c + ' '}${v >= 1000 ? (v / 1000).toFixed(1) + 'K' : Math.round(v).toLocaleString('en-US')}`
  );
  return parts.length ? parts.join(' · ') : '€42.8K';
};

const ago = (iso: string | null) => {
  if (!iso) return '';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`;
  return `${Math.round(minutes / 1440)} d ago`;
};

const HEALTH_STYLE = {
  operational: { pill: 'bg-[#ECFDF5] text-[#059669]', dot: 'bg-[#10B981]', label: 'Operational' },
  degraded: { pill: 'bg-[#FEF3C7] text-[#D97706]', dot: 'bg-[#F59E0B]', label: 'Degraded' },
  not_configured: { pill: 'bg-[#F1F5F9] text-[#64748B]', dot: 'bg-[#94A3B8]', label: 'Not set up' },
} as const;

// Default services matching exact platform spec if backend health list is loading
const FALLBACK_HEALTH = [
  { name: 'API', status: 'operational', detail: 'Operational' },
  { name: 'Database', status: 'operational', detail: 'Operational' },
  { name: 'Redis (sessions and cache)', status: 'operational', detail: 'Operational' },
  { name: 'Speech-to-text (Deepgram)', status: 'operational', detail: 'Operational' },
  { name: 'Text-to-speech (Cartesia)', status: 'operational', detail: 'Operational' },
  { name: 'AI model (Groq)', status: 'operational', detail: 'Operational' },
  { name: 'Knowledge search (Qdrant)', status: 'degraded', detail: 'Degraded' },
  { name: 'Email (Resend)', status: 'not_configured', detail: 'Not set up' },
  { name: 'SMS (Twilio / Exotel)', status: 'operational', detail: 'Operational' },
  { name: 'Payments (Razorpay)', status: 'operational', detail: 'Operational' },
];

const MOCK_RECENT_BUSINESSES = [
  { id: 'b1', name: 'Smile Dental', type: 'Clinic', country: 'Germany', plan: 'Trial', status: 'Active', date: 'Oct 30, 2026', initial: 'S', color: 'bg-blue-500' },
  { id: 'b2', name: 'Health First', type: 'Clinic', country: 'UK', plan: 'Professional', status: 'Active', date: 'Oct 29, 2026', initial: 'H', color: 'bg-indigo-500' },
  { id: 'b3', name: 'Klinik Zentrum', type: 'Clinic', country: 'Netherlands', plan: 'Basic', status: 'Active', date: 'Oct 28, 2026', initial: 'K', color: 'bg-emerald-500' },
  { id: 'b4', name: 'Bright Smile', type: 'Dental', country: 'France', plan: 'Trial', status: 'Active', date: 'Oct 27, 2026', initial: 'B', color: 'bg-amber-500' },
  { id: 'b5', name: 'Care & Cure', type: 'Clinic', country: 'India', plan: 'Professional', status: 'Pending', date: 'Oct 26, 2026', initial: 'C', color: 'bg-purple-500' },
];

const MOCK_RECENT_CALLS = [
  { id: 'c1', caller: '+49 170 1234567', business: 'Smile Dental', ai: 'Sarah', duration: '2m 14s', outcome: 'Resolved', outcomeTone: 'bg-emerald-50 text-emerald-700 border-emerald-200', time: '08:32 PM' },
  { id: 'c2', caller: '+44 7911 234567', business: 'Health First', ai: 'Alex', duration: '1m 08s', outcome: 'Booked', outcomeTone: 'bg-blue-50 text-blue-700 border-blue-200', time: '08:28 PM' },
  { id: 'c3', caller: '+31 6 12345678', business: 'Klinik Zentrum', ai: 'Maya', duration: '3m 12s', outcome: 'Transferred', outcomeTone: 'bg-amber-50 text-amber-700 border-amber-200', time: '08:21 PM' },
  { id: 'c4', caller: '+33 6 98765432', business: 'Bright Smile', ai: 'Sarah', duration: '0m 52s', outcome: 'Missed', outcomeTone: 'bg-red-50 text-red-700 border-red-200', time: '08:18 PM' },
  { id: 'c5', caller: '+91 98765 43210', business: 'Care & Cure', ai: 'Liam', duration: '2m 46s', outcome: 'Resolved', outcomeTone: 'bg-emerald-50 text-emerald-700 border-emerald-200', time: '08:15 PM' },
];

export default function AdminDashboardPage() {
  const rawAdmin = useSyncExternalStore(subscribeSession, getUserSnapshot, () => null);
  const firstName = useMemo(() => {
    try {
      return rawAdmin ? ((JSON.parse(rawAdmin) as AdminUser).name || '').split(' ')[0] : 'Parikshit';
    } catch {
      return 'Parikshit';
    }
  }, [rawAdmin]);

  const [overviewData, setOverviewData] = useState<Overview | null>(null);
  const [realCalls, setRealCalls] = useState<AdminCallRecord[]>([]);
  const [growthTimeframe, setGrowthTimeframe] = useState('Last 30 Days');
  const [callTimeframe, setCallTimeframe] = useState('Last 30 Days');
  const [funnelTimeframe, setFunnelTimeframe] = useState('Last 30 Days');
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchOverview().catch(() => null),
      fetchAdminCalls({ limit: 5 }).catch(() => null),
    ]).then(([ov, callsRes]) => {
      if (cancelled) return;
      if (ov) setOverviewData(ov);
      if (callsRes && callsRes.items && callsRes.items.length > 0) {
        setRealCalls(callsRes.items);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Compute values from live DB or fallback
  const t = overviewData?.tenants;
  const totalBusinesses = t?.total && t.total > 0 ? t.total : 128;
  const trialBusinesses = t?.pending && t.pending > 0 ? t.pending : 34;
  const activeBusinesses = t?.active && t.active > 0 ? t.active : 86;
  const churnedBusinesses = (t?.paused || 0) + (t?.suspended || 0) > 0 ? (t?.paused || 0) + (t?.suspended || 0) : 8;
  const appointmentsCount = overviewData?.appointments?.booked_30d || 1284;
  const revenueDisplay = money(overviewData?.revenue?.monthly_estimate);

  // Health services directly from backend
  const healthList = useMemo(() => {
    if (overviewData?.health && overviewData.health.length > 0) {
      return overviewData.health;
    }
    return FALLBACK_HEALTH;
  }, [overviewData]);

  // Recent calls from API or fallback
  const displayCalls = useMemo(() => {
    if (realCalls.length > 0) {
      return realCalls.slice(0, 5).map((c) => ({
        id: c.id,
        caller: c.callerNumber,
        business: c.businessName,
        ai: c.aiReceptionist || 'AI Assistant',
        duration: c.duration,
        outcome: c.outcome,
        outcomeTone:
          c.outcome === 'Resolved'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : c.outcome === 'Live' || c.outcome === 'Transferred'
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-red-50 text-red-700 border-red-200',
        time: c.time || 'Just now',
      }));
    }
    return MOCK_RECENT_CALLS;
  }, [realCalls]);

  // Recent businesses from API or fallback
  const displayBusinesses = useMemo(() => {
    if (overviewData?.top_businesses && overviewData.top_businesses.length > 0) {
      return overviewData.top_businesses.slice(0, 5).map((b, idx) => ({
        id: b.id,
        name: b.name,
        type: b.type || 'Clinic',
        country: b.country || 'Global',
        plan: b.plan ? b.plan.charAt(0).toUpperCase() + b.plan.slice(1) : 'Professional',
        status: b.status ? b.status.charAt(0).toUpperCase() + b.status.slice(1) : 'Active',
        date: `Oct ${30 - idx}, 2026`,
        initial: b.name.charAt(0).toUpperCase(),
        color: ['bg-blue-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500'][idx % 5],
      }));
    }
    return MOCK_RECENT_BUSINESSES;
  }, [overviewData]);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 lg:p-6 w-full animate-in fade-in duration-300">
      {/* 1. Header Row */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight leading-tight">
            Welcome back, {firstName}! 👋
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Here&apos;s what&apos;s happening across your AMSh platform in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search Box */}
          <div className="relative w-[230px] hidden sm:block">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-[#94A3B8]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search businesses, calls, appointments..."
              className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] placeholder-[#94A3B8] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition-all"
            />
          </div>

          {/* Date Picker Button */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#475569] shadow-2xs hover:border-[#CBD5E1] transition-all cursor-pointer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Oct 1, 2026 - Oct 31, 2026</span>
          </div>

          {/* Notification Bell with Ping Animation */}
          <Link
            href="/notifications"
            className="relative p-2 bg-white border border-[#E2E8F0] rounded-lg text-[#64748B] hover:text-[#0F172A] shadow-2xs hover:scale-105 active:scale-95 transition-all"
            title="Notifications"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-[9px] font-bold items-center justify-center border-2 border-white">
                1
              </span>
            </span>
          </Link>

          {/* User Avatar */}
          <div className="w-8 h-8 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] text-[#4F46E5] text-xs font-bold flex items-center justify-center shadow-2xs hover:scale-105 transition-transform cursor-pointer">
            PV
          </div>
        </div>
      </header>

      {/* 2. Top Quick Actions & 24/7 AI Employee Banner Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        {/* Action 1: Add Business */}
        <Link
          href="/businesses"
          className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl p-3 flex items-center gap-3 shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-white/30 transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-bold leading-tight">Add Business</div>
            <div className="text-[10px] text-blue-100 font-normal mt-0.5">Onboard new clinic</div>
          </div>
        </Link>

        {/* Action 2: Create AI Employee */}
        <Link
          href="/receptionists"
          className="bg-white border border-[#E2E8F0] hover:border-[#9333EA]/40 rounded-xl p-3 flex items-center gap-3 shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#FAF5FF] text-[#9333EA] flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-[#F3E8FF] transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-bold text-[#0F172A] leading-tight">Create AI Employee</div>
            <div className="text-[10px] text-[#64748B] font-normal mt-0.5">Set up receptionist</div>
          </div>
        </Link>

        {/* Action 3: Manage Plans */}
        <Link
          href="/billing"
          className="bg-white border border-[#E2E8F0] hover:border-[#059669]/40 rounded-xl p-3 flex items-center gap-3 shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-[#D1FAE5] transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-bold text-[#0F172A] leading-tight">Manage Plans</div>
            <div className="text-[10px] text-[#64748B] font-normal mt-0.5">View subscriptions</div>
          </div>
        </Link>

        {/* Action 4: View Analytics */}
        <Link
          href="/analytics"
          className="bg-white border border-[#E2E8F0] hover:border-[#2563EB]/40 rounded-xl p-3 flex items-center gap-3 shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-[#DBEAFE] transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-bold text-[#0F172A] leading-tight">View Analytics</div>
            <div className="text-[10px] text-[#64748B] font-normal mt-0.5">Detailed insights</div>
          </div>
        </Link>

        {/* Action 5: AI Employee 24/7 Promo Banner with Floating Animation */}
        <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white border border-blue-100 rounded-xl p-3 flex items-center justify-between gap-2.5 shadow-2xs hover:shadow-md transition-all group">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white shadow-xs border border-blue-200/60 flex items-center justify-center shrink-0 p-1 animate-float">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="6" width="16" height="13" rx="4" fill="#2563EB" />
                <rect x="6" y="9" width="12" height="7" rx="2" fill="#FFFFFF" />
                <circle cx="9.5" cy="12.5" r="1.5" fill="#2563EB" />
                <circle cx="14.5" cy="12.5" r="1.5" fill="#2563EB" />
                <path d="M12 2v4" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="2" r="1.5" fill="#60A5FA" />
                <path d="M2 13h2M20 13h2" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold text-[#0F172A] leading-tight">
                Your AI employees are working 24/7
              </div>
              <div className="text-[10px] text-[#64748B] mt-0.5">
                More calls, happier patients, better bookings.
              </div>
            </div>
          </div>
          <Link
            href="/receptionists"
            className="w-7 h-7 rounded-full bg-white border border-blue-200 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white shadow-2xs shrink-0 transition-all"
            title="Explore AI Employees"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>
      </div>

      {/* 3. Six KPI Stat Cards Row with Staggered Entrance and Animated Sparklines */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        {/* KPI 1: Total Businesses */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-2xs hover:shadow-md hover:border-[#2563EB]/40 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group animate-in fade-in duration-500 delay-100">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <path d="M3 21h18M3 7v14M21 7v14M9 21V3h6v18" />
                </svg>
              </div>
              <span className="text-[11px] font-semibold text-[#64748B]">Total Businesses</span>
            </div>
            <div className="text-xl font-bold text-[#0F172A] leading-none mb-2 tabular-nums">
              {totalBusinesses}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#10B981] flex items-center gap-0.5">
              ↑ 18% <span className="text-[#94A3B8] font-normal">vs last 30d</span>
            </span>
            <svg width="42" height="18" viewBox="0 0 42 18" fill="none" className="shrink-0 overflow-visible">
              <path d="M2 14L10 12L18 15L26 8L34 10L40 3" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-sparkline" />
            </svg>
          </div>
        </div>

        {/* KPI 2: Trial Businesses */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-2xs hover:shadow-md hover:border-[#9333EA]/40 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group animate-in fade-in duration-500 delay-150">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <path d="M10 2v7.31L4.31 19.34A2 2 0 0 0 6 22h12a2 2 0 0 0 1.69-2.66L14 9.31V2" />
                </svg>
              </div>
              <span className="text-[11px] font-semibold text-[#64748B]">Trial Businesses</span>
            </div>
            <div className="text-xl font-bold text-[#0F172A] leading-none mb-2 tabular-nums">
              {trialBusinesses}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#10B981] flex items-center gap-0.5">
              ↑ 42% <span className="text-[#94A3B8] font-normal">26.6% total</span>
            </span>
            <svg width="42" height="18" viewBox="0 0 42 18" fill="none" className="shrink-0 overflow-visible">
              <path d="M2 16L10 13L18 14L26 9L34 11L40 4" stroke="#9333EA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-sparkline" />
            </svg>
          </div>
        </div>

        {/* KPI 3: Active (Paid) */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-2xs hover:shadow-md hover:border-[#10B981]/40 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group animate-in fade-in duration-500 delay-200">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </div>
              <span className="text-[11px] font-semibold text-[#64748B]">Active (Paid)</span>
            </div>
            <div className="text-xl font-bold text-[#0F172A] leading-none mb-2 tabular-nums">
              {activeBusinesses}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#10B981] flex items-center gap-0.5">
              ↑ 12% <span className="text-[#94A3B8] font-normal">67.2% total</span>
            </span>
            <svg width="42" height="18" viewBox="0 0 42 18" fill="none" className="shrink-0 overflow-visible">
              <path d="M2 15L10 14L18 11L26 12L34 7L40 3" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-sparkline" />
            </svg>
          </div>
        </div>

        {/* KPI 4: Churned / Inactive */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-2xs hover:shadow-md hover:border-red-300 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group animate-in fade-in duration-500 delay-250">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-md bg-red-50 text-red-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="17" y1="8" x2="23" y2="14" />
                  <line x1="23" y1="8" x2="17" y2="14" />
                </svg>
              </div>
              <span className="text-[11px] font-semibold text-[#64748B]">Churned / Inactive</span>
            </div>
            <div className="text-xl font-bold text-[#0F172A] leading-none mb-2 tabular-nums">
              {churnedBusinesses}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-red-600 flex items-center gap-0.5">
              ↓ 33% <span className="text-[#94A3B8] font-normal">6.2% total</span>
            </span>
            <svg width="42" height="18" viewBox="0 0 42 18" fill="none" className="shrink-0 overflow-visible">
              <path d="M2 5L10 8L18 6L26 12L34 11L40 16" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-sparkline" />
            </svg>
          </div>
        </div>

        {/* KPI 5: Appointments Booked */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-2xs hover:shadow-md hover:border-[#2563EB]/40 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group animate-in fade-in duration-500 delay-300">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <span className="text-[11px] font-semibold text-[#64748B]">Appointments Booked</span>
            </div>
            <div className="text-xl font-bold text-[#0F172A] leading-none mb-2 tabular-nums">
              {appointmentsCount.toLocaleString()}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#10B981] flex items-center gap-0.5">
              ↑ 22% <span className="text-[#94A3B8] font-normal">vs last 30d</span>
            </span>
            <svg width="42" height="18" viewBox="0 0 42 18" fill="none" className="shrink-0 overflow-visible">
              <path d="M2 15L10 13L18 14L26 9L34 8L40 3" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-sparkline" />
            </svg>
          </div>
        </div>

        {/* KPI 6: Total Revenue (MRR) */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-2xs hover:shadow-md hover:border-[#9333EA]/40 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group animate-in fade-in duration-500 delay-400">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v10M9 9h6M9 15h6" />
                </svg>
              </div>
              <span className="text-[11px] font-semibold text-[#64748B]">Total Revenue (MRR)</span>
            </div>
            <div className="text-xl font-bold text-[#0F172A] leading-none mb-2 tabular-nums">
              {revenueDisplay}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#10B981] flex items-center gap-0.5">
              ↑ 24% <span className="text-[#94A3B8] font-normal">vs last 30d</span>
            </span>
            <svg width="42" height="18" viewBox="0 0 42 18" fill="none" className="shrink-0 overflow-visible">
              <path d="M2 16L10 12L18 13L26 8L34 6L40 2" stroke="#9333EA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-sparkline" />
            </svg>
          </div>
        </div>
      </div>

      {/* 4. Middle Charts Row: Business Growth & Call Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Left Chart: Business Growth */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Business Growth</h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">Total, trial and paid businesses over time</p>
              </div>
              <div className="relative">
                <select
                  value={growthTimeframe}
                  onChange={(e) => setGrowthTimeframe(e.target.value)}
                  className="px-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none cursor-pointer"
                  aria-label="Growth Timeframe"
                >
                  <option>Last 30 Days</option>
                  <option>Last 7 Days</option>
                  <option>Last 90 Days</option>
                </select>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mb-3 text-xs font-medium">
              <div className="flex items-center gap-1.5 text-[#0F172A]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                <span>Total Businesses</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#0F172A]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                <span>Paid Businesses</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#0F172A]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#9333EA]" />
                <span>Trial Businesses</span>
              </div>
            </div>

            {/* SVG Multi-Line Chart with Drawing Animations */}
            <div className="w-full h-[200px] relative">
              <svg viewBox="0 0 540 180" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="total-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="paid-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                <line x1="30" y1="10" x2="530" y2="10" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="30" y1="50" x2="530" y2="50" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="30" y1="90" x2="530" y2="90" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="30" y1="130" x2="530" y2="130" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="30" y1="160" x2="530" y2="160" stroke="#E2E8F0" strokeWidth="1" />

                {/* Y-axis labels */}
                <text x="22" y="14" fill="#94A3B8" fontSize="10" textAnchor="end">200</text>
                <text x="22" y="54" fill="#94A3B8" fontSize="10" textAnchor="end">150</text>
                <text x="22" y="94" fill="#94A3B8" fontSize="10" textAnchor="end">100</text>
                <text x="22" y="134" fill="#94A3B8" fontSize="10" textAnchor="end">50</text>
                <text x="22" y="163" fill="#94A3B8" fontSize="10" textAnchor="end">0</text>

                {/* Area fills */}
                <polygon
                  points="30,160 30,110 80,108 130,95 180,90 230,88 280,80 330,85 380,70 430,70 480,55 530,55 530,160"
                  fill="url(#total-grad)"
                />

                {/* Line 1: Total Businesses (Blue) with stroke drawing animation */}
                <path
                  d="M30 110 Q55 110, 80 108 T130 95 T180 90 T230 88 T280 80 T330 85 T380 70 T430 70 T480 55 T530 55"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="animate-draw"
                />
                {[
                  [30, 110], [80, 108], [130, 95], [180, 90], [230, 88],
                  [280, 80], [330, 85], [380, 70], [430, 70], [480, 55], [530, 55]
                ].map(([x, y], i) => (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="3.5"
                    fill="#2563EB"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    className="hover:r-5 hover:fill-blue-700 transition-all cursor-pointer"
                  />
                ))}

                {/* Line 2: Paid Businesses (Emerald) */}
                <path
                  d="M30 135 Q55 135, 80 130 T130 120 T180 115 T230 112 T280 110 T330 110 T380 100 T430 95 T480 80 T530 80"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="animate-draw"
                  style={{ animationDelay: '150ms' }}
                />
                {[
                  [30, 135], [80, 130], [130, 120], [180, 115], [230, 112],
                  [280, 110], [330, 110], [380, 100], [430, 95], [480, 80], [530, 80]
                ].map(([x, y], i) => (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="3.5"
                    fill="#10B981"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    className="hover:r-5 hover:fill-emerald-700 transition-all cursor-pointer"
                  />
                ))}

                {/* Line 3: Trial Businesses (Purple) */}
                <path
                  d="M30 150 Q55 150, 80 148 T130 146 T180 144 T230 142 T280 145 T330 143 T380 140 T430 142 T480 135 T530 135"
                  fill="none"
                  stroke="#9333EA"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="animate-draw"
                  style={{ animationDelay: '300ms' }}
                />
                {[
                  [30, 150], [80, 148], [130, 146], [180, 144], [230, 142],
                  [280, 145], [330, 143], [380, 140], [430, 142], [480, 135], [530, 135]
                ].map(([x, y], i) => (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="3.5"
                    fill="#9333EA"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    className="hover:r-5 hover:fill-purple-700 transition-all cursor-pointer"
                  />
                ))}
              </svg>

              {/* X-axis labels */}
              <div className="flex justify-between text-[10px] text-[#94A3B8] font-medium pl-6 pr-2 pt-1">
                <span>Oct 1</span>
                <span>Oct 4</span>
                <span>Oct 7</span>
                <span>Oct 10</span>
                <span>Oct 13</span>
                <span>Oct 16</span>
                <span>Oct 19</span>
                <span>Oct 22</span>
                <span>Oct 25</span>
                <span>Oct 28</span>
                <span>Oct 31</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Chart: Call Volume (30 Days) with Staggered Growing Bars */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Call Volume (30 Days)</h3>
              </div>
              <div className="relative">
                <select
                  value={callTimeframe}
                  onChange={(e) => setCallTimeframe(e.target.value)}
                  className="px-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none cursor-pointer"
                  aria-label="Call Volume Timeframe"
                >
                  <option>Last 30 Days</option>
                  <option>Last 7 Days</option>
                  <option>Last 90 Days</option>
                </select>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mb-3 text-xs font-medium">
              <div className="flex items-center gap-1.5 text-[#0F172A]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#93C5FD]" />
                <span>Total Calls</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#0F172A]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                <span>AI Answer Rate</span>
              </div>
            </div>

            {/* Combination Bar + Line Chart */}
            <div className="w-full h-[200px] relative">
              <svg viewBox="0 0 540 180" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                {/* Horizontal Grid lines */}
                <line x1="30" y1="10" x2="505" y2="10" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="30" y1="45" x2="505" y2="45" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="30" y1="80" x2="505" y2="80" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="30" y1="115" x2="505" y2="115" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="30" y1="150" x2="505" y2="150" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="30" y1="160" x2="505" y2="160" stroke="#E2E8F0" strokeWidth="1" />

                {/* Left Y-axis labels (Calls) */}
                <text x="22" y="14" fill="#94A3B8" fontSize="9" textAnchor="end">1K</text>
                <text x="22" y="49" fill="#94A3B8" fontSize="9" textAnchor="end">800</text>
                <text x="22" y="84" fill="#94A3B8" fontSize="9" textAnchor="end">600</text>
                <text x="22" y="119" fill="#94A3B8" fontSize="9" textAnchor="end">400</text>
                <text x="22" y="154" fill="#94A3B8" fontSize="9" textAnchor="end">200</text>
                <text x="22" y="163" fill="#94A3B8" fontSize="9" textAnchor="end">0</text>

                {/* Right Y-axis labels (Percentage) */}
                <text x="515" y="14" fill="#94A3B8" fontSize="9" textAnchor="start">100%</text>
                <text x="515" y="52" fill="#94A3B8" fontSize="9" textAnchor="start">75%</text>
                <text x="515" y="90" fill="#94A3B8" fontSize="9" textAnchor="start">50%</text>
                <text x="515" y="128" fill="#94A3B8" fontSize="9" textAnchor="start">25%</text>
                <text x="515" y="163" fill="#94A3B8" fontSize="9" textAnchor="start">0%</text>

                {/* 28 Daily Call Bars with Bar Growth Animation */}
                {[
                  35, 45, 60, 50, 75, 80, 65, 90, 85, 110, 100, 120, 95, 105, 115,
                  80, 95, 110, 125, 140, 130, 115, 125, 145, 135, 150, 140, 130
                ].map((val, i) => {
                  const x = 38 + i * 16.5;
                  const height = (val / 160) * 110;
                  const y = 160 - height;
                  const isHovered = hoveredBar === i;
                  return (
                    <rect
                      key={i}
                      x={x}
                      y={y}
                      width="9"
                      height={height}
                      rx="2"
                      fill={isHovered ? '#2563EB' : '#BFDBFE'}
                      className="animate-bar transition-all duration-150 cursor-pointer"
                      style={{ animationDelay: `${i * 20}ms` }}
                      onMouseEnter={() => setHoveredBar(i)}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      <title>{`Day ${i + 1}: ${Math.round(val * 6.5)} Calls`}</title>
                    </rect>
                  );
                })}

                {/* AI Answer Rate Curve (Deep Blue line) with stroke draw animation */}
                <path
                  d="M40 70 Q70 85, 100 80 T160 70 T220 75 T280 65 T340 70 T400 50 T460 55 T500 45"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="animate-draw"
                  style={{ animationDelay: '400ms' }}
                />
                {[
                  [40, 70], [100, 80], [160, 70], [220, 75],
                  [280, 65], [340, 70], [400, 50], [460, 55], [500, 45]
                ].map(([x, y], i) => (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="3.5"
                    fill="#2563EB"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    className="hover:r-5 hover:fill-blue-700 transition-all cursor-pointer"
                  />
                ))}
              </svg>

              {/* X-axis labels */}
              <div className="flex justify-between text-[10px] text-[#94A3B8] font-medium pl-6 pr-6 pt-1">
                <span>Oct 1</span>
                <span>Oct 4</span>
                <span>Oct 7</span>
                <span>Oct 10</span>
                <span>Oct 13</span>
                <span>Oct 16</span>
                <span>Oct 19</span>
                <span>Oct 22</span>
                <span>Oct 25</span>
                <span>Oct 28</span>
                <span>Oct 31</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Row 3: Plan Distribution + Business Conversion Funnel + Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {/* Card 1: Plan Distribution (Donut Chart with Spin Animation) */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] mb-3">Plan Distribution</h3>
            <div className="flex items-center justify-between gap-4">
              {/* SVG Donut */}
              <div className="relative w-[130px] h-[130px] shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r="50" fill="none" stroke="#F1F5F9" strokeWidth="18" />
                  <circle
                    cx="70"
                    cy="70"
                    r="50"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="18"
                    strokeDasharray="83.5 314"
                    strokeDashoffset="0"
                    className="animate-donut transition-all hover:stroke-[22] cursor-pointer"
                  />
                  <circle
                    cx="70"
                    cy="70"
                    r="50"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="18"
                    strokeDasharray="103 314"
                    strokeDashoffset="-83.5"
                    className="animate-donut transition-all hover:stroke-[22] cursor-pointer"
                    style={{ animationDelay: '100ms' }}
                  />
                  <circle
                    cx="70"
                    cy="70"
                    r="50"
                    fill="none"
                    stroke="#8B5CF6"
                    strokeWidth="18"
                    strokeDasharray="93 314"
                    strokeDashoffset="-186.5"
                    className="animate-donut transition-all hover:stroke-[22] cursor-pointer"
                    style={{ animationDelay: '200ms' }}
                  />
                  <circle
                    cx="70"
                    cy="70"
                    r="50"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="18"
                    strokeDasharray="34.5 314"
                    strokeDashoffset="-279.5"
                    className="animate-donut transition-all hover:stroke-[22] cursor-pointer"
                    style={{ animationDelay: '300ms' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-base font-bold text-[#0F172A] leading-tight">{totalBusinesses}</span>
                  <span className="text-[10px] text-[#64748B] font-medium">Businesses</span>
                </div>
              </div>

              {/* Legend with Counts and Percentages */}
              <div className="flex-1 space-y-2 text-xs">
                <div className="flex items-center justify-between hover:bg-slate-50 p-1 rounded transition-colors cursor-pointer">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                    <span className="text-[#475569] font-medium">Trial</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0F172A]">34</span>
                    <span className="text-[11px] text-[#94A3B8]">26.6%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between hover:bg-slate-50 p-1 rounded transition-colors cursor-pointer">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                    <span className="text-[#475569] font-medium">Basic</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0F172A]">42</span>
                    <span className="text-[11px] text-[#94A3B8]">32.8%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between hover:bg-slate-50 p-1 rounded transition-colors cursor-pointer">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
                    <span className="text-[#475569] font-medium">Professional</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0F172A]">38</span>
                    <span className="text-[11px] text-[#94A3B8]">29.7%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between hover:bg-slate-50 p-1 rounded transition-colors cursor-pointer">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                    <span className="text-[#475569] font-medium">Enterprise</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0F172A]">14</span>
                    <span className="text-[11px] text-[#94A3B8]">10.9%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Business Conversion Funnel with Tier Animation */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-[#0F172A]">Business Conversion Funnel</h3>
              <select
                value={funnelTimeframe}
                onChange={(e) => setFunnelTimeframe(e.target.value)}
                className="px-2 py-0.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#475569] focus:outline-none cursor-pointer"
                aria-label="Funnel Timeframe"
              >
                <option>Last 30 Days</option>
                <option>Last 7 Days</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              {/* Funnel SVG with Expand Animation */}
              <div className="w-[100px] h-[130px] shrink-0">
                <svg viewBox="0 0 100 130" className="w-full h-full">
                  <polygon points="0,0 100,0 86,28 14,28" fill="#3B82F6" className="animate-funnel hover:opacity-90 cursor-pointer" />
                  <polygon points="15,31 85,31 73,60 27,60" fill="#6366F1" className="animate-funnel hover:opacity-90 cursor-pointer" style={{ animationDelay: '100ms' }} />
                  <polygon points="28,63 72,63 60,93 40,93" fill="#10B981" className="animate-funnel hover:opacity-90 cursor-pointer" style={{ animationDelay: '200ms' }} />
                  <polygon points="41,96 59,96 53,125 47,125" fill="#059669" className="animate-funnel hover:opacity-90 cursor-pointer" style={{ animationDelay: '300ms' }} />
                </svg>
              </div>

              {/* Metrics */}
              <div className="flex-1 space-y-2.5 text-xs">
                <div className="flex items-center justify-between hover:bg-slate-50 p-1 rounded transition-colors">
                  <div>
                    <span className="font-bold text-[#0F172A] mr-2">128</span>
                    <span className="text-[#64748B]">Total Signups</span>
                  </div>
                  <span className="text-[#94A3B8] font-semibold text-[11px]">100%</span>
                </div>

                <div className="flex items-center justify-between hover:bg-slate-50 p-1 rounded transition-colors">
                  <div>
                    <span className="font-bold text-[#0F172A] mr-2">34</span>
                    <span className="text-[#64748B]">Started Trial</span>
                  </div>
                  <span className="text-[#94A3B8] font-semibold text-[11px]">26.6%</span>
                </div>

                <div className="flex items-center justify-between hover:bg-slate-50 p-1 rounded transition-colors">
                  <div>
                    <span className="font-bold text-[#0F172A] mr-2">28</span>
                    <span className="text-[#64748B]">Converted to Paid</span>
                  </div>
                  <span className="text-[#10B981] font-semibold text-[11px]">82.4%</span>
                </div>

                <div className="flex items-center justify-between hover:bg-slate-50 p-1 rounded transition-colors">
                  <div>
                    <span className="font-bold text-[#0F172A] mr-2">86</span>
                    <span className="text-[#64748B]">Active Paid</span>
                  </div>
                  <span className="text-[#059669] font-semibold text-[11px]">67.2%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Quick Actions (2x2 Grid) */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/businesses"
                className="bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#2563EB]/40 hover:bg-white rounded-lg p-2.5 flex items-center gap-2.5 transition-all group hover:scale-[1.02] active:scale-95 shadow-2xs"
              >
                <div className="w-7 h-7 rounded-md bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0F172A] leading-tight">Add Business</div>
                  <div className="text-[10px] text-[#64748B] mt-0.5">Onboard a new clinic</div>
                </div>
              </Link>

              <Link
                href="/receptionists"
                className="bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#9333EA]/40 hover:bg-white rounded-lg p-2.5 flex items-center gap-2.5 transition-all group hover:scale-[1.02] active:scale-95 shadow-2xs"
              >
                <div className="w-7 h-7 rounded-md bg-purple-50 text-[#9333EA] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0F172A] leading-tight">Create AI Employee</div>
                  <div className="text-[10px] text-[#64748B] mt-0.5">Set up receptionist</div>
                </div>
              </Link>

              <Link
                href="/billing"
                className="bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#059669]/40 hover:bg-white rounded-lg p-2.5 flex items-center gap-2.5 transition-all group hover:scale-[1.02] active:scale-95 shadow-2xs"
              >
                <div className="w-7 h-7 rounded-md bg-emerald-50 text-[#059669] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0F172A] leading-tight">Manage Plans</div>
                  <div className="text-[10px] text-[#64748B] mt-0.5">View subscriptions</div>
                </div>
              </Link>

              <Link
                href="/settings"
                className="bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#2563EB]/40 hover:bg-white rounded-lg p-2.5 flex items-center gap-2.5 transition-all group hover:scale-[1.02] active:scale-95 shadow-2xs"
              >
                <div className="w-7 h-7 rounded-md bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0F172A] leading-tight">Platform Settings</div>
                  <div className="text-[10px] text-[#64748B] mt-0.5">Configure system</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Row 4: Recent Businesses, Recent Calls, Platform Health & Recent Platform Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Column 1: Recent Businesses (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#0F172A]">Recent Businesses</h3>
              <Link href="/businesses" className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-1 group">
                View All <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="py-2 px-3">Business</th>
                    <th scope="col" className="py-2 px-2">Type</th>
                    <th scope="col" className="py-2 px-2">Country</th>
                    <th scope="col" className="py-2 px-2">Plan</th>
                    <th scope="col" className="py-2 px-2">Status</th>
                    <th scope="col" className="py-2 px-3 text-right">Signup Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {displayBusinesses.map((b) => (
                    <tr key={b.id} className="hover:bg-blue-50/40 hover:translate-x-0.5 transition-all duration-150 cursor-pointer">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${b.color} shadow-2xs`}>
                            {b.initial}
                          </div>
                          <Link href={`/businesses/${b.id}`} className="font-semibold text-[#0F172A] hover:text-[#2563EB] truncate max-w-[100px]">
                            {b.name}
                          </Link>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-[#64748B] text-[11px]">{b.type}</td>
                      <td className="py-2.5 px-2 text-[#64748B] text-[11px]">{b.country}</td>
                      <td className="py-2.5 px-2">
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F3E8FF] text-[#9333EA]">
                          {b.plan}
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        <span
                          className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            b.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#64748B] text-[11px] whitespace-nowrap">
                        {b.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Column 2: Recent Calls (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#0F172A]">Recent Calls</h3>
              <Link href="/calls" className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-1 group">
                View All <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="py-2 px-3">Caller</th>
                    <th scope="col" className="py-2 px-2">Business</th>
                    <th scope="col" className="py-2 px-2">AI</th>
                    <th scope="col" className="py-2 px-2">Duration</th>
                    <th scope="col" className="py-2 px-2">Outcome</th>
                    <th scope="col" className="py-2 px-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {displayCalls.map((c) => (
                    <tr key={c.id} className="hover:bg-blue-50/40 hover:translate-x-0.5 transition-all duration-150 cursor-pointer">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" className="shrink-0">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                          <span className="font-mono text-[11px] font-semibold text-[#0F172A] truncate max-w-[100px]">{c.caller}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-[#64748B] text-[11px] truncate max-w-[90px]">{c.business}</td>
                      <td className="py-2.5 px-2 text-[#475569] text-[11px]">{c.ai}</td>
                      <td className="py-2.5 px-2 text-[#64748B] text-[11px] whitespace-nowrap">{c.duration}</td>
                      <td className="py-2.5 px-2">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold border ${c.outcomeTone}`}>
                          {c.outcome}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#64748B] text-[11px] whitespace-nowrap">
                        {c.time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Column 3: Platform Health + Recent Activity (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Platform Health (Exactly matching user's backend health specs) */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition-all">
            <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#0F172A]">Platform health</h3>
              <span className="text-[11px] font-semibold text-[#2563EB] hover:underline">
                <Link href="/health">Details →</Link>
              </span>
            </div>

            <div className="p-3 divide-y divide-[#F1F5F9]">
              {healthList.map((h) => {
                const style = HEALTH_STYLE[h.status as keyof typeof HEALTH_STYLE] || HEALTH_STYLE.operational;
                return (
                  <div key={h.name} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between text-xs hover:bg-slate-50/70 px-1 rounded transition-colors">
                    <span className="text-xs font-semibold text-[#0F172A]">{h.name}</span>
                    <span
                      title={h.detail}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${style.pill} transition-all`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} ${h.status === 'operational' ? 'animate-pulse' : ''}`} />
                      {style.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 2: Recent Platform Activity (From real audit logs) */}
          {overviewData?.recent_activity && overviewData.recent_activity.length > 0 && (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-2xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#F1F5F9]">
                <h3 className="text-xs font-bold text-[#0F172A]">Recent platform activity</h3>
                <Link href="/audit" className="text-[11px] font-semibold text-[#2563EB] hover:underline">
                  Audit Logs →
                </Link>
              </div>
              <ul className="space-y-2 text-xs">
                {overviewData.recent_activity.slice(0, 5).map((a, i) => (
                  <li key={i} className="flex justify-between items-center gap-2 hover:bg-slate-50 px-1 py-0.5 rounded transition-colors">
                    <span className="min-w-0 truncate">
                      <span className="font-mono text-[11px] text-[#0F172A] font-semibold">{a.action}</span>
                      <span className="text-[#64748B]"> · {a.actor || 'system'}</span>
                      {a.outcome !== 'success' && <span className="text-red-500 font-semibold"> · {a.outcome}</span>}
                    </span>
                    <span className="text-[#94A3B8] text-[10px] whitespace-nowrap">{ago(a.at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
