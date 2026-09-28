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
    <div className="mb-3 shrink-0">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 py-1">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight leading-tight">
            {STRINGS.DASHBOARD.HEADERS.INTEGRATIONS.TITLE}
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            {STRINGS.DASHBOARD.HEADERS.INTEGRATIONS.SUBTITLE}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#0066FF] border border-blue-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF]" />
            API & Telephony Live
          </span>
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
