"use client";
import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  trendText: string;
  trendUp: boolean;
}

export function MetricCard({ title, value, trendText, trendUp }: MetricCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col justify-between">
      <div>
        <h3 className="text-xs font-medium text-gray-500 mb-1">{title}</h3>
        <div className="mb-2">
          <span className="text-2xl font-bold text-gray-900 tracking-tight">{value}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 mt-auto">
        <svg 
          width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" 
          className={trendUp ? 'text-[#10B981]' : 'text-red-500'}
        >
          {trendUp ? (
            <>
              <line x1="12" y1="19" x2="12" y2="5"></line>
              <polyline points="5 12 12 5 19 12"></polyline>
            </>
          ) : (
            <>
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <polyline points="19 12 12 19 5 12"></polyline>
            </>
          )}
        </svg>
        <span className={`text-[11px] font-semibold ${trendUp ? 'text-[#10B981]' : 'text-red-500'}`}>
          {trendText}
        </span>
      </div>
    </div>
  );
}
