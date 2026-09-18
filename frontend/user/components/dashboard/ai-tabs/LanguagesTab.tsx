"use client";
import React, { useState } from 'react';
import { STRINGS } from '../../../utils/strings/en';

export function LanguagesTab() {
  const content = STRINGS.DASHBOARD.COMPONENTS.AI_TABS_CONTENT.LANGUAGES;
  const [langs, setLangs] = useState(
    content.SUPPORTED.OPTIONS.map((l: { code: string; name: string; active: boolean }) => ({ ...l }))
  );

  const toggle = (code: string) =>
    setLangs(prev => prev.map(l => l.code === code ? { ...l, active: !l.active } : l));

  return (
    <div className="animate-in fade-in duration-500 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <div className="max-w-2xl space-y-5">

        <div>
          <h2 className="text-base font-bold text-gray-900">{content.TITLE}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{content.DESCRIPTION}</p>
        </div>

        {/* Primary Language */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-gray-700">{content.PRIMARY.LABEL}</label>
          <select className="w-full md:w-56 border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 focus:outline-none focus:border-[#0066FF] bg-white cursor-pointer appearance-none">
            <option value="en">English (US)</option>
            <option value="es">Spanish</option>
          </select>
          <p className="text-[11px] text-gray-400">{content.PRIMARY.HINT}</p>
        </div>

        <div className="h-px bg-gray-100" />

        {/* Auto Detect Toggle */}
        <label className="flex items-center justify-between cursor-pointer group bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
          <div>
            <div className="text-sm font-bold text-gray-900">{content.AUTO_DETECT.LABEL}</div>
            <div className="text-[11px] text-gray-500">{content.AUTO_DETECT.HINT}</div>
          </div>
          <div className="relative shrink-0 ml-4">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#10B981]" />
          </div>
        </label>

        {/* Supported Languages */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2">{content.SUPPORTED.LABEL}</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {langs.map(lang => (
              <label
                key={lang.code}
                onClick={() => toggle(lang.code)}
                className={`border rounded-lg px-3 py-2 flex items-center gap-2 cursor-pointer transition-all ${
                  lang.active ? 'border-[#0066FF] bg-[#F0F7FF]' : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${lang.active ? 'bg-[#0066FF] border-[#0066FF]' : 'border-gray-300'}`}>
                  {lang.active && (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span className={`text-xs font-semibold ${lang.active ? 'text-[#0066FF]' : 'text-gray-700'}`}>{lang.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button className="px-5 py-2 bg-[#0066FF] text-white rounded-lg text-xs font-bold shadow-sm hover:bg-[#0052cc] transition-colors">
            {content.SAVE}
          </button>
        </div>

      </div>
    </div>
  );
}
