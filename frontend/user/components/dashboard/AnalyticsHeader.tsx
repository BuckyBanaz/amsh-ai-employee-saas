"use client";
import React from 'react';

interface AnalyticsHeaderProps {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  dateRangeLabel?: string;
  onExport?: () => void;
}

export function AnalyticsHeader({
  selectedPeriod,
  onPeriodChange,
  dateRangeLabel = 'Sep 21, 2026 – Oct 20, 2026',
  onExport,
}: AnalyticsHeaderProps) {
  const periods = [
    { id: 'today', label: 'Today' },
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
    { id: '90d', label: '90 Days' },
    { id: 'custom', label: 'Custom' },
  ];

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 py-1">
      <div>
        <h1 className="text-xl font-extrabold text-gray-900 tracking-tight leading-tight">
          Analytics
        </h1>
        <p className="text-xs text-gray-500 font-medium mt-0.5">
          Understand your clinic's calling volume and performance metrics
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Date Range Picker Display */}
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 bg-white border border-gray-200/90 shadow-2xs hover:bg-gray-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>{dateRangeLabel}</span>
          <svg className="w-3 h-3 text-gray-400 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Time Filter Segmented Buttons */}
        <div className="inline-flex items-center p-0.5 bg-gray-100/80 rounded-lg border border-gray-200/70 shadow-2xs">
          {periods.map((p) => {
            const isActive = selectedPeriod === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onPeriodChange(p.id)}
                type="button"
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0066FF] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Export Report CTA */}
        <button
          onClick={onExport}
          type="button"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0066FF] hover:bg-[#0055EE] active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Export Report</span>
        </button>
      </div>
    </header>
  );
}
