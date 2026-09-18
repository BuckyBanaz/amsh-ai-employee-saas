"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

interface TeamHeaderProps {
  onInviteClick: () => void;
}

export function TeamHeader({ onInviteClick }: TeamHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between mb-3 py-1 shrink-0 gap-3">
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">
          {STRINGS.DASHBOARD.HEADERS.TEAM.TITLE}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {STRINGS.DASHBOARD.HEADERS.TEAM.SUBTITLE}
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="text-xs font-medium text-gray-500 hidden md:block">
          Tuesday, August 12, 2026
        </div>

        <div className="w-8 h-8 rounded-full bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center font-bold text-xs cursor-pointer shadow-2xs hover:bg-blue-100 transition-colors hidden sm:flex">
          SW
        </div>
      </div>
    </header>
  );
}
