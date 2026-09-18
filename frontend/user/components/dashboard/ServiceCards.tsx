"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

const services = STRINGS.DASHBOARD.COMPONENTS.SERVICE_CARDS.MOCK_DATA;

export function ServiceCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto scrollbar-hide pb-6">
      {services.map(service => (
        <div key={service.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between">
          
          <div>
            <div className="flex justify-between items-start mb-1.5">
              <h3 className="text-sm font-bold text-gray-900 tracking-tight">{service.title}</h3>
              {service.status === 'Active' ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#E6FBF3] text-[#10B981]">
                  {STRINGS.DASHBOARD.COMPONENTS.SERVICE_CARDS.STATUS.ACTIVE}
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500">
                  {STRINGS.DASHBOARD.COMPONENTS.SERVICE_CARDS.STATUS.INACTIVE}
                </span>
              )}
            </div>
            
            <p className="text-xs font-medium text-gray-500 mb-3 line-clamp-2">
              {service.description}
            </p>
          </div>

          <div className="flex items-center gap-4 mt-auto pt-2 border-t border-gray-50">
            <div className="flex items-center gap-1.5 text-gray-500">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span className="text-xs font-semibold">{service.duration}</span>
            </div>
            
            <div className="flex items-center gap-1 text-gray-700">
              <span className="font-bold text-xs">€</span>
              <span className="text-xs font-bold">{service.price.replace('€', '')}</span>
            </div>

            <div className="flex items-center gap-1.5 text-gray-500 ml-auto">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span className="text-xs font-medium truncate max-w-[100px]">{service.doctors}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
