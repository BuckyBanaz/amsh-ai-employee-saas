"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function AppointmentsFilterBar() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm mb-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Doctor Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 tracking-wider">{STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.LABELS.DOCTOR}</label>
          <div className="relative">
            <select className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-semibold rounded-lg pl-3 pr-8 py-2 outline-none focus:border-[#0066FF] min-w-[140px] transition-colors cursor-pointer">
              <option>{STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.OPTIONS.ALL_DOCTORS}</option>
              <option>Dr. Sarah Wilson</option>
              <option>Dr. John Miller</option>
              <option>Dr. Emily Carter</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
        </div>

        {/* Service Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 tracking-wider">{STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.LABELS.SERVICE}</label>
          <div className="relative">
            <select className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-semibold rounded-lg pl-3 pr-8 py-2 outline-none focus:border-[#0066FF] min-w-[140px] transition-colors cursor-pointer">
              <option>{STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.OPTIONS.ALL_SERVICES}</option>
              <option>Consultation</option>
              <option>Cleaning</option>
              <option>Whitening</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 tracking-wider">{STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.LABELS.STATUS}</label>
          <div className="relative">
            <select className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-semibold rounded-lg pl-3 pr-8 py-2 outline-none focus:border-[#0066FF] min-w-[140px] transition-colors cursor-pointer">
              <option>{STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.OPTIONS.ALL_STATUSES}</option>
              <option>Confirmed</option>
              <option>Pending</option>
              <option>Completed</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
        </div>

        {/* Source Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 tracking-wider">{STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.LABELS.SOURCE}</label>
          <div className="relative">
            <select className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-semibold rounded-lg pl-3 pr-8 py-2 outline-none focus:border-[#0066FF] min-w-[140px] transition-colors cursor-pointer">
              <option>{STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.OPTIONS.ALL_SOURCES}</option>
              <option>AI</option>
              <option>Website</option>
              <option>Phone</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex bg-gray-100 p-1 rounded-lg self-end mb-1">
        <button className="px-4 py-1.5 bg-white text-gray-900 rounded-md text-[13px] font-bold shadow-sm">
          {STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.VIEWS.WEEK}
        </button>
        <button className="px-4 py-1.5 text-gray-500 hover:text-gray-900 rounded-md text-[13px] font-bold transition-colors">
          {STRINGS.DASHBOARD.HEADERS.APPOINTMENTS_FILTER.VIEWS.LIST}
        </button>
      </div>
    </div>
  );
}
