"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

const kpis = STRINGS.DASHBOARD.COMPONENTS.ANALYTICS_KPIS;

export function AnalyticsKPIs() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
      {kpis.map((kpi, idx) => (
        <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[12px] font-medium text-gray-500 mb-2">{kpi.label}</p>
          <h3 className="text-[28px] font-extrabold text-gray-900 tracking-tight leading-none mb-3">
            {kpi.value}
          </h3>
          <div className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={kpi.isPositive ? "#10B981" : "#EF4444"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
            <span className={`text-[11px] font-bold ${kpi.isPositive ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
              {kpi.trend}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
