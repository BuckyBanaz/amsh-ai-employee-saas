"use client";
import React from 'react';
import { STRINGS } from '../../../utils/strings/en';

export function ProfileSettings() {
  const content = STRINGS.DASHBOARD.SETTINGS.PROFILE;

  return (
    <div className="space-y-3 max-w-4xl pb-6">
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <h3 className="text-sm font-bold text-gray-900 tracking-tight mb-3">{content.TITLE}</h3>
        
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center text-sm font-bold tracking-tight">
            SW
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button className="px-2.5 py-1 bg-[#F0F7FF] text-[#0066FF] rounded-md text-xs font-semibold hover:bg-blue-100 transition-colors">
                {content.UPLOAD}
              </button>
              <button className="px-2.5 py-1 bg-white border border-gray-200 text-gray-600 rounded-md text-xs font-semibold hover:bg-gray-50 transition-colors">
                {content.REMOVE}
              </button>
            </div>
            <p className="text-[10px] text-gray-400">{content.SUPPORTED_FORMATS}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{content.FIRST_NAME}</label>
            <input type="text" defaultValue="Sarah" className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{content.LAST_NAME}</label>
            <input type="text" defaultValue="Wilson" className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">{content.EMAIL}</label>
            <input type="email" defaultValue="sarah@smileclinic.com" className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]" />
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
