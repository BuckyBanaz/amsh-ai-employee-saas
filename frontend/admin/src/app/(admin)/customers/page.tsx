"use client";

import React, { useState } from 'react';
import Link from 'next/link';

interface CustomerRecord {
  id: string;
  name: string;
  businessId: string;
  businessName: string;
  businessType: string;
  maskedContact: string;
  phone: string;
  lastBooking: string;
  appointmentId: string;
  status: 'Active' | 'Inactive';
  totalAppointments: number;
  totalCalls: number;
  city: string;
  country: string;
}

const mockCustomers: CustomerRecord[] = [
  {
    id: 'cust-001',
    name: 'Sarah W.••••',
    businessId: 'biz-01',
    businessName: 'Smile Dental Business',
    businessType: 'Dental Clinic',
    maskedContact: 'sa••••@gmail.com',
    phone: '+31 6 •••••• 42',
    lastBooking: 'Jan 12, 2026',
    appointmentId: 'apt-101',
    status: 'Active',
    totalAppointments: 4,
    totalCalls: 7,
    city: 'Amsterdam',
    country: 'Netherlands'
  },
  {
    id: 'cust-002',
    name: 'Mark de J.••••',
    businessId: 'biz-01',
    businessName: 'Amsterdam Dental Care',
    businessType: 'Dental Clinic',
    maskedContact: 'ma••••@hotmail.com',
    phone: '+31 6 •••••• 89',
    lastBooking: 'Jan 05, 2026',
    appointmentId: 'apt-102',
    status: 'Active',
    totalAppointments: 2,
    totalCalls: 3,
    city: 'Amsterdam',
    country: 'Netherlands'
  },
  {
    id: 'cust-003',
    name: 'Klaus S.••••',
    businessId: 'biz-02',
    businessName: 'Berlin Health Center',
    businessType: 'Medical Center',
    maskedContact: 'kl••••@gmx.de',
    phone: '+49 170 •••••• 15',
    lastBooking: 'Dec 15, 2025',
    appointmentId: 'apt-103',
    status: 'Inactive',
    totalAppointments: 1,
    totalCalls: 2,
    city: 'Berlin',
    country: 'Germany'
  },
  {
    id: 'cust-004',
    name: 'Lisa M.••••',
    businessId: 'biz-02',
    businessName: 'Munich Orthodontics',
    businessType: 'Dental Clinic',
    maskedContact: 'li••••@web.de',
    phone: '+49 171 •••••• 77',
    lastBooking: 'Jan 22, 2026',
    appointmentId: 'apt-104',
    status: 'Active',
    totalAppointments: 6,
    totalCalls: 11,
    city: 'Munich',
    country: 'Germany'
  },
  {
    id: 'cust-005',
    name: 'Pierre D.••••',
    businessId: 'biz-03',
    businessName: 'Paris Dental Studio',
    businessType: 'Dental Clinic',
    maskedContact: 'pi••••@yahoo.fr',
    phone: '+33 6 •••••• 34',
    lastBooking: 'Jan 19, 2026',
    appointmentId: 'apt-105',
    status: 'Active',
    totalAppointments: 3,
    totalCalls: 5,
    city: 'Paris',
    country: 'France'
  },
  {
    id: 'cust-006',
    name: 'Oliver T.••••',
    businessId: 'biz-03',
    businessName: 'London Tooth Business',
    businessType: 'Dental Clinic',
    maskedContact: 'ol••••@outlook.co.uk',
    phone: '+44 7700 •••••• 91',
    lastBooking: 'Jan 28, 2026',
    appointmentId: 'apt-106',
    status: 'Active',
    totalAppointments: 5,
    totalCalls: 8,
    city: 'London',
    country: 'United Kingdom'
  }
];

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<string>('All');
  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);

  const typeOptions = ['All', ...Array.from(new Set(mockCustomers.map(c => c.businessType)))];

  const hasActiveFilters = selectedBusiness !== 'All' || selectedCountry !== 'All' || selectedStatus !== 'All' || selectedType !== 'All' || searchQuery !== '';

  const filteredCustomers = mockCustomers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.maskedContact.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.businessName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBusiness = selectedBusiness === 'All' || c.businessName === selectedBusiness;
    const matchesCountry = selectedCountry === 'All' || c.country === selectedCountry;
    const matchesStatus = selectedStatus === 'All' || c.status === selectedStatus;
    const matchesType = selectedType === 'All' || c.businessType === selectedType;

    return matchesSearch && matchesBusiness && matchesCountry && matchesStatus && matchesType;
  });

  const resetFilters = () => {
    setSelectedBusiness('All');
    setSelectedCountry('All');
    setSelectedStatus('All');
    setSelectedType('All');
    setSearchQuery('');
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-6 md:p-8 animate-in fade-in duration-300 w-full bg-[#F8FAFC]">
      {/* Header */}
      <header className="mb-6 pb-5 border-b border-[#E2E8F0] flex justify-between items-center w-full">
        <div>
          <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight leading-tight">
            Customers
          </h1>
          <p className="text-[14px] text-[#475569] mt-1 font-normal">
            Platform-level customer management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <button className="flex items-center gap-2 border border-[#E2E8F0] rounded-lg py-2 px-3 text-[13px] font-medium text-[#475569] bg-white shadow-sm hover:bg-gray-50 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="8"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>Jan 1 - Jan 30, 2026</span>
          </button>

          {/* Bell Icon */}
          <button className="flex items-center justify-center border border-[#E2E8F0] rounded-full w-9 h-9 text-[#475569] bg-white shadow-sm hover:bg-gray-50 transition-colors relative">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="space-y-5 w-full">
        {/* HIPAA/GDPR Compliance Warning Banner */}
        <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <div className="w-5 h-5 rounded-full bg-[#EF4444] text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[12px] font-bold tracking-wider text-[#991B1B] uppercase">
                Restricted Data Access (HIPAA / GDPR)
              </h3>
              <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded uppercase">
                Privacy Protected
              </span>
            </div>
            <p className="text-[12px] text-[#B91C1C] mt-0.5 leading-relaxed">
              Patient personal health information (PHI) is masked. Platform operators only have access to operational logs needed to ensure system reliability.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1 max-w-md">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Search masked customers or business..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-[13px] bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-gray-900"
              />
            </div>

            <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[12px] font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
          >
            <option value="All">Status: All</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
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
          
          {/* Reset Filters */}
          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-[12px] font-semibold text-[#2563EB] hover:underline px-2 py-1">
              Reset Filters
            </button>
          )}
          </div>

          <div className="text-[12px] font-semibold text-gray-500">
            Showing <span className="text-gray-900 font-bold">{filteredCustomers.length}</span> platform customers
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-[#F9FAFB]">
                  <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Customer Name</th>
                  <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Business</th>
                  <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Contact (Masked)</th>
                  <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Last Booking</th>
                  <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[13px]">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50/75 transition-colors group">
                    {/* Customer Name */}
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-bold text-[12px] flex items-center justify-center flex-shrink-0">
                          {customer.name.charAt(0)}
                        </div>
                        <div>
                          <button
                            onClick={() => setSelectedCustomer(customer)}
                            className="font-bold text-gray-900 hover:text-blue-600 transition-colors text-left font-mono"
                          >
                            {customer.name}
                          </button>
                          <div className="text-[11px] text-gray-400 font-mono">ID: {customer.id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Business */}
                    <td className="py-3 px-5">
                      <Link
                        href={`/businesses/${customer.businessId}`}
                        className="font-medium text-gray-800 hover:text-blue-600 transition-colors flex items-center gap-1.5"
                      >
                        <span>{customer.businessName}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                      </Link>
                      <div className="text-[11px] text-gray-400">{customer.city}, {customer.country}</div>
                    </td>

                    {/* Contact (Masked) */}
                    <td className="py-3 px-5 font-mono text-[12px] text-gray-600">
                      <div>{customer.maskedContact}</div>
                      <div className="text-[11px] text-gray-400">{customer.phone}</div>
                    </td>

                    {/* Last Booking */}
                    <td className="py-3 px-5 text-gray-600">
                      <Link
                        href={`/appointments/${customer.appointmentId}`}
                        className="hover:text-blue-600 font-medium transition-colors"
                      >
                        {customer.lastBooking}
                      </Link>
                      <div className="text-[11px] text-gray-400">{customer.totalAppointments} past appointments</div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                        customer.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${customer.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        {customer.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-5 text-right">
                      <div className="flex items-center justify-end gap-3 text-[12px] font-semibold">
                        <button
                          onClick={() => setSelectedCustomer(customer)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          View Logs
                        </button>
                        <span className="text-gray-300">·</span>
                        <Link
                          href={`/businesses/${customer.businessId}`}
                          className="text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          Contact Business
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Audit Log / Operational Inspector Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end transition-opacity">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-gray-200 p-6 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Audit & Diagnostic Log</span>
                  <h2 className="text-[16px] font-bold text-gray-900 mt-0.5">{selectedCustomer.name}</h2>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                >
                  ✕
                </button>
              </div>

              {/* Privacy Notice in modal */}
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-800 leading-relaxed">
                <strong>HIPAA Restricted:</strong> Unmasking requires two-party operator authorization and is audited in accordance with GDPR Article 32.
              </div>

              {/* Customer Stats */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-[11px] text-gray-500 font-medium">Total Calls</span>
                  <div className="text-[16px] font-bold text-gray-900 mt-1">{selectedCustomer.totalCalls}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-[11px] text-gray-500 font-medium">Appointments</span>
                  <div className="text-[16px] font-bold text-gray-900 mt-1">{selectedCustomer.totalAppointments}</div>
                </div>
              </div>

              {/* Diagnostic Events */}
              <div className="mt-6">
                <h3 className="text-[12px] font-bold text-gray-900 uppercase tracking-wider mb-3">Recent Operational Events</h3>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border border-gray-100 bg-gray-50 text-[12px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">Inbound Twilio Voice Session</span>
                      <span className="text-gray-400 text-[11px]">{selectedCustomer.lastBooking}</span>
                    </div>
                    <p className="text-gray-600 mt-1 text-[11px]">AI Receptionist processed appointment reschedule for {selectedCustomer.businessName}.</p>
                    <div className="mt-2 text-emerald-600 font-mono text-[10px]">Status: 200 OK (Latency 480ms)</div>
                  </div>

                  <div className="p-3 rounded-lg border border-gray-100 bg-gray-50 text-[12px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">SMS Confirmation Dispatched</span>
                      <span className="text-gray-400 text-[11px]">{selectedCustomer.lastBooking}</span>
                    </div>
                    <p className="text-gray-600 mt-1 text-[11px]">Automated notification sent to masked destination {selectedCustomer.phone}.</p>
                    <div className="mt-2 text-emerald-600 font-mono text-[10px]">Delivered via Twilio Gateway</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200 mt-6 flex items-center gap-3">
              <Link
                href={`/appointments/${selectedCustomer.appointmentId}`}
                className="flex-1 py-2 text-center bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-lg shadow-sm transition-colors"
              >
                View Appointment
              </Link>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-[13px] rounded-lg transition-colors"
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
