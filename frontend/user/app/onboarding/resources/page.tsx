"use client";
import React from 'react';
import { ResourcesManager } from '../../../components/verticals/ResourcesManager';
import { OnboardingStepShell } from '../../../components/verticals/OnboardingStepShell';
import { useVerticalConfig } from '../../../verticals/useVerticalConfig';

export default function OnboardingResourcesPage() {
  const { config, loading } = useVerticalConfig();
  return (
    <OnboardingStepShell
      href="/onboarding/resources"
      title="Rooms"
      subtitle="Treatments marked as needing a room are booked only when one is free. You can skip this if none of yours do."
    >
      {loading ? <p className="text-xs text-gray-500">Loading…</p> : <ResourcesManager kinds={config?.resources || []} />}
    </OnboardingStepShell>
  );
}
