"use client";
import React from 'react';
import { STRINGS } from '../../../utils/strings/en';

export function AppointmentsTab() {
  const content = STRINGS.DASHBOARD.COMPONENTS.AI_TABS_CONTENT.APPOINTMENTS;

  return (
    <div className="animate-in fade-in duration-500 bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <div className="max-w-3xl">
        <h2 className="text-sm font-bold text-gray-900 mb-1">{content.TITLE}</h2>
        <p className="text-xs text-gray-500 mb-3">{content.DESCRIPTION}</p>
        
        <div className="space-y-3.5">
          
          {/* Status */}
          <div className="bg-[#F0F7FF] border border-[#0066FF]/20 rounded-lg p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0066FF] flex items-center justify-center text-white">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900">{content.STATUS.TITLE}</div>
                <div className="text-[11px] text-[#0066FF] font-medium">{content.STATUS.SUBTITLE}</div>
              </div>
            </div>
            <button className="px-3 py-1 border border-gray-200 bg-white rounded-md text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors">
              {content.STATUS.BTN}
            </button>
          </div>

          <div className="h-px bg-gray-100 w-full"></div>

          {/* Limits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{content.LIMITS.BUFFER}</label>
              <input type="number" defaultValue="15" className="w-full border border-gray-200 rounded-md p-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#0066FF]" />
              <p className="text-[10px] text-gray-400 mt-1">{content.LIMITS.BUFFER_HINT}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{content.LIMITS.NOTICE}</label>
              <input type="number" defaultValue="24" className="w-full border border-gray-200 rounded-md p-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#0066FF]" />
              <p className="text-[10px] text-gray-400 mt-1">{content.LIMITS.NOTICE_HINT}</p>
            </div>
          </div>

          <div className="h-px bg-gray-100 w-full"></div>

          {/* Toggles */}
          <div className="space-y-2.5">
            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <div className="text-xs font-semibold text-gray-900">{content.TOGGLES.CANCEL}</div>
                <div className="text-[11px] text-gray-500">{content.TOGGLES.CANCEL_HINT}</div>
              </div>
              <div className="relative">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#10B981]"></div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <div className="text-xs font-semibold text-gray-900">{content.TOGGLES.RESCHEDULE}</div>
                <div className="text-[11px] text-gray-500">{content.TOGGLES.RESCHEDULE_HINT}</div>
              </div>
              <div className="relative">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#10B981]"></div>
              </div>
            </label>
          </div>

          <div className="pt-2 flex justify-end">
            <button className="px-4 py-1.5 bg-[#0066FF] text-white rounded-md text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors">
              {content.SAVE}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
