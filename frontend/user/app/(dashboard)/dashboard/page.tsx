"use client";
import React from 'react';
import { TopBar } from '../../../components/dashboard/TopBar';
import { AIBanner } from '../../../components/dashboard/AIBanner';
import { MetricCard } from '../../../components/dashboard/MetricCard';
import { AppointmentsTable } from '../../../components/dashboard/AppointmentsTable';
import { CallStreamsTable } from '../../../components/dashboard/CallStreamsTable';
import { InsightsCard } from '../../../components/dashboard/InsightsCard';
import { QuickActionsCard } from '../../../components/dashboard/QuickActionsCard';
import { AlertsCard } from '../../../components/dashboard/AlertsCard';

export default function DashboardPage() {
  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-8">
      
      <TopBar />
      <AIBanner />
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Today's Appointments" 
          value="12" 
          trendText="12% vs last week" 
          trendUp={true} 
        />
        <MetricCard 
          title="AI Handled Calls" 
          value="37" 
          trendText="8% vs yesterday" 
          trendUp={true} 
        />
        <MetricCard 
          title="Appointments Booked" 
          value="8" 
          trendText="23% overall accuracy" 
          trendUp={true} 
        />
        <MetricCard 
          title="Missed / Escalated" 
          value="3" 
          trendText="14% response time" 
          trendUp={false} 
        />
      </div>

      {/* Main Content Columns */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        
        {/* Left Column (Tables) */}
        <div className="xl:col-span-2 space-y-4">
          <AppointmentsTable />
          <CallStreamsTable />
        </div>

        {/* Right Column (Widgets) */}
        <div className="space-y-4">
          <InsightsCard />
          <QuickActionsCard />
          <AlertsCard />
        </div>

      </div>
    </div>
  );
}
