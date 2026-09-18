"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function CurrentPlanCard() {
  return (
    <div className="bg-white border-2 border-[#0066FF] rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)] mb-3 relative">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        
        {/* Plan Info */}
        <div className="flex-1 w-full max-w-4xl pr-4">
          <p className="text-[10px] font-bold text-[#0066FF] tracking-wider uppercase mb-1">{STRINGS.DASHBOARD.COMPONENTS.CURRENT_PLAN_CARD.LABEL}</p>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight leading-tight">{STRINGS.DASHBOARD.COMPONENTS.CURRENT_PLAN_CARD.TITLE}</h2>
          <p className="text-xs text-gray-500 mb-3">{STRINGS.DASHBOARD.COMPONENTS.CURRENT_PLAN_CARD.RENEWAL_TEXT}</p>

          <div className="space-y-2.5 w-full">
            
            {/* AI Minutes Progress */}
            <div className="w-full">
              <div className="flex justify-between items-end mb-1">
                <span className="text-xs font-semibold text-gray-800">{STRINGS.DASHBOARD.COMPONENTS.CURRENT_PLAN_CARD.STATS.MINUTES_LABEL}</span>
                <span className="text-[11px] font-medium text-gray-500">{STRINGS.DASHBOARD.COMPONENTS.CURRENT_PLAN_CARD.STATS.MINUTES_VALUE}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-[#0066FF] h-1.5 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>

            {/* Calls Processed Progress */}
            <div className="w-full">
              <div className="flex justify-between items-end mb-1">
                <span className="text-xs font-semibold text-gray-800">{STRINGS.DASHBOARD.COMPONENTS.CURRENT_PLAN_CARD.STATS.CALLS_LABEL}</span>
                <span className="text-[11px] font-medium text-gray-500">{STRINGS.DASHBOARD.COMPONENTS.CURRENT_PLAN_CARD.STATS.CALLS_VALUE}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-[#10B981] h-1.5 rounded-full" style={{ width: '42%' }}></div>
              </div>
            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-start">
          <button className="px-3.5 py-1.5 bg-white border border-gray-200 text-gray-900 rounded-md text-xs font-semibold shadow-2xs hover:bg-gray-50 transition-colors">
            {STRINGS.DASHBOARD.COMPONENTS.CURRENT_PLAN_CARD.BTN_CHANGE_PLAN}
          </button>
          <button className="px-3.5 py-1.5 bg-[#0066FF] text-white rounded-md text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors">
            {STRINGS.DASHBOARD.COMPONENTS.CURRENT_PLAN_CARD.BTN_MANAGE_BILLING}
          </button>
        </div>

      </div>
    </div>
  );
}
