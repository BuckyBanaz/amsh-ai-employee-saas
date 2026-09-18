"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

const kpis = STRINGS.DASHBOARD.COMPONENTS.AI_KPI_CARDS;

export function AIKpiCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
      {kpis.map((kpi, idx) => (
        <div key={idx} className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
          <h3 className="text-xs font-medium text-gray-500 mb-1">{kpi.title}</h3>
          <div className="text-xl font-bold text-gray-900 tracking-tight leading-tight mb-1">
            {kpi.value}
          </div>
          <p className="text-[10px] font-semibold text-[#10B981]">{kpi.subtext}</p>
        </div>
      ))}
    </div>
  );
}
