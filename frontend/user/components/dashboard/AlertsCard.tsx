"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function AlertsCard() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-4">
      <h2 className="text-xs font-bold text-gray-900 tracking-wider uppercase mb-3">{STRINGS.DASHBOARD.COMPONENTS.ALERTS_CARD.TITLE}</h2>
      
      <ul className="space-y-2.5">
        <li className="flex items-start gap-2.5">
          <div className="w-3.5 h-3.5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
          </div>
          <p className="text-xs font-semibold text-gray-900 leading-relaxed">
            {STRINGS.DASHBOARD.COMPONENTS.ALERTS_CARD.ALERTS.CALLS_TRANSFERRED}
          </p>
        </li>
        <li className="flex items-start gap-2.5">
          <div className="w-3.5 h-3.5 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed">
            <span className="font-semibold text-gray-900">{STRINGS.DASHBOARD.COMPONENTS.ALERTS_CARD.ALERTS.SYNC_WARNING_TITLE}</span>{STRINGS.DASHBOARD.COMPONENTS.ALERTS_CARD.ALERTS.SYNC_WARNING_DESC}
          </p>
        </li>
        <li className="flex items-start gap-2.5">
          <div className="w-3.5 h-3.5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed italic">
            {STRINGS.DASHBOARD.COMPONENTS.ALERTS_CARD.ALERTS.KNOWLEDGE_PARSING}
          </p>
        </li>
      </ul>
    </div>
  );
}
