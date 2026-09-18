"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

const chartData = [
  { day: 'Aug 06', height: '50%' },
  { day: 'Aug 07', height: '55%' },
  { day: 'Aug 08', height: '42%' },
  { day: 'Aug 09', height: '40%' },
  { day: 'Aug 10', height: '58%' },
  { day: 'Aug 11', height: '62%' },
  { day: 'Aug 12', height: '70%' },
];

export function AIVolumeChart() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col h-full min-h-[240px]">
      <h3 className="text-xs font-bold text-gray-900 tracking-tight mb-3">{STRINGS.DASHBOARD_PANELS.AI_VOLUME.TITLE}</h3>
      
      <div className="flex-1 flex items-end justify-between px-2 pb-1 relative">
        {chartData.map((data, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1.5 w-full group">
            <div className="relative w-6 sm:w-8 h-[130px] flex items-end justify-center rounded-t-sm overflow-hidden bg-transparent">
              <div 
                className="w-full bg-[#0066FF] rounded-t-sm transition-all duration-500 group-hover:bg-[#0052cc]"
                style={{ height: data.height }}
              ></div>
            </div>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{data.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
