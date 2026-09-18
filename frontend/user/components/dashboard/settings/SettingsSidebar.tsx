"use client";
import React from 'react';
import { STRINGS } from '../../../utils/strings/en';

export type SettingsTab = 'business' | 'profile' | 'security' | 'notifications' | 'ai_defaults' | 'billing' | 'danger_zone';

interface SettingsSidebarProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

export function SettingsSidebar({ activeTab, onTabChange }: SettingsSidebarProps) {
  const t = STRINGS.DASHBOARD.SETTINGS.SIDEBAR.TABS;
  const tabs: { id: SettingsTab; label: string; isDanger?: boolean }[] = [
    { id: 'business', label: t.BUSINESS },
    { id: 'profile', label: t.PROFILE },
    { id: 'security', label: t.SECURITY },
    { id: 'notifications', label: t.NOTIFICATIONS },
    { id: 'ai_defaults', label: t.AI_DEFAULTS },
    { id: 'billing', label: t.BILLING },
    { id: 'danger_zone', label: t.DANGER_ZONE, isDanger: true },
  ];

  return (
    <div className="w-[180px] shrink-0">
      <nav className="flex flex-col space-y-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center w-full px-3 py-1.5 rounded-md text-xs font-semibold text-left transition-colors ${
              activeTab === tab.id
                ? tab.isDanger 
                  ? 'bg-red-50 text-red-600' 
                  : 'bg-[#F0F7FF] text-[#0066FF]'
                : tab.isDanger
                  ? 'text-red-500 hover:bg-red-50'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
