"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function PatientsHeader() {
  return (
    <header className="flex items-center justify-between mb-3 py-1">
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight flex items-center gap-2">
          {STRINGS.HEADERS.PATIENTS.TITLE}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {STRINGS.HEADERS.PATIENTS.SUBTITLE}
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="text-xs font-medium text-gray-500 hidden sm:inline-block">
          Tuesday, August 12, 2026
        </span>
        <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white rounded-lg text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          {STRINGS.COMMON.BUTTONS.EXPORT}
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066FF] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          {STRINGS.COMMON.BUTTONS.ADD_PATIENT}
        </button>
      </div>
    </header>
  );
}
