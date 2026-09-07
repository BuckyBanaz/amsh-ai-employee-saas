"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function CallLogsHeader() {
  return (
    <header className="flex items-center justify-between mb-4">
      <div>
        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight leading-tight flex items-center gap-2">
          {STRINGS.HEADERS.CALL_LOGS.TITLE}
        </h1>
        <p className="text-[15px] text-gray-500 mt-1">
          {STRINGS.HEADERS.CALL_LOGS.SUBTITLE}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Date Picker (Mock) */}
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-lg text-[13px] font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          Aug 10 - Aug 12, 2026
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>

        {/* Export Button */}
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-lg text-[13px] font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          {STRINGS.COMMON.BUTTONS.EXPORT}
        </button>

        {/* Notification Bell */}
        <button className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        </button>

        {/* Profile Circle */}
        <div className="w-10 h-10 rounded-full bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center font-bold text-sm cursor-pointer hover:bg-blue-100 transition-colors">
          SW
        </div>
      </div>
    </header>
  );
}
