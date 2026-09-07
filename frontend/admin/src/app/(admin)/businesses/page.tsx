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

export default function BusinessesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBusinesses = businessesData.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-8 animate-in fade-in duration-500">
      {/* Header */}
      <header className="mb-6 pb-5 border-b border-[#E2E8F0] flex justify-between items-center">
        <div>
          <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight leading-tight">
            Businesses
          </h1>
          <p className="text-[14px] text-[#475569] mt-1 font-normal">
            Manage all businesses using the Amsh platform.
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

      {/* Filter & Action Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 mb-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
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
              placeholder="Search businesses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            />
          </div>

          {/* Filter Pills */}
          {['Country', 'Plan', 'Status', 'AI Status', 'Signup Date', 'Business Type'].map((filter) => (
            <button
              key={filter}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[12px] font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors"
            >
              <span>{filter}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          ))}
        </div>

        {/* Add Business Button */}
        <button className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg text-[13px] font-semibold shadow-sm transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Business
        </button>
      </div>

      {/* Businesses Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[150px]">
                  Business Name
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[120px]">
                  Type
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[140px]">
                  Owner
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[70px]">
                  Country
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[120px]">
                  AI Receptionist
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[110px]">
                  Plan
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[130px]">
                  Usage (API)
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[90px]">
                  Status
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[110px]">
                  Created
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider w-10 text-center">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredBusinesses.map((b) => (
                <tr key={b.id} className="hover:bg-[#F8FAFC]/70 transition-colors">
                  {/* Name */}
                  <td className="px-4 py-3.5 text-[14px] font-semibold text-[#0F172A] whitespace-nowrap">
                    <Link href={`/businesses/${b.id}`} className="hover:text-[#2563EB] transition-colors">
                      {b.name}
                    </Link>
                  </td>

                  {/* Type Badge */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-semibold ${b.typeColor.bg} ${b.typeColor.text}`}>
                      {b.type}
                    </span>
                  </td>

                  {/* Owner */}
                  <td className="px-4 py-3.5 text-[13px] text-[#475569] whitespace-nowrap">
                    {b.owner}
                  </td>

                  {/* Country */}
                  <td className="px-4 py-3.5 text-[13px] text-[#475569] whitespace-nowrap">
                    {b.country}
                  </td>

                  {/* AI Receptionist */}
                  <td className="px-4 py-3.5 text-[13px] font-medium whitespace-nowrap">
                    <Link
                      href="/receptionists"
                      className="text-[#2563EB] hover:underline flex items-center gap-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                      {b.aiReceptionist}
                    </Link>
                  </td>

                  {/* Plan */}
                  <td className="px-4 py-3.5 text-[13px] font-medium text-[#475569] whitespace-nowrap">
                    {b.plan}
                  </td>

                  {/* Usage (API) Progress Bar */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-[100px] h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2563EB] rounded-full transition-all duration-300"
                          style={{ width: `${b.usagePercent}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-semibold ${b.statusColor.bg} ${b.statusColor.text}`}>
                      {b.status}
                    </span>
                  </td>

                  {/* Created Date */}
                  <td className="px-4 py-3.5 text-[13px] text-[#94A3B8] whitespace-nowrap">
                    {b.created}
                  </td>

                  {/* Actions Menu */}
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
