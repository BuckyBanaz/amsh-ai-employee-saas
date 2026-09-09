"use client";

import React, { useState } from 'react';
import Link from 'next/link';

interface ServiceItem {
  id: string;
  name: string;
  category: string;
  businessId: string;
  businessName: string;
  businessType: string;
  duration: string;
  price: string;
  currency: string;
  status: 'Active' | 'Inactive';
  restriction: string;
  country: string;
  toolCallMapping: string;
  depositRequired: boolean;
}

const mockServices: ServiceItem[] = [
  {
    id: 'srv-01',
    name: 'Initial Oral Examination',
    category: 'Diagnostic & Preventive',
    businessId: 'biz-01',
    businessName: 'Smile Dental Business',
    businessType: 'Dental Clinic',
    duration: '30 min',
    price: '€45.00',
    currency: 'EUR',
    status: 'Active',
    restriction: 'Read-Only Template',
    country: 'Netherlands',
    toolCallMapping: 'check_doctor_availability, book_appointment',
    depositRequired: false
  },
  {
    id: 'srv-02',
    name: 'Professional Dental Cleaning',
    category: 'Hygiene & Care',
    businessId: 'biz-01',
    businessName: 'Amsterdam Dental Care',
    businessType: 'Dental Clinic',
    duration: '45 min',
    price: '€75.00',
    currency: 'EUR',
    status: 'Active',
    restriction: 'Read-Only Template',
    country: 'Netherlands',
    toolCallMapping: 'check_hygienist_slots, reserve_slot',
    depositRequired: false
  },
  {
    id: 'srv-03',
    name: 'Panoramic X-Ray',
    category: 'Radiology',
    businessId: 'biz-02',
    businessName: 'Berlin Health Center',
    businessType: 'Medical Center',
    duration: '15 min',
    price: '€60.00',
    currency: 'EUR',
    status: 'Active',
    restriction: 'Read-Only Template',
    country: 'Germany',
    toolCallMapping: 'schedule_radiology_exam',
    depositRequired: true
  },
  {
    id: 'srv-04',
    name: 'Composite Filling (1 Surface)',
    category: 'Restorative Care',
    businessId: 'biz-02',
    businessName: 'Bella Rosa Ristorante',
    businessType: 'Restaurant',
    duration: '45 min',
    price: '€95.00',
    currency: 'EUR',
    status: 'Active',
    restriction: 'Read-Only Template',
    country: 'Germany',
    toolCallMapping: 'schedule_treatment_session',
    depositRequired: true
  },
  {
    id: 'srv-05',
    name: 'Root Canal Therapy (Molar)',
    category: 'Endodontics',
    businessId: 'biz-03',
    businessName: 'Glow & Shine Salon',
    businessType: 'Beauty Salon',
    duration: '90 min',
    price: '€320.00',
    currency: 'EUR',
    status: 'Active',
    restriction: 'Read-Only Template',
    country: 'France',
    toolCallMapping: 'schedule_endodontic_consultation',
    depositRequired: true
  },
  {
    id: 'srv-06',
    name: 'Tooth Extraction (Simple)',
    category: 'Oral Surgery',
    businessId: 'biz-03',
    businessName: 'FitLife Studio',
    businessType: 'Fitness Studio',
    duration: '45 min',
    price: '£85.00',
    currency: 'GBP',
    status: 'Active',
    restriction: 'Read-Only Template',
    country: 'United Kingdom',
    toolCallMapping: 'book_oral_surgery_slot',
    depositRequired: false
  },
  {
    id: 'srv-07',
    name: 'Implants Consultation',
    category: 'Prosthodontics',
    businessId: 'biz-01',
    businessName: 'Smile Dental Business',
    businessType: 'Dental Clinic',
    duration: '60 min',
    price: '€120.00',
    currency: 'EUR',
    status: 'Inactive',
    restriction: 'Read-Only Template',
    country: 'Netherlands',
    toolCallMapping: 'request_specialist_evaluation',
    depositRequired: true
  },
  {
    id: 'srv-08',
    name: 'Teeth Whitening Home Kit',
    category: 'Cosmetic',
    businessId: 'biz-01',
    businessName: 'Amsterdam Dental Care',
    businessType: 'Dental Clinic',
    duration: '15 min',
    price: '€180.00',
    currency: 'EUR',
    status: 'Active',
    restriction: 'Read-Only Template',
    country: 'Netherlands',
    toolCallMapping: 'order_cosmetic_product',
    depositRequired: true
  }
];

export default function ServicesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [businessFilter, setBusinessFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);

  const filteredServices = mockServices.filter((srv) => {
    const matchesSearch =
      srv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      srv.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      srv.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBusiness = businessFilter === 'All' || srv.businessName === businessFilter;
    const matchesType = typeFilter === 'All' || srv.businessType === typeFilter;
    const matchesCountry = countryFilter === 'All' || srv.country === countryFilter;
    const matchesStatus = statusFilter === 'All' || srv.status === statusFilter;
    return matchesSearch && matchesBusiness && matchesType && matchesCountry && matchesStatus;
  });

  const businesses = Array.from(new Set(mockServices.map((s) => s.businessName)));
  const businessTypes = Array.from(new Set(mockServices.map((s) => s.businessType)));
  const countries = Array.from(new Set(mockServices.map((s) => s.country)));

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-6 md:p-8 animate-in fade-in duration-300 w-full bg-[#F8FAFC]">
      {/* Header */}
      <header className="mb-6 pb-5 border-b border-[#E2E8F0] flex justify-between items-center w-full">
        <div>
          <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight leading-tight">
            Services
          </h1>
          <p className="text-[14px] text-[#475569] mt-1 font-normal">
            Platform-wide service overview.
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
        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[260px]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search service templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-[13px] bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-gray-900"
            />
          </div>

          {/* Business Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-gray-400 uppercase">Business:</span>
            <select
              value={businessFilter}
              onChange={(e) => setBusinessFilter(e.target.value)}
              className="px-3 py-1.5 text-[12px] bg-gray-50 border border-gray-200 rounded-lg font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Businesses</option>
              {businesses.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Business Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-gray-400 uppercase">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-[12px] bg-gray-50 border border-gray-200 rounded-lg font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Types</option>
              {businessTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Country Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-gray-400 uppercase">Country:</span>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="px-3 py-1.5 text-[12px] bg-gray-50 border border-gray-200 rounded-lg font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Countries</option>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-gray-400 uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-[12px] bg-gray-50 border border-gray-200 rounded-lg font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Services Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-[#F9FAFB]">
                  <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Service Name</th>
                  <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Business</th>
                  <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Restriction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[13px]">
                {filteredServices.map((service) => (
                  <tr
                    key={service.id}
                    onClick={() => setSelectedService(service)}
                    className="hover:bg-gray-50/75 transition-colors cursor-pointer group"
                  >
                    {/* Service Name */}
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold text-[12px] flex-shrink-0">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                          </svg>
                        </div>
                        <div>
                          <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {service.name}
                          </span>
                          <div className="text-[11px] text-gray-400">{service.category}</div>
                        </div>
                      </div>
                    </td>

                    {/* Business */}
                    <td className="py-3 px-5">
                      <Link
                        href={`/businesses/${service.businessId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-gray-800 hover:text-blue-600 transition-colors flex items-center gap-1.5"
                      >
                        <span>{service.businessName}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                      </Link>
                      <div className="text-[11px] text-gray-400">{service.businessType} · {service.country}</div>
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-5 text-gray-600 font-medium">
                      <div className="flex items-center gap-1.5">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>{service.duration}</span>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-5 font-bold text-gray-900">
                      {service.price}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                        service.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${service.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        {service.status}
                      </span>
                    </td>

                    {/* Restriction */}
                    <td className="py-3 px-5 text-right">
                      <span className="text-[12px] italic text-gray-400 font-medium bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                        {service.restriction}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Service Template Inspector Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 transition-opacity">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold text-[16px]">
                  €
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Service Template Inspector</span>
                  <h3 className="text-[16px] font-bold text-gray-900">{selectedService.name}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedService(null)}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
              >
                ✕
              </button>
            </div>

            {/* Template Specs */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-[11px] text-gray-500 font-medium">Duration</div>
                <div className="text-[15px] font-bold text-gray-900 mt-1">{selectedService.duration}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-[11px] text-gray-500 font-medium">Price</div>
                <div className="text-[15px] font-bold text-gray-900 mt-1">{selectedService.price}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-[11px] text-gray-500 font-medium">Status</div>
                <div className="text-[15px] font-bold text-emerald-600 mt-1">{selectedService.status}</div>
              </div>
            </div>

            {/* AI Receptionist Integration */}
            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-blue-900 flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 8V4H8"></path>
                    <rect x="4" y="8" width="16" height="12" rx="2"></rect>
                    <path d="M2 14h2"></path>
                    <path d="M20 14h2"></path>
                  </svg>
                  Voice Agent Function Tool Binding
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full uppercase">Active RAG Schema</span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                When a caller asks for &quot;{selectedService.name}&quot;, the receptionist triggers the following deterministic tool pipeline:
              </p>
              <div className="bg-white/80 p-2.5 rounded-lg border border-blue-200 font-mono text-[11px] text-blue-900 overflow-x-auto">
                {selectedService.toolCallMapping}
              </div>
            </div>

            {/* Restriction explanation */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-[12px] text-gray-600">
              <div className="font-bold text-gray-800 mb-1">Platform Multi-Tenant Guardrail</div>
              This service configuration is managed by the tenant admin ({selectedService.businessName}). Platform operators have read-only access to prevent cross-tenant catalog corruption.
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <Link
                href={`/businesses/${selectedService.businessId}`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-lg shadow-sm transition-colors"
              >
                View Business
              </Link>
              <button
                onClick={() => setSelectedService(null)}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-[13px] rounded-lg transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
