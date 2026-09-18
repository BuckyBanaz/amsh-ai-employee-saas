"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function TopBar() {
  return (
    <header className="flex items-center justify-between py-2.5 mb-1">
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight flex items-center gap-1.5">
          {STRINGS.PAGES?.DASHBOARD?.GREETING || "Good morning, Sarah"} <span className="text-lg">👋</span>
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {STRINGS.PAGES?.DASHBOARD?.SUBTITLE || "Here is what is happening at Smile Dental Clinic today."}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-gray-500 hidden sm:inline-block">
          Tuesday, August 12, 2026
        </span>
        <button className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors shadow-xs">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        </button>
        <div className="w-8 h-8 rounded-full bg-[#E0E7FF] text-[#0066FF] flex items-center justify-center text-xs font-bold cursor-pointer">
          SW
        </div>
      </div>
    </header>
  );
}
