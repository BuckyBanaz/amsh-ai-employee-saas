"use client";
import React from 'react';
import { AIKpiCards } from '../AIKpiCards';
import { AIVolumeChart } from '../AIVolumeChart';
import { AIOperationsList } from '../AIOperationsList';

export function OverviewTab() {
  return (
    <div className="animate-in fade-in duration-500 flex flex-col h-full">
      <AIKpiCards />
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-[400px]">
        <div className="xl:col-span-2 h-full min-w-0">
          <AIVolumeChart />
        </div>
        <div className="h-full min-w-0">
          <AIOperationsList />
        </div>
      </div>
    </div>
  );
}
