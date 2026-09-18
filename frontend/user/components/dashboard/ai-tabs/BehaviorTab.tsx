"use client";
import React from 'react';
import { STRINGS } from '../../../utils/strings/en';

export function BehaviorTab() {
  const content = STRINGS.DASHBOARD.COMPONENTS.AI_TABS_CONTENT.BEHAVIOR;

  return (
    <div className="animate-in fade-in duration-500 bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <div className="max-w-3xl">
        <h2 className="text-sm font-bold text-gray-900 mb-1">{content.TITLE}</h2>
        <p className="text-xs text-gray-500 mb-4">{content.DESCRIPTION}</p>
        
        <div className="space-y-4">
          
          {/* Prompt */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">{content.PROMPT.LABEL}</label>
            <textarea 
              className="w-full border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800 min-h-[110px] focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all"
              placeholder={content.PROMPT.PLACEHOLDER}
              defaultValue={content.PROMPT.DEFAULT}
            ></textarea>
            <p className="text-[10px] text-gray-400 mt-1">{content.PROMPT.HINT}</p>
          </div>

          <div className="h-px bg-gray-100 w-full"></div>

          {/* Temperature/Strictness */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">{content.TEMP.LABEL}</label>
            <input type="range" min="0" max="100" defaultValue="20" className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0066FF]" />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] font-semibold text-gray-400">{content.TEMP.STRICT}</span>
              <span className="text-[10px] font-semibold text-gray-400">{content.TEMP.CREATIVE}</span>
            </div>
          </div>

          <div className="h-px bg-gray-100 w-full"></div>

          {/* Toggles */}
          <div className="space-y-2.5">
            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <div className="text-xs font-semibold text-gray-900">{content.TOGGLES.SMALL_TALK}</div>
                <div className="text-[11px] text-gray-500">{content.TOGGLES.SMALL_TALK_HINT}</div>
              </div>
              <div className="relative">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#10B981]"></div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <div className="text-xs font-semibold text-gray-900">{content.TOGGLES.CONFIRM}</div>
                <div className="text-[11px] text-gray-500">{content.TOGGLES.CONFIRM_HINT}</div>
              </div>
              <div className="relative">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#10B981]"></div>
              </div>
            </label>
          </div>

          {/* Save Button */}
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
