"use client";
import React from 'react';

interface ShimmerBlockProps {
  className?: string;
  delay?: 1 | 2 | 3 | 4;
}

export function ShimmerBlock({ className = '', delay }: ShimmerBlockProps) {
  const delayClass = delay ? `shimmer-delay-${delay}` : '';
  return (
    <div
      className={`shimmer-skeleton ${delayClass} ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * Ultra-premium table shimmer skeleton with realistic row heights,
 * rounded cells, pill badges, and staggered wave animations.
 */
interface TableSkeletonProps {
  rows?: number;
  headers?: string[];
  showStatusBar?: boolean;
  statusMessage?: string;
}

export function TableSkeleton({
  rows = 5,
  headers,
  showStatusBar = true,
  statusMessage = "Synchronizing live records...",
}: TableSkeletonProps) {
  return (
    <div className="w-full bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden">
      {showStatusBar && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-blue-50/40 via-white to-indigo-50/30 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0066FF] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0066FF]"></span>
            </span>
            <span className="text-[11px] font-semibold text-gray-500 tracking-tight">
              {statusMessage}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShimmerBlock className="h-3 w-16 rounded-full" />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          {headers && headers.length > 0 && (
            <thead>
              <tr className="border-b border-gray-100 bg-[#F9FAFB]/70">
                {headers.map((h, i) => (
                  <th
                    key={i}
                    className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-gray-50">
            {Array.from({ length: rows }).map((_, rIdx) => {
              const delay = ((rIdx % 4) + 1) as 1 | 2 | 3 | 4;
              return (
                <tr key={rIdx} className="hover:bg-gray-50/30 transition-colors">
                  {/* Primary Col with Avatar + Text */}
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <ShimmerBlock delay={delay} className="w-7 h-7 rounded-full shrink-0" />
                      <div className="space-y-1.5">
                        <ShimmerBlock delay={delay} className="h-3.5 w-28 rounded-md" />
                        <ShimmerBlock delay={delay} className="h-2.5 w-16 rounded-md opacity-60" />
                      </div>
                    </div>
                  </td>

                  {/* Secondary Col: Contact or Meta */}
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <div className="space-y-1.5">
                      <ShimmerBlock delay={delay} className="h-3 w-24 rounded-md" />
                      <ShimmerBlock delay={delay} className="h-2.5 w-14 rounded-md opacity-60" />
                    </div>
                  </td>

                  {/* Third Col: Date / Count */}
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <ShimmerBlock delay={delay} className="h-3 w-16 rounded-md" />
                  </td>

                  {/* Fourth Col: Status Badge Pill */}
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <ShimmerBlock delay={delay} className="h-5 w-20 rounded-full" />
                  </td>

                  {/* Fifth Col: Action or Time */}
                  <td className="px-3.5 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <ShimmerBlock delay={delay} className="h-6 w-14 rounded-md" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Ultra-premium Card Grid shimmer skeleton (for Services, Doctors, Integrations)
 */
interface CardGridSkeletonProps {
  count?: number;
  columns?: string;
}

export function CardGridSkeleton({
  count = 6,
  columns = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
}: CardGridSkeletonProps) {
  return (
    <div className={`grid ${columns} gap-4 w-full`}>
      {Array.from({ length: count }).map((_, i) => {
        const delay = ((i % 4) + 1) as 1 | 2 | 3 | 4;
        return (
          <div
            key={i}
            className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)] space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <ShimmerBlock delay={delay} className="w-10 h-10 rounded-xl shrink-0" />
                <div className="space-y-1.5">
                  <ShimmerBlock delay={delay} className="h-3.5 w-28 rounded-md" />
                  <ShimmerBlock delay={delay} className="h-2.5 w-16 rounded-md opacity-60" />
                </div>
              </div>
              <ShimmerBlock delay={delay} className="h-5 w-14 rounded-full" />
            </div>

            <div className="space-y-1.5 pt-1">
              <ShimmerBlock delay={delay} className="h-2.5 w-full rounded-md opacity-80" />
              <ShimmerBlock delay={delay} className="h-2.5 w-3/4 rounded-md opacity-60" />
            </div>

            <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
              <ShimmerBlock delay={delay} className="h-4 w-20 rounded-md" />
              <div className="flex items-center gap-1.5">
                <ShimmerBlock delay={delay} className="h-6 w-12 rounded-lg" />
                <ShimmerBlock delay={delay} className="h-6 w-12 rounded-lg" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Ultra-premium List shimmer skeleton (for Notifications, Recent Calls, Activity Feed)
 */
interface ListSkeletonProps {
  count?: number;
}

export function ListSkeleton({ count = 5 }: ListSkeletonProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] divide-y divide-gray-50 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => {
        const delay = ((i % 4) + 1) as 1 | 2 | 3 | 4;
        return (
          <div key={i} className="p-3.5 flex items-start gap-3 hover:bg-gray-50/30 transition-colors">
            <ShimmerBlock delay={delay} className="w-8 h-8 rounded-xl shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <ShimmerBlock delay={delay} className="h-3.5 w-36 rounded-md" />
                <ShimmerBlock delay={delay} className="h-2.5 w-12 rounded-md opacity-50" />
              </div>
              <ShimmerBlock delay={delay} className="h-2.5 w-full max-w-sm rounded-md opacity-70" />
              <ShimmerBlock delay={delay} className="h-2 w-20 rounded-md opacity-40 pt-0.5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Ultra-premium KPI Grid shimmer skeleton
 */
export function KpiGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
      {Array.from({ length: 4 }).map((_, i) => {
        const delay = ((i % 4) + 1) as 1 | 2 | 3 | 4;
        return (
          <div
            key={i}
            className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.03)] space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <ShimmerBlock delay={delay} className="h-3 w-20 rounded-md" />
              <ShimmerBlock delay={delay} className="w-7 h-7 rounded-lg" />
            </div>
            <div className="space-y-1">
              <ShimmerBlock delay={delay} className="h-6 w-24 rounded-md" />
              <div className="flex items-center gap-1.5 pt-0.5">
                <ShimmerBlock delay={delay} className="h-3.5 w-12 rounded-full" />
                <ShimmerBlock delay={delay} className="h-2.5 w-16 rounded-md opacity-50" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
