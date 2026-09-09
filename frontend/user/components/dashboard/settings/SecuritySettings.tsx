"use client";
import React from 'react';
import { STRINGS } from '../../../utils/strings/en';

export function SecuritySettings() {
  const content = STRINGS.DASHBOARD.SETTINGS.SECURITY;

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <h3 className="text-[16px] font-extrabold text-gray-900 tracking-tight mb-1">{content.CHANGE_PASSWORD.TITLE}</h3>
        <p className="text-[13px] font-medium text-gray-500 mb-6">{content.CHANGE_PASSWORD.DESCRIPTION}</p>
        
        <div className="space-y-5 max-w-md">
          <div>
            <label className="block text-[12px] font-bold text-gray-900 mb-2">{content.CHANGE_PASSWORD.CURRENT}</label>
            <input type="password" placeholder="••••••••" className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-gray-900 mb-2">{content.CHANGE_PASSWORD.NEW}</label>
            <input type="password" placeholder="••••••••" className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-gray-900 mb-2">{content.CHANGE_PASSWORD.CONFIRM}</label>
            <input type="password" placeholder="••••••••" className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]" />
          </div>
          <button className="px-5 py-2.5 bg-gray-900 text-white rounded-lg text-[13px] font-bold shadow-sm hover:bg-black transition-colors mt-2">
            {content.CHANGE_PASSWORD.UPDATE}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-[16px] font-extrabold text-gray-900 tracking-tight mb-1">{content.TFA.TITLE}</h3>
            <p className="text-[13px] font-medium text-gray-500">{content.TFA.DESCRIPTION}</p>
          </div>
          <button className="px-5 py-2.5 bg-white border border-gray-200 text-gray-900 rounded-lg text-[13px] font-bold hover:bg-gray-50 transition-colors ml-4 shrink-0">
            {content.TFA.ENABLE}
          </button>
        </div>
      </div>
    </div>
  );
}
