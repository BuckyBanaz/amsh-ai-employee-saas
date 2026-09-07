"use client";
import React from 'react';
import { AnalyticsHeader } from '../../../components/dashboard/AnalyticsHeader';
import { AnalyticsKPIs } from '../../../components/dashboard/AnalyticsKPIs';
import { AnalyticsCharts } from '../../../components/dashboard/AnalyticsCharts';

export default function AnalyticsPage() {
  return (
    <div className="animate-in fade-in duration-500 pt-4 pb-6 flex flex-col h-full w-full overflow-y-auto scrollbar-hide">
      <AnalyticsHeader />
      <AnalyticsKPIs />
      <AnalyticsCharts />
    </div>
  );
}
