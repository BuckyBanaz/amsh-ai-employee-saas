"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function AlertsCard() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] p-6">
      <h2 className="text-[13px] font-bold text-gray-900 tracking-wider uppercase mb-5">{STRINGS.DASHBOARD.COMPONENTS.ALERTS_CARD.TITLE}</h2>
      
      <ul className="space-y-4">
        <li className="flex items-start gap-3">
          <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
          </div>
          <p className="text-[13px] font-semibold text-gray-900 leading-relaxed">
            {STRINGS.DASHBOARD.COMPONENTS.ALERTS_CARD.ALERTS.CALLS_TRANSFERRED}
          </p>
        </li>
        <li className="flex items-start gap-3">
          <div className="w-4 h-4 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
          </div>
          <p className="text-[13px] text-gray-700 leading-relaxed">
            <span className="font-semibold text-gray-900">{STRINGS.DASHBOARD.COMPONENTS.ALERTS_CARD.ALERTS.SYNC_WARNING_TITLE}</span>{STRINGS.DASHBOARD.COMPONENTS.ALERTS_CARD.ALERTS.SYNC_WARNING_DESC}
          </p>
        </li>
        <li className="flex items-start gap-3">
          <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-500"></div>
          </div>
          <p className="text-[13px] text-gray-500 leading-relaxed italic">
            {STRINGS.DASHBOARD.COMPONENTS.ALERTS_CARD.ALERTS.KNOWLEDGE_PARSING}
          </p>
        </li>
      </ul>
    </div>
  );
}
