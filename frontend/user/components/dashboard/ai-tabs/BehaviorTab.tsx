"use client";
import React from 'react';
import { STRINGS } from '../../../../utils/strings/en';

export function BehaviorTab() {
  const content = STRINGS.DASHBOARD.COMPONENTS.AI_TABS_CONTENT.BEHAVIOR;

  return (
    <div className="animate-in fade-in duration-500 bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
      <div className="max-w-3xl">
        <h2 className="text-[18px] font-bold text-gray-900 mb-2">{content.TITLE}</h2>
        <p className="text-[13px] text-gray-500 mb-8">{content.DESCRIPTION}</p>
        
        <div className="space-y-8">
          
          {/* Prompt */}
          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-2">{content.PROMPT.LABEL}</label>
            <textarea 
              className="w-full border border-gray-200 rounded-xl p-4 text-[13px] text-gray-800 min-h-[160px] focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all"
              placeholder={content.PROMPT.PLACEHOLDER}
              defaultValue={content.PROMPT.DEFAULT}
            ></textarea>
            <p className="text-[11px] text-gray-500 mt-2">{content.PROMPT.HINT}</p>
          </div>

          <div className="h-px bg-gray-100 w-full"></div>

          {/* Temperature/Strictness */}
          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-4">{content.TEMP.LABEL}</label>
            <input type="range" min="0" max="100" defaultValue="20" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0066FF]" />
            <div className="flex justify-between mt-2">
              <span className="text-[11px] font-bold text-gray-400">{content.TEMP.STRICT}</span>
              <span className="text-[11px] font-bold text-gray-400">{content.TEMP.CREATIVE}</span>
            </div>
          </div>

          <div className="h-px bg-gray-100 w-full"></div>

          {/* Toggles */}
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <div className="text-[14px] font-bold text-gray-900">{content.TOGGLES.SMALL_TALK}</div>
                <div className="text-[12px] text-gray-500">{content.TOGGLES.SMALL_TALK_HINT}</div>
              </div>
              <div className="relative">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#10B981]"></div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <div className="text-[14px] font-bold text-gray-900">{content.TOGGLES.CONFIRM}</div>
                <div className="text-[12px] text-gray-500">{content.TOGGLES.CONFIRM_HINT}</div>
              </div>
              <div className="relative">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#10B981]"></div>
              </div>
            </label>
          </div>

          {/* Save Button */}
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
