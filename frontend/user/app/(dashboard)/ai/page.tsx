"use client";
import React, { useState } from 'react';
import { AIHeader } from '../../../components/dashboard/AIHeader';
import { AITabs, AITabType } from '../../../components/dashboard/AITabs';
import { OverviewTab } from '../../../components/dashboard/ai-tabs/OverviewTab';
import { BehaviorTab } from '../../../components/dashboard/ai-tabs/BehaviorTab';
import { VoiceTab } from '../../../components/dashboard/ai-tabs/VoiceTab';
import { LanguagesTab } from '../../../components/dashboard/ai-tabs/LanguagesTab';
import { CallHandlingTab } from '../../../components/dashboard/ai-tabs/CallHandlingTab';
import { AppointmentsTab } from '../../../components/dashboard/ai-tabs/AppointmentsTab';
import { EscalationTab } from '../../../components/dashboard/ai-tabs/EscalationTab';
import { TestPlaygroundModal } from '../../../components/dashboard/TestPlaygroundModal';

export default function AIPage() {
  const [activeTab, setActiveTab] = useState<AITabType>('Overview');
  const [isTestOpen, setIsTestOpen] = useState(false);

  return (
    <div className="animate-in fade-in duration-500 pt-4 pb-6 flex flex-col h-full w-full">
      <AIHeader onTestClick={() => setIsTestOpen(true)} />
      <AITabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <TestPlaygroundModal isOpen={isTestOpen} onClose={() => setIsTestOpen(false)} />
      
      <div className="flex-1">
        {activeTab === 'Overview' && <OverviewTab />}
        {activeTab === 'Behavior' && <BehaviorTab />}
        {activeTab === 'Voice' && <VoiceTab />}
        {activeTab === 'Languages' && <LanguagesTab />}
        {activeTab === 'Call Handling' && <CallHandlingTab />}
        {activeTab === 'Appointments' && <AppointmentsTab />}
        {activeTab === 'Escalation' && <EscalationTab />}
      </div>
    </div>
  );
}
