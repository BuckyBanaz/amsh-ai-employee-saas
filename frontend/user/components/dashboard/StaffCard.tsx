"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export interface StaffCardProps {
  id?: string;
  initials: string;
  name: string;
  specialty: string;
  role: 'DOCTOR' | 'RECEPTIONIST';
  status: 'Available' | 'On Leave';
  weeklySchedule: string;
  rating: string;
  contact: string;
  services: string[];
  service_ids?: string[];
  email?: string;
  phone?: string;
  onEdit?: (staff: StaffCardProps) => void;
  onViewSchedule?: (staff: StaffCardProps) => void;
}

export function StaffCard(props: StaffCardProps) {
  const {
    initials,
    name,
    specialty,
    role,
    status,
    weeklySchedule,
    rating,
    contact,
    services,
    onEdit,
    onViewSchedule,
  } = props;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col hover:border-gray-200 transition-all">
      {/* Header Info */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center font-bold text-xs shadow-2xs flex-shrink-0">
            {initials}
          </div>
          <div>
            <h2 className="text-xs font-bold text-gray-900 leading-tight">{name}</h2>
            <p className="text-[11px] text-gray-500 font-medium">{specialty}</p>
          </div>
        </div>

        {/* Role Badge */}
        {role === 'DOCTOR' ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#F0F7FF] text-[9px] font-extrabold uppercase tracking-wider text-[#0066FF]">
            {STRINGS.DASHBOARD.COMPONENTS.STAFF_CARD.ROLES.DOCTOR}
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-[9px] font-extrabold uppercase tracking-wider text-gray-500">
            {STRINGS.DASHBOARD.COMPONENTS.STAFF_CARD.ROLES.RECEPTIONIST}
          </span>
        )}
      </div>

      <div className="w-full h-px bg-gray-100 mb-3"></div>

      {/* Stats List */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{STRINGS.DASHBOARD.COMPONENTS.STAFF_CARD.LABELS.STATUS}</span>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${status === 'Available' ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`}></div>
            <span className={`text-xs font-semibold ${status === 'Available' ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
              {status}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{STRINGS.DASHBOARD.COMPONENTS.STAFF_CARD.LABELS.WEEKLY_SCHEDULE}</span>
          <span className="text-xs font-semibold text-gray-900">{weeklySchedule}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{STRINGS.DASHBOARD.COMPONENTS.STAFF_CARD.LABELS.RATING}</span>
          <div className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <span className="text-xs font-semibold text-gray-900">{rating}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{STRINGS.DASHBOARD.COMPONENTS.STAFF_CARD.LABELS.CONTACT}</span>
          <span className="text-xs font-medium text-gray-500 truncate max-w-[170px]" title={contact}>{contact}</span>
        </div>
      </div>

      {/* Assigned Services */}
      <div className="mb-3 flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {STRINGS.DASHBOARD.COMPONENTS.STAFF_CARD.LABELS.ASSIGNED_SERVICES} ({services.length})
          </h4>
          {onEdit && (
            <button
              onClick={() => onEdit(props)}
              className="text-[10px] text-[#0066FF] hover:underline font-semibold cursor-pointer"
            >
              + Edit Services
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {services.length > 0 ? (
            services.map((service, idx) => (
              <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50/70 border border-blue-100 text-[10px] font-medium text-[#0066FF]">
                {service}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-gray-400 italic">No services assigned yet</span>
          )}
        </div>
      </div>

      <div className="w-full h-px bg-gray-100 mb-3"></div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 mt-auto">
        <button
          onClick={() => onViewSchedule && onViewSchedule(props)}
          className="py-1.5 bg-white border border-gray-200 rounded-md text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          {STRINGS.DASHBOARD.COMPONENTS.STAFF_CARD.BUTTONS.VIEW_SCHEDULE}
        </button>
        <button
          onClick={() => onEdit && onEdit(props)}
          className="flex items-center justify-center gap-1.5 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          {STRINGS.DASHBOARD.COMPONENTS.STAFF_CARD.BUTTONS.EDIT}
        </button>
      </div>
    </div>
  );
}
