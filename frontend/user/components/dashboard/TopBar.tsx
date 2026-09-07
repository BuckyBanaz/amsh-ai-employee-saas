"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function TopBar() {
  return (
    <header className="flex items-center justify-between py-6">
      <div>
        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight leading-tight flex items-center gap-2">
          {STRINGS.PAGES?.DASHBOARD?.GREETING || "Good morning, Sarah"} <span className="text-2xl">👋</span>
        </h1>
        <p className="text-[15px] text-gray-500 mt-1">
          {STRINGS.PAGES?.DASHBOARD?.SUBTITLE || "Here is what is happening at Smile Dental Clinic today."}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-[13px] font-semibold text-gray-600">
          Tuesday, August 12, 2026
        </span>
        <button className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        </button>
        <div className="w-10 h-10 rounded-full bg-[#E0E7FF] flex items-center justify-center cursor-pointer"></div>
      </div>
    </header>
  );
}
