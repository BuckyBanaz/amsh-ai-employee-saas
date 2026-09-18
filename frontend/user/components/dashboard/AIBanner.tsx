"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function AIBanner() {
  return (
    <div className="w-full bg-[#0066FF] rounded-xl px-5 py-3.5 text-white relative overflow-hidden shadow-sm">
      {/* Background Decorator */}
      <div className="absolute right-0 top-0 w-48 h-full bg-white/5 skew-x-[-20deg] translate-x-10 pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">

        {/* Left: Status + Description */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md rounded-full pl-2 pr-2.5 py-0.5 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-white">{STRINGS.DASHBOARD.COMPONENTS.AI_BANNER.STATUS}</span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-blue-50 truncate">
            {STRINGS.DASHBOARD.COMPONENTS.AI_BANNER.STATUS_TEXT} — {STRINGS.DASHBOARD.COMPONENTS.AI_BANNER.DESCRIPTION}
          </p>
        </div>

        {/* Center: Stats */}
        <div className="flex items-center justify-around md:justify-center gap-4 sm:gap-6 py-2 md:py-0 border-y md:border-y-0 border-white/10">
          <div className="text-center">
            <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider">{STRINGS.DASHBOARD.COMPONENTS.AI_BANNER.STATS.CALLS}</p>
            <p className="text-lg sm:text-xl font-extrabold leading-tight">37</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider">{STRINGS.DASHBOARD.COMPONENTS.AI_BANNER.STATS.APPOINTMENTS}</p>
            <p className="text-lg sm:text-xl font-extrabold leading-tight">8</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider">{STRINGS.DASHBOARD.COMPONENTS.AI_BANNER.STATS.RESOLUTION}</p>
            <p className="text-lg sm:text-xl font-extrabold leading-tight">84%</p>
          </div>
        </div>

        {/* Right: Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/ai?test=true"
            className="flex-1 md:flex-initial text-center px-3.5 py-1.5 rounded-lg bg-white text-[#0066FF] font-bold text-xs hover:bg-blue-50 transition-colors shadow-sm"
          >
            {STRINGS.DASHBOARD.COMPONENTS.AI_BANNER.BTN_TEST}
          </a>
          <a
            href="/ai"
            className="flex-1 md:flex-initial text-center px-3.5 py-1.5 rounded-lg border border-white/30 text-white font-bold text-xs hover:bg-white/10 transition-colors"
          >
            {STRINGS.DASHBOARD.COMPONENTS.AI_BANNER.BTN_CONFIGURE}
          </a>
        </div>

      </div>
    </div>
  );
}
