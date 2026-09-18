"use client";
import React, { useState } from 'react';

type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

interface SecurityEvent {
  id: string;
  severity: Severity;
  timestamp: string;
  ip: string;
  identity: string;
  event: string;
  status: string;
  statusTone: 'danger' | 'default';
}

const severityStyles: Record<Severity, string> = {
  Critical: 'bg-[#FEE2E2] text-[#991B1B]',
  High: 'bg-[#FEF3C7] text-[#92400E]',
  Medium: 'bg-[#DBEAFE] text-[#1E40AF]',
  Low: 'bg-[#D1FAE5] text-[#065F46]',
};

const kpis = [
  { label: 'Events Today', value: '12', note: '-14% vs yesterday', tone: 'positive' as const },
  { label: 'Failed Logins', value: '3', note: '2 IPs blocked', tone: 'danger' as const },
  { label: 'Suspicious Sessions', value: '1', note: 'Requires manual review', tone: 'danger' as const },
];

const securityEvents: SecurityEvent[] = [
  {
    id: 'sec-1',
    severity: 'Critical',
    timestamp: '2026-01-30 10:24 AM',
    ip: '103.42.12.91',
    identity: 'Operator Account',
    event: 'Brute force: 3 consecutive login failures',
    status: 'Blocked IP',
    statusTone: 'danger',
  },
  {
    id: 'sec-2',
    severity: 'High',
    timestamp: '2026-01-30 08:15 AM',
    ip: '185.220.101.5',
    identity: 'Sarah Wilson Token',
    event: 'Suspicious session: unexpected geographic switch',
    status: 'Session Revoked',
    statusTone: 'default',
  },
  {
    id: 'sec-3',
    severity: 'Medium',
    timestamp: '2026-01-29 03:30 PM',
    ip: '82.197.102.4',
    identity: 'Parikshit Arora',
    event: 'MFA disabled for testing bypass',
    status: 'MFA Restored',
    statusTone: 'default',
  },
  {
    id: 'sec-4',
    severity: 'Low',
    timestamp: '2026-01-29 01:10 PM',
    ip: '192.168.1.50',
    identity: 'Admin Robot API',
    event: 'Rotated root encryption key successfully',
    status: 'Completed',
    statusTone: 'default',
  },
  {
    id: 'sec-5',
    severity: 'Medium',
    timestamp: '2026-01-28 11:24 AM',
    ip: '45.132.8.19',
    identity: 'Unknown Agent',
    event: 'Rate limit hit: API query spam',
    status: 'Throttled',
    statusTone: 'default',
  },
  {
    id: 'sec-6',
    severity: 'Low',
    timestamp: '2026-01-28 09:42 AM',
    ip: '82.197.102.4',
    identity: 'Parikshit Arora',
    event: 'Bulk logs archive downloaded',
    status: 'Authorized',
    statusTone: 'default',
  },
];

const severityTabs: ('All' | Severity)[] = ['All', 'Critical', 'High', 'Medium', 'Low'];

export default function SecurityEventsPage() {
  const [activeSeverity, setActiveSeverity] = useState<'All' | Severity>('All');
  const [search, setSearch] = useState('');

  const countFor = (severity: 'All' | Severity) =>
    severity === 'All'
      ? securityEvents.length
      : securityEvents.filter((event) => event.severity === severity).length;

  const filtered = securityEvents.filter((entry) => {
    const term = search.toLowerCase();
    const matchesSearch =
      term === '' ||
      entry.event.toLowerCase().includes(term) ||
      entry.identity.toLowerCase().includes(term) ||
      entry.status.toLowerCase().includes(term) ||
      entry.ip.includes(term);
    const matchesSeverity = activeSeverity === 'All' || entry.severity === activeSeverity;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <header className="mb-4 pb-3 border-b border-[#E2E8F0] flex flex-wrap justify-between items-center gap-2.5">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A] tracking-tight leading-tight">Security Events</h1>
          <p className="text-xs text-[#475569] mt-0.5 font-normal">Security monitoring and threat detection.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 border border-[#E2E8F0] rounded-lg py-1.5 px-2.5 text-xs font-medium text-[#475569] bg-white shadow-2xs hover:bg-gray-50 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Jan 1 - Jan 30, 2026
          </button>
          <button className="flex items-center justify-center border border-[#E2E8F0] rounded-full w-7 h-7 text-[#475569] bg-white shadow-2xs hover:bg-gray-50 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>
        </div>
      </header>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-3.5">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white border border-[#E2E8F0] rounded-lg p-3 shadow-2xs">
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">{kpi.label}</div>
            <div className="flex items-end justify-between gap-2.5">
              <span className="text-xl font-bold text-[#0F172A] leading-none">{kpi.value}</span>
              <span className={`text-[11px] font-semibold ${kpi.tone === 'positive' ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                {kpi.note}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Severity tabs + search */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
        <div className="inline-flex items-center gap-1 bg-[#F1F5F9] rounded-lg p-1">
          {severityTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSeverity(tab)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                activeSeverity === tab ? 'bg-white text-[#2563EB] shadow-2xs' : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              {tab === 'All' ? 'All Severities' : tab} ({countFor(tab)})
            </button>
          ))}
        </div>

        <div className="relative w-[210px]">
          <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-[#94A3B8]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search event, identity, IP..."
            className="w-full pl-8 pr-2.5 py-1 bg-white border border-[#E2E8F0] rounded-md text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
          />
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Severity</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Timestamp</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">IP Address</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Admin User / Identity</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[240px]">Action / Event Detected</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3.5 py-6 text-center text-xs text-[#94A3B8]">
                    No security events match this view.
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#F8FAFC]/70 transition-colors">
                    <td className="px-3.5 py-2 whitespace-nowrap">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${severityStyles[entry.severity]}`}>
                        {entry.severity}
                      </span>
                    </td>
                    <td className="px-3.5 py-2 text-xs text-[#475569] whitespace-nowrap">{entry.timestamp}</td>
                    <td className="px-3.5 py-2 text-xs text-[#475569] whitespace-nowrap">{entry.ip}</td>
                    <td className="px-3.5 py-2 text-xs font-bold text-[#0F172A] whitespace-nowrap">{entry.identity}</td>
                    <td className="px-3.5 py-2 text-xs text-[#475569]">{entry.event}</td>
                    <td
                      className={`px-3.5 py-2 text-xs font-bold whitespace-nowrap ${
                        entry.statusTone === 'danger' ? 'text-[#EF4444]' : 'text-[#0F172A]'
                      }`}
                    >
                      {entry.status}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
