"use client";
import React from 'react';

// Hardcoded heights for the bars based on the screenshot
const chartData = [
  { day: 'Aug 06', height: '50%' },
  { day: 'Aug 07', height: '55%' },
  { day: 'Aug 08', height: '42%' },
  { day: 'Aug 09', height: '40%' },
  { day: 'Aug 10', height: '58%' },
  { day: 'Aug 11', height: '62%' },
  { day: 'Aug 12', height: '70%' },
];
import { STRINGS } from '../../utils/strings/en';

export function AIVolumeChart() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col h-full min-h-[350px]">
      <h3 className="text-[15px] font-bold text-gray-900 mb-8">{STRINGS.DASHBOARD_PANELS.AI_VOLUME.TITLE}</h3>
      
      <div className="flex-1 flex items-end justify-between px-4 pb-2 relative">
        
        {/* Subtle grid lines could go here, but screenshot has clean white background */}
        
        {chartData.map((data, idx) => (
          <div key={idx} className="flex flex-col items-center gap-3 w-full group">
            <div className="relative w-10 sm:w-12 h-[200px] flex items-end justify-center rounded-t-md overflow-hidden bg-transparent">
              <div 
                className="w-full bg-[#0066FF] rounded-t-md transition-all duration-500 group-hover:bg-[#0052cc]"
                style={{ height: data.height }}
              ></div>
            </div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{data.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
