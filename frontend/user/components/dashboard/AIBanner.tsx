"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function AIBanner() {
  return (
    <div className="w-full bg-[#0066FF] rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-sm">
      {/* Background Decorator */}
      <div className="absolute right-0 top-0 w-64 h-full bg-white/5 skew-x-[-20deg] translate-x-12"></div>
      
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        
        <div className="space-y-4 max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full pl-2 pr-3 py-1">
              <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-white">{STRINGS.DASHBOARD.COMPONENTS.AI_BANNER.STATUS}</span>
            </div>
            <span className="text-sm font-semibold text-blue-50">{STRINGS.DASHBOARD.COMPONENTS.AI_BANNER.STATUS_TEXT}</span>
          </div>
          
          <p className="text-lg md:text-[21px] font-medium text-white leading-snug">
            {STRINGS.DASHBOARD.COMPONENTS.AI_BANNER.DESCRIPTION}
          </p>
          
          <div className="flex flex-wrap items-center gap-8 pt-2">
            <div>
              <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1">{STRINGS.DASHBOARD.COMPONENTS.AI_BANNER.STATS.CALLS}</p>
              <p className="text-3xl font-extrabold">37</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1">{STRINGS.DASHBOARD.COMPONENTS.AI_BANNER.STATS.APPOINTMENTS}</p>
              <p className="text-3xl font-extrabold">8</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1">{STRINGS.DASHBOARD.COMPONENTS.AI_BANNER.STATS.RESOLUTION}</p>
              <p className="text-3xl font-extrabold">84%</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 md:self-end pt-4 md:pt-0">
          <button className="px-6 py-2.5 rounded-lg bg-white text-[#0066FF] font-bold text-sm hover:bg-blue-50 transition-colors shadow-sm">
            {STRINGS.DASHBOARD.COMPONENTS.AI_BANNER.BTN_TEST}
          </button>
          <button className="px-6 py-2.5 rounded-lg border-2 border-white/30 text-white font-bold text-sm hover:bg-white/10 transition-colors">
            {STRINGS.DASHBOARD.COMPONENTS.AI_BANNER.BTN_CONFIGURE}
          </button>
        </div>

      </div>
    </div>
  );
}
