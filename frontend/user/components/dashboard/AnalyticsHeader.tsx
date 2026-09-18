"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function AnalyticsHeader() {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between mb-3 py-1 shrink-0 gap-3">
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">
          {STRINGS.DASHBOARD.HEADERS.ANALYTICS.TITLE}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {STRINGS.DASHBOARD.HEADERS.ANALYTICS.SUBTITLE}
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Date Filter Pills */}
        <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg p-0.5 shadow-2xs">
          <button className="px-2.5 py-1 text-[11px] font-semibold text-gray-500 hover:text-gray-900 rounded-md transition-colors">{STRINGS.DASHBOARD.HEADERS.ANALYTICS.FILTERS.TODAY}</button>
          <button className="px-2.5 py-1 text-[11px] font-semibold text-gray-500 hover:text-gray-900 rounded-md transition-colors">{STRINGS.DASHBOARD.HEADERS.ANALYTICS.FILTERS.DAYS_7}</button>
          <button className="px-2.5 py-1 text-[11px] font-semibold bg-[#F0F7FF] text-[#0066FF] rounded-md shadow-2xs transition-colors">{STRINGS.DASHBOARD.HEADERS.ANALYTICS.FILTERS.DAYS_30}</button>
          <button className="px-2.5 py-1 text-[11px] font-semibold text-gray-500 hover:text-gray-900 rounded-md transition-colors">{STRINGS.DASHBOARD.HEADERS.ANALYTICS.FILTERS.DAYS_90}</button>
          <button className="px-2.5 py-1 text-[11px] font-semibold text-gray-500 hover:text-gray-900 rounded-md transition-colors">{STRINGS.DASHBOARD.HEADERS.ANALYTICS.FILTERS.CUSTOM}</button>
        </div>

        {/* Export Button */}
        <button className="px-3 py-1.5 bg-[#0066FF] text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors">
          {STRINGS.DASHBOARD.HEADERS.ANALYTICS.BTN_EXPORT}
        </button>
      </div>
    </header>
  );
}
