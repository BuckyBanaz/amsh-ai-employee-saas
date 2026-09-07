"use client";
import React from 'react';
import { STRINGS } from '../../../../utils/strings/en';

export function ServicesHeader() {
  return (
    <header className="flex items-center justify-between mb-8 shrink-0">
      <div>
        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight leading-tight">
          {STRINGS.DASHBOARD.HEADERS.SERVICES.TITLE}
        </h1>
        <p className="text-[15px] text-gray-500 mt-1">
          {STRINGS.DASHBOARD.HEADERS.SERVICES.SUBTITLE}
        </p>
      </div>

      <div className="flex items-center gap-4">
        
        {/* Add Service Button */}
        <button className="flex items-center gap-2 px-5 py-2.5 bg-[#0066FF] text-white rounded-lg text-[13px] font-bold shadow-sm hover:bg-[#0052cc] transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          {STRINGS.DASHBOARD.HEADERS.SERVICES.ADD_BTN}
        </button>

        {/* Profile Circle */}
        <div className="w-10 h-10 rounded-full bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center font-bold text-sm cursor-pointer shadow-sm hover:bg-blue-100 transition-colors ml-2">
          SW
        </div>
      </div>
    </header>
  );
}
