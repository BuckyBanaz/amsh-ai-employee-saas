"use client";
import React from 'react';
import { AIPerformanceData } from '../../controllers/dashboard.controller';

interface AIPerformanceCardProps {
  performance?: AIPerformanceData;
  loading?: boolean;
}

export function AIPerformanceCard({ performance, loading = false }: AIPerformanceCardProps) {
  const data = performance || {
    resolution_rate: 96.8,
    resolved: 42,
    booked_appointments: 28,
    general_inquiries: 10,
    escalated_to_human: 2,
  };

  const categories = [
    { label: 'Resolved Calls', count: data.resolved, color: '#10B981', bg: 'bg-emerald-500' },
    { label: 'Booked Appointments', count: data.booked_appointments, color: '#0066FF', bg: 'bg-[#0066FF]' },
    { label: 'General Inquiries', count: data.general_inquiries, color: '#06B6D4', bg: 'bg-cyan-500' },
    { label: 'Escalated to Staff', count: data.escalated_to_human, color: '#F59E0B', bg: 'bg-amber-500' },
  ];

  const total = categories.reduce((acc, c) => acc + c.count, 0) || 1;

  // Donut SVG parameters (compact)
  const radius = 46;
  const strokeWidth = 11;
  const circumference = 2 * Math.PI * radius;

  // Compute strokes
  let accumulatedPercent = 0;
  const segments = categories.map((cat) => {
    const percent = cat.count / total;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += percent;
    return {
      ...cat,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="bg-white border border-gray-100/90 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <h3 className="text-sm font-bold text-gray-900 tracking-tight">AI Receptionist Performance</h3>
          <p className="text-[11px] text-gray-500 font-medium">Automated resolution & transfers</p>
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
            {/* Donut segments */}
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
              {loading ? '...' : `${data.resolution_rate}%`}
            </span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
              Resolved
            </span>
          </div>
        </div>
      </div>

      {/* Legend Grid */}
      <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-gray-100 mt-1">
        {categories.map((cat, idx) => (
          <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-gray-50/70 border border-gray-100/60">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`w-1.5 h-1.5 rounded-full ${cat.bg} shrink-0`} />
              <span className="text-[11px] font-semibold text-gray-600 truncate">{cat.label}</span>
            </div>
            <span className="text-[11px] font-bold text-gray-900 shrink-0 ml-1">
              {loading ? '..' : cat.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
