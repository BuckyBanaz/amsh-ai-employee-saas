"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export const INTEGRATION_TABS = [
  'All Integrations',
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
    <div className="mb-4 shrink-0">
      <header className="flex items-center justify-between mb-3 py-1">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">
            {STRINGS.DASHBOARD.HEADERS.INTEGRATIONS.TITLE}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {STRINGS.DASHBOARD.HEADERS.INTEGRATIONS.SUBTITLE}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-xs font-medium text-gray-500 hidden sm:inline-block">
            Tuesday, August 12, 2026
          </div>

          <button className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 shadow-2xs transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          </button>

          <div className="w-8 h-8 rounded-full bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center font-bold text-xs cursor-pointer shadow-2xs hover:bg-blue-100 transition-colors">
            SW
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-200 w-full">
        <nav className="flex items-center gap-5 px-1 overflow-x-auto scrollbar-hide">
          {INTEGRATION_TABS.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 text-xs font-semibold whitespace-nowrap transition-colors relative ${
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
