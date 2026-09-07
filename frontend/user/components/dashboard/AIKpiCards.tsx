"use client";
import React from 'react';
import { STRINGS } from '../../../../utils/strings/en';

const kpis = STRINGS.DASHBOARD.COMPONENTS.AI_KPI_CARDS;

export function AIKpiCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {kpis.map((kpi, idx) => (
        <div key={idx} className="bg-white border border-gray-100 rounded-xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
          <h3 className="text-[13px] font-bold text-gray-500 mb-3">{kpi.title}</h3>
          <div className="text-[28px] font-extrabold text-gray-900 tracking-tight leading-none mb-2">
            {kpi.value}
          </div>
          <p className="text-[11px] font-bold text-[#10B981]">{kpi.subtext}</p>
        </div>
      ))}
    </div>
  );
}
