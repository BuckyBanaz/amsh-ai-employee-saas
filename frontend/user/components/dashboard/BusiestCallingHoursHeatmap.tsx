"use client";
import React, { useState } from 'react';
import { HeatmapData } from '../../controllers/analytics.controller';
import { GlobalLoader } from '../common/GlobalLoader';

interface BusiestCallingHoursHeatmapProps {
  data?: HeatmapData;
  loading?: boolean;
}

export function BusiestCallingHoursHeatmap({ data, loading = false }: BusiestCallingHoursHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ day: string; hour: string; calls: number } | null>(null);

  const days = data?.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = data?.hours || ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm'];
  const matrix = data?.matrix || Array.from({ length: 7 }, () => Array(13).fill(0));

  const getCellColor = (val: number) => {
    switch (val) {
      case 4:
        return 'bg-[#0052CC] hover:bg-[#003D99] shadow-xs';
      case 3:
        return 'bg-[#0066FF] hover:bg-[#0055EE]';
      case 2:
        return 'bg-[#8FB5FF] hover:bg-[#7AA5FF]';
      case 1:
        return 'bg-[#DCE8FF] hover:bg-[#C9DCFF]';
      case 0:
      default:
        return 'bg-gray-100/70 hover:bg-gray-200/80';
    }
  };

  return (
    <div className="bg-white border border-gray-100/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between h-full min-h-[260px]">
      {/* Header with Title and Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">Busiest Calling Hours</h3>
          <p className="text-[11px] text-gray-500 font-medium">Heatmap of incoming calls over the selected period</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-gray-500 font-medium shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-[#DCE8FF]" />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-[#8FB5FF]" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-[#0066FF]" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-[#0052CC]" />
            <span className="font-bold text-gray-700">Very High</span>
          </div>
        </div>
      </div>

      {/* State 1: Loading Progress State */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-4">
          <GlobalLoader message="Calculating hourly call density..." size="sm" />
        </div>
      ) : (
        /* Heatmap Grid */
        <div className="w-full overflow-x-auto scrollbar-hide py-1">
          <div className="min-w-[580px]">
            {/* Hour Headers */}
            <div className="grid grid-cols-[48px_repeat(13,1fr)] gap-1.5 mb-1.5">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider"></div>
              {hours.map((hour, idx) => (
                <div key={idx} className="text-center text-[10px] font-bold text-gray-400">
                  {hour}
                </div>
              ))}
            </div>

            {/* Day Rows */}
            <div className="space-y-1.5">
              {days.map((day, dayIdx) => (
                <div key={dayIdx} className="grid grid-cols-[48px_repeat(13,1fr)] gap-1.5 items-center">
                  <div className="text-[11px] font-bold text-gray-500 truncate">
                    {day}
                  </div>
                  {matrix[dayIdx]?.map((val, hourIdx) => (
                    <div
                      key={hourIdx}
                      onMouseEnter={() => setHoveredCell({ day, hour: hours[hourIdx], calls: val })}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`h-7 sm:h-8 rounded-lg transition-all duration-200 cursor-pointer relative ${getCellColor(val)}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Cell Tooltip Bar / Status */}
      <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 mt-2">
        {hoveredCell ? (
          <span className="flex items-center gap-1.5 font-bold text-[#0066FF] animate-in fade-in duration-200">
            <span className="w-2 h-2 rounded-full bg-[#0066FF] animate-pulse" />
            {hoveredCell.day} at {hoveredCell.hour}: density level {hoveredCell.calls}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Real-time call timeline density
          </span>
        )}
        <span className="text-[10px] font-bold text-gray-400">Live database data</span>
      </div>
    </div>
  );
}
