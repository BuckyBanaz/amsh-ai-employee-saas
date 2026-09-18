"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function QuickActionsCard() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-4">
      <h2 className="text-xs font-bold text-gray-900 tracking-wider uppercase mb-3">{STRINGS.DASHBOARD.COMPONENTS.QUICK_ACTIONS.TITLE}</h2>
      
      <div className="grid grid-cols-2 gap-2 mb-2.5">
        <button className="py-2 px-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-semibold text-gray-800 transition-colors">
          {STRINGS.DASHBOARD.COMPONENTS.QUICK_ACTIONS.ACTIONS[0]}
        </button>
        <button className="py-2 px-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-semibold text-gray-800 transition-colors">
          {STRINGS.DASHBOARD.COMPONENTS.QUICK_ACTIONS.ACTIONS[1]}
        </button>
        <button className="py-2 px-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-semibold text-gray-800 transition-colors">
          {STRINGS.DASHBOARD.COMPONENTS.QUICK_ACTIONS.ACTIONS[2]}
        </button>
        <button className="py-2 px-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-semibold text-gray-800 transition-colors">
          {STRINGS.DASHBOARD.COMPONENTS.QUICK_ACTIONS.ACTIONS[3]}
        </button>
      </div>

      <button className="w-full py-2 bg-[#F0F7FF] hover:bg-blue-50 text-[#0066FF] rounded-lg text-xs font-bold transition-colors">
        {STRINGS.DASHBOARD.COMPONENTS.QUICK_ACTIONS.BTN_CONFIGURE}
      </button>
    </div>
  );
}
