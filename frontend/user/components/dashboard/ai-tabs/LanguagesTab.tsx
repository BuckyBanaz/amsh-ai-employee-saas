"use client";
import React from 'react';
import { STRINGS } from '../../../utils/strings/en';

export function LanguagesTab() {
  const content = STRINGS.DASHBOARD.COMPONENTS.AI_TABS_CONTENT.LANGUAGES;
  const languages = content.SUPPORTED.OPTIONS;

  return (
    <div className="animate-in fade-in duration-500 bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
      <div className="max-w-3xl">
        <h2 className="text-[18px] font-bold text-gray-900 mb-2">{content.TITLE}</h2>
        <p className="text-[13px] text-gray-500 mb-8">{content.DESCRIPTION}</p>

        <div className="space-y-8">
          
          {/* Primary Language */}
          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-2">{content.PRIMARY.LABEL}</label>
            <select className="w-full md:w-1/2 border border-gray-200 rounded-xl p-3 text-[13px] font-bold text-gray-800 focus:outline-none focus:border-[#0066FF] bg-white cursor-pointer appearance-none">
              <option value="en">English (US)</option>
              <option value="es">Spanish</option>
            </select>
            <p className="text-[11px] text-gray-500 mt-2">{content.PRIMARY.HINT}</p>
          </div>

          <div className="h-px bg-gray-100 w-full"></div>

          {/* Auto Detect Toggle */}
          <label className="flex items-center justify-between cursor-pointer group bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div>
              <div className="text-[14px] font-bold text-gray-900">{content.AUTO_DETECT.LABEL}</div>
              <div className="text-[12px] text-gray-500">{content.AUTO_DETECT.HINT}</div>
            </div>
            <div className="relative">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#10B981]"></div>
            </div>
          </label>

          {/* Supported Languages */}
          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-4">{content.SUPPORTED.LABEL}</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {languages.map(lang => (
                <label key={lang.code} className={`border rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all ${
                  lang.active ? 'border-[#0066FF] bg-[#F0F7FF]' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input type="checkbox" defaultChecked={lang.active} className="w-4 h-4 text-[#0066FF] rounded focus:ring-[#0066FF]" />
                  <span className={`text-[13px] font-bold ${lang.active ? 'text-[#0066FF]' : 'text-gray-700'}`}>{lang.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button className="px-6 py-2.5 bg-[#0066FF] text-white rounded-lg text-[13px] font-bold shadow-sm hover:bg-[#0052cc] transition-colors">
              {content.SAVE}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
