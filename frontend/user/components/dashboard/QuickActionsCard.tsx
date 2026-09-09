"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function QuickActionsCard() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] p-6 mb-6">
      <h2 className="text-[13px] font-bold text-gray-900 tracking-wider uppercase mb-5">{STRINGS.DASHBOARD.COMPONENTS.QUICK_ACTIONS.TITLE}</h2>
      
      <div className="grid grid-cols-2 gap-3 mb-3">
        <button className="py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-[13px] font-bold text-gray-900 transition-colors">
          {STRINGS.DASHBOARD.COMPONENTS.QUICK_ACTIONS.ACTIONS[0]}
        </button>
        <button className="py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-[13px] font-bold text-gray-900 transition-colors">
          {STRINGS.DASHBOARD.COMPONENTS.QUICK_ACTIONS.ACTIONS[1]}
        </button>
        <button className="py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-[13px] font-bold text-gray-900 transition-colors">
          {STRINGS.DASHBOARD.COMPONENTS.QUICK_ACTIONS.ACTIONS[2]}
        </button>
        <button className="py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-[13px] font-bold text-gray-900 transition-colors">
          {STRINGS.DASHBOARD.COMPONENTS.QUICK_ACTIONS.ACTIONS[3]}
        </button>
      </div>

      <button className="w-full py-2.5 bg-[#F0F7FF] hover:bg-blue-50 text-[#0066FF] rounded-lg text-[13px] font-bold transition-colors">
        {STRINGS.DASHBOARD.COMPONENTS.QUICK_ACTIONS.BTN_CONFIGURE}
      </button>
    </div>
  );
}
