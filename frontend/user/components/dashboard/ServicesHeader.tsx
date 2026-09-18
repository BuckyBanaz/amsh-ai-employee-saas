"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function ServicesHeader() {
  return (
    <header className="flex items-center justify-between mb-3 py-1 shrink-0">
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">
          {STRINGS.DASHBOARD.HEADERS.SERVICES.TITLE}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {STRINGS.DASHBOARD.HEADERS.SERVICES.SUBTITLE}
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Add Service Button */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066FF] text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          {STRINGS.DASHBOARD.HEADERS.SERVICES.ADD_BTN}
        </button>

        {/* Profile Circle */}
        <div className="w-8 h-8 rounded-full bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center font-bold text-xs cursor-pointer shadow-2xs hover:bg-blue-100 transition-colors">
          SW
        </div>
      </div>
    </header>
  );
}
