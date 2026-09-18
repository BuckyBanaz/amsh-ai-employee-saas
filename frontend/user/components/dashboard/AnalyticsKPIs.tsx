"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

const kpis = STRINGS.DASHBOARD.COMPONENTS.ANALYTICS_KPIS;

export function AnalyticsKPIs() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 mb-3">
      {kpis.map((kpi, idx) => (
        <div key={idx} className="bg-white border border-gray-100 rounded-xl p-3 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
          <p className="text-[11px] font-medium text-gray-500 mb-1 truncate">{kpi.label}</p>
          <h3 className="text-xl font-bold text-gray-900 tracking-tight leading-tight mb-1.5">
            {kpi.value}
          </h3>
          <div className="flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={kpi.isPositive ? "#10B981" : "#EF4444"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
            <span className={`text-[10px] font-semibold ${kpi.isPositive ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
              {kpi.trend}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
