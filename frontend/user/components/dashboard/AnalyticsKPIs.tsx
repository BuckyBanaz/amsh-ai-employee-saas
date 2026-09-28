"use client";
import React from 'react';
import { AnalyticsKPIsData } from '../../controllers/analytics.controller';

interface AnalyticsKPIsProps {
  data?: AnalyticsKPIsData;
  loading?: boolean;
}

export function AnalyticsKPIs({ data, loading = false }: AnalyticsKPIsProps) {
  const defaultKPIs: AnalyticsKPIsData = {
    total_calls: {
      value: '1,247',
      trend: '↑ 12% vs last month',
      is_positive: true,
      sparkline: [35, 48, 62, 55, 78, 92],
    },
    ai_answer_rate: {
      value: '92%',
      trend: '↑ 4% vs last month',
      is_positive: true,
      sparkline: [82, 85, 87, 86, 89, 92],
    },
    ai_resolution_rate: {
      value: '84%',
      trend: '↑ 8% vs last month',
      is_positive: true,
      sparkline: [65, 70, 74, 76, 80, 84],
    },
    appointments_booked: {
      value: '342',
      trend: '↑ 23% vs last month',
      is_positive: true,
      sparkline: [20, 38, 52, 65, 80, 100],
    },
    conversion_rate: {
      value: '27%',
      trend: '↑ 3% vs last month',
      is_positive: true,
      sparkline: [18, 20, 22, 23, 25, 27],
    },
    avg_call_duration: {
      value: '02:15',
      trend: '↓ 14% vs last month',
      is_positive: true,
      sparkline: [85, 76, 68, 60, 54, 45],
    },
  };

  const kpis = data || defaultKPIs;

  const cardConfig = [
    {
      title: 'Total Calls',
      kpi: kpis.total_calls,
      iconBg: 'bg-blue-50 text-[#0066FF]',
      barGradient: 'from-blue-300 to-[#0066FF]',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      ),
    },
    {
      title: 'AI Answer Rate',
      kpi: kpis.ai_answer_rate,
      iconBg: 'bg-emerald-50 text-emerald-600',
      barGradient: 'from-emerald-300 to-emerald-600',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      ),
    },
    {
      title: 'AI Resolution Rate',
      kpi: kpis.ai_resolution_rate,
      iconBg: 'bg-teal-50 text-teal-600',
      barGradient: 'from-purple-300 to-purple-600',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    {
      title: 'Appointments Booked',
      kpi: kpis.appointments_booked,
      iconBg: 'bg-purple-50 text-purple-600',
      barGradient: 'from-blue-300 to-[#0066FF]',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      title: 'Conversion Rate',
      kpi: kpis.conversion_rate,
      iconBg: 'bg-amber-50 text-amber-600',
      barGradient: 'from-amber-300 to-amber-500',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
    {
      title: 'Avg Call Duration',
      kpi: kpis.avg_call_duration,
      iconBg: 'bg-rose-50 text-rose-500',
      barGradient: 'from-rose-300 to-rose-500',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-3.5 my-2">
      {cardConfig.map((card, idx) => (
        <div
          key={idx}
          className="bg-white border border-gray-100/90 rounded-2xl p-3 sm:p-3.5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
        >
          {/* Top: Icon + Title */}
          <div className="flex items-center gap-2 mb-1.5">
            <div className={`w-7 h-7 rounded-full ${card.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
              {card.icon}
            </div>
            <h3 className="text-[11px] font-bold text-gray-500 tracking-tight truncate">{card.title}</h3>
          </div>

          {/* Value + Sparkline */}
          <div className="flex items-end justify-between gap-1.5 mt-0.5">
            <div className="min-w-0">
              {loading ? (
                <div className="h-6 w-20 bg-slate-100 rounded-md animate-pulse relative overflow-hidden mb-1">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent animate-shimmer-slide" />
                </div>
              ) : (
                <span className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-none truncate block">
                  {card.kpi.value}
                </span>
              )}
              <div className="flex items-center gap-1 mt-1">
                {loading ? (
                  <div className="h-2.5 w-16 bg-slate-100 rounded animate-pulse" />
                ) : (
                  <span className="text-emerald-500 font-bold text-[10px] truncate">
                    {card.kpi.trend}
                  </span>
                )}
              </div>
            </div>

            {/* Sparkline */}
            <div className="flex items-end gap-0.5 sm:gap-1 h-7 pb-0.5 shrink-0">
              {card.kpi.sparkline.map((val, sIdx) => (
                <div
                  key={sIdx}
                  style={{ height: `${val}%` }}
                  className={`w-1 rounded-full bg-gradient-to-t ${card.barGradient} transition-all duration-500`}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
