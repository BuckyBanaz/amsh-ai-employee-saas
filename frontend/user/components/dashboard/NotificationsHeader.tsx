"use client";
import React from 'react';
import { STRINGS } from '../../../../utils/strings/en';

export function NotificationsHeader() {
  return (
    <div className="mb-6 shrink-0">
      <header className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight leading-tight">
            {STRINGS.DASHBOARD.HEADERS.NOTIFICATIONS.TITLE}
          </h1>
          <p className="text-[15px] text-gray-500 mt-1">
            {STRINGS.DASHBOARD.HEADERS.NOTIFICATIONS.SUBTITLE}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button className="text-[13px] font-bold text-[#0066FF] hover:text-[#0052cc] transition-colors bg-transparent border-none p-0 cursor-pointer">
            {STRINGS.DASHBOARD.HEADERS.NOTIFICATIONS.MARK_READ}
          </button>
          
          <div className="w-10 h-10 rounded-full bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center font-bold text-sm cursor-pointer shadow-sm hover:bg-blue-100 transition-colors ml-4">
            SW
          </div>
        </div>
      </header>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
        <button className="px-4 py-1.5 bg-[#0066FF] text-white rounded-lg text-[13px] font-bold whitespace-nowrap shadow-sm transition-colors">
          {STRINGS.DASHBOARD.HEADERS.NOTIFICATIONS.FILTERS.ALL}
        </button>
        <button className="px-4 py-1.5 border border-gray-200 text-gray-600 bg-white rounded-lg text-[13px] font-bold hover:bg-gray-50 whitespace-nowrap shadow-sm transition-colors">
          {STRINGS.DASHBOARD.HEADERS.NOTIFICATIONS.FILTERS.APPOINTMENTS}
        </button>
        <button className="px-4 py-1.5 border border-gray-200 text-gray-600 bg-white rounded-lg text-[13px] font-bold hover:bg-gray-50 whitespace-nowrap shadow-sm transition-colors">
          {STRINGS.DASHBOARD.HEADERS.NOTIFICATIONS.FILTERS.AI}
        </button>
        <button className="px-4 py-1.5 border border-gray-200 text-gray-600 bg-white rounded-lg text-[13px] font-bold hover:bg-gray-50 whitespace-nowrap shadow-sm transition-colors">
          {STRINGS.DASHBOARD.HEADERS.NOTIFICATIONS.FILTERS.INTEGRATION}
        </button>
        <button className="px-4 py-1.5 border border-gray-200 text-gray-600 bg-white rounded-lg text-[13px] font-bold hover:bg-gray-50 whitespace-nowrap shadow-sm transition-colors">
          {STRINGS.DASHBOARD.HEADERS.NOTIFICATIONS.FILTERS.SYSTEM}
        </button>
        <button className="px-4 py-1.5 border border-gray-200 text-gray-600 bg-white rounded-lg text-[13px] font-bold hover:bg-gray-50 whitespace-nowrap shadow-sm transition-colors">
          {STRINGS.DASHBOARD.HEADERS.NOTIFICATIONS.FILTERS.BILLING}
        </button>
      </div>
    </div>
  );
}
