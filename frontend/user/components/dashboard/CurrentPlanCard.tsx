"use client";
import React from 'react';
import { STRINGS } from '../../../../utils/strings/en';

export function CurrentPlanCard() {
  return (
    <div className="bg-white border-2 border-[#0066FF] rounded-2xl p-6 shadow-sm mb-8 relative">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        
        {/* Plan Info */}
        <div className="flex-1 w-full max-w-4xl pr-8">
          <p className="text-[11px] font-bold text-[#0066FF] tracking-widest uppercase mb-2">{STRINGS.DASHBOARD.COMPONENTS.CURRENT_PLAN_CARD.LABEL}</p>
          <h2 className="text-[24px] font-extrabold text-gray-900 tracking-tight mb-1">{STRINGS.DASHBOARD.COMPONENTS.CURRENT_PLAN_CARD.TITLE}</h2>
          <p className="text-[14px] font-medium text-gray-500 mb-6">{STRINGS.DASHBOARD.COMPONENTS.CURRENT_PLAN_CARD.RENEWAL_TEXT}</p>

          <div className="space-y-5 w-full">
            
            {/* AI Minutes Progress */}
            <div className="w-full">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[13px] font-bold text-gray-900">{STRINGS.DASHBOARD.COMPONENTS.CURRENT_PLAN_CARD.STATS.MINUTES_LABEL}</span>
                <span className="text-[12px] font-medium text-gray-500">{STRINGS.DASHBOARD.COMPONENTS.CURRENT_PLAN_CARD.STATS.MINUTES_VALUE}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-[#0066FF] h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>

            {/* Calls Processed Progress */}
            <div className="w-full">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[13px] font-bold text-gray-900">{STRINGS.DASHBOARD.COMPONENTS.CURRENT_PLAN_CARD.STATS.CALLS_LABEL}</span>
                <span className="text-[12px] font-medium text-gray-500">{STRINGS.DASHBOARD.COMPONENTS.CURRENT_PLAN_CARD.STATS.CALLS_VALUE}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-[#10B981] h-2 rounded-full" style={{ width: '42%' }}></div>
              </div>
            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <button className="px-5 py-2.5 bg-white border border-gray-200 text-gray-900 rounded-lg text-[13px] font-bold shadow-sm hover:bg-gray-50 transition-colors">
            {STRINGS.DASHBOARD.COMPONENTS.CURRENT_PLAN_CARD.BTN_CHANGE_PLAN}
          </button>
          <button className="px-5 py-2.5 bg-[#0066FF] text-white rounded-lg text-[13px] font-bold shadow-sm hover:bg-[#0052cc] transition-colors">
            {STRINGS.DASHBOARD.COMPONENTS.CURRENT_PLAN_CARD.BTN_MANAGE_BILLING}
          </button>
        </div>

      </div>
    </div>
  );
}
