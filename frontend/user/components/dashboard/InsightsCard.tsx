"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function InsightsCard() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] p-6 mb-6">
      <h2 className="text-[13px] font-bold text-gray-900 tracking-wider uppercase mb-5">{STRINGS.DASHBOARD.COMPONENTS.INSIGHTS_CARD.TITLE}</h2>
      
      <ul className="space-y-4">
        <li className="flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF] mt-1.5 flex-shrink-0"></div>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            {STRINGS.DASHBOARD.COMPONENTS.INSIGHTS_CARD.INSIGHTS[0]}
          </p>
        </li>
        <li className="flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF] mt-1.5 flex-shrink-0"></div>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            {STRINGS.DASHBOARD.COMPONENTS.INSIGHTS_CARD.INSIGHTS[1]}
          </p>
        </li>
        <li className="flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] mt-1.5 flex-shrink-0"></div>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            {STRINGS.DASHBOARD.COMPONENTS.INSIGHTS_CARD.INSIGHTS[2]}
          </p>
        </li>
      </ul>
    </div>
  );
}
