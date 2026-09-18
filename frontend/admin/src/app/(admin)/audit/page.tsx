"use client";
import React, { useMemo, useState } from 'react';

type LogStatus = 'Success' | 'Alert' | 'Failed' | 'Info';

interface AuditEntry {
  id: string;
  timestamp: string;
  date: string;
  adminUser: string;
  action: string;
  resource: string;
  targetBusiness: string;
  businessType: string;
  ip: string;
  status: LogStatus;
}

const statusStyles: Record<LogStatus, string> = {
  Success: 'bg-[#D1FAE5] text-[#065F46]',
  Alert: 'bg-[#FEF3C7] text-[#92400E]',
  Failed: 'bg-[#FEE2E2] text-[#991B1B]',
  Info: 'bg-[#DBEAFE] text-[#1E40AF]',
};

const auditLog: AuditEntry[] = [
  {
    id: 'log-1',
    timestamp: '2026-01-30 10:24 AM',
    date: '2026-01-30',
    adminUser: 'Parikshit Arora',
    action: 'Business Activated',
    resource: 'Smile Dental Clinic (UID: 128)',
    targetBusiness: 'Smile Dental Clinic',
    businessType: 'Dental Clinic',
    ip: '82.197.102.4',
    status: 'Success',
  },
  {
    id: 'log-2',
    timestamp: '2026-01-30 09:12 AM',
    date: '2026-01-30',
    adminUser: 'Parikshit Arora',
    action: 'Integrations Updated',
    resource: 'Twilio Gateway (SID: tw-sid)',
    targetBusiness: 'Amsterdam Dental Care',
    businessType: 'Dental Clinic',
    ip: '82.197.102.4',
    status: 'Success',
  },
  {
    id: 'log-3',
    timestamp: '2026-01-29 04:45 PM',
    date: '2026-01-29',
    adminUser: 'Admin Robot',
    action: 'Limit Exceeded',
    resource: 'Voice Minutes Alert Triggered',
    targetBusiness: 'Smile Dental Clinic',
    businessType: 'Dental Clinic',
    ip: '10.0.42.100',
    status: 'Alert',
  },
  {
    id: 'log-4',
    timestamp: '2026-01-29 02:18 PM',
    date: '2026-01-29',
    adminUser: 'Parikshit Arora',
    action: 'Business Suspended',
    resource: 'Berlin Health Center (Starter)',
    targetBusiness: 'Berlin Health Center',
    businessType: 'Medical Center',
    ip: '82.197.102.4',
    status: 'Failed',
  },
  {
    id: 'log-5',
    timestamp: '2026-01-28 11:05 AM',
    date: '2026-01-28',
    adminUser: 'Support System',
    action: 'Ticket Resolved',
    resource: 'ST-8821 Invoice Correction',
    targetBusiness: 'Paris Dental Studio',
    businessType: 'Dental Clinic',
    ip: '10.0.12.82',
    status: 'Success',
  },
  {
    id: 'log-6',
    timestamp: '2026-01-28 10:00 AM',
    date: '2026-01-28',
    adminUser: 'Parikshit Arora',
    action: 'Password Changed',
    resource: 'Secure credentials update',
    targetBusiness: 'Platform System',
    businessType: 'Platform',
    ip: '82.197.102.4',
    status: 'Success',
  },
  {
    id: 'log-7',
    timestamp: '2026-01-27 05:30 PM',
    date: '2026-01-27',
    adminUser: 'Security Watchdog',
    action: 'Login Blocked',
    resource: '3 failed passwords detected',
    targetBusiness: 'Operator Account',
    businessType: 'Platform',
    ip: '103.42.12.91',
    status: 'Failed',
  },
  {
    id: 'log-8',
    timestamp: '2026-01-27 01:15 PM',
    date: '2026-01-27',
    adminUser: 'Parikshit Arora',
    action: 'Invite Dispatched',
    resource: 'New administrator workspace',
    targetBusiness: 'Internal Org',
    businessType: 'Platform',
    ip: '82.197.102.4',
    status: 'Info',
  },
];

const selectClass =
  'px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[12px] font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 cursor-pointer';

const unique = (values: string[]) => ['All', ...Array.from(new Set(values))];

/** Wraps a CSV cell so commas, quotes and newlines in log text cannot break the column layout. */
const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

export default function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [admin, setAdmin] = useState('All');
  const [business, setBusiness] = useState('All');
  const [businessType, setBusinessType] = useState('All');
  const [action, setAction] = useState('All');
  const [date, setDate] = useState('All');
  const [status, setStatus] = useState('All');

  const admins = useMemo(() => unique(auditLog.map((e) => e.adminUser)), []);
  const businesses = useMemo(() => unique(auditLog.map((e) => e.targetBusiness)), []);
  const businessTypes = useMemo(() => unique(auditLog.map((e) => e.businessType)), []);
  const actions = useMemo(() => unique(auditLog.map((e) => e.action)), []);
  const dates = useMemo(() => unique(auditLog.map((e) => e.date)), []);

  const filtered = auditLog.filter((entry) => {
    const term = search.toLowerCase();
    const matchesSearch =
      term === '' ||
      entry.resource.toLowerCase().includes(term) ||
      entry.action.toLowerCase().includes(term) ||
      entry.adminUser.toLowerCase().includes(term) ||
      entry.targetBusiness.toLowerCase().includes(term) ||
      entry.ip.includes(term);

    return (
      matchesSearch &&
      (admin === 'All' || entry.adminUser === admin) &&
      (business === 'All' || entry.targetBusiness === business) &&
      (businessType === 'All' || entry.businessType === businessType) &&
      (action === 'All' || entry.action === action) &&
      (date === 'All' || entry.date === date) &&
      (status === 'All' || entry.status === status)
    );
  });

  const hasFilters =
    admin !== 'All' ||
    business !== 'All' ||
    businessType !== 'All' ||
    action !== 'All' ||
    date !== 'All' ||
    status !== 'All' ||
    search !== '';

  const resetFilters = () => {
    setAdmin('All');
    setBusiness('All');
    setBusinessType('All');
    setAction('All');
    setDate('All');
    setStatus('All');
    setSearch('');
  };

  const exportLogs = () => {
    const header = ['Timestamp', 'Admin User', 'Action', 'Resource', 'Target Business', 'Business Type', 'IP Address', 'Status'];
    const rows = filtered.map((entry) => [
      entry.timestamp,
      entry.adminUser,
      entry.action,
      entry.resource,
      entry.targetBusiness,
      entry.businessType,
      entry.ip,
      entry.status,
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <header className="mb-4 pb-3 border-b border-[#E2E8F0] flex flex-wrap justify-between items-center gap-2.5">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A] tracking-tight leading-tight">Audit Logs</h1>
          <p className="text-xs text-[#475569] mt-0.5 font-normal">Immutable platform activity log.</p>
        </div>
        <button
          onClick={exportLogs}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Export Logs
        </button>
      </header>

      {/* Filter bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-2.5 mb-3.5 shadow-2xs flex flex-wrap items-center gap-2">
        <div className="relative w-[190px]">
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
            placeholder="Search logs, IP, resource..."
            className="w-full pl-8 pr-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
          />
        </div>

        <select value={admin} onChange={(e) => setAdmin(e.target.value)} className="px-2 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 cursor-pointer">
          {admins.map((a) => (
            <option key={a} value={a}>{a === 'All' ? 'Admin: All' : a}</option>
          ))}
        </select>

        <select value={business} onChange={(e) => setBusiness(e.target.value)} className="px-2 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 cursor-pointer">
          {businesses.map((b) => (
            <option key={b} value={b}>{b === 'All' ? 'Business: All' : b}</option>
          ))}
        </select>

        <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="px-2 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 cursor-pointer">
          {businessTypes.map((t) => (
            <option key={t} value={t}>{t === 'All' ? 'Type: All' : t}</option>
          ))}
        </select>

        <select value={action} onChange={(e) => setAction(e.target.value)} className="px-2 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 cursor-pointer">
          {actions.map((a) => (
            <option key={a} value={a}>{a === 'All' ? 'Action: All' : a}</option>
          ))}
        </select>

        <select value={date} onChange={(e) => setDate(e.target.value)} className="px-2 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 cursor-pointer">
          {dates.map((d) => (
            <option key={d} value={d}>{d === 'All' ? 'Date: All' : d}</option>
          ))}
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-2 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 cursor-pointer">
          <option value="All">Status: All</option>
          <option value="Success">Success</option>
          <option value="Alert">Alert</option>
          <option value="Failed">Failed</option>
          <option value="Info">Info</option>
        </select>

        {hasFilters && (
          <button onClick={resetFilters} className="text-xs font-semibold text-[#2563EB] hover:underline px-1">
            Reset
          </button>
        )}
      </div>

      <div className="mb-2 text-xs font-semibold text-[#94A3B8]">
        Showing <span className="text-[#0F172A]">{filtered.length}</span> of {auditLog.length} entries
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Timestamp</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Admin User</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Action</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[220px]">Resource</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Target Business</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">IP Address</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3.5 py-6 text-center text-xs text-[#94A3B8]">
                    No log entries match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#F8FAFC]/70 transition-colors">
                    <td className="px-3.5 py-2 text-xs text-[#475569] whitespace-nowrap">{entry.timestamp}</td>
                    <td className="px-3.5 py-2 text-xs font-bold text-[#0F172A] whitespace-nowrap">{entry.adminUser}</td>
                    <td className="px-3.5 py-2 text-xs text-[#475569] whitespace-nowrap">{entry.action}</td>
                    <td className="px-3.5 py-2 text-xs text-[#475569]">{entry.resource}</td>
                    <td className="px-3.5 py-2 whitespace-nowrap">
                      <div className="text-xs text-[#475569]">{entry.targetBusiness}</div>
                      <div className="text-[10px] text-[#94A3B8]">{entry.businessType}</div>
                    </td>
                    <td className="px-3.5 py-2 text-xs text-[#475569] whitespace-nowrap">{entry.ip}</td>
                    <td className="px-3.5 py-2 whitespace-nowrap">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusStyles[entry.status]}`}>
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-2 text-[10px] text-[#94A3B8]">
        Audit entries are append-only and cannot be edited or deleted from the console.
      </p>
    </div>
  );
}
