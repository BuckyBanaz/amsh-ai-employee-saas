"use client";
import React, { useState } from 'react';
import Link from 'next/link';

interface BusinessUser {
  id: string;
  name: string;
  email: string;
  business: string;
  role: 'Owner' | 'Admin' | 'Manager' | 'Doctor' | 'Receptionist';
  status: 'Active' | 'Suspended' | 'Pending';
  statusColor: { bg: string; text: string };
  lastActive: string;
}

const usersData: BusinessUser[] = [
  {
    id: 'u-1',
    name: 'Dr. Sarah Wilson',
    email: 'sarah.w@smile.nl',
    business: 'Smile Dental Business',
    role: 'Owner',
    status: 'Active',
    statusColor: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' },
    lastActive: '10 min ago',
  },
  {
    id: 'u-2',
    name: 'Dr. Mark de Jong',
    email: 'mark@amsterdamcare.nl',
    business: 'Amsterdam Dental Care',
    role: 'Owner',
    status: 'Active',
    statusColor: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' },
    lastActive: '1 hour ago',
  },
  {
    id: 'u-3',
    name: 'Dr. Klaus Schmidt',
    email: 'klaus@berlin-health.de',
    business: 'Berlin Health Center',
    role: 'Admin',
    status: 'Suspended',
    statusColor: { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]' },
    lastActive: '3 days ago',
  },
  {
    id: 'u-4',
    name: 'Dr. Lisa Muller',
    email: 'lisa.m@munichortho.de',
    business: 'Munich Orthodontics',
    role: 'Manager',
    status: 'Active',
    statusColor: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' },
    lastActive: '30 min ago',
  },
  {
    id: 'u-5',
    name: 'Dr. Pierre Dubois',
    email: 'p.dubois@parisdent.fr',
    business: 'Paris Dental Studio',
    role: 'Doctor',
    status: 'Active',
    statusColor: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' },
    lastActive: 'Just now',
  },
  {
    id: 'u-6',
    name: 'Emma Watson',
    email: 'emma@londontooth.co.uk',
    business: 'London Tooth Business',
    role: 'Receptionist',
    status: 'Pending',
    statusColor: { bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]' },
    lastActive: 'Never',
  },
];

export default function BusinessUsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<string>('All');
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);

  const businessOptions = [
    'All',
    'Smile Dental Business',
    'Amsterdam Dental Care',
    'Berlin Health Center',
    'Munich Orthodontics',
    'Paris Dental Studio',
    'London Tooth Business',
  ];

  const filteredUsers = usersData.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.business.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBusiness =
      selectedBusiness === 'All' || user.business === selectedBusiness;

    return matchesSearch && matchesBusiness;
  });

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-8 animate-in fade-in duration-500">
      {/* Header */}
      <header className="mb-6 pb-5 border-b border-[#E2E8F0] flex justify-between items-center">
        <div>
          <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight leading-tight">
            Business Users
          </h1>
          <p className="text-[14px] text-[#475569] mt-1 font-normal">
            All users across platform tenants.
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
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            />
          </div>

          {/* Filter by Business Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowBusinessDropdown(!showBusinessDropdown)}
              className="flex items-center gap-2 px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[13px] font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors"
            >
              <span>{selectedBusiness === 'All' ? 'Filter by Business' : selectedBusiness}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            {showBusinessDropdown && (
              <div className="absolute left-0 mt-1.5 w-60 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-20 py-1 max-h-60 overflow-y-auto">
                {businessOptions.map((biz) => (
                  <button
                    key={biz}
                    onClick={() => {
                      setSelectedBusiness(biz);
                      setShowBusinessDropdown(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-[13px] transition-colors ${
                      selectedBusiness === biz
                        ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold'
                        : 'text-[#0F172A] hover:bg-gray-50 font-normal'
                    }`}
                  >
                    {biz}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Invite User Button */}
        <button className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg text-[13px] font-semibold shadow-sm transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Invite User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[180px]">
                  Name
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[180px]">
                  Email
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[180px]">
                  Business
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[120px]">
                  Role
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[100px]">
                  Status
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[120px]">
                  Last Active
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider w-12 text-center">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[#F8FAFC]/70 transition-colors">
                  {/* Name */}
                  <td className="px-4 py-3.5 text-[14px] font-semibold text-[#0F172A] whitespace-nowrap">
                    <Link href={`/business-users/${user.id}`} className="hover:text-[#2563EB] transition-colors">
                      {user.name}
                    </Link>
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3.5 text-[13px] text-[#475569] whitespace-nowrap">
                    {user.email}
                  </td>

                  {/* Business */}
                  <td className="px-4 py-3.5 text-[13px] text-[#475569] whitespace-nowrap">
                    {user.business}
                  </td>

                  {/* Role Badge */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#EFF6FF] text-[#2563EB]">
                      {user.role}
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-semibold ${user.statusColor.bg} ${user.statusColor.text}`}>
                      {user.status}
                    </span>
                  </td>

                  {/* Last Active */}
                  <td className="px-4 py-3.5 text-[13px] text-[#94A3B8] whitespace-nowrap">
                    {user.lastActive}
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
