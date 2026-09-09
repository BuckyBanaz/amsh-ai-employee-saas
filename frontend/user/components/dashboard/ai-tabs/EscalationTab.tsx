"use client";
import React from 'react';
import { STRINGS } from '../../../utils/strings/en';

export function EscalationTab() {
  const content = STRINGS.DASHBOARD.COMPONENTS.AI_TABS_CONTENT.ESCALATION;
  
  // We can merge the triggers data from STRINGS with our state if needed, but for now we just use the STRINGS mock.
  const triggers = content.TRIGGERS;
  return (
    <div className="animate-in fade-in duration-500 bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
      <div className="max-w-3xl">
        <h2 className="text-[18px] font-bold text-gray-900 mb-2">{content.TITLE}</h2>
        <p className="text-[13px] text-gray-500 mb-8">{content.DESCRIPTION}</p>

        <div className="space-y-8">
          
          {/* Transfer Number */}
          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-2">{content.FALLBACK.LABEL}</label>
            <div className="relative md:w-2/3">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[13px]">+1</span>
              <input type="text" defaultValue="(555) 123-4567" className="w-full border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-[13px] font-bold text-gray-800 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all" />
            </div>
            <p className="text-[11px] text-gray-500 mt-2">{content.FALLBACK.HINT}</p>
          </div>

          <div className="h-px bg-gray-100 w-full"></div>

          {/* Checklist */}
          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-4">{content.TRIGGERS_LABEL}</label>
            <div className="space-y-3">
              {triggers.map(trigger => (
                <label key={trigger.id} className="flex items-start gap-3 cursor-pointer group">
                  <div className="pt-0.5">
                    <input type="checkbox" defaultChecked={trigger.active} className="w-4 h-4 text-[#EF4444] rounded border-gray-300 focus:ring-[#EF4444]" />
                  </div>
                  <span className={`text-[13px] font-medium leading-snug ${trigger.active ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
                    {trigger.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button className="px-6 py-2.5 bg-[#EF4444] text-white rounded-lg text-[13px] font-bold shadow-sm hover:bg-red-600 transition-colors">
              {content.SAVE}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
