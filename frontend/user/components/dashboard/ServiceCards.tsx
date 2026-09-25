"use client";
import React, { useEffect, useState } from 'react';
import { STRINGS } from '../../utils/strings/en';
import { DashboardController, ServiceItem } from '../../controllers/dashboard.controller';

export function ServiceCards() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    DashboardController.getServices()
      .then((data) => {
        setServices(data || []);
      })
      .catch((err) => {
        console.error('Failed to load services:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-xs text-gray-400">
        <span className="w-2 h-2 rounded-full bg-[#0066FF] animate-ping mr-2"></span>
        Loading services catalog...
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-10 text-center flex flex-col items-center justify-center max-w-md mx-auto mt-6">
        <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0066FF] flex items-center justify-center mb-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </div>
        <h3 className="text-sm font-bold text-gray-900 mb-1">No services created yet</h3>
        <p className="text-xs text-gray-500 mb-4">
          Add services that your AI receptionist can offer to callers when booking appointments.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto scrollbar-hide pb-6">
      {services.map((service) => (
        <div
          key={service.id}
          className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-start mb-1.5">
              <h3 className="text-sm font-bold text-gray-900 tracking-tight">{service.title}</h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#E6FBF3] text-[#10B981]">
                Active
              </span>
            </div>
            
            <p className="text-xs font-medium text-gray-500 mb-3 line-clamp-2">
              {service.description || 'Standard business service'}
            </p>
          </div>

          <div className="flex items-center gap-4 mt-auto pt-2 border-t border-gray-50">
            <div className="flex items-center gap-1.5 text-gray-500">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span className="text-xs font-semibold">{service.duration_minutes || 30} mins</span>
            </div>
            
            <div className="flex items-center gap-1 text-gray-700">
              <span className="text-xs font-bold">
                {service.price_currency === 'INR' ? '₹' : '$'}
                {service.price_amount ?? '0'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
