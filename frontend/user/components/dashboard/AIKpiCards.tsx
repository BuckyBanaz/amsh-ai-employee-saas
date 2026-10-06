"use client";
import React, { useEffect, useState } from 'react';
import { DashboardController, DashboardMetrics } from '../../controllers/dashboard.controller';
import { KpiGridSkeleton } from '../common/ShimmerSkeleton';

export function AIKpiCards() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    DashboardController.getStats()
      .then((res) => {
        if (res?.metrics) {
          setMetrics(res.metrics);
        }
      })
      .catch((err) => console.warn('Failed to load AI KPI metrics:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mb-4">
        <KpiGridSkeleton />
      </div>
    );
  }

  // Everything comes from the server's real numbers; a figure it cannot compute yet shows a dash.
  const dash = (v: string | null | undefined) => (v ?? '—');
  const cards = [
    { title: 'Calls Today', value: loading ? '...' : (metrics?.total_calls ?? 0), subtext: metrics?.calls_trend ?? 'No earlier day to compare', isGood: !metrics?.calls_trend?.startsWith('-') },
    { title: 'AI Resolution Rate', value: dash(metrics?.resolution_rate), subtext: metrics ? `${metrics.transferred_calls} handed to staff today` : '', isGood: true },
    { title: 'Avg Response Latency', value: dash(metrics?.avg_latency), subtext: 'Average over the last 7 days', isGood: true },
    { title: 'Appointments Booked Today', value: loading ? '...' : (metrics?.booked_appointments ?? 0), subtext: metrics?.appointments_trend ?? 'No earlier day to compare', isGood: !metrics?.appointments_trend?.startsWith('-') },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {cards.map((kpi, idx) => (
        <div key={idx} className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.03)] hover:border-blue-100 transition-all">
          <h3 className="text-xs font-semibold text-gray-500 mb-1">{kpi.title}</h3>
          <div className="text-xl font-bold text-gray-900 tracking-tight leading-tight mb-1">
            {kpi.value}
          </div>
          <p className={`text-[10px] font-semibold ${kpi.isGood ? 'text-[#10B981]' : 'text-red-500'}`}>{kpi.subtext}</p>
        </div>
      ))}
    </div>
  );
}
