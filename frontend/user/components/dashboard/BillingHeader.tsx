"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function BillingHeader() {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 shrink-0 gap-4">
      <div>
        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight leading-tight">
          {STRINGS.DASHBOARD.HEADERS.BILLING.TITLE}
        </h1>
        <p className="text-[15px] text-gray-500 mt-1">
          {STRINGS.DASHBOARD.HEADERS.BILLING.SUBTITLE}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Date Display */}
        <div className="text-[14px] font-bold text-gray-600 mr-2">
          Tuesday, August 12, 2026
        </div>

        {/* Notification Dot */}
        <button className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 shadow-sm transition-colors relative">
          <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-black rounded-full"></div>
        </button>

        {/* Profile Circle */}
        <div className="w-10 h-10 rounded-full bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center font-bold text-sm cursor-pointer shadow-sm hover:bg-blue-100 transition-colors">
          SW
        </div>
      </div>
    </header>
  );
}
