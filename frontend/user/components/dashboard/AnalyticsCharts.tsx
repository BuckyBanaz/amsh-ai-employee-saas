"use client";
import React from 'react';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const hours = ['9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm'];

// Dummy data for heatmap intensity (1-4, 4 being busiest)
const heatmapData = [
  [1, 2, 3, 2, 1, 2, 3, 2, 1], // Mon
  [1, 2, 3, 3, 2, 2, 3, 2, 1], // Tue
  [1, 2, 3, 3, 2, 2, 3, 2, 1], // Wed
  [1, 2, 3, 2, 2, 2, 3, 2, 1], // Thu
  [1, 2, 3, 2, 2, 2, 3, 2, 1], // Fri
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
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      {/* Busiest Calling Hours (Col Span 2) */}
      <div className="xl:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <h3 className="text-[16px] font-extrabold text-gray-900 tracking-tight mb-6">{STRINGS.DASHBOARD_PANELS.ANALYTICS.BUSIEST_HOURS}</h3>
        
        <div className="w-full overflow-x-auto scrollbar-hide">
          <div className="min-w-[600px]">
            {/* Hour Labels */}
            <div className="grid grid-cols-10 gap-2 mb-2">
              <div className="col-span-1"></div>
              {hours.map((hour, idx) => (
                <div key={idx} className="col-span-1 text-center text-[11px] font-bold text-gray-400">
                  {hour}
                </div>
              ))}
            </div>

            {/* Heatmap Rows */}
            <div className="space-y-2">
              {days.map((day, dayIdx) => (
                <div key={dayIdx} className="grid grid-cols-10 gap-2 items-center">
                  <div className="col-span-1 text-[11px] font-bold text-gray-500">
                    {day}
                  </div>
                  {heatmapData[dayIdx].map((intensity, hourIdx) => (
                    <div 
                      key={hourIdx} 
                      className={`col-span-1 h-10 rounded-md transition-opacity hover:opacity-80 cursor-pointer ${getColorIntensity(intensity)}`}
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
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col h-full">
        <h3 className="text-[16px] font-extrabold text-gray-900 tracking-tight mb-8">{STRINGS.DASHBOARD_PANELS.ANALYTICS.CALL_OUTCOMES}</h3>
        
        <div className="space-y-8 flex-1">
          {/* Resolved by AI */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[13px] font-bold text-gray-900">{STRINGS.DASHBOARD_PANELS.ANALYTICS.RESOLVED_AI}</span>
              <span className="text-[12px] font-medium text-gray-500">64%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-[#10B981] h-1.5 rounded-full" style={{ width: '64%' }}></div>
            </div>
          </div>

          {/* Appointment Booked */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[13px] font-bold text-gray-900">{STRINGS.DASHBOARD_PANELS.ANALYTICS.APPOINTMENT_BOOKED}</span>
              <span className="text-[12px] font-medium text-gray-500">20%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-[#0066FF] h-1.5 rounded-full" style={{ width: '20%' }}></div>
            </div>
          </div>

          {/* Transferred */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[13px] font-bold text-gray-900">{STRINGS.DASHBOARD_PANELS.ANALYTICS.TRANSFERRED}</span>
              <span className="text-[12px] font-medium text-gray-500">12%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-[#F59E0B] h-1.5 rounded-full" style={{ width: '12%' }}></div>
            </div>
          </div>

          {/* Missed */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[13px] font-bold text-gray-900">{STRINGS.DASHBOARD_PANELS.ANALYTICS.MISSED}</span>
              <span className="text-[12px] font-medium text-gray-500">4%</span>
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
