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
import { AIStudioWorkbench } from '../../../components/dashboard/ai-studio/AIStudioWorkbench';
import { FormSkeleton } from '../../../components/common/ShimmerSkeleton';

function AIPageContent() {
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<'workbench' | 'settings'>('workbench');
  const [activeTab, setActiveTab] = useState<AITabType>('Overview');
  const [isTestOpen, setIsTestOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('test') === 'true') {
      setIsTestOpen(true);
    }
    if (searchParams.get('mode') === 'settings') {
      setViewMode('settings');
    }
  }, [searchParams]);

  if (viewMode === 'workbench') {
    return (
      <div className="animate-in fade-in duration-300 flex flex-col h-full w-full">
        <AIStudioWorkbench onBack={() => setViewMode('settings')} />
        {isTestOpen && <TestPlaygroundModal isOpen={isTestOpen} onClose={() => setIsTestOpen(false)} />}
      </div>
    );
  }

  return (
    <div className="space-y-3.5 animate-in fade-in duration-300 flex flex-col h-full w-full pb-8">
      <AIHeader
        onTestClick={() => setIsTestOpen(true)}
        onSwitchWorkbench={() => setViewMode('workbench')}
      />
      <AITabs activeTab={activeTab} setActiveTab={setActiveTab} />
      {isTestOpen && <TestPlaygroundModal isOpen={isTestOpen} onClose={() => setIsTestOpen(false)} />}
      
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

export default function AIPage() {
  return (
    <Suspense fallback={<FormSkeleton title="Loading AI Studio..." />}>
      <AIPageContent />
    </Suspense>
  );
}
