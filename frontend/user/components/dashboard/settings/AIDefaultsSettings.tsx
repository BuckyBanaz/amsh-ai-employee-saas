"use client";
import React from 'react';
import { STRINGS } from '../../../utils/strings/en';

export function AIDefaultsSettings() {
  const content = STRINGS.DASHBOARD.SETTINGS.AI_DEFAULTS;

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <h3 className="text-[16px] font-extrabold text-gray-900 tracking-tight mb-1">{content.TITLE}</h3>
        <p className="text-[13px] font-medium text-gray-500 mb-8">{content.DESCRIPTION}</p>
        
        <div className="space-y-6 max-w-xl">
          
          <div>
            <label className="block text-[13px] font-bold text-gray-900 mb-2">{content.VOICE.LABEL}</label>
            <div className="relative mb-2">
              <select className="w-full border border-gray-200 rounded-lg py-3 px-4 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none bg-white">
                {content.VOICE.OPTIONS.map((opt, i) => (
                  <option key={i}>{opt}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>
            <p className="text-[11px] font-medium text-gray-500">{content.VOICE.HINT}</p>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-gray-900 mb-2">{content.SPEED.LABEL}</label>
            <div className="flex items-center gap-4 mb-2">
              <span className="text-[11px] font-bold text-gray-400">{content.SPEED.SLOW}</span>
              <input type="range" min="1" max="100" defaultValue="50" className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0066FF]" />
              <span className="text-[11px] font-bold text-gray-400">{content.SPEED.FAST}</span>
            </div>
            <p className="text-[11px] font-medium text-gray-500">{content.SPEED.HINT}</p>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-gray-900 mb-2">{content.LANGUAGE.LABEL}</label>
            <div className="relative mb-2">
              <select className="w-full border border-gray-200 rounded-lg py-3 px-4 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none bg-white">
                {content.LANGUAGE.OPTIONS.map((opt, i) => (
                  <option key={i}>{opt}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>
            <p className="text-[11px] font-medium text-gray-500">{content.LANGUAGE.HINT}</p>
          </div>

        </div>
      </div>
      
      <div className="flex justify-end">
        <button className="px-6 py-2.5 bg-[#0066FF] text-white rounded-lg text-[13px] font-bold shadow-sm hover:bg-[#0052cc] transition-colors">
          {content.SAVE}
        </button>
      </div>
    </div>
  );
}
