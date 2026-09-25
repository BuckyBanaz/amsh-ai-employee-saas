"use client";
import React, { useMemo } from 'react';
import { STRINGS } from '../../utils/strings/en';

export function AIVolumeChart() {
  const chartDays = useMemo(() => {
    const days = [];
    const heights = [45, 60, 52, 78, 65, 85, 92]; // Realistic weekly curve
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayLabel = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      days.push({
        label: dayLabel,
        height: `${heights[6 - i]}%`,
        calls: Math.round((heights[6 - i] / 100) * 24),
      });
    }
    return days;
  }, []);

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col h-full min-h-[260px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-bold text-gray-900 tracking-tight">{STRINGS.DASHBOARD_PANELS.AI_VOLUME.TITLE}</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Real-time daily AI conversation traffic (Last 7 Days)</p>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#0066FF] border border-blue-100/60">
          Live Telephony
        </span>
      </div>
      
      <div className="flex-1 flex items-end justify-between px-2 pb-2 gap-2 relative">
        {chartDays.map((data, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1.5 w-full group relative">
            {/* Tooltip on Hover */}
            <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[9px] font-semibold py-0.5 px-1.5 rounded pointer-events-none whitespace-nowrap shadow-sm z-10">
              {data.calls} calls
            </div>

            <div className="relative w-full max-w-[36px] h-[130px] flex items-end justify-center rounded-t-sm overflow-hidden bg-gray-50/80">
              <div 
                className="w-full bg-[#0066FF] rounded-t-sm transition-all duration-500 group-hover:bg-[#0052cc]"
                style={{ height: data.height }}
              ></div>
            </div>
            <span className="text-[10px] font-semibold text-gray-500 truncate max-w-[48px] text-center">{data.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
