"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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

function AIPageContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<AITabType>('Overview');
  const [isTestOpen, setIsTestOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('test') === 'true') {
      setIsTestOpen(true);
    }
  }, [searchParams]);

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

import { GlobalLoader } from '../../../components/common/GlobalLoader';

export default function AIPage() {
  return (
    <Suspense fallback={<GlobalLoader label="Loading AI Receptionist" sublabel="Synchronizing voice models & settings..." size="md" />}>
      <AIPageContent />
    </Suspense>
  );
}


