"use client";
import React from 'react';
import { STRINGS } from '../../../../utils/strings/en';

export function AnalyticsHeader() {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 shrink-0 gap-4">
      <div>
        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight leading-tight">
          {STRINGS.DASHBOARD.HEADERS.ANALYTICS.TITLE}
        </h1>
        <p className="text-[15px] text-gray-500 mt-1">
          {STRINGS.DASHBOARD.HEADERS.ANALYTICS.SUBTITLE}
        </p>
      </div>

      <div className="flex items-center gap-4">
        
        {/* Date Filter Pills */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
          <button className="px-3 py-1.5 text-[12px] font-bold text-gray-500 hover:text-gray-900 rounded-md transition-colors">{STRINGS.DASHBOARD.HEADERS.ANALYTICS.FILTERS.TODAY}</button>
          <button className="px-3 py-1.5 text-[12px] font-bold text-gray-500 hover:text-gray-900 rounded-md transition-colors">{STRINGS.DASHBOARD.HEADERS.ANALYTICS.FILTERS.DAYS_7}</button>
          <button className="px-3 py-1.5 text-[12px] font-bold bg-[#F0F7FF] text-[#0066FF] rounded-md shadow-sm transition-colors">{STRINGS.DASHBOARD.HEADERS.ANALYTICS.FILTERS.DAYS_30}</button>
          <button className="px-3 py-1.5 text-[12px] font-bold text-gray-500 hover:text-gray-900 rounded-md transition-colors">{STRINGS.DASHBOARD.HEADERS.ANALYTICS.FILTERS.DAYS_90}</button>
          <button className="px-3 py-1.5 text-[12px] font-bold text-gray-500 hover:text-gray-900 rounded-md transition-colors">{STRINGS.DASHBOARD.HEADERS.ANALYTICS.FILTERS.CUSTOM}</button>
        </div>

        {/* Export Button */}
        <button className="px-5 py-2.5 bg-[#0066FF] text-white rounded-lg text-[13px] font-bold shadow-sm hover:bg-[#0052cc] transition-colors">
          {STRINGS.DASHBOARD.HEADERS.ANALYTICS.BTN_EXPORT}
        </button>

      </div>
    </header>
  );
}
