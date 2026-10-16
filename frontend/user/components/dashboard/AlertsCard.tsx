"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

interface AlertsCardProps {
  transferredCalls?: number;
  totalCalls?: number;
}

export function AlertsCard({ transferredCalls = 0, totalCalls = 0 }: AlertsCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-gray-900 tracking-wider uppercase">System & Reception Health</h2>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
      </div>

      <ul className="space-y-2.5">
        <li className="flex items-start gap-2.5">
          <div className="w-3.5 h-3.5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
          </div>
          <p className="text-xs font-semibold text-gray-900 leading-relaxed">
            AI Receptionist Online & Ready
          </p>
        </li>

        {transferredCalls > 0 ? (
          <li className="flex items-start gap-2.5">
            <div className="w-3.5 h-3.5 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
            </div>
            <p className="text-xs font-medium text-gray-800 leading-relaxed">
              {transferredCalls} {transferredCalls === 1 ? 'call' : 'calls'} escalated to human staff today.
            </p>
          </li>
        ) : (
          <li className="flex items-start gap-2.5">
            <div className="w-3.5 h-3.5 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF]"></div>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              Zero emergency escalations recorded today.
            </p>
          </li>
        )}

        <li className="flex items-start gap-2.5">
          <div className="w-3.5 h-3.5 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Telephony media stream latency &lt;800ms
          </p>
        </li>
      </ul>
    </div>
  );
}
