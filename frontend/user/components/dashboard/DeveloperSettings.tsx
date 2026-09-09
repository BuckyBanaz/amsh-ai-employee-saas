"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function DeveloperSettings() {
  return (
    <div className="space-y-6">
      
      {/* API Keys Section */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-[16px] font-extrabold text-gray-900 tracking-tight">{STRINGS.DASHBOARD.COMPONENTS.DEVELOPER_SETTINGS.API_KEYS.TITLE}</h3>
            <p className="text-[13px] text-gray-500 mt-1">{STRINGS.DASHBOARD.COMPONENTS.DEVELOPER_SETTINGS.API_KEYS.SUBTITLE}</p>
          </div>
          <button className="px-4 py-2 bg-gray-900 text-white rounded-lg text-[13px] font-bold shadow-sm hover:bg-gray-800 transition-colors">
            {STRINGS.DASHBOARD.COMPONENTS.DEVELOPER_SETTINGS.API_KEYS.GENERATE_BTN}
          </button>
        </div>

        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">{STRINGS.DASHBOARD.COMPONENTS.DEVELOPER_SETTINGS.API_KEYS.TABLE.COLS[0]}</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">{STRINGS.DASHBOARD.COMPONENTS.DEVELOPER_SETTINGS.API_KEYS.TABLE.COLS[1]}</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">{STRINGS.DASHBOARD.COMPONENTS.DEVELOPER_SETTINGS.API_KEYS.TABLE.COLS[2]}</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100 text-right">{STRINGS.DASHBOARD.COMPONENTS.DEVELOPER_SETTINGS.API_KEYS.TABLE.COLS[3]}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-[13px] font-bold text-gray-900">{STRINGS.DASHBOARD.COMPONENTS.DEVELOPER_SETTINGS.API_KEYS.TABLE.MOCK_DATA.NAME}</td>
                <td className="px-4 py-3 text-[13px] font-mono text-gray-500">{STRINGS.DASHBOARD.COMPONENTS.DEVELOPER_SETTINGS.API_KEYS.TABLE.MOCK_DATA.KEY}</td>
                <td className="px-4 py-3 text-[13px] text-gray-500">{STRINGS.DASHBOARD.COMPONENTS.DEVELOPER_SETTINGS.API_KEYS.TABLE.MOCK_DATA.CREATED}</td>
                <td className="px-4 py-3 text-right">
                  <button className="text-[#EF4444] text-[13px] font-bold hover:text-red-600">{STRINGS.DASHBOARD.COMPONENTS.DEVELOPER_SETTINGS.API_KEYS.TABLE.MOCK_DATA.REVOKE}</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Webhooks Section */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <h3 className="text-[16px] font-extrabold text-gray-900 tracking-tight">{STRINGS.DASHBOARD.COMPONENTS.DEVELOPER_SETTINGS.WEBHOOKS.TITLE}</h3>
        <p className="text-[13px] text-gray-500 mt-1 mb-6">{STRINGS.DASHBOARD.COMPONENTS.DEVELOPER_SETTINGS.WEBHOOKS.SUBTITLE}</p>

        <div className="space-y-4 max-w-3xl">
          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-2">{STRINGS.DASHBOARD.COMPONENTS.DEVELOPER_SETTINGS.WEBHOOKS.ENDPOINT_LABEL}</label>
            <input 
              type="text" 
              placeholder="https://api.yourdomain.com/webhooks/aura" 
              className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-[13px] font-bold text-gray-800 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all"
            />
          </div>

          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-2">{STRINGS.DASHBOARD.COMPONENTS.DEVELOPER_SETTINGS.WEBHOOKS.EVENTS_LABEL}</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input type="checkbox" defaultChecked className="w-4 h-4 text-[#0066FF] rounded border-gray-300 focus:ring-[#0066FF]" />
                <span className="text-[13px] font-medium text-gray-700">{STRINGS.DASHBOARD.COMPONENTS.DEVELOPER_SETTINGS.WEBHOOKS.EVENTS[0]}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input type="checkbox" defaultChecked className="w-4 h-4 text-[#0066FF] rounded border-gray-300 focus:ring-[#0066FF]" />
                <span className="text-[13px] font-medium text-gray-700">{STRINGS.DASHBOARD.COMPONENTS.DEVELOPER_SETTINGS.WEBHOOKS.EVENTS[1]}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input type="checkbox" className="w-4 h-4 text-[#0066FF] rounded border-gray-300 focus:ring-[#0066FF]" />
                <span className="text-[13px] font-medium text-gray-700">{STRINGS.DASHBOARD.COMPONENTS.DEVELOPER_SETTINGS.WEBHOOKS.EVENTS[2]}</span>
              </label>
            </div>
          </div>

          <div className="pt-2">
            <button className="px-5 py-2.5 bg-[#0066FF] text-white rounded-lg text-[13px] font-bold shadow-sm hover:bg-[#0052cc] transition-colors">
              {STRINGS.DASHBOARD.COMPONENTS.DEVELOPER_SETTINGS.WEBHOOKS.SAVE_BTN}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
