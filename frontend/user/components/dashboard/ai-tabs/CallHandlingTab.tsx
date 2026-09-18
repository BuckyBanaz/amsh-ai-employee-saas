"use client";
import React, { useState } from 'react';
import { STRINGS } from '../../../utils/strings/en';

const MOCK_AI_NUMBER = '+1 (555) 018-2947';

export function CallHandlingTab() {
  const content = STRINGS.DASHBOARD.COMPONENTS.AI_TABS_CONTENT.CALL_HANDLING;
  const phone = content.PHONE_NUMBER;
  const [copied, setCopied] = useState(false);

  const copyNumber = () => {
    navigator.clipboard?.writeText(MOCK_AI_NUMBER).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="animate-in fade-in duration-500 bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <div className="max-w-3xl">
        <h2 className="text-sm font-bold text-gray-900 mb-1">{content.TITLE}</h2>
        <p className="text-xs text-gray-500 mb-3">{content.DESCRIPTION}</p>

        <div className="space-y-4">

          {/* AI Phone Number */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-gray-700">{phone.TITLE}</label>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                {phone.STATUS_PENDING}
              </span>
            </div>

            <div className="border border-gray-200 rounded-lg p-3 mb-2 bg-gray-50/50">
              <div className="text-xs font-bold text-gray-900 mb-0.5">{phone.FORWARD_TITLE}</div>
              <p className="text-[11px] text-gray-500 mb-2">{phone.FORWARD_DESCRIPTION}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-2.5 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-mono font-bold text-gray-900 tracking-wide">
                  {MOCK_AI_NUMBER}
                </div>
                <button
                  onClick={copyNumber}
                  className="px-2.5 py-1.5 border border-gray-200 bg-white rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  {copied ? '✓ Copied' : phone.COPY_BTN}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">{phone.FORWARD_HINT}</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-3 opacity-60">
              <div className="text-xs font-bold text-gray-900 mb-0.5">{phone.DEDICATED_TITLE}</div>
              <p className="text-[11px] text-gray-500 mb-2">{phone.DEDICATED_DESCRIPTION}</p>
              <button disabled className="px-3 py-1 border border-gray-200 rounded-md text-xs font-medium text-gray-400 cursor-not-allowed">
                {phone.DEDICATED_BTN}
              </button>
            </div>
          </div>

          <div className="h-px bg-gray-100 w-full"></div>

          {/* Greeting */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">{content.GREETING.LABEL}</label>
            <textarea 
              className="w-full border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800 min-h-[70px] focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all"
              placeholder={content.GREETING.PLACEHOLDER}
              defaultValue={content.GREETING.DEFAULT}
            ></textarea>
            <p className="text-[10px] text-gray-400 mt-1">{content.GREETING.HINT}</p>
          </div>

          <div className="h-px bg-gray-100 w-full"></div>

          {/* Toggles */}
          <div className="space-y-2.5">
            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <div className="text-xs font-semibold text-gray-900">{content.TOGGLES.RECORD}</div>
                <div className="text-[11px] text-gray-500">{content.TOGGLES.RECORD_HINT}</div>
              </div>
              <div className="relative">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#10B981]"></div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <div className="text-xs font-semibold text-gray-900">{content.TOGGLES.TRANSCRIBE}</div>
                <div className="text-[11px] text-gray-500">{content.TOGGLES.TRANSCRIBE_HINT}</div>
              </div>
              <div className="relative">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#10B981]"></div>
              </div>
            </label>
          </div>

          <div className="h-px bg-gray-100 w-full"></div>

          {/* Limits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{content.LIMITS.MAX_DURATION}</label>
              <input type="number" defaultValue="15" className="w-full border border-gray-200 rounded-md p-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#0066FF]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{content.LIMITS.SILENT_TIMEOUT}</label>
              <input type="number" defaultValue="10" className="w-full border border-gray-200 rounded-md p-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#0066FF]" />
              <p className="text-[10px] text-gray-400 mt-1">{content.LIMITS.SILENT_HINT}</p>
            </div>
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
