"use client";
import React from 'react';
import { STRINGS } from '../../../../utils/strings/en';

export const INTEGRATION_TABS = [
  'All Integrations', // Kept generic in component state for simplicity, we map UI labels below
  'Calendar',
  'Communication',
  'Payments',
  'Developer'
] as const;

export type IntegrationTabType = typeof INTEGRATION_TABS[number];

interface IntegrationsHeaderProps {
  activeTab: IntegrationTabType;
  setActiveTab: (tab: IntegrationTabType) => void;
}

export function IntegrationsHeader({ activeTab, setActiveTab }: IntegrationsHeaderProps) {
  return (
    <div className="mb-6 shrink-0">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight leading-tight">
            {STRINGS.DASHBOARD.HEADERS.INTEGRATIONS.TITLE}
          </h1>
          <p className="text-[15px] text-gray-500 mt-1">
            {STRINGS.DASHBOARD.HEADERS.INTEGRATIONS.SUBTITLE}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Date Display */}
          <div className="text-[14px] font-bold text-gray-600 mr-2">
            Tuesday, August 12, 2026
          </div>

          {/* Notification Dot */}
          <button className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 shadow-sm transition-colors relative">
            <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-black rounded-full"></div>
          </button>

          {/* Profile Circle */}
          <div className="w-10 h-10 rounded-full bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center font-bold text-sm cursor-pointer shadow-sm hover:bg-blue-100 transition-colors">
            SW
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-200 w-full">
        <nav className="flex items-center gap-8 px-2 overflow-x-auto scrollbar-hide">
          {INTEGRATION_TABS.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-[14px] font-bold whitespace-nowrap transition-colors relative ${
                  isActive ? 'text-[#0066FF]' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab === 'All Integrations' ? STRINGS.DASHBOARD.HEADERS.INTEGRATIONS.TABS.ALL :
                 tab === 'Calendar' ? STRINGS.DASHBOARD.HEADERS.INTEGRATIONS.TABS.CALENDAR :
                 tab === 'Communication' ? STRINGS.DASHBOARD.HEADERS.INTEGRATIONS.TABS.COMMUNICATION :
                 tab === 'Payments' ? STRINGS.DASHBOARD.HEADERS.INTEGRATIONS.TABS.PAYMENTS :
                 tab === 'Developer' ? STRINGS.DASHBOARD.HEADERS.INTEGRATIONS.TABS.DEVELOPER : tab}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0066FF] rounded-t-full"></div>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
