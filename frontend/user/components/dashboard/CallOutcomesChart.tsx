"use client";
import React from 'react';
import { CallOutcomesData } from '../../controllers/analytics.controller';
import { ShimmerBlock } from '../common/ShimmerSkeleton';

interface CallOutcomesChartProps {
  data?: CallOutcomesData;
  loading?: boolean;
}

export function CallOutcomesChart({ data, loading = false }: CallOutcomesChartProps) {
  const items = data?.items || [];
  const total = data?.total_calls || 0;

  // Donut SVG parameters
  const radius = 48;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const segments = items.map((item) => {
    const fraction = item.percentage / 100;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += fraction;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="bg-white border border-gray-100/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between h-full min-h-[260px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">Call Outcomes</h3>
          <p className="text-[11px] text-gray-500 font-medium">Distribution of all handled calls</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200/80 transition-colors"
        >
          <span>Selected Period</span>
          <svg className="w-3 h-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* State 1: Loading Progress State */}
      {loading ? (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-auto py-3">
          <ShimmerBlock className="w-24 h-24 rounded-full" />
          <div className="space-y-2.5">
            <ShimmerBlock delay={1} className="h-3 w-28 rounded-md" />
            <ShimmerBlock delay={2} className="h-3 w-24 rounded-md" />
            <ShimmerBlock delay={3} className="h-3 w-32 rounded-md" />
          </div>
        </div>
      ) : items.length === 0 || total === 0 ? (
        /* State 2: Zero Data State */
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center my-auto">
          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 mb-2 border border-gray-100">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-xs font-bold text-gray-800">No calls recorded yet</p>
          <p className="text-[11px] text-gray-400 mt-0.5 max-w-[220px]">
            Outcomes will appear here as soon as incoming calls are received.
          </p>
        </div>
      ) : (
        /* State 3: Active Live Data */
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 my-auto py-2">
          {/* Donut Chart */}
          <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 130 130">
              <circle
                cx="65"
                cy="65"
                r={radius}
                fill="none"
                stroke="#F3F4F6"
                strokeWidth={strokeWidth}
              />
              {segments.map((seg, idx) => (
                <circle
                  key={idx}
                  cx="65"
                  cy="65"
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              ))}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
              <span className="text-xl font-black text-gray-900 tracking-tight leading-none">
                {total.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                Total Calls
              </span>
            </div>
          </div>

          {/* Legend List on Right */}
          <div className="flex-1 w-full space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="font-semibold text-gray-700 truncate">{item.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-bold ml-2">
                  <span className="text-gray-900">{item.count}</span>
                  <span className="text-gray-400 font-medium text-[11px]">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 mt-1">
        <span className="flex items-center gap-1 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Live database aggregation
        </span>
        <span className="text-[10px] font-bold text-gray-400">100% verified</span>
      </div>
    </div>
  );
}
