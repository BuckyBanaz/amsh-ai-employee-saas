"use client";
import React, { useState, useEffect } from 'react';
import { TopBar } from '../../../components/dashboard/TopBar';
import { AIBanner } from '../../../components/dashboard/AIBanner';
import { MetricCard } from '../../../components/dashboard/MetricCard';
import { AppointmentsTable } from '../../../components/dashboard/AppointmentsTable';
import { AIPerformanceCard } from '../../../components/dashboard/AIPerformanceCard';
import { CallVolumeChart } from '../../../components/dashboard/CallVolumeChart';
import { AppointmentSourcesChart } from '../../../components/dashboard/AppointmentSourcesChart';
import { RecentAIConversations } from '../../../components/dashboard/RecentAIConversations';
import { TestPlaygroundModal } from '../../../components/dashboard/TestPlaygroundModal';
import {
  DashboardController,
  DashboardStatsResponse,
} from '../../../controllers/dashboard.controller';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState<boolean>(false);

  useEffect(() => {
    DashboardController.getStats()
      .then((res) => {
        if (res) {
          setData(res);
        }
      })
      .catch((err) => {
        console.error('Failed to load dashboard stats:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const metrics = data?.metrics;
  const totalCalls = metrics?.total_calls ?? 42;
  const bookedAppointments = metrics?.booked_appointments ?? 28;
  const newPatients = metrics?.new_patients ?? 16;
  const resolutionRate = metrics?.resolution_rate ?? '96.8%';

  return (
    <div className="space-y-3.5 sm:space-y-4 animate-in fade-in duration-300 pb-8">
      {/* 1. Top Navigation Bar */}
      <TopBar />

      {/* 2. AI Receptionist Hero Banner */}
      <AIBanner
        calls={totalCalls}
        appointments={bookedAppointments}
        resolutionRate={resolutionRate}
        loading={loading}
        onTestClick={() => setIsPlaygroundOpen(true)}
      />

      {/* 3. Top Metrics Row (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="Total Calls Today"
          value={loading ? '...' : totalCalls}
          trendText={metrics?.calls_trend || '+12% from yesterday'}
          trendUp={true}
          variant="blue"
          icon={
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          }
          sparklineData={[30, 45, 60, 50, 75, 95]}
        />

        <MetricCard
          title="Appointments Booked"
          value={loading ? '...' : bookedAppointments}
          trendText={metrics?.appointments_trend || '+22% from yesterday'}
          trendUp={true}
          variant="emerald"
          icon={
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
          sparklineData={[20, 35, 45, 65, 80, 100]}
        />

        <MetricCard
          title="New Patients"
          value={loading ? '...' : newPatients}
          trendText={metrics?.patients_trend || '+8% from last week'}
          trendUp={true}
          variant="purple"
          icon={
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          }
          sparklineData={[40, 55, 50, 70, 65, 85]}
        />

        <MetricCard
          title="Resolution Rate"
          value={loading ? '...' : resolutionRate}
          trendText={metrics?.resolution_trend || '+4% vs target'}
          trendUp={true}
          variant="amber"
          icon={
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
          sparklineData={[70, 75, 82, 88, 92, 98]}
        />
      </div>

      {/* 4. Middle Section: Today's Appointments (~62%) + AI Performance (~38%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
        <div className="lg:col-span-8 flex flex-col">
          <AppointmentsTable />
        </div>
        <div className="lg:col-span-4 flex flex-col">
          <AIPerformanceCard
            performance={data?.performance}
            loading={loading}
          />
        </div>
      </div>

      {/* 5. Bottom Section: 3-column analysis grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 items-stretch">
        <div className="flex flex-col">
          <CallVolumeChart
            data={data?.call_volume}
            loading={loading}
          />
        </div>
        <div className="flex flex-col">
          <AppointmentSourcesChart
            sources={data?.appointment_sources}
            loading={loading}
          />
        </div>
        <div className="md:col-span-2 lg:col-span-1 flex flex-col">
          <RecentAIConversations loading={loading} />
        </div>
      </div>

      {/* 6. Interactive Test AI Receptionist Playground Modal */}
      {isPlaygroundOpen && (
        <TestPlaygroundModal
          isOpen={isPlaygroundOpen}
          onClose={() => setIsPlaygroundOpen(false)}
        />
      )}
    </div>
  );
}
