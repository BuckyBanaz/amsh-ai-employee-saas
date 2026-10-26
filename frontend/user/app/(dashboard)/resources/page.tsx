"use client";
import React from 'react';
import { ResourcesManager } from '../../../components/verticals/ResourcesManager';
import { PageHeader } from '../../../components/verticals/PageBits';
import { useVerticalConfig } from '../../../verticals/useVerticalConfig';

export default function ResourcesPage() {
  const { config, loading } = useVerticalConfig();
  return (
    <div className="space-y-3.5 animate-in fade-in duration-300 pb-8 w-full">
      <PageHeader title="Rooms" subtitle="Treatments that need a room are booked only when one is free at that time." />
      {loading ? <p className="text-xs text-gray-500">Loading…</p> : <ResourcesManager kinds={config?.resources || []} />}
    </div>
  );
}
