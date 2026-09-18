"use client";
import React from 'react';
import { STRINGS } from '../../../utils/strings/en';

export function SecuritySettings() {
  const content = STRINGS.DASHBOARD.SETTINGS.SECURITY;

  return (
    <div className="space-y-3 max-w-4xl pb-6">
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <h3 className="text-sm font-bold text-gray-900 tracking-tight mb-0.5">{content.CHANGE_PASSWORD.TITLE}</h3>
        <p className="text-xs text-gray-500 mb-3">{content.CHANGE_PASSWORD.DESCRIPTION}</p>
        
        <div className="space-y-2.5 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{content.CHANGE_PASSWORD.CURRENT}</label>
            <input type="password" placeholder="••••••••" className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{content.CHANGE_PASSWORD.NEW}</label>
            <input type="password" placeholder="••••••••" className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{content.CHANGE_PASSWORD.CONFIRM}</label>
            <input type="password" placeholder="••••••••" className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]" />
          </div>
          <button className="px-3.5 py-1.5 bg-gray-900 text-white rounded-md text-xs font-semibold shadow-xs hover:bg-black transition-colors mt-1">
            {content.CHANGE_PASSWORD.UPDATE}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 tracking-tight mb-0.5">{content.TFA.TITLE}</h3>
            <p className="text-xs text-gray-500">{content.TFA.DESCRIPTION}</p>
          </div>
          <button className="px-3.5 py-1.5 bg-white border border-gray-200 text-gray-900 rounded-md text-xs font-semibold hover:bg-gray-50 transition-colors ml-4 shrink-0 shadow-2xs">
            {content.TFA.ENABLE}
          </button>
        </div>
      </div>
    </div>
  );
}
