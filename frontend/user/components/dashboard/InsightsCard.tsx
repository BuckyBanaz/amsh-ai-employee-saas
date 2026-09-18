"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function InsightsCard() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-4">
      <h2 className="text-xs font-bold text-gray-900 tracking-wider uppercase mb-3">{STRINGS.DASHBOARD.COMPONENTS.INSIGHTS_CARD.TITLE}</h2>
      
      <ul className="space-y-2.5">
        <li className="flex items-start gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF] mt-1.5 flex-shrink-0"></div>
          <p className="text-xs text-gray-600 leading-relaxed">
            {STRINGS.DASHBOARD.COMPONENTS.INSIGHTS_CARD.INSIGHTS[0]}
          </p>
        </li>
        <li className="flex items-start gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF] mt-1.5 flex-shrink-0"></div>
          <p className="text-xs text-gray-600 leading-relaxed">
            {STRINGS.DASHBOARD.COMPONENTS.INSIGHTS_CARD.INSIGHTS[1]}
          </p>
        </li>
        <li className="flex items-start gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] mt-1.5 flex-shrink-0"></div>
          <p className="text-xs text-gray-600 leading-relaxed">
            {STRINGS.DASHBOARD.COMPONENTS.INSIGHTS_CARD.INSIGHTS[2]}
          </p>
        </li>
      </ul>
    </div>
  );
}
