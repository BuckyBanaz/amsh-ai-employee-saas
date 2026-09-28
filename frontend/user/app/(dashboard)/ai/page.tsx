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
import { GlobalLoader } from '../../../components/common/GlobalLoader';

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
        <TestPlaygroundModal isOpen={isTestOpen} onClose={() => setIsTestOpen(false)} />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pt-4 pb-6 flex flex-col h-full w-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          onClick={() => setViewMode('workbench')}
          className="px-3.5 py-1.5 bg-blue-50 text-[#0066FF] border border-blue-200 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          Switch to AI Studio Workbench
        </button>
      </div>

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

export default function AIPage() {
  return (
    <Suspense fallback={<GlobalLoader label="Loading AI Receptionist" sublabel="Synchronizing voice models & settings..." size="md" />}>
      <AIPageContent />
    </Suspense>
  );
}
