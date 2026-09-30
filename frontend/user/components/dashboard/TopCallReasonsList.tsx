"use client";
import React from 'react';
import { TopCallReasonItem } from '../../controllers/analytics.controller';
import { ShimmerBlock } from '../common/ShimmerSkeleton';

interface TopCallReasonsListProps {
  reasons?: TopCallReasonItem[];
  loading?: boolean;
}

export function TopCallReasonsList({ reasons, loading = false }: TopCallReasonsListProps) {
  const list = reasons || [];

  const getReasonIcon = (category: string) => {
    switch (category) {
      case 'booking':
        return (
          <svg className="w-3.5 h-3.5 text-[#0066FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        );
      case 'inquiry':
        return (
          <svg className="w-3.5 h-3.5 text-[#8B5CF6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        );
      case 'reschedule':
        return (
          <svg className="w-3.5 h-3.5 text-[#10B981]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        );
      case 'treatment':
        return (
          <svg className="w-3.5 h-3.5 text-[#F59E0B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M2 12h20" />
          </svg>
        );
      case 'cancel':
        return (
          <svg className="w-3.5 h-3.5 text-[#EF4444]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      case 'other':
      default:
        return (
          <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        );
    }
  };

  return (
    <div className="bg-white border border-gray-100/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between h-full min-h-[260px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">Top Call Reasons</h3>
          <p className="text-[11px] text-gray-500 font-medium">Most common reasons for incoming calls</p>
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
        <div className="flex-1 flex flex-col justify-center space-y-3 py-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShimmerBlock delay={((i % 4) + 1) as 1 | 2 | 3 | 4} className="w-5 h-5 rounded-md" />
                  <ShimmerBlock delay={((i % 4) + 1) as 1 | 2 | 3 | 4} className="h-3 w-28 rounded-md" />
                </div>
                <ShimmerBlock delay={((i % 4) + 1) as 1 | 2 | 3 | 4} className="h-3 w-10 rounded-md" />
              </div>
              <ShimmerBlock delay={((i % 4) + 1) as 1 | 2 | 3 | 4} className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center my-auto">
          <p className="text-xs font-bold text-gray-800">No intent reasons categorized yet</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Caller intents will appear as calls conclude.</p>
        </div>
      ) : (
        /* Reasons Progress List */
        <div className="space-y-2.5 my-auto py-1">
          {list.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-[150px] sm:min-w-[170px] shrink-0">
                <span className="w-6 h-6 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                  {getReasonIcon(item.category)}
                </span>
                <span className="font-semibold text-gray-800 text-[11px] truncate">
                  {item.reason}
                </span>
              </div>

              <div className="flex-1 bg-gray-100/80 rounded-full h-1.5 overflow-hidden">
                <div
                  style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                  className="h-full rounded-full transition-all duration-700"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0 font-bold w-14 justify-end">
                <span className="text-gray-900 text-[11px]">{item.percentage}%</span>
                <span className="text-gray-400 font-medium text-[10px]">{item.count}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Info */}
      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 mt-1">
        <span className="flex items-center gap-1 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF]" />
          Classified directly by AI conversation engine
        </span>
        <span className="text-[10px] font-bold text-gray-400">Intent analysis</span>
      </div>
    </div>
  );
}
