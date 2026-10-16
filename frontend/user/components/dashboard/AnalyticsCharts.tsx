"use client";
import React from 'react';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const hours = ['9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm'];

const heatmapData = [
  [1, 2, 3, 2, 1, 2, 3, 2, 1],
  [1, 2, 3, 3, 2, 2, 3, 2, 1],
  [1, 2, 3, 3, 2, 2, 3, 2, 1],
  [1, 2, 3, 2, 2, 2, 3, 2, 1],
  [1, 2, 3, 2, 2, 2, 3, 2, 1],
];

const getColorIntensity = (val: number) => {
  switch(val) {
    case 1: return 'bg-[#E5EDFF]';
    case 2: return 'bg-[#7AA5FF]';
    case 3: return 'bg-[#0066FF]';
    case 4: return 'bg-[#004dc2]';
    default: return 'bg-gray-100';
  }
};
import { STRINGS } from '../../utils/strings/en';

export function AnalyticsCharts() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
      
      {/* Busiest Calling Hours (Col Span 2) */}
      <div className="xl:col-span-2 bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <h3 className="text-sm font-bold text-gray-900 tracking-tight mb-3">{STRINGS.DASHBOARD_PANELS.ANALYTICS.BUSIEST_HOURS}</h3>
        
        <div className="w-full overflow-x-auto scrollbar-hide">
          <div className="min-w-[500px]">
            {/* Hour Labels */}
            <div className="grid grid-cols-10 gap-1.5 mb-1.5">
              <div className="col-span-1"></div>
              {hours.map((hour, idx) => (
                <div key={idx} className="col-span-1 text-center text-[10px] font-semibold text-gray-400">
                  {hour}
                </div>
              ))}
            </div>

            {/* Heatmap Rows */}
            <div className="space-y-1.5">
              {days.map((day, dayIdx) => (
                <div key={dayIdx} className="grid grid-cols-10 gap-1.5 items-center">
                  <div className="col-span-1 text-[10px] font-bold text-gray-500">
                    {day}
                  </div>
                  {heatmapData[dayIdx].map((intensity, hourIdx) => (
                    <div 
                      key={hourIdx} 
                      className={`col-span-1 h-7 rounded-md transition-opacity hover:opacity-80 cursor-pointer ${getColorIntensity(intensity)}`}
                      title={`${day} at ${hours[hourIdx]}`}
                    ></div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Call Outcomes (Col Span 1) */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        <h3 className="text-sm font-bold text-gray-900 tracking-tight mb-3">{STRINGS.DASHBOARD_PANELS.ANALYTICS.CALL_OUTCOMES}</h3>
        
        <div className="space-y-3 flex-1 flex flex-col justify-around">
          {/* Resolved by AI */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-gray-800">{STRINGS.DASHBOARD_PANELS.ANALYTICS.RESOLVED_AI}</span>
              <span className="text-xs font-bold text-gray-500">64%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-[#10B981] h-1.5 rounded-full" style={{ width: '64%' }}></div>
            </div>
          </div>

          {/* Appointment Booked */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-gray-800">{STRINGS.DASHBOARD_PANELS.ANALYTICS.APPOINTMENT_BOOKED}</span>
              <span className="text-xs font-bold text-gray-500">20%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-[#0066FF] h-1.5 rounded-full" style={{ width: '20%' }}></div>
            </div>
          </div>

          {/* Transferred */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-gray-800">{STRINGS.DASHBOARD_PANELS.ANALYTICS.TRANSFERRED}</span>
              <span className="text-xs font-bold text-gray-500">12%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-[#F59E0B] h-1.5 rounded-full" style={{ width: '12%' }}></div>
            </div>
          </div>

          {/* Missed */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-gray-800">{STRINGS.DASHBOARD_PANELS.ANALYTICS.MISSED}</span>
              <span className="text-xs font-bold text-gray-500">4%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-[#EF4444] h-1.5 rounded-full" style={{ width: '4%' }}></div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
