"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';
import { StorageService } from '../../services/storage.service';

interface CallLogsHeaderProps {
  onRefresh?: () => void;
}

export function CallLogsHeader({ onRefresh }: CallLogsHeaderProps) {
  const business = StorageService.getBusiness();
  const user = StorageService.getUser();

  const businessName = business?.name || 'Reception';
  const initials = user?.name
    ? user.name.slice(0, 2).toUpperCase()
    : businessName.slice(0, 2).toUpperCase();

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header className="flex items-center justify-between mb-3 py-1 flex-wrap gap-2">
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight flex items-center gap-2">
          {STRINGS.HEADERS.CALL_LOGS.TITLE}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {STRINGS.HEADERS.CALL_LOGS.SUBTITLE}
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="text-xs font-semibold text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-2xs">
          {todayStr}
        </span>

        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Refresh calls"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white rounded-lg text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            Refresh
          </button>
        )}

        <div className="w-8 h-8 rounded-full bg-[#E0E7FF] text-[#0066FF] flex items-center justify-center font-bold text-xs shadow-2xs">
          {initials}
        </div>
      </div>
    </header>
  );
}
