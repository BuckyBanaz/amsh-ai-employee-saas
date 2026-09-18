"use client";
import React, { useState } from 'react';
import { SettingsSidebar, SettingsTab } from '../../../components/dashboard/settings/SettingsSidebar';
import { BusinessSettings } from '../../../components/dashboard/settings/BusinessSettings';
import { STRINGS } from '../../../utils/strings/en';
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
      case 'danger_zone':
        return <BusinessSettings focusDangerZone={true} />;
      case 'billing':
        return (
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.03)] text-center max-w-xl">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-[#0066FF] flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Billing & Invoices</h3>
            <p className="text-xs text-gray-500 mb-4">Manage your subscription tiers, payment methods, usage credits, and download receipts.</p>
            <a href="/billing" className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0066FF] text-white rounded-md text-xs font-semibold hover:bg-blue-600 transition-colors shadow-xs">
              Go to Billing Dashboard
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </a>
          </div>
        );
      default: return <BusinessSettings />;
    }
  };

  return (
    <div className="animate-in fade-in duration-500 pt-1 pb-4 flex flex-col h-full w-full">
      <header className="mb-3 py-1 shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">
              {STRINGS.DASHBOARD.SETTINGS.TITLE}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {STRINGS.DASHBOARD.SETTINGS.SUBTITLE}
            </p>
          </div>
          
          <div className="flex items-center gap-2.5">
            <div className="text-xs font-medium text-gray-500 hidden md:block">
              {STRINGS.DASHBOARD.SETTINGS.DATE_PLACEHOLDER}
            </div>
            <button className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 shadow-2xs transition-colors relative">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            </button>
            <div className="w-8 h-8 rounded-full bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center font-bold text-xs cursor-pointer shadow-2xs hover:bg-blue-100 transition-colors hidden sm:flex">
              SW
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4">
        <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 overflow-y-auto scrollbar-hide pr-2">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
