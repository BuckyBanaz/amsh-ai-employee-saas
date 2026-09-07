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
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex flex-col justify-between">
      <div>
        <h3 className="text-[13px] font-semibold text-gray-500 mb-3">{title}</h3>
        <div className="mb-5">
          <span className="text-4xl font-bold text-gray-900 tracking-tight">{value}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-auto">
        <svg 
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" 
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
        <span className={`text-xs font-bold ${trendUp ? 'text-[#10B981]' : 'text-red-500'}`}>
          {trendText}
        </span>
      </div>
    </div>
  );
}
