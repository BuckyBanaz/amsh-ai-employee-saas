"use client";
import React from 'react';
import { STRINGS } from '../../../../utils/strings/en';

const services = STRINGS.DASHBOARD.COMPONENTS.SERVICE_CARDS.MOCK_DATA;

export function ServiceCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto scrollbar-hide pb-10">
      {services.map(service => (
        <div key={service.id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.04)] transition-all cursor-pointer">
          
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[16px] font-extrabold text-gray-900 tracking-tight">{service.title}</h3>
            {service.status === 'Active' ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#E6FBF3] text-[#10B981]">
                {STRINGS.DASHBOARD.COMPONENTS.SERVICE_CARDS.STATUS.ACTIVE}
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-500">
                {STRINGS.DASHBOARD.COMPONENTS.SERVICE_CARDS.STATUS.INACTIVE}
              </span>
            )}
          </div>
          
          <p className="text-[13px] font-medium text-gray-500 mb-6">
            {service.description}
          </p>

          <div className="flex items-center gap-6 mt-auto">
            <div className="flex items-center gap-2 text-gray-500">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span className="text-[12px] font-bold">{service.duration}</span>
            </div>
            
            <div className="flex items-center gap-2 text-gray-500">
              <span className="font-bold text-[14px]">€</span>
              <span className="text-[12px] font-bold">{service.price.replace('€', '')}</span>
            </div>

            <div className="flex items-center gap-2 text-gray-500">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span className="text-[12px] font-bold truncate max-w-[120px]">{service.doctors}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
