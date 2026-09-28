"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

interface TeamHeaderProps {
  onInviteClick: () => void;
}

export function TeamHeader({ onInviteClick }: TeamHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 py-1 shrink-0">
      <div>
        <h1 className="text-xl font-extrabold text-gray-900 tracking-tight leading-tight">
          {STRINGS.DASHBOARD.HEADERS.TEAM.TITLE}
        </h1>
        <p className="text-xs text-gray-500 font-medium mt-0.5">
          {STRINGS.DASHBOARD.HEADERS.TEAM.SUBTITLE}
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onInviteClick}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066FF] text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors cursor-pointer"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          {STRINGS.DASHBOARD.TEAM.INVITE_BTN}
        </button>
      </div>
    </header>
  );
}
