"use client";
import React, { useState } from 'react';
import Link from 'next/link';

interface AppointmentItem {
  id: string;
  businessId: string;
  businessName: string;
  patientName: string;
  doctorName: string;
  serviceName: string;
  dateTime: string;
  status: 'Confirmed' | 'Completed' | 'Cancelled' | 'No-show';
  statusColor: { bg: string; text: string };
  source: 'AI' | 'Website' | 'Staff' | 'WhatsApp';
  sourceColor: { bg: string; text: string };
  businessType: string;
}

const appointmentsData: AppointmentItem[] = [
  {
    id: 'apt-1',
    businessId: 'b-1',
    businessName: 'Smile Dental Clinic',
    patientName: 'Sarah Wilson',
    doctorName: 'Dr. Evans',
    serviceName: 'Teeth Cleaning',
    dateTime: 'Today, 11:30 AM',
    status: 'Confirmed',
    statusColor: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' },
    source: 'AI',
    sourceColor: { bg: 'bg-[#EFF6FF]', text: 'text-[#2563EB]' },
    businessType: 'Dental Clinic',
  },
  {
    id: 'apt-2',
    businessId: 'b-2',
    businessName: 'Amsterdam Dental Care',
    patientName: 'Mark de Jong',
    doctorName: 'Dr. Wilson',
    serviceName: 'Check-up',
    dateTime: 'Today, 12:00 PM',
    status: 'Completed',
    statusColor: { bg: 'bg-[#DBEAFE]', text: 'text-[#1D4ED8]' },
    source: 'Website',
    sourceColor: { bg: 'bg-purple-50', text: 'text-purple-700' },
    businessType: 'Dental Clinic',
  },
  {
    id: 'apt-3',
    businessId: 'b-3',
    businessName: 'Berlin Health Center',
    patientName: 'Klaus Schmidt',
    doctorName: 'Dr. Schmidt',
    serviceName: 'Root Canal',
    dateTime: 'Today, 02:15 PM',
    status: 'Cancelled',
    statusColor: { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]' },
    source: 'Staff',
    sourceColor: { bg: 'bg-gray-100', text: 'text-gray-700' },
    businessType: 'Medical Center',
  },
  {
    id: 'apt-4',
    businessId: 'b-4',
    businessName: 'Bella Rosa Ristorante',
    patientName: 'Lisa Muller',
    doctorName: 'Dr. Muller',
    serviceName: 'Table Reservation (4p)',
    dateTime: 'Today, 03:00 PM',
    status: 'No-show',
    statusColor: { bg: 'bg-[#FFEDD5]', text: 'text-[#C2410C]' },
    source: 'WhatsApp',
    sourceColor: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    businessType: 'Restaurant',
  },
  {
    id: 'apt-5',
    businessId: 'b-5',
    businessName: 'Glow & Shine Salon',
    patientName: 'Pierre Dubois',
    doctorName: 'Marie Dubois',
    serviceName: 'Hair Styling & Spa',
    dateTime: 'Jan 31, 10:00 AM',
    status: 'Confirmed',
    statusColor: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' },
    source: 'AI',
    sourceColor: { bg: 'bg-[#EFF6FF]', text: 'text-[#2563EB]' },
    businessType: 'Beauty Salon',
  },
  {
    id: 'apt-6',
    businessId: 'b-6',
    businessName: 'FitLife Studio',
    patientName: 'Oliver Twist',
    doctorName: 'James Smith',
    serviceName: 'Personal Fitness Assessment',
    dateTime: 'Jan 31, 11:15 AM',
    status: 'Confirmed',
    statusColor: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' },
    source: 'AI',
    sourceColor: { bg: 'bg-[#EFF6FF]', text: 'text-[#2563EB]' },
    businessType: 'Fitness Studio',
  },
];

export default function AppointmentsPage() {
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
    <div className="flex-1 overflow-y-auto scrollbar-hide p-8 animate-in fade-in duration-500">
      {/* Header */}
      <header className="mb-6 pb-5 border-b border-[#E2E8F0] flex justify-between items-center">
        <div>
          <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight leading-tight">
            Appointments
          </h1>
          <p className="text-[14px] text-[#475569] mt-1 font-normal">
            Platform-wide appointment overview across all business tenants.
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

      {/* Top 5 KPI Summary Cards (From Figma 09 — Appointments) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">
            TODAY&apos;S APPOINTMENTS
          </div>
          <div className="text-[24px] font-bold text-[#0F172A] leading-none mb-1">
            1,284
          </div>
          <div className="text-[11px] font-semibold text-[#10B981]">
            +120 vs yesterday
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">
            COMPLETED
          </div>
          <div className="text-[24px] font-bold text-[#0F172A] leading-none mb-1">
            892
          </div>
          <div className="text-[11px] font-semibold text-[#2563EB]">
            70% daily goal
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">
            CANCELLED
          </div>
          <div className="text-[24px] font-bold text-[#0F172A] leading-none mb-1">
            67
          </div>
          <div className="text-[11px] font-semibold text-[#EF4444]">
            5.2% rate
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">
            NO-SHOW
          </div>
          <div className="text-[24px] font-bold text-[#0F172A] leading-none mb-1">
            34
          </div>
          <div className="text-[11px] font-semibold text-amber-600">
            2.6% rate
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">
            AI BOOKED
          </div>
          <div className="text-[24px] font-bold text-[#0F172A] leading-none mb-1">
            1,012
          </div>
          <div className="text-[11px] font-semibold text-[#10B981]">
            78.8% of bookings
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 mb-6 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative w-[240px]">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#94A3B8]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search patients, doctors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            />
          </div>

          {/* Business Filter */}
          <select
            value={selectedBusiness}
            onChange={(e) => setSelectedBusiness(e.target.value)}
            className="px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[12px] font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
          >
            {businessOptions.map((b) => (
              <option key={b} value={b}>
                {b === 'All' ? 'Business ∨ (All)' : b}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[12px] font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
          >
            <option value="All">Status ∨ (All)</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="No-show">No-show</option>
          </select>

          {/* Source Filter */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-2.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[12px] font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
          >
            <option value="All">Source: All</option>
            <option value="AI">AI Agent</option>
            <option value="Website">Website</option>
            <option value="Staff">Staff / Manual</option>
            <option value="WhatsApp">WhatsApp</option>
          </select>

          {/* Business Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[12px] font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
          >
            {typeOptions.map((t) => (
              <option key={t} value={t}>{t === 'All' ? 'Type: All' : t}</option>
            ))}
          </select>
        </div>

        {/* Clear Filters or New Appointment */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-[12px] font-semibold text-[#2563EB] hover:underline px-2 py-1">
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Appointments Data Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[170px]">
                  Business
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[140px]">
                  Patient
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[130px]">
                  Doctor
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[160px]">
                  Service
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[150px]">
                  Date & Time
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[110px]">
                  Status
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[100px]">
                  Source
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider w-10 text-center">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredAppointments.map((apt) => (
                <tr key={apt.id} className="hover:bg-[#F8FAFC]/70 transition-colors">
                  {/* Business (Connected to Business Detail Page) */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <Link
                      href={`/businesses/${apt.businessId}`}
                      className="text-[13px] font-semibold text-[#0F172A] hover:text-[#2563EB] transition-colors flex items-center gap-1.5"
                    >
                      {apt.businessName}
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#94A3B8]">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                    </Link>
                  </td>

                  {/* Patient */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <Link
                      href={`/appointments/${apt.id}`}
                      className="text-[13px] font-semibold text-[#0F172A] hover:text-[#2563EB] transition-colors"
                    >
                      {apt.patientName}
                    </Link>
                  </td>

                  {/* Doctor */}
                  <td className="px-4 py-3.5 text-[13px] text-[#475569] font-medium whitespace-nowrap">
                    {apt.doctorName}
                  </td>

                  {/* Service */}
                  <td className="px-4 py-3.5 text-[13px] text-[#475569] whitespace-nowrap">
                    <Link
                      href={`/appointments/${apt.id}`}
                      className="hover:text-[#2563EB] transition-colors"
                    >
                      {apt.serviceName}
                    </Link>
                  </td>

                  {/* Date & Time */}
                  <td className="px-4 py-3.5 text-[13px] text-[#0F172A] font-medium whitespace-nowrap">
                    {apt.dateTime}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${apt.statusColor.bg} ${apt.statusColor.text}`}>
                      {apt.status}
                    </span>
                  </td>

                  {/* Source (Interactive AI Link) */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {apt.source === 'AI' ? (
                      <Link
                        href="/receptionists"
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold ${apt.sourceColor.bg} ${apt.sourceColor.text} hover:opacity-80 transition-opacity`}
                        title="Booked by AI Receptionist - Click to view"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="10" rx="2"></rect>
                          <circle cx="12" cy="5" r="2"></circle>
                          <path d="M12 7v4"></path>
                          <line x1="8" y1="16" x2="8" y2="16"></line>
                          <line x1="16" y1="16" x2="16" y2="16"></line>
                        </svg>
                        AI Receptionist
                      </Link>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold ${apt.sourceColor.bg} ${apt.sourceColor.text}`}>
                        {apt.source === 'Website' && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="2" y1="12" x2="22" y2="12"></line>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                          </svg>
                        )}
                        {apt.source === 'Staff' && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                          </svg>
                        )}
                        {apt.source === 'WhatsApp' && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                          </svg>
                        )}
                        {apt.source}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 text-center whitespace-nowrap">
                    <button className="p-1 text-[#94A3B8] hover:text-[#0F172A] hover:bg-gray-100 rounded-md transition-colors">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="19" cy="12" r="1"></circle>
                        <circle cx="5" cy="12" r="1"></circle>
                      </svg>
                    </button>
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
