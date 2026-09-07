"use client";
import React from 'react';
import { STRINGS } from '../../../../utils/strings/en';

export interface StaffCardProps {
  initials: string;
  name: string;
  specialty: string;
  role: 'DOCTOR' | 'RECEPTIONIST';
  status: 'Available' | 'On Leave';
  weeklySchedule: string;
  rating: string;
  contact: string;
  services: string[];
}

export function StaffCard({
  initials,
  name,
  specialty,
  role,
  status,
  weeklySchedule,
  rating,
  contact,
  services,
}: StaffCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex flex-col">
      
      {/* Header Info */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-full bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center font-bold text-lg shadow-sm">
            {initials}
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-gray-900 leading-tight">{name}</h2>
            <p className="text-[13px] text-gray-500 font-medium mt-0.5">{specialty}</p>
          </div>
        </div>
        
        {/* Role Badge */}
        {role === 'DOCTOR' ? (
          <span className="inline-flex items-center px-2 py-1 rounded bg-[#F0F7FF] text-[10px] font-extrabold uppercase tracking-widest text-[#0066FF]">
            {STRINGS.DASHBOARD.COMPONENTS.STAFF_CARD.ROLES.DOCTOR}
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-[10px] font-extrabold uppercase tracking-widest text-gray-500">
            {STRINGS.DASHBOARD.COMPONENTS.STAFF_CARD.ROLES.RECEPTIONIST}
          </span>
        )}
      </div>

      <div className="w-full h-px bg-gray-100 mb-5"></div>

      {/* Stats List */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-gray-500">{STRINGS.DASHBOARD.COMPONENTS.STAFF_CARD.LABELS.STATUS}</span>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${status === 'Available' ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`}></div>
            <span className={`text-[13px] font-bold ${status === 'Available' ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
              {status}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-gray-500">{STRINGS.DASHBOARD.COMPONENTS.STAFF_CARD.LABELS.WEEKLY_SCHEDULE}</span>
          <span className="text-[13px] font-bold text-gray-900">{weeklySchedule}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-gray-500">{STRINGS.DASHBOARD.COMPONENTS.STAFF_CARD.LABELS.RATING}</span>
          <div className="flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <span className="text-[13px] font-bold text-gray-900">{rating}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-gray-500">{STRINGS.DASHBOARD.COMPONENTS.STAFF_CARD.LABELS.CONTACT}</span>
          <span className="text-[13px] font-medium text-gray-500">{contact}</span>
        </div>
      </div>

      {/* Assigned Services */}
      <div className="mb-6 flex-1">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">{STRINGS.DASHBOARD.COMPONENTS.STAFF_CARD.LABELS.ASSIGNED_SERVICES}</h4>
        <div className="flex flex-wrap gap-2">
          {services.map((service, idx) => (
            <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded bg-white border border-gray-200 text-[11px] font-bold text-gray-600 shadow-sm">
              {service}
            </span>
          ))}
        </div>
      </div>

      <div className="w-full h-px bg-gray-100 mb-5"></div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 mt-auto">
        <button className="py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
          {STRINGS.DASHBOARD.COMPONENTS.STAFF_CARD.BUTTONS.VIEW_SCHEDULE}
        </button>
        <button className="flex items-center justify-center gap-2 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          {STRINGS.DASHBOARD.COMPONENTS.STAFF_CARD.BUTTONS.EDIT}
        </button>
      </div>

    </div>
  );
}
