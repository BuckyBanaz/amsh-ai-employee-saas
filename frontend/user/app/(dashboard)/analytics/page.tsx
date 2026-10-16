"use client";
import React, { useState, useEffect } from 'react';
import { AnalyticsHeader } from '../../../components/dashboard/AnalyticsHeader';
import { AnalyticsKPIs } from '../../../components/dashboard/AnalyticsKPIs';
import { BusiestCallingHoursHeatmap } from '../../../components/dashboard/BusiestCallingHoursHeatmap';
import { CallOutcomesChart } from '../../../components/dashboard/CallOutcomesChart';
import { CallVolumeTrendChart } from '../../../components/dashboard/CallVolumeTrendChart';
import { TopCallReasonsList } from '../../../components/dashboard/TopCallReasonsList';
import {
  AnalyticsController,
  AnalyticsSummaryResponse,
} from '../../../controllers/analytics.controller';

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<string>('30d');
  const [data, setData] = useState<AnalyticsSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAnalytics = (currentPeriod: string) => {
    setLoading(true);
    AnalyticsController.getSummary(currentPeriod)
      .then((res) => {
        if (res) {
          setData(res);
        }
      })
      .catch((err) => {
        console.error('Failed to load analytics data:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAnalytics(period);
  }, [period]);

  const handleExport = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amsh-analytics-report-${period}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3.5 sm:space-y-4 animate-in fade-in duration-300 pb-8">
      {/* 1. Analytics Header (Date picker, Filters, Export button) */}
      <AnalyticsHeader
        selectedPeriod={period}
        onPeriodChange={(newPeriod) => setPeriod(newPeriod)}
        dateRangeLabel={data?.date_range_label || (loading ? 'Loading period...' : 'Last 30 Days')}
        onExport={handleExport}
      />

      {/* 2. Top Row: 6 KPI Cards with sparklines */}
      <AnalyticsKPIs
        data={data?.kpis}
        loading={loading}
      />

      {/* 3. Middle Row: Heatmap (60%) + Call Outcomes Donut (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
        <div className="lg:col-span-7 flex flex-col">
          <BusiestCallingHoursHeatmap
            data={data?.heatmap}
            loading={loading}
          />
        </div>
        <div className="lg:col-span-5 flex flex-col">
          <CallOutcomesChart
            data={data?.outcomes}
            loading={loading}
          />
        </div>
      </div>

      {/* 4. Bottom Row: Call Volume Trend (60%) + Top Call Reasons (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
        <div className="lg:col-span-7 flex flex-col">
          <CallVolumeTrendChart
            data={data?.trend}
            loading={loading}
          />
        </div>
        <div className="lg:col-span-5 flex flex-col">
          <TopCallReasonsList
            reasons={data?.top_reasons}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
