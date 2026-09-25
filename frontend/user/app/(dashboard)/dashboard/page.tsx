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
import { DashboardController } from '../../../controllers/dashboard.controller';

export default function DashboardPage() {
  const [stats, setStats] = React.useState<any>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    DashboardController.getStats()
      .then((res) => {
        if (res?.metrics) {
          setStats(res.metrics);
        }
      })
      .catch((err) => {
        console.error('Failed to load dashboard stats:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const totalCalls = stats?.total_calls ?? 0;
  const bookedAppointments = stats?.booked_appointments ?? 0;
  const transferredCalls = stats?.transferred_calls ?? 0;
  const conversionRate = stats?.conversion_rate ?? '100%';

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-8">
      
      <TopBar />
      <AIBanner 
        calls={totalCalls} 
        appointments={bookedAppointments} 
        resolutionRate={conversionRate} 
        loading={loading}
      />
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Today's Appointments" 
          value={loading ? '...' : String(bookedAppointments)} 
          trendText="Live bookings" 
          trendUp={true} 
        />
        <MetricCard 
          title="AI Handled Calls" 
          value={loading ? '...' : String(totalCalls)} 
          trendText="Realtime stream" 
          trendUp={true} 
        />
        <MetricCard 
          title="Conversion Rate" 
          value={loading ? '...' : String(conversionRate)} 
          trendText="Booking efficiency" 
          trendUp={true} 
        />
        <MetricCard 
          title="Missed / Escalated" 
          value={loading ? '...' : String(transferredCalls)} 
          trendText="Human fallback" 
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
          <InsightsCard 
            totalCalls={totalCalls} 
            bookedAppointments={bookedAppointments} 
            conversionRate={conversionRate} 
          />
          <QuickActionsCard />
          <AlertsCard 
            transferredCalls={transferredCalls} 
            totalCalls={totalCalls} 
          />
        </div>

      </div>
    </div>
  );
}
