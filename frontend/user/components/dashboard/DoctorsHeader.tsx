"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

interface DoctorsHeaderProps {
  onAddStaff?: () => void;
}

export function DoctorsHeader({ onAddStaff }: DoctorsHeaderProps) {
  return (
    <header className="flex items-center justify-between mb-4 py-1 flex-wrap gap-2">
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight flex items-center gap-2">
          {STRINGS.DASHBOARD.HEADERS.DOCTORS.TITLE}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {STRINGS.DASHBOARD.HEADERS.DOCTORS.SUBTITLE}
        </p>
      </div>

      {onAddStaff && (
        <button
          onClick={onAddStaff}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066FF] text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors cursor-pointer active:scale-95"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          {STRINGS.DASHBOARD.HEADERS.DOCTORS.ADD_BTN}
        </button>
      )}
    </header>
  );
}
