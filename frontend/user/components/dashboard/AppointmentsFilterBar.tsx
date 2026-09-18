"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function AppointmentsFilterBar() {
  return (
    <div className="bg-white border border-gray-100 rounded-lg px-3.5 py-2 shadow-2xs mb-3 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Doctor Filter */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.LABELS.DOCTOR}</label>
          <div className="relative">
            <select className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium rounded-md pl-2.5 pr-7 py-1.5 outline-none focus:border-[#0066FF] min-w-[120px] transition-colors cursor-pointer">
              <option>{STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.OPTIONS.ALL_DOCTORS}</option>
              <option>Dr. Sarah Wilson</option>
              <option>Dr. John Miller</option>
              <option>Dr. Emily Carter</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
        </div>

        {/* Service Filter */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.LABELS.SERVICE}</label>
          <div className="relative">
            <select className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium rounded-md pl-2.5 pr-7 py-1.5 outline-none focus:border-[#0066FF] min-w-[120px] transition-colors cursor-pointer">
              <option>{STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.OPTIONS.ALL_SERVICES}</option>
              <option>Consultation</option>
              <option>Cleaning</option>
              <option>Whitening</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.LABELS.STATUS}</label>
          <div className="relative">
            <select className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium rounded-md pl-2.5 pr-7 py-1.5 outline-none focus:border-[#0066FF] min-w-[120px] transition-colors cursor-pointer">
              <option>{STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.OPTIONS.ALL_STATUSES}</option>
              <option>Confirmed</option>
              <option>Pending</option>
              <option>Completed</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
        </div>

        {/* Source Filter */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.LABELS.SOURCE}</label>
          <div className="relative">
            <select className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium rounded-md pl-2.5 pr-7 py-1.5 outline-none focus:border-[#0066FF] min-w-[120px] transition-colors cursor-pointer">
              <option>{STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.OPTIONS.ALL_SOURCES}</option>
              <option>AI</option>
              <option>Website</option>
              <option>Phone</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex bg-gray-100 p-0.5 rounded-md self-end mb-0.5">
        <button className="px-2.5 py-1 bg-white text-gray-900 rounded text-xs font-semibold shadow-2xs">
          {STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.VIEWS.WEEK}
        </button>
        <button className="px-2.5 py-1 text-gray-500 hover:text-gray-900 rounded text-xs font-semibold transition-colors">
          {STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.VIEWS.LIST}
        </button>
      </div>
    </div>
  );
}
