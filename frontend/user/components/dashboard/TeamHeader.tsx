"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

interface TeamHeaderProps {
  onInviteClick: () => void;
}

export function TeamHeader({ onInviteClick }: TeamHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 shrink-0 gap-4">
      <div>
        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight leading-tight">
          {STRINGS.DASHBOARD.HEADERS.TEAM.TITLE}
        </h1>
        <p className="text-[15px] text-gray-500 mt-1">
          {STRINGS.DASHBOARD.HEADERS.TEAM.SUBTITLE}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Date Display */}
        <div className="text-[14px] font-bold text-gray-600 mr-2 hidden md:block">
          Tuesday, August 12, 2026
        </div>

        {/* Profile Circle */}
        <div className="w-10 h-10 rounded-full bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center font-bold text-sm cursor-pointer shadow-sm hover:bg-blue-100 transition-colors hidden sm:flex">
          SW
        </div>
      </div>
    </header>
  );
}
