"use client";
import React from 'react';
import { STRINGS } from '../../../utils/strings/en';

export function EscalationTab() {
  const content = STRINGS.DASHBOARD.COMPONENTS.AI_TABS_CONTENT.ESCALATION;
  const triggers = content.TRIGGERS;

  return (
    <div className="animate-in fade-in duration-500 bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <div className="max-w-3xl">
        <h2 className="text-sm font-bold text-gray-900 mb-1">{content.TITLE}</h2>
        <p className="text-xs text-gray-500 mb-3">{content.DESCRIPTION}</p>

        <div className="space-y-3.5">
          
          {/* Transfer Number */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{content.FALLBACK.LABEL}</label>
            <div className="relative sm:w-2/3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">+1</span>
              <input type="text" defaultValue="(555) 123-4567" className="w-full border border-gray-200 rounded-md py-1.5 pl-8 pr-3 text-xs font-medium text-gray-800 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all" />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{content.FALLBACK.HINT}</p>
          </div>

          <div className="h-px bg-gray-100 w-full"></div>

          {/* Checklist */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">{content.TRIGGERS_LABEL}</label>
            <div className="space-y-2">
              {triggers.map(trigger => (
                <label key={trigger.id} className="flex items-center gap-2.5 cursor-pointer group">
                  <input type="checkbox" defaultChecked={trigger.active} className="w-3.5 h-3.5 text-[#EF4444] rounded border-gray-300 focus:ring-[#EF4444]" />
                  <span className={`text-xs leading-snug ${trigger.active ? 'text-gray-900 font-semibold' : 'text-gray-500 font-medium'}`}>
                    {trigger.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button className="px-4 py-1.5 bg-[#EF4444] text-white rounded-md text-xs font-semibold shadow-xs hover:bg-red-600 transition-colors">
              {content.SAVE}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
