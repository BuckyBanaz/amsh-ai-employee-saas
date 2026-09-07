"use client";
import React from 'react';
import { STRINGS } from '../../../../utils/strings/en';

export const AI_TABS = [
  'Overview',
  'Behavior',
  'Voice',
  'Languages',
  'Call Handling',
  'Appointments',
  'Escalation'
] as const;

export type AITabType = typeof AI_TABS[number];

interface AITabsProps {
  activeTab: AITabType;
  setActiveTab: (tab: AITabType) => void;
}

export function AITabs({ activeTab, setActiveTab }: AITabsProps) {
  return (
    <div className="border-b border-gray-200 mb-6 w-full">
      <nav className="flex items-center gap-8 px-2 overflow-x-auto scrollbar-hide">
        {AI_TABS.map((tab) => {
          const isActive = tab === activeTab;
          
          return (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-[14px] font-bold whitespace-nowrap transition-colors relative ${
                isActive ? 'text-[#0066FF]' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab === 'Overview' ? STRINGS.DASHBOARD.COMPONENTS.AI_TABS.OVERVIEW :
               tab === 'Behavior' ? STRINGS.DASHBOARD.COMPONENTS.AI_TABS.BEHAVIOR :
               tab === 'Voice' ? STRINGS.DASHBOARD.COMPONENTS.AI_TABS.VOICE :
               tab === 'Languages' ? STRINGS.DASHBOARD.COMPONENTS.AI_TABS.LANGUAGES :
               tab === 'Call Handling' ? STRINGS.DASHBOARD.COMPONENTS.AI_TABS.CALL_HANDLING :
               tab === 'Appointments' ? STRINGS.DASHBOARD.COMPONENTS.AI_TABS.APPOINTMENTS :
               tab === 'Escalation' ? STRINGS.DASHBOARD.COMPONENTS.AI_TABS.ESCALATION : tab}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0066FF] rounded-t-full animate-in fade-in zoom-in duration-300"></div>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
