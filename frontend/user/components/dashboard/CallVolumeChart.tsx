"use client";
import React, { useState } from 'react';
import { CallVolumeHour } from '../../controllers/dashboard.controller';

interface CallVolumeChartProps {
  data?: CallVolumeHour[];
  loading?: boolean;
}

export function CallVolumeChart({ data, loading = false }: CallVolumeChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const chartData = data ?? [];
  const maxCalls = Math.max(...chartData.map((d) => d.calls), 4);
  const totalCalls = chartData.reduce((acc, d) => acc + d.calls, 0);
  const topCalls = Math.max(0, ...chartData.map((d) => d.calls));
  const peak = topCalls > 0 ? chartData.find((d) => d.calls === topCalls) : undefined;

  return (
    <div className="bg-white border border-gray-100/90 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-gray-900 tracking-tight">Call Volume</h3>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-[#0066FF] border border-blue-100">
              {totalCalls} calls
            </span>
          </div>
          <p className="text-[11px] text-gray-500 font-medium">Calls today, by 3-hour window</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200/80 transition-colors"
        >
          <span>Today</span>
          <svg className="w-3 h-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Chart Canvas with Guide Lines & Bars */}
      <div className="relative pt-4 pb-1">
        {/* Horizontal Grid lines */}
        <div className="absolute inset-x-0 top-4 bottom-6 flex flex-col justify-between pointer-events-none">
          <div className="border-b border-gray-100 border-dashed w-full" />
          <div className="border-b border-gray-100 border-dashed w-full" />
          <div className="border-b border-gray-100 border-dashed w-full" />
          <div className="border-b border-gray-100 w-full" />
        </div>

        {/* Bars Container */}
        <div className="relative h-28 sm:h-32 flex items-end justify-between gap-1.5 sm:gap-2 px-1 z-10">
          {chartData.map((item, idx) => {
            const heightPercent = Math.max((item.calls / maxCalls) * 100, 8);
            const isHovered = hoveredIdx === idx;
            const isPeak = topCalls > 0 && item.calls === topCalls;

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Tooltip on hover */}
                <div
                  className={`absolute -top-2 transform -translate-y-full transition-all duration-200 pointer-events-none z-20 ${
                    isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                  }`}
                >
                  <div className="bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-md whitespace-nowrap">
                    {item.calls} {item.calls === 1 ? 'call' : 'calls'} at {item.time}
                  </div>
                </div>

                {/* Bar */}
                <div className="w-full max-w-[20px] sm:max-w-[24px] flex items-end justify-center h-full pb-1.5">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-md transition-all duration-300 relative ${
                      isPeak
                        ? 'bg-gradient-to-t from-[#0055FE] to-[#0088FF] shadow-xs'
                        : isHovered
                        ? 'bg-[#0066FF]'
                        : 'bg-blue-100 hover:bg-blue-200'
                    }`}
                  >
                    {isPeak && (
                      <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-black text-[#0066FF] tracking-wider uppercase">
                        Peak
                      </span>
                    )}
                  </div>
                </div>

                {/* X-axis Label */}
                <span
                  className={`text-[10px] font-semibold transition-colors truncate ${
                    isHovered || isPeak ? 'text-gray-900 font-bold' : 'text-gray-400'
                  }`}
                >
                  {item.time}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Insight */}
      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
        <span className="flex items-center gap-1 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF]" />
          {peak ? `Busiest: ${peak.time} window (${peak.calls} ${peak.calls === 1 ? 'call' : 'calls'})` : 'No calls yet today'}
        </span>
      </div>
    </div>
  );
}
