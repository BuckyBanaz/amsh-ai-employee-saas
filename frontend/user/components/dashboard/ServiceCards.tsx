"use client";
import React, { useState } from 'react';
import { ServiceItem } from '../../controllers/dashboard.controller';
import { CardGridSkeleton } from '../common/ShimmerSkeleton';

interface ServiceCardsProps {
  services: ServiceItem[];
  loading: boolean;
  onEdit: (service: ServiceItem) => void;
  onDelete: (serviceId: string) => void;
  onAdd: () => void;
}

export function ServiceCards({ services, loading, onEdit, onDelete, onAdd }: ServiceCardsProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (loading) {
    return <CardGridSkeleton count={6} />;
  }

  if (services.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center flex flex-col items-center justify-center max-w-md mx-auto mt-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0066FF] flex items-center justify-center mb-4 shadow-2xs">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </div>
        <h3 className="text-base font-extrabold text-gray-900 tracking-tight mb-1.5">No services configured</h3>
        <p className="text-xs text-gray-500 mb-5 max-w-xs leading-relaxed">
          Add services that your AI receptionist will use to answer pricing inquiries and schedule appointments.
        </p>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0066FF] hover:bg-[#0052cc] text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Your First Service
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
      {services.map((service) => (
        <div
          key={service.id}
          className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between group relative"
        >
          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-sm font-extrabold text-gray-900 tracking-tight group-hover:text-[#0066FF] transition-colors pr-2">
                {service.title}
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6FBF3] text-[#10B981] border border-[#10B981]/20 shrink-0">
                Active
              </span>
            </div>
            
            <p className="text-xs font-medium text-gray-500 mb-4 line-clamp-2 leading-relaxed">
              {service.description || 'Standard clinic consultation and treatment procedure.'}
            </p>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between mt-auto">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-gray-500">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span className="text-xs font-bold text-gray-600">{service.duration_minutes || 30}m</span>
              </div>
              
              <div className="flex items-center gap-0.5 text-gray-900 font-extrabold text-xs">
                <span>{service.price_currency === 'INR' ? '₹' : '$'}</span>
                <span>{service.price_amount ?? '0'}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5">
              {deleteConfirmId === service.id ? (
                <div className="flex items-center gap-1 animate-in fade-in duration-150">
                  <button
                    onClick={() => {
                      onDelete(service.id);
                      setDeleteConfirmId(null);
                    }}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onEdit(service)}
                    title="Edit Service"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-[#0066FF] hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(service.id)}
                    title="Delete Service"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
