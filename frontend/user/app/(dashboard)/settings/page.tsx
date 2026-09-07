"use client";
import React, { useState } from 'react';
import { SettingsSidebar, SettingsTab } from '../../../components/dashboard/settings/SettingsSidebar';
import { BusinessSettings } from '../../../components/dashboard/settings/BusinessSettings';
import { STRINGS } from '../../../../utils/strings/en';
import { ProfileSettings } from '../../../components/dashboard/settings/ProfileSettings';
import { SecuritySettings } from '../../../components/dashboard/settings/SecuritySettings';
import { NotificationSettings } from '../../../components/dashboard/settings/NotificationSettings';
import { AIDefaultsSettings } from '../../../components/dashboard/settings/AIDefaultsSettings';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('business');

  const renderContent = () => {
    switch (activeTab) {
      case 'business': return <BusinessSettings />;
      case 'profile': return <ProfileSettings />;
      case 'security': return <SecuritySettings />;
      case 'notifications': return <NotificationSettings />;
      case 'ai_defaults': return <AIDefaultsSettings />;
      case 'billing': 
      case 'danger_zone':
        return <BusinessSettings />; // Danger zone is part of business settings
      default: return <BusinessSettings />;
    }
  };

  return (
    <div className="animate-in fade-in duration-500 pt-4 pb-6 flex flex-col h-full w-full">
      <header className="mb-8 shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight leading-tight">
              {STRINGS.DASHBOARD.SETTINGS.TITLE}
            </h1>
            <p className="text-[15px] text-gray-500 mt-1">
              {STRINGS.DASHBOARD.SETTINGS.SUBTITLE}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-[14px] font-bold text-gray-600 mr-2 hidden md:block">
              {STRINGS.DASHBOARD.SETTINGS.DATE_PLACEHOLDER}
            </div>
            <button className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 shadow-sm transition-colors relative">
              <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-black rounded-full"></div>
            </button>
            <div className="w-10 h-10 rounded-full bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center font-bold text-sm cursor-pointer shadow-sm hover:bg-blue-100 transition-colors hidden sm:flex">
              SW
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-10">
        <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 overflow-y-auto scrollbar-hide pr-4">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
