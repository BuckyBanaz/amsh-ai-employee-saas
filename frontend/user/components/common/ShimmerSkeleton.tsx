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
 * Clean, lightweight inline spinner for buttons and action processing
 */
export function InlineSpinner({ className = "w-4 h-4 text-[#0066FF]" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
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
 * Ultra-premium Card Grid shimmer skeleton (for Services, Doctors, Staff)
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
 * Ultra-premium List shimmer skeleton (for Notifications, Recent Calls, Sidebar items)
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

/**
 * Form / Settings / AI-Tabs shimmer skeleton
 */
export function FormSkeleton({ title = "Loading settings..." }: { title?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.03)] space-y-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="space-y-1.5">
          <ShimmerBlock className="h-4 w-40 rounded-md" />
          <ShimmerBlock className="h-2.5 w-64 rounded-md opacity-60" />
        </div>
        <ShimmerBlock className="h-8 w-24 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <ShimmerBlock delay={((i % 4) + 1) as 1 | 2 | 3 | 4} className="h-3 w-24 rounded-md" />
            <ShimmerBlock delay={((i % 4) + 1) as 1 | 2 | 3 | 4} className="h-9 w-full rounded-lg" />
          </div>
        ))}
      </div>

      <div className="space-y-2 pt-2">
        <ShimmerBlock className="h-3 w-32 rounded-md" />
        <ShimmerBlock className="h-20 w-full rounded-xl" />
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <ShimmerBlock className="h-3 w-28 rounded-md" />
        <div className="flex gap-2">
          <ShimmerBlock className="h-8 w-20 rounded-lg" />
          <ShimmerBlock className="h-8 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Chat / Dialogue Conversation Thread Shimmer Skeleton
 */
export function ChatThreadSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShimmerBlock className="w-10 h-10 rounded-full shrink-0" />
          <div className="space-y-1.5">
            <ShimmerBlock className="h-3.5 w-32 rounded-md" />
            <ShimmerBlock className="h-2.5 w-20 rounded-md opacity-60" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ShimmerBlock className="h-6 w-16 rounded-full" />
          <ShimmerBlock className="h-8 w-8 rounded-lg" />
        </div>
      </div>

      {/* Message Bubbles */}
      <div className="flex-1 p-5 space-y-4 overflow-y-auto">
        {/* Turn 1: AI Greeting */}
        <div className="flex justify-start">
          <div className="max-w-[70%] space-y-1.5">
            <ShimmerBlock className="h-2 w-16 rounded-md opacity-50" />
            <div className="bg-blue-50/50 p-3 rounded-2xl rounded-tl-none border border-blue-100/60 space-y-2">
              <ShimmerBlock className="h-3 w-48 rounded-md" />
              <ShimmerBlock className="h-3 w-36 rounded-md opacity-80" />
            </div>
          </div>
        </div>

        {/* Turn 2: Caller response */}
        <div className="flex justify-end">
          <div className="max-w-[70%] space-y-1.5 flex flex-col items-end">
            <ShimmerBlock delay={2} className="h-2 w-14 rounded-md opacity-50" />
            <div className="bg-gray-100 p-3 rounded-2xl rounded-tr-none space-y-2">
              <ShimmerBlock delay={2} className="h-3 w-56 rounded-md" />
              <ShimmerBlock delay={2} className="h-3 w-40 rounded-md opacity-80" />
            </div>
          </div>
        </div>

        {/* Turn 3: AI Action */}
        <div className="flex justify-start">
          <div className="max-w-[70%] space-y-1.5">
            <ShimmerBlock delay={3} className="h-2 w-16 rounded-md opacity-50" />
            <div className="bg-blue-50/50 p-3 rounded-2xl rounded-tl-none border border-blue-100/60 space-y-2">
              <ShimmerBlock delay={3} className="h-3 w-64 rounded-md" />
              <ShimmerBlock delay={3} className="h-3 w-44 rounded-md opacity-80" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Audio Bar */}
      <div className="p-3 border-t border-gray-100 bg-[#F9FAFB]/60 flex items-center justify-between gap-3">
        <ShimmerBlock className="w-8 h-8 rounded-full shrink-0" />
        <ShimmerBlock className="flex-1 h-3 rounded-full" />
        <ShimmerBlock className="w-12 h-3 rounded-md" />
      </div>
    </div>
  );
}

/**
 * Call Detail Panel Shimmer Skeleton
 */
export function CallDetailSkeleton() {
  return (
    <div className="w-full bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col h-full overflow-hidden p-4 space-y-4">
      <div className="flex items-center justify-between">
        <ShimmerBlock className="h-3 w-20 rounded-md" />
        <ShimmerBlock className="h-3 w-16 rounded-md opacity-60" />
      </div>

      <div className="flex items-center gap-3 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
        <ShimmerBlock className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <ShimmerBlock className="h-3.5 w-28 rounded-md" />
          <ShimmerBlock className="h-2.5 w-20 rounded-md opacity-60" />
        </div>
        <ShimmerBlock className="h-5 w-16 rounded-full" />
      </div>

      <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 space-y-2">
        <div className="flex justify-between">
          <ShimmerBlock className="h-3 w-16 rounded-md" />
          <ShimmerBlock className="h-3 w-12 rounded-md opacity-60" />
        </div>
        <ShimmerBlock className="h-2 w-full rounded-full" />
      </div>

      <div className="space-y-2 flex-1 pt-1">
        <ShimmerBlock className="h-3 w-24 rounded-md" />
        <ShimmerBlock className="h-3 w-full rounded-md opacity-70" />
        <ShimmerBlock className="h-3 w-4/5 rounded-md opacity-60" />
        <ShimmerBlock className="h-3 w-3/4 rounded-md opacity-50" />
      </div>
    </div>
  );
}

/**
 * Calendar Grid Shimmer Skeleton
 */
export function CalendarSkeleton() {
  return (
    <div className="w-full bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <ShimmerBlock className="h-7 w-20 rounded-lg" />
          <ShimmerBlock className="h-7 w-24 rounded-lg" />
        </div>
        <ShimmerBlock className="h-6 w-32 rounded-md" />
      </div>

      <div className="grid grid-cols-7 border-b border-gray-100 bg-[#F9FAFB]/70">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
          <div key={idx} className="p-3 text-center border-r border-gray-100 last:border-r-0 space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase">{day}</span>
            <ShimmerBlock className="h-3 w-6 mx-auto rounded-md" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 h-[380px] divide-x divide-gray-100 bg-white">
        {Array.from({ length: 7 }).map((_, cIdx) => (
          <div key={cIdx} className="p-2 space-y-2">
            {cIdx % 2 === 0 && (
              <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-100 space-y-1">
                <ShimmerBlock delay={((cIdx % 4) + 1) as 1 | 2 | 3 | 4} className="h-2.5 w-14 rounded-md" />
                <ShimmerBlock delay={((cIdx % 4) + 1) as 1 | 2 | 3 | 4} className="h-2 w-10 rounded-md opacity-60" />
              </div>
            )}
            {cIdx % 3 === 0 && (
              <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100 space-y-1">
                <ShimmerBlock delay={2} className="h-2.5 w-16 rounded-md" />
                <ShimmerBlock delay={2} className="h-2 w-12 rounded-md opacity-60" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Chart Shimmer Skeleton
 */
export function ChartSkeleton({ height = "h-48" }: { height?: string }) {
  return (
    <div className={`w-full bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col justify-between ${height}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="space-y-1">
          <ShimmerBlock className="h-3.5 w-28 rounded-md" />
          <ShimmerBlock className="h-2 w-20 rounded-md opacity-60" />
        </div>
        <ShimmerBlock className="h-5 w-16 rounded-full" />
      </div>

      <div className="flex items-end gap-3 h-28 pt-2 px-2">
        {Array.from({ length: 8 }).map((_, i) => {
          const heights = ['h-12', 'h-20', 'h-16', 'h-24', 'h-14', 'h-28', 'h-18', 'h-22'];
          const delay = ((i % 4) + 1) as 1 | 2 | 3 | 4;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <ShimmerBlock delay={delay} className={`w-full ${heights[i]} rounded-t-md`} />
              <ShimmerBlock delay={delay} className="h-2 w-4 rounded-md opacity-50" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
