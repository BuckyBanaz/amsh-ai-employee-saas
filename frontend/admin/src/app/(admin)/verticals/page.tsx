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
    <div className="flex-1 overflow-y-auto scrollbar-hide p-8 animate-in fade-in duration-500">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight leading-tight">
            Vertical Templates
          </h1>
          <p className="text-[15px] text-gray-500 mt-1 font-medium">
            Configure industry-specific AI behaviors, intents, and capabilities.
          </p>
        </div>
        <button className="px-4 py-2 bg-[#0066FF] hover:bg-blue-600 text-white font-bold text-[13px] rounded-lg shadow-sm transition-colors flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Create New Vertical
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {verticals.map((v) => (
          <div key={v.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:border-blue-200 transition-colors group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 12 12 17 22 12"></polyline><polyline points="2 17 12 22 22 17"></polyline></svg>
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-gray-900">{v.name}</h3>
                  <div className="text-[12px] font-medium text-gray-500 uppercase tracking-widest">{v.slug}</div>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                v.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              }`}>
                {v.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">Active Tenants</div>
                <div className="text-[18px] font-black text-gray-900">{v.tenants}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">Assigned Tools</div>
                <div className="text-[18px] font-black text-gray-900">{v.tools}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="flex-1 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-[13px] rounded-lg transition-colors">
                Edit Config (YAML)
              </button>
              <button className="flex-1 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-[13px] rounded-lg transition-colors">
                Manage Tools
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
