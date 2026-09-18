"use client";
import React from 'react';

const verticals = [
  { id: 'v_clinic', name: 'Medical & Dental Clinic', slug: 'clinic', tenants: 84, status: 'Active', tools: 4 },
  { id: 'v_restaurant', name: 'Restaurant & Hospitality', slug: 'restaurant', tenants: 42, status: 'Active', tools: 3 },
  { id: 'v_realestate', name: 'Real Estate Agency', slug: 'real_estate', tenants: 12, status: 'Beta', tools: 2 },
  { id: 'v_hotel', name: 'Hotel & Resorts', slug: 'hotel', tenants: 4, status: 'Beta', tools: 3 },
];

export default function VerticalsPage() {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-300">
      <header className="mb-4 flex justify-between items-end">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A] tracking-tight leading-tight">
            Vertical Templates
          </h1>
          <p className="text-xs text-[#475569] mt-0.5">
            Configure industry-specific AI behaviors, intents, and capabilities.
          </p>
        </div>
        <button className="px-2.5 py-1.5 bg-[#0066FF] hover:bg-blue-600 text-white font-bold text-xs rounded-md shadow-2xs transition-colors flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Create New Vertical
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {verticals.map((v) => (
          <div key={v.id} className="bg-white border border-[#E2E8F0] rounded-lg p-3.5 shadow-2xs hover:border-blue-300 transition-colors group">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#64748B]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 12 12 17 22 12"></polyline><polyline points="2 17 12 22 22 17"></polyline></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">{v.name}</h3>
                  <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">{v.slug}</div>
                </div>
              </div>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                v.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {v.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <div className="p-2 bg-[#F8FAFC] rounded-md border border-[#E2E8F0]">
                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-0.5">Active Tenants</div>
                <div className="text-base font-bold text-[#0F172A]">{v.tenants}</div>
              </div>
              <div className="p-2 bg-[#F8FAFC] rounded-md border border-[#E2E8F0]">
                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-0.5">Assigned Tools</div>
                <div className="text-base font-bold text-[#0F172A]">{v.tools}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="flex-1 py-1.5 bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#334155] font-semibold text-xs rounded-md shadow-2xs transition-colors">
                Edit Config (YAML)
              </button>
              <button className="flex-1 py-1.5 bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#334155] font-semibold text-xs rounded-md shadow-2xs transition-colors">
                Manage Tools
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
