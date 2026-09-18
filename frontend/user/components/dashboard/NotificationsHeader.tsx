"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function NotificationsHeader() {
  return (
    <div className="mb-3 shrink-0">
      <header className="flex items-start justify-between mb-3 py-1">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">
            {STRINGS.DASHBOARD.HEADERS.NOTIFICATIONS.TITLE}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {STRINGS.DASHBOARD.HEADERS.NOTIFICATIONS.SUBTITLE}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="text-xs font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors bg-transparent border-none p-0 cursor-pointer">
            {STRINGS.DASHBOARD.HEADERS.NOTIFICATIONS.MARK_READ}
          </button>
          
          <div className="w-8 h-8 rounded-full bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center font-bold text-xs cursor-pointer shadow-2xs hover:bg-blue-100 transition-colors">
            SW
          </div>
        </div>
      </header>

      {/* Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        <button className="px-3 py-1 bg-[#0066FF] text-white rounded-lg text-xs font-semibold whitespace-nowrap shadow-xs transition-colors">
          {STRINGS.DASHBOARD.HEADERS.NOTIFICATIONS.FILTERS.ALL}
        </button>
        <button className="px-3 py-1 border border-gray-200 text-gray-600 bg-white rounded-lg text-xs font-semibold hover:bg-gray-50 whitespace-nowrap shadow-2xs transition-colors">
          {STRINGS.DASHBOARD.HEADERS.NOTIFICATIONS.FILTERS.APPOINTMENTS}
        </button>
        <button className="px-3 py-1 border border-gray-200 text-gray-600 bg-white rounded-lg text-xs font-semibold hover:bg-gray-50 whitespace-nowrap shadow-2xs transition-colors">
          {STRINGS.DASHBOARD.HEADERS.NOTIFICATIONS.FILTERS.AI}
        </button>
        <button className="px-3 py-1 border border-gray-200 text-gray-600 bg-white rounded-lg text-xs font-semibold hover:bg-gray-50 whitespace-nowrap shadow-2xs transition-colors">
          {STRINGS.DASHBOARD.HEADERS.NOTIFICATIONS.FILTERS.INTEGRATION}
        </button>
        <button className="px-3 py-1 border border-gray-200 text-gray-600 bg-white rounded-lg text-xs font-semibold hover:bg-gray-50 whitespace-nowrap shadow-2xs transition-colors">
          {STRINGS.DASHBOARD.HEADERS.NOTIFICATIONS.FILTERS.SYSTEM}
        </button>
        <button className="px-3 py-1 border border-gray-200 text-gray-600 bg-white rounded-lg text-xs font-semibold hover:bg-gray-50 whitespace-nowrap shadow-2xs transition-colors">
          {STRINGS.DASHBOARD.HEADERS.NOTIFICATIONS.FILTERS.BILLING}
        </button>
      </div>
    </div>
  );
}
