"use client";
import React from 'react';
import { STRINGS } from '../../../utils/strings/en';

export function AIDefaultsSettings() {
  const content = STRINGS.DASHBOARD.SETTINGS.AI_DEFAULTS;

  return (
    <div className="space-y-3 max-w-4xl pb-6">
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <h3 className="text-sm font-bold text-gray-900 tracking-tight mb-0.5">{content.TITLE}</h3>
        <p className="text-xs text-gray-500 mb-4">{content.DESCRIPTION}</p>
        
        <div className="space-y-3.5 max-w-xl">
          
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{content.VOICE.LABEL}</label>
            <div className="relative mb-1">
              <select className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none bg-white">
                {content.VOICE.OPTIONS.map((opt, i) => (
                  <option key={i}>{opt}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-gray-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>
            <p className="text-[10px] text-gray-400">{content.VOICE.HINT}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{content.SPEED.LABEL}</label>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[10px] font-medium text-gray-400">{content.SPEED.SLOW}</span>
              <input type="range" min="1" max="100" defaultValue="50" className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0066FF]" />
              <span className="text-[10px] font-medium text-gray-400">{content.SPEED.FAST}</span>
            </div>
            <p className="text-[10px] text-gray-400">{content.SPEED.HINT}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{content.LANGUAGE.LABEL}</label>
            <div className="relative mb-1">
              <select className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none bg-white">
                {content.LANGUAGE.OPTIONS.map((opt, i) => (
                  <option key={i}>{opt}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-gray-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>
            <p className="text-[10px] text-gray-400">{content.LANGUAGE.HINT}</p>
          </div>

        </div>
      </div>
      
      <div className="flex justify-end">
        <button className="px-4 py-1.5 bg-[#0066FF] text-white rounded-md text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors">
          {content.SAVE}
        </button>
      </div>
    </div>
  );
}
