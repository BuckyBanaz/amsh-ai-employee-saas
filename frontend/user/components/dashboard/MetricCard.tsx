"use client";
import React from 'react';

export type MetricVariant = 'blue' | 'purple' | 'emerald' | 'amber';

interface MetricCardProps {
  title: string;
  value: string | number;
  trendText: string;
  trendUp?: boolean;
  variant?: MetricVariant;
  icon?: React.ReactNode;
  sparklineData?: number[];
}

export function MetricCard({
  title,
  value,
  trendText,
  trendUp = true,
  variant = 'blue',
  icon,
  sparklineData = [35, 45, 60, 55, 75, 90],
}: MetricCardProps) {
  const getTheme = () => {
    switch (variant) {
      case 'purple':
        return {
          iconBg: 'bg-purple-50 text-purple-600',
          barGradient: 'from-purple-300 to-purple-600',
        };
      case 'emerald':
        return {
          iconBg: 'bg-emerald-50 text-emerald-600',
          barGradient: 'from-emerald-300 to-emerald-600',
        };
      case 'amber':
        return {
          iconBg: 'bg-amber-50 text-amber-600',
          barGradient: 'from-amber-300 to-amber-500',
        };
      case 'blue':
      default:
        return {
          iconBg: 'bg-blue-50 text-[#0066FF]',
          barGradient: 'from-blue-300 to-[#0066FF]',
        };
    }
  };

  const theme = getTheme();

  return (
    <div className="bg-white border border-gray-100/90 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
      {/* Top Header: Icon + Title */}
      <div className="flex items-center gap-2.5 mb-1.5">
        {icon && (
          <div className={`w-7 h-7 rounded-full ${theme.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
            {icon}
          </div>
        )}
        <h3 className="text-[11px] font-bold text-gray-500 tracking-tight">{title}</h3>
      </div>

      {/* Main Content: Value + Sparkline */}
      <div className="flex items-end justify-between gap-2 mt-0.5">
        <div>
          <span className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-none">
            {value}
          </span>
          <div className="flex items-center gap-1 mt-1.5">
            <span className="text-emerald-500 font-bold text-[10px] sm:text-[11px] flex items-center gap-0.5">
              <span>↑</span>
              <span>{trendText}</span>
            </span>
          </div>
        </div>

        {/* Mini Gradient Bar Chart */}
        <div className="flex items-end gap-1 h-7 sm:h-8 pb-0.5 shrink-0">
          {sparklineData.map((val, idx) => (
            <div
              key={idx}
              style={{ height: `${val}%` }}
              className={`w-1 sm:w-1.5 rounded-full bg-gradient-to-t ${theme.barGradient} transition-all duration-500`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
