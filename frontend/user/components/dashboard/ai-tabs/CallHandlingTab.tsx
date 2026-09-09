"use client";
import React, { useState } from 'react';
import { STRINGS } from '../../../utils/strings/en';

// Mock — the AI's Twilio number doesn't exist yet (no phone_number model/API
// wired up). Placeholder so the UI, and the requirement, aren't forgotten.
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
    <div className="animate-in fade-in duration-500 bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
      <div className="max-w-3xl">
        <h2 className="text-[18px] font-bold text-gray-900 mb-2">{content.TITLE}</h2>
        <p className="text-[13px] text-gray-500 mb-8">{content.DESCRIPTION}</p>

        <div className="space-y-8">

          {/* AI Phone Number */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-[13px] font-bold text-gray-700">{phone.TITLE}</label>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800">
                {phone.STATUS_PENDING}
              </span>
            </div>

            <div className="border border-gray-200 rounded-xl p-4 mb-3">
              <div className="text-[13px] font-bold text-gray-900 mb-1">{phone.FORWARD_TITLE}</div>
              <p className="text-[12px] text-gray-500 mb-3">{phone.FORWARD_DESCRIPTION}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[14px] font-bold text-gray-900 tracking-wide">
                  {MOCK_AI_NUMBER}
                </div>
                <button
                  onClick={copyNumber}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-[12px] font-bold text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  {copied ? '✓' : phone.COPY_BTN}
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">{phone.FORWARD_HINT}</p>
            </div>

            <div className="border border-gray-200 rounded-xl p-4 opacity-70">
              <div className="text-[13px] font-bold text-gray-900 mb-1">{phone.DEDICATED_TITLE}</div>
              <p className="text-[12px] text-gray-500 mb-3">{phone.DEDICATED_DESCRIPTION}</p>
              <button disabled className="px-4 py-2 border border-gray-200 rounded-lg text-[12px] font-bold text-gray-400 cursor-not-allowed">
                {phone.DEDICATED_BTN}
              </button>
            </div>
          </div>

          <div className="h-px bg-gray-100 w-full"></div>

          {/* Greeting */}
          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-2">{content.GREETING.LABEL}</label>
            <textarea 
              className="w-full border border-gray-200 rounded-xl p-4 text-[13px] text-gray-800 min-h-[100px] focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all"
              placeholder={content.GREETING.PLACEHOLDER}
              defaultValue={content.GREETING.DEFAULT}
            ></textarea>
            <p className="text-[11px] text-gray-500 mt-2">{content.GREETING.HINT}</p>
          </div>

          <div className="h-px bg-gray-100 w-full"></div>

          {/* Toggles */}
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <div className="text-[14px] font-bold text-gray-900">{content.TOGGLES.RECORD}</div>
                <div className="text-[12px] text-gray-500">{content.TOGGLES.RECORD_HINT}</div>
              </div>
              <div className="relative">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#10B981]"></div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <div className="text-[14px] font-bold text-gray-900">{content.TOGGLES.TRANSCRIBE}</div>
                <div className="text-[12px] text-gray-500">{content.TOGGLES.TRANSCRIBE_HINT}</div>
              </div>
              <div className="relative">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#10B981]"></div>
              </div>
            </label>
          </div>

          <div className="h-px bg-gray-100 w-full"></div>

          {/* Limits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[13px] font-bold text-gray-700 mb-2">{content.LIMITS.MAX_DURATION}</label>
              <input type="number" defaultValue="15" className="w-full border border-gray-200 rounded-xl p-3 text-[13px] font-bold text-gray-800 focus:outline-none focus:border-[#0066FF]" />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-gray-700 mb-2">{content.LIMITS.SILENT_TIMEOUT}</label>
              <input type="number" defaultValue="10" className="w-full border border-gray-200 rounded-xl p-3 text-[13px] font-bold text-gray-800 focus:outline-none focus:border-[#0066FF]" />
              <p className="text-[11px] text-gray-500 mt-2">{content.LIMITS.SILENT_HINT}</p>
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
