"use client";
import React from 'react';
import { AppointmentSourcesData } from '../../controllers/dashboard.controller';

interface AppointmentSourcesChartProps {
  sources?: AppointmentSourcesData;
  loading?: boolean;
}

export function AppointmentSourcesChart({ sources, loading = false }: AppointmentSourcesChartProps) {
  const defaultBreakdown = [
    { source: 'ai_call', label: 'AI Phone Calls', percentage: 42, count: 12, color: '#0066FF' },
    { source: 'whatsapp', label: 'WhatsApp Bot', percentage: 32, count: 9, color: '#10B981' },
    { source: 'website', label: 'Web Widget', percentage: 18, count: 5, color: '#8B5CF6' },
    { source: 'walk_in', label: 'Front Desk / Walk-in', percentage: 8, count: 2, color: '#F59E0B' },
  ];

  const breakdown = sources?.breakdown && sources.breakdown.length > 0 ? sources.breakdown : defaultBreakdown;
  const total = sources?.total || breakdown.reduce((acc, b) => acc + b.count, 0) || 28;

  // Donut SVG parameters (compact)
  const radius = 46;
  const strokeWidth = 11;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const segments = breakdown.map((item) => {
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
    <div className="bg-white border border-gray-100/90 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <h3 className="text-sm font-bold text-gray-900 tracking-tight">Appointment Sources</h3>
          <p className="text-[11px] text-gray-500 font-medium">Booking intake channels</p>
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

      {/* Donut Chart */}
      <div className="flex flex-col items-center justify-center my-1">
        <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            {/* Background track */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="#F3F4F6"
              strokeWidth={strokeWidth}
            />
            {/* Segments */}
            {segments.map((seg, idx) => (
              <circle
                key={idx}
                cx="60"
                cy="60"
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

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
            <span className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-none">
              {loading ? '...' : total}
            </span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
              Bookings
            </span>
          </div>
        </div>
      </div>

      {/* Channel Breakdown List */}
      <div className="space-y-1.5 pt-2 border-t border-gray-100 mt-1">
        {breakdown.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-[11px] py-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="font-semibold text-gray-700">{item.label}</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold">
              <span className="text-gray-900">{item.count}</span>
              <span className="text-gray-400 font-medium">({item.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
