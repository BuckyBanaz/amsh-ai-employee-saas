"use client";
import React from 'react';
import { STRINGS } from '../../../../utils/strings/en';

export function ProfileSettings() {
  const content = STRINGS.DASHBOARD.SETTINGS.PROFILE;

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <h3 className="text-[16px] font-extrabold text-gray-900 tracking-tight mb-6">{content.TITLE}</h3>
        
        <div className="flex items-center gap-6 mb-8">
          <div className="w-16 h-16 rounded-full bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center text-[24px] font-black tracking-tight">
            SW
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <button className="px-4 py-1.5 bg-[#F0F7FF] text-[#0066FF] rounded-lg text-[12px] font-bold hover:bg-blue-100 transition-colors">
                {content.UPLOAD}
              </button>
              <button className="px-4 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-[12px] font-bold hover:bg-gray-50 transition-colors">
                {content.REMOVE}
              </button>
            </div>
            <p className="text-[11px] font-medium text-gray-400">{content.SUPPORTED_FORMATS}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[12px] font-bold text-gray-900 mb-2">{content.FIRST_NAME}</label>
            <input type="text" defaultValue="Sarah" className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-gray-900 mb-2">{content.LAST_NAME}</label>
            <input type="text" defaultValue="Wilson" className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[12px] font-bold text-gray-900 mb-2">{content.EMAIL}</label>
            <input type="email" defaultValue="sarah@smileclinic.com" className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]" />
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
