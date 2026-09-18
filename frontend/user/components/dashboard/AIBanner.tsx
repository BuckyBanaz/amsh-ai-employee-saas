"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function AIBanner() {
  return (
    <div className="w-full bg-[#0066FF] rounded-xl px-5 py-3.5 text-white relative overflow-hidden shadow-sm">
      {/* Background Decorator */}
      <div className="absolute right-0 top-0 w-48 h-full bg-white/5 skew-x-[-20deg] translate-x-10 pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">

        {/* Left: Status + Description */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md rounded-full pl-2 pr-2.5 py-0.5 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-white">{STRINGS.DASHBOARD.COMPONENTS.AI_BANNER.STATUS}</span>
          </div>
          <p className="text-sm font-medium text-blue-50 truncate">{STRINGS.DASHBOARD.COMPONENTS.AI_BANNER.STATUS_TEXT} — {STRINGS.DASHBOARD.COMPONENTS.AI_BANNER.DESCRIPTION}</p>
        </div>

        {/* Center: Stats */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider">{STRINGS.DASHBOARD.COMPONENTS.AI_BANNER.STATS.CALLS}</p>
            <p className="text-xl font-extrabold leading-tight">37</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider">{STRINGS.DASHBOARD.COMPONENTS.AI_BANNER.STATS.APPOINTMENTS}</p>
            <p className="text-xl font-extrabold leading-tight">8</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider">{STRINGS.DASHBOARD.COMPONENTS.AI_BANNER.STATS.RESOLUTION}</p>
            <p className="text-xl font-extrabold leading-tight">84%</p>
          </div>
        </div>

        {/* Right: Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button className="px-4 py-1.5 rounded-lg bg-white text-[#0066FF] font-bold text-xs hover:bg-blue-50 transition-colors shadow-sm">
            {STRINGS.DASHBOARD.COMPONENTS.AI_BANNER.BTN_TEST}
          </button>
          <button className="px-4 py-1.5 rounded-lg border border-white/30 text-white font-bold text-xs hover:bg-white/10 transition-colors">
            {STRINGS.DASHBOARD.COMPONENTS.AI_BANNER.BTN_CONFIGURE}
          </button>
        </div>

      </div>
    </div>
  );
}
