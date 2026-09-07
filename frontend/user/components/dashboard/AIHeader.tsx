"use client";
import React from 'react';
import { STRINGS } from '../../../../utils/strings/en';

export function AIHeader() {
  return (
    <header className="flex items-center justify-between mb-4">
      <div>
        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight leading-tight">
          {STRINGS.DASHBOARD.HEADERS.AI.TITLE}
        </h1>
        <p className="text-[15px] text-gray-500 mt-1">
          {STRINGS.DASHBOARD.HEADERS.AI.SUBTITLE}
        </p>
      </div>

      <div className="flex items-center gap-4">
        
        {/* Status Indicator */}
        <div className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-lg text-[11px] font-extrabold tracking-widest text-[#10B981] shadow-sm uppercase">
          <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
          {STRINGS.DASHBOARD.HEADERS.AI.STATUS_ONLINE}
        </div>

        {/* Test AI Button */}
        <button className="flex items-center gap-2 px-5 py-2 bg-[#0066FF] text-white rounded-lg text-[13px] font-bold shadow-sm hover:bg-[#0052cc] transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          {STRINGS.DASHBOARD.HEADERS.AI.BTN_TEST}
        </button>

        {/* Pause AI Button */}
        <button className="flex items-center gap-2 px-4 py-2 border border-[#EF4444] text-[#EF4444] bg-white rounded-lg text-[13px] font-bold shadow-sm hover:bg-red-50 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="4"></circle>
          </svg>
          {STRINGS.DASHBOARD.HEADERS.AI.BTN_PAUSE}
        </button>

        {/* Notification Bell */}
        <button className="w-10 h-10 ml-2 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
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
