"use client";
import React, { useState } from 'react';
import Link from 'next/link';

interface BusinessItem {
  id: string;
  name: string;
  type: string;
  typeColor: { bg: string; text: string };
  owner: string;
  country: string;
  aiReceptionist: string;
  plan: string;
  usagePercent: number;
  status: 'Active' | 'Suspended' | 'Pending';
  statusColor: { bg: string; text: string };
  created: string;
}

const businessesData: BusinessItem[] = [
  {
    id: 'b-1',
    name: 'Smile Dental Clinic',
    type: 'Dental Clinic',
    typeColor: { bg: 'bg-[#DBEAFE]', text: 'text-[#1D4ED8]' },
    owner: 'Dr. Sarah Wilson',
    country: 'NL',
    aiReceptionist: 'Sarah',
    plan: 'Professional',
    usagePercent: 78,
    status: 'Active',
    statusColor: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' },
    created: '2025-10-13',
  },
  {
    id: 'b-2',
    name: 'Amsterdam Dental Care',
    type: 'Dental Clinic',
    typeColor: { bg: 'bg-[#DBEAFE]', text: 'text-[#1D4ED8]' },
    owner: 'Dr. Mark de Jong',
    country: 'NL',
    aiReceptionist: 'Anna',
    plan: 'Business',
    usagePercent: 92,
    status: 'Active',
    statusColor: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' },
    created: '2025-11-05',
  },
  {
    id: 'b-3',
    name: 'Berlin Health Center',
    type: 'Medical Center',
    typeColor: { bg: 'bg-[#EDE9FE]', text: 'text-[#6D28D9]' },
    owner: 'Dr. Klaus Schmidt',
    country: 'DE',
    aiReceptionist: 'Dieter',
    plan: 'Starter',
    usagePercent: 12,
    status: 'Suspended',
    statusColor: { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]' },
    created: '2025-08-15',
  },
  {
    id: 'b-4',
    name: 'Bella Rosa Ristorante',
    type: 'Restaurant',
    typeColor: { bg: 'bg-[#FFEDD5]', text: 'text-[#C2410C]' },
    owner: 'Marco Rossi',
    country: 'IT',
    aiReceptionist: 'Sofia',
    plan: 'Professional',
    usagePercent: 45,
    status: 'Active',
    statusColor: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' },
    created: '2025-12-01',
  },
  {
    id: 'b-5',
    name: 'Glow & Shine Salon',
    type: 'Beauty Salon',
    typeColor: { bg: 'bg-[#FCE7F3]', text: 'text-[#BE185D]' },
    owner: 'Marie Dubois',
    country: 'FR',
    aiReceptionist: 'Chloé',
    plan: 'Business',
    usagePercent: 60,
    status: 'Active',
    statusColor: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' },
    created: '2025-12-20',
  },
  {
    id: 'b-6',
    name: 'FitLife Studio',
    type: 'Fitness Studio',
    typeColor: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' },
    owner: 'James Smith',
    country: 'GB',
    aiReceptionist: 'Oliver',
    plan: 'Starter',
    usagePercent: 85,
    status: 'Pending',
    statusColor: { bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]' },
    created: '2026-01-02',
  },
];

// Derive filter options dynamically from data
const countries = ['All', ...Array.from(new Set(businessesData.map(b => b.country)))];
const plans = ['All', ...Array.from(new Set(businessesData.map(b => b.plan)))];
const statuses = ['All', 'Active', 'Suspended', 'Pending'];
const businessTypes = ['All', ...Array.from(new Set(businessesData.map(b => b.type)))];

const selectClass = "px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[12px] font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 cursor-pointer";

export default function BusinessesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [selectedPlan, setSelectedPlan] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  const hasActiveFilters = selectedCountry !== 'All' || selectedPlan !== 'All' || selectedStatus !== 'All' || selectedType !== 'All' || searchQuery;

  const filteredBusinesses = businessesData.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCountry = selectedCountry === 'All' || b.country === selectedCountry;
    const matchesPlan = selectedPlan === 'All' || b.plan === selectedPlan;
    const matchesStatus = selectedStatus === 'All' || b.status === selectedStatus;
    const matchesType = selectedType === 'All' || b.type === selectedType;
    return matchesSearch && matchesCountry && matchesPlan && matchesStatus && matchesType;
  });

  const resetFilters = () => {
    setSelectedCountry('All');
    setSelectedPlan('All');
    setSelectedStatus('All');
    setSelectedType('All');
    setSearchQuery('');
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      {/* Header */}
      <header className="mb-4 pb-3 border-b border-[#E2E8F0] flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A] tracking-tight leading-tight">
            Businesses
          </h1>
          <p className="text-xs text-[#475569] mt-0.5 font-normal">
            Manage all businesses using the Amsh platform.
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

      {/* Filter & Action Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-2.5 mb-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative w-[180px]">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-[#94A3B8]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search businesses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB]"
            />
          </div>

          {/* Country Filter */}
          <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)} className={selectClass}>
            {countries.map(c => <option key={c} value={c}>{c === 'All' ? 'Country: All' : c}</option>)}
          </select>

          {/* Plan Filter */}
          <select value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)} className={selectClass}>
            {plans.map(p => <option key={p} value={p}>{p === 'All' ? 'Plan: All' : p}</option>)}
          </select>

          {/* Status Filter */}
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className={selectClass}>
            {statuses.map(s => <option key={s} value={s}>{s === 'All' ? 'Status: All' : s}</option>)}
          </select>

          {/* Business Type Filter */}
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className={selectClass}>
            {businessTypes.map(t => <option key={t} value={t}>{t === 'All' ? 'Type: All' : t}</option>)}
          </select>

          {/* Reset */}
          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-[11px] font-semibold text-[#2563EB] hover:underline px-1">
              Reset
            </button>
          )}
        </div>

        {/* Add Business Button */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-2xs transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Business
        </button>
      </div>

      {/* Results Count */}
      <div className="mb-2 text-[11px] font-semibold text-[#94A3B8]">
        Showing <span className="text-[#0F172A]">{filteredBusinesses.length}</span> of {businessesData.length} businesses
      </div>

      {/* Businesses Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[140px]">Business Name</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[110px]">Type</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[120px]">Owner</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[70px]">Country</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[110px]">AI Receptionist</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[90px]">Plan</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[110px]">Usage (API)</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[80px]">Status</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[90px]">Created</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider w-8 text-center">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredBusinesses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3.5 py-8 text-center text-xs text-[#94A3B8]">
                    No businesses match your filters.
                  </td>
                </tr>
              ) : (
                filteredBusinesses.map((b) => (
                  <tr key={b.id} className="hover:bg-[#F8FAFC]/70 transition-colors">
                    <td className="px-3.5 py-2.5 text-xs font-semibold text-[#0F172A] whitespace-nowrap">
                      <Link href={`/businesses/${b.id}`} className="hover:text-[#2563EB] transition-colors">
                        {b.name}
                      </Link>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${b.typeColor.bg} ${b.typeColor.text}`}>
                        {b.type}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-xs text-[#475569] whitespace-nowrap">{b.owner}</td>
                    <td className="px-3.5 py-2.5 text-xs text-[#475569] whitespace-nowrap">{b.country}</td>
                    <td className="px-3.5 py-2.5 text-xs font-medium whitespace-nowrap">
                      <Link href="/receptionists" className="text-[#2563EB] hover:underline flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                        {b.aiReceptionist}
                      </Link>
                    </td>
                    <td className="px-3.5 py-2.5 text-xs font-medium text-[#475569] whitespace-nowrap">{b.plan}</td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <div className="w-[80px] h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${b.usagePercent >= 90 ? 'bg-red-500' : b.usagePercent >= 70 ? 'bg-amber-500' : 'bg-[#2563EB]'}`}
                            style={{ width: `${b.usagePercent}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[#94A3B8]">{b.usagePercent}%</span>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${b.statusColor.bg} ${b.statusColor.text}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-[11px] text-[#94A3B8] whitespace-nowrap">{b.created}</td>
                    <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                      <button className="p-1 text-[#94A3B8] hover:text-[#0F172A] hover:bg-gray-100 rounded-md transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="1"></circle>
                          <circle cx="19" cy="12" r="1"></circle>
                          <circle cx="5" cy="12" r="1"></circle>
                        </svg>
                      </button>
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

