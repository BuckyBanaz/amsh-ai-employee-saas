"use client";
import React, { useState } from 'react';
import { IntegrationsHeader, IntegrationTabType } from '../../../components/dashboard/IntegrationsHeader';
import { IntegrationsGrid } from '../../../components/dashboard/IntegrationsGrid';
import { DeveloperSettings } from '../../../components/dashboard/DeveloperSettings';

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<IntegrationTabType>('All Integrations');

  return (
    <div className="space-y-3.5 animate-in fade-in duration-300 pb-8 flex flex-col h-full w-full">
      <IntegrationsHeader activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 min-h-0 pt-4 overflow-y-auto scrollbar-hide">
        {activeTab === 'Developer' ? (
          <DeveloperSettings />
        ) : (
          <IntegrationsGrid filter={activeTab} />
        )}
      </div>
    </div>
  );
}
