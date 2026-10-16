"use client";
import React from 'react';
import { ShimmerBlock } from '../common/ShimmerSkeleton';

export interface CurrentPlanProps {
  planName?: string;
  planKey?: string;
  status?: string;
  renewalDate?: string;
  price?: number;
  currency?: string;
  cycle?: string;
  minutesUsed?: number;
  minutesLimit?: number;
  callsCount?: number;
  callsLimit?: number;
  onChangePlanClick?: () => void;
  onManageBillingClick?: () => void;
  isLoading?: boolean;
}

export function CurrentPlanCard({
  planName = "Professional Clinic",
  planKey = "professional",
  status = "active",
  renewalDate = "October 22, 2026",
  price = 199,
  currency = "USD",
  cycle = "monthly",
  minutesUsed = 14.5,
  minutesLimit = 2000,
  callsCount = 8,
  callsLimit = 5000,
  onChangePlanClick,
  onManageBillingClick,
  isLoading = false
}: CurrentPlanProps) {
  if (isLoading) {
    return (
      <div className="bg-white border-2 border-blue-100 rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)] mb-4 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <ShimmerBlock className="h-3 w-28 rounded" />
            <ShimmerBlock className="h-6 w-56 rounded" />
            <ShimmerBlock className="h-3.5 w-72 rounded" />
            <div className="pt-2 space-y-3">
              <div>
                <div className="flex justify-between mb-1.5">
                  <ShimmerBlock className="h-3 w-32 rounded" />
                  <ShimmerBlock className="h-3 w-20 rounded" />
                </div>
                <ShimmerBlock className="h-2 w-full rounded-full" />
              </div>
              <div>
                <div className="flex justify-between mb-1.5">
                  <ShimmerBlock className="h-3 w-36 rounded" />
                  <ShimmerBlock className="h-3 w-24 rounded" />
                </div>
                <ShimmerBlock className="h-2 w-full rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ShimmerBlock className="h-8 w-24 rounded-lg" />
            <ShimmerBlock className="h-8 w-28 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const currencySymbol = '$';
  const minutesPct = Math.min(100, Math.max(minutesUsed > 0 ? 1 : 0, Math.round((minutesUsed / Math.max(1, minutesLimit)) * 100)));
  const callsPct = Math.min(100, Math.max(callsCount > 0 ? 1 : 0, Math.round((callsCount / Math.max(1, callsLimit)) * 100)));

  return (
    <div className="bg-white border-2 border-[#0066FF] rounded-xl p-5 shadow-[0_4px_20px_rgba(0,102,255,0.05)] mb-4 relative overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
        
        {/* Plan Info */}
        <div className="flex-1 w-full max-w-4xl pr-0 lg:pr-4">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[10px] font-extrabold text-[#0066FF] tracking-wider uppercase bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              {status.toLowerCase() === 'trial' ? 'FREE TRIAL PLAN' : 'CURRENT ACTIVE PLAN'}
            </span>
            {status.toLowerCase() === 'trial' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                14-DAY FREE TRIAL
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {status.toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2 mb-1">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">
              {planName}
            </h2>
            <span className="text-sm font-semibold text-gray-500">
              ({currencySymbol}{price.toLocaleString()} / {cycle})
            </span>
          </div>

          <p className="text-xs text-gray-500 mb-4 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            {status.toLowerCase() === 'trial' ? (
              <>
                Free trial period ends: <span className="font-semibold text-amber-700">{renewalDate}</span>. No credit card charged.
              </>
            ) : (
              <>
                Next renewal date: <span className="font-semibold text-gray-700">{renewalDate}</span>. Automatic renewal is enabled.
              </>
            )}
          </p>

          <div className="space-y-3 w-full max-w-2xl bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
            
            {/* AI Minutes Progress */}
            <div className="w-full">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </svg>
                  Voice Minutes Usage
                </span>
                <span className="text-[11px] font-mono font-medium text-gray-600">
                  <strong className="text-gray-900 font-bold">{minutesUsed.toLocaleString()}</strong> / {minutesLimit.toLocaleString()} mins ({minutesPct}%)
                </span>
              </div>
              <div className="w-full bg-gray-200/70 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-[#0066FF] h-2 rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${Math.max(2, minutesPct)}%` }}
                />
              </div>
            </div>

            {/* Calls Processed Progress */}
            <div className="w-full">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  Patient Calls Handled
                </span>
                <span className="text-[11px] font-mono font-medium text-gray-600">
                  <strong className="text-gray-900 font-bold">{callsCount.toLocaleString()}</strong> / {callsLimit.toLocaleString()} calls ({callsPct}%)
                </span>
              </div>
              <div className="w-full bg-gray-200/70 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-[#10B981] h-2 rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${Math.max(2, callsPct)}%` }}
                />
              </div>
            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex sm:flex-row lg:flex-col items-stretch sm:items-center gap-2 shrink-0 self-start w-full sm:w-auto">
          <button 
            type="button"
            onClick={onChangePlanClick}
            className="flex-1 sm:flex-initial px-4 py-2 bg-white border border-gray-300 text-gray-800 rounded-lg text-xs font-bold shadow-2xs hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer text-center"
          >
            Change Plan
          </button>
          <button 
            type="button"
            onClick={onManageBillingClick}
            className="flex-1 sm:flex-initial px-4 py-2 bg-[#0066FF] text-white rounded-lg text-xs font-bold shadow-xs hover:bg-[#0052cc] active:bg-[#004099] transition-colors cursor-pointer text-center"
          >
            Manage Billing
          </button>
        </div>

      </div>
    </div>
  );
}
