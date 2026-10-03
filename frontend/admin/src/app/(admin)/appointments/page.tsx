"use client";
import React, { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/api';
import Link from 'next/link';

interface AppointmentItem {
  id: string;
  businessId: string;
  businessName: string;
  patientName: string;
  doctorName: string;
  serviceName: string;
  dateTime: string;
  status: 'Scheduled' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No-show';
  statusColor: { bg: string; text: string };
  source: 'AI' | 'Website' | 'Staff' | 'WhatsApp';
  sourceColor: { bg: string; text: string };
  businessType: string;
}



const cap = (v: string | null | undefined) => (v ? v.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '');
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '–');
const ago = (iso: string | null) => {
  if (!iso) return 'No calls yet';
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return `${Math.floor(s / 86400)} d ago`;
};
const STATUS_VIEW: Record<string, { label: AppointmentItem['status']; color: { bg: string; text: string } }> = {
  confirmed: { label: 'Confirmed', color: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' } },
  completed: { label: 'Completed', color: { bg: 'bg-[#DBEAFE]', text: 'text-[#1D4ED8]' } },
  cancelled: { label: 'Cancelled', color: { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]' } },
  pending: { label: 'Scheduled', color: { bg: 'bg-[#FFEDD5]', text: 'text-[#C2410C]' } },
  no_show: { label: 'No-show', color: { bg: 'bg-[#FFEDD5]', text: 'text-[#C2410C]' } },
};
const SOURCE_VIEW: Record<string, { label: AppointmentItem['source']; color: { bg: string; text: string } }> = {
  phone: { label: 'AI', color: { bg: 'bg-[#EFF6FF]', text: 'text-[#2563EB]' } },
  playground: { label: 'AI', color: { bg: 'bg-[#EFF6FF]', text: 'text-[#2563EB]' } },
  whatsapp: { label: 'WhatsApp', color: { bg: 'bg-emerald-50', text: 'text-emerald-700' } },
  manual: { label: 'Staff', color: { bg: 'bg-gray-100', text: 'text-gray-700' } },
};

export default function AppointmentsPage() {
  const [appointmentsData, setAppointmentsData] = useState<AppointmentItem[]>([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let alive = true;
    const load = () =>
      adminFetch<{ items: any[] }>('/admin/appointments')
        .then((r) => {
          if (!alive) return;
          setLoadError('');
          setAppointmentsData(
            r.items.map((a) => {
              const st = STATUS_VIEW[a.status] || STATUS_VIEW.pending;
              const src = SOURCE_VIEW[a.source] || SOURCE_VIEW.manual;
              const day = a.date ? new Date(`${a.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
              return {
                id: a.id,
                businessId: a.businessId,
                businessName: a.businessName,
                patientName: a.patient || '–',
                doctorName: a.doctor || '–',
                serviceName: a.service || '–',
                dateTime: [day, a.time].filter(Boolean).join(', ') || when(a.createdAt),
                status: st.label,
                statusColor: st.color,
                source: src.label,
                sourceColor: src.color,
                businessType: a.businessType || 'Business',
              };
            })
          );
        })
        .catch(() => alive && setLoadError('Could not load appointments from the API.'));
    load();
    const t = window.setInterval(() => document.visibilityState === 'visible' && load(), 30000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedSource, setSelectedSource] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');

  const businessOptions = ['All', ...Array.from(new Set(appointmentsData.map(a => a.businessName)))];
  const typeOptions = ['All', ...Array.from(new Set(appointmentsData.map(a => a.businessType)))];

  const hasActiveFilters = selectedBusiness !== 'All' || selectedStatus !== 'All' || selectedSource !== 'All' || selectedType !== 'All' || searchQuery;

  const filteredAppointments = appointmentsData.filter((apt) => {
    const matchesSearch =
      apt.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.businessName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBusiness = selectedBusiness === 'All' || apt.businessName === selectedBusiness;
    const matchesStatus = selectedStatus === 'All' || apt.status === selectedStatus;
    const matchesSource = selectedSource === 'All' || apt.source === selectedSource;
    const matchesType = selectedType === 'All' || apt.businessType === selectedType;

    return matchesSearch && matchesBusiness && matchesStatus && matchesSource && matchesType;
  });

  const resetFilters = () => {
    setSelectedBusiness('All');
    setSelectedStatus('All');
    setSelectedSource('All');
    setSelectedType('All');
    setSearchQuery('');
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      {/* Header */}
      <header className="mb-4 pb-3 border-b border-[#E2E8F0] flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A] tracking-tight leading-tight">
            Appointments
          </h1>
          <p className="text-xs text-[#475569] mt-0.5 font-normal">
            Platform-wide appointment overview across all business tenants.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 border border-[#E2E8F0] rounded-md py-1.5 px-2.5 text-xs font-medium text-[#475569] bg-white shadow-2xs hover:bg-gray-50 transition-colors">
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

      {/* Top 5 KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 mb-3.5">
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-2.5 shadow-2xs">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
            TODAY&apos;S APPOINTMENTS
          </div>
          <div className="text-lg font-bold text-[#0F172A] leading-none mb-0.5">
            1,284
          </div>
          <div className="text-[10px] font-semibold text-[#10B981]">
            +120 vs yest
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-2.5 shadow-2xs">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
            COMPLETED
          </div>
          <div className="text-lg font-bold text-[#0F172A] leading-none mb-0.5">
            892
          </div>
          <div className="text-[10px] font-semibold text-[#2563EB]">
            70% daily goal
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-2.5 shadow-2xs">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
            CANCELLED
          </div>
          <div className="text-lg font-bold text-[#0F172A] leading-none mb-0.5">
            67
          </div>
          <div className="text-[10px] font-semibold text-[#EF4444]">
            5.2% rate
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-2.5 shadow-2xs">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
            NO-SHOW
          </div>
          <div className="text-lg font-bold text-[#0F172A] leading-none mb-0.5">
            34
          </div>
          <div className="text-[10px] font-semibold text-amber-600">
            2.6% rate
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-2.5 shadow-2xs">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
            AI BOOKED
          </div>
          <div className="text-lg font-bold text-[#0F172A] leading-none mb-0.5">
            1,012
          </div>
          <div className="text-[10px] font-semibold text-[#10B981]">
            78.8% of total
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-2.5 mb-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative w-[190px]">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-[#94A3B8]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search patients, doctors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB]"
            />
          </div>

          {/* Business Filter */}
          <select
            value={selectedBusiness}
            onChange={(e) => setSelectedBusiness(e.target.value)}
            className="px-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
          >
            {businessOptions.map((b) => (
              <option key={b} value={b}>
                {b === 'All' ? 'Business: All' : b}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
          >
            <option value="All">Status: All</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="No-Show">No-Show</option>
          </select>

          {/* Source Filter */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
          >
            <option value="All">Source: All</option>
            <option value="AI Receptionist">AI Receptionist</option>
            <option value="Website">Website</option>
            <option value="Staff">Staff / Manual</option>
            <option value="WhatsApp">WhatsApp</option>
          </select>

          {/* Business Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
          >
            {typeOptions.map((t) => (
              <option key={t} value={t}>{t === 'All' ? 'Type: All' : t}</option>
            ))}
          </select>
        </div>

        {/* Clear Filters */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-[11px] font-semibold text-[#2563EB] hover:underline px-1 py-0.5">
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Appointments Data Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[150px]">
                  Business
                </th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[120px]">
                  Patient
                </th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[110px]">
                  Doctor
                </th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[130px]">
                  Service
                </th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[120px]">
                  Date & Time
                </th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[90px]">
                  Status
                </th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[90px]">
                  Source
                </th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider w-8 text-center">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredAppointments.map((apt) => (
                <tr key={apt.id} className="hover:bg-[#F8FAFC]/70 transition-colors">
                  {/* Business (Connected to Business Detail Page) */}
                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                    <Link
                      href={`/businesses/${apt.businessId}`}
                      className="text-xs font-semibold text-[#0F172A] hover:text-[#2563EB] transition-colors flex items-center gap-1"
                    >
                      {apt.businessName}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#94A3B8]">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                    </Link>
                  </td>

                  {/* Patient */}
                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                    <Link
                      href={`/appointments/${apt.id}`}
                      className="text-xs font-semibold text-[#0F172A] hover:text-[#2563EB] transition-colors"
                    >
                      {apt.patientName}
                    </Link>
                  </td>

                  {/* Doctor */}
                  <td className="px-3.5 py-2.5 text-xs text-[#475569] font-medium whitespace-nowrap">
                    {apt.doctorName}
                  </td>

                  {/* Service */}
                  <td className="px-3.5 py-2.5 text-xs text-[#475569] whitespace-nowrap">
                    <Link
                      href={`/appointments/${apt.id}`}
                      className="hover:text-[#2563EB] transition-colors"
                    >
                      {apt.serviceName}
                    </Link>
                  </td>

                  {/* Date & Time */}
                  <td className="px-3.5 py-2.5 text-xs text-[#0F172A] font-medium whitespace-nowrap">
                    {apt.dateTime}
                  </td>

                  {/* Status */}
                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${apt.statusColor.bg} ${apt.statusColor.text}`}>
                      {apt.status}
                    </span>
                  </td>

                  {/* Source (Interactive AI Link) */}
                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                    {apt.source === 'AI' ? (
                      <Link
                        href="/receptionists"
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${apt.sourceColor.bg} ${apt.sourceColor.text} hover:opacity-80 transition-opacity`}
                        title="Booked by AI Receptionist - Click to view"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="10" rx="2"></rect>
                          <circle cx="12" cy="5" r="2"></circle>
                          <path d="M12 7v4"></path>
                          <line x1="8" y1="16" x2="8" y2="16"></line>
                          <line x1="16" y1="16" x2="16" y2="16"></line>
                        </svg>
                        AI Receptionist
                      </Link>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${apt.sourceColor.bg} ${apt.sourceColor.text}`}>
                        {apt.source}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                    <Link
                      href={`/appointments/${apt.id}`}
                      className="p-1 text-[#94A3B8] hover:text-[#0F172A] hover:bg-gray-100 rounded-md transition-colors inline-block"
                      title="View Details"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
