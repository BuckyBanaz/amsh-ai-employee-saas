"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

interface AppointmentsFilterBarProps {
  activeView: 'week' | 'list';
  onViewChange: (view: 'week' | 'list') => void;
  selectedDoctor: string;
  onDoctorChange: (val: string) => void;
  selectedService: string;
  onServiceChange: (val: string) => void;
  selectedStatus: string;
  onStatusChange: (val: string) => void;
  selectedSource: string;
  onSourceChange: (val: string) => void;
  doctors?: Array<{ id: string; name: string }>;
  services?: Array<{ id: string; title: string }>;
}

export function AppointmentsFilterBar({
  activeView,
  onViewChange,
  selectedDoctor,
  onDoctorChange,
  selectedService,
  onServiceChange,
  selectedStatus,
  onStatusChange,
  selectedSource,
  onSourceChange,
  doctors = [],
  services = [],
}: AppointmentsFilterBarProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg px-3.5 py-1.5 shadow-2xs mb-2 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Doctor Filter */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            {STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.LABELS.DOCTOR}
          </label>
          <div className="relative">
            <select
              value={selectedDoctor}
              onChange={(e) => onDoctorChange(e.target.value)}
              className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium rounded-md pl-2.5 pr-7 py-1.5 outline-none focus:border-[#0066FF] min-w-[120px] transition-colors cursor-pointer"
            >
              <option value="">{STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.OPTIONS.ALL_DOCTORS}</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
        </div>

        {/* Service Filter */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            {STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.LABELS.SERVICE}
          </label>
          <div className="relative">
            <select
              value={selectedService}
              onChange={(e) => onServiceChange(e.target.value)}
              className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium rounded-md pl-2.5 pr-7 py-1.5 outline-none focus:border-[#0066FF] min-w-[120px] transition-colors cursor-pointer"
            >
              <option value="">{STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.OPTIONS.ALL_SERVICES}</option>
              {services.map((s) => (
                <option key={s.id} value={s.title}>{s.title}</option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            {STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.LABELS.STATUS}
          </label>
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value)}
              className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium rounded-md pl-2.5 pr-7 py-1.5 outline-none focus:border-[#0066FF] min-w-[120px] transition-colors cursor-pointer"
            >
              <option value="">{STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.OPTIONS.ALL_STATUSES}</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
        </div>

        {/* Source Filter */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            {STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.LABELS.SOURCE}
          </label>
          <div className="relative">
            <select
              value={selectedSource}
              onChange={(e) => onSourceChange(e.target.value)}
              className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium rounded-md pl-2.5 pr-7 py-1.5 outline-none focus:border-[#0066FF] min-w-[120px] transition-colors cursor-pointer"
            >
              <option value="">{STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.OPTIONS.ALL_SOURCES}</option>
              <option value="ai">AI Booked</option>
              <option value="manual">Manual / Dashboard</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex bg-gray-100 p-0.5 rounded-md self-end mb-0.5">
        <button
          type="button"
          onClick={() => onViewChange('week')}
          className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
            activeView === 'week'
              ? 'bg-white text-gray-900 shadow-2xs'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          {STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.VIEWS.WEEK}
        </button>
        <button
          type="button"
          onClick={() => onViewChange('list')}
          className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
            activeView === 'list'
              ? 'bg-white text-gray-900 shadow-2xs'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          {STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.VIEWS.LIST}
        </button>
      </div>
    </div>
  );
}
