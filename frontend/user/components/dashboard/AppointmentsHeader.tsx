"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function AppointmentsHeader() {
  return (
    <div className="flex items-center justify-between mb-1.5 py-0.5">
      <div>
        <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-tight">{STRINGS.HEADERS.APPOINTMENTS.TITLE}</h1>
        <p className="text-[11px] text-gray-500 mt-0.5">{STRINGS.HEADERS.APPOINTMENTS.SUBTITLE}</p>
      </div>
      <div className="flex items-center gap-2.5">
        <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white rounded-lg text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          Aug 10 - Aug 14, 2026
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066FF] text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          {STRINGS.COMMON.BUTTONS.NEW_APPOINTMENT}
        </button>
      </div>
    </div>
  );
}
