"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

const DAYS = STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.DAYS;
const HOURS = STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.HOURS;

export function WeeklyCalendar() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Header Row */}
        <div className="grid grid-cols-6 mb-4">
          <div className="text-[11px] font-bold text-gray-400"></div> {/* Empty corner */}
          {DAYS.map((d, i) => (
            <div key={i} className="flex flex-col items-center justify-center">
              <span className={`text-[13px] font-bold ${d.active ? 'text-[#0066FF]' : 'text-gray-900'}`}>{d.day}</span>
              <span className={`text-[12px] font-medium mt-0.5 ${
                d.active ? 'w-6 h-6 flex items-center justify-center bg-[#E0E7FF] text-[#0066FF] rounded-md font-bold' : 'text-gray-500'
              }`}>
                {d.date}
              </span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="relative border-t border-l border-dashed border-gray-100 mt-2">
          
          {/* Background Grid Lines */}
          {HOURS.map((hour, i) => (
            <div key={i} className="grid grid-cols-6 h-[80px]">
              <div className="border-b border-r border-dashed border-gray-100 -ml-px flex items-start justify-center pt-2">
                <span className="text-[11px] font-semibold text-gray-500">{hour}</span>
              </div>
              <div className="border-b border-r border-dashed border-gray-100"></div>
              <div className="border-b border-r border-dashed border-gray-100"></div>
              <div className="border-b border-r border-dashed border-gray-100"></div>
              <div className="border-b border-r border-dashed border-gray-100"></div>
              <div className="border-b border-r border-dashed border-gray-100"></div>
            </div>
          ))}

          {/* Absolute Positioned Appointments */}
          {/* Top = hourIndex * 80, Left = (dayIndex + 1) * (100/6)% */}

          {/* WED 09:00 */}
          <div className="absolute top-[80px] left-[50%] w-[16.66%] p-1 h-[70px]">
            <div className="w-full h-full bg-[#F0F7FF] border border-[#0066FF]/30 rounded-lg p-2 hover:shadow-md cursor-pointer transition-shadow shadow-[0_0_0_1px_#0066FF] z-10">
              <p className="text-[11px] font-bold text-[#0066FF] leading-tight truncate">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.RAHUL_CONSULTATION.name}</p>
              <p className="text-[10px] text-[#0066FF]/80 leading-tight truncate mt-0.5">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.RAHUL_CONSULTATION.type}</p>
              <p className="text-[10px] text-[#0066FF]/80 leading-tight truncate">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.RAHUL_CONSULTATION.doc}</p>
            </div>
          </div>

          {/* WED 10:00 */}
          <div className="absolute top-[160px] left-[33.33%] w-[16.66%] p-1 h-[65px]">
            <div className="w-full h-full bg-[#F0F7FF] border border-[#0066FF]/30 rounded-lg p-2 hover:shadow-md cursor-pointer transition-shadow z-10">
              <p className="text-[11px] font-bold text-[#0066FF] leading-tight truncate">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.RAHUL_CONSULTATION.name}</p>
              <p className="text-[10px] text-[#0066FF]/80 leading-tight truncate mt-0.5">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.RAHUL_CONSULTATION.type}</p>
              <p className="text-[10px] text-[#0066FF]/80 leading-tight truncate">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.RAHUL_CONSULTATION.doc}</p>
            </div>
          </div>

          {/* WED 11:00 */}
          <div className="absolute top-[240px] left-[50%] w-[16.66%] p-1 h-[65px]">
            <div className="w-full h-full bg-[#F0F7FF] border border-[#0066FF]/30 rounded-lg p-2 hover:shadow-md cursor-pointer transition-shadow z-10">
              <p className="text-[11px] font-bold text-[#0066FF] leading-tight truncate">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.JAMES_WHITENING.name}</p>
              <p className="text-[10px] text-[#0066FF]/80 leading-tight truncate mt-0.5">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.JAMES_WHITENING.type}</p>
              <p className="text-[10px] text-[#0066FF]/80 leading-tight truncate">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.JAMES_WHITENING.doc}</p>
            </div>
          </div>

          {/* FRI 09:00 */}
          <div className="absolute top-[80px] left-[83.33%] w-[16.66%] p-1 h-[65px]">
            <div className="w-full h-full bg-[#F0F7FF] border border-[#0066FF]/30 rounded-lg p-2 hover:shadow-md cursor-pointer transition-shadow z-10">
              <p className="text-[11px] font-bold text-[#0066FF] leading-tight truncate">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.SOPHIE_WHITENING.name}</p>
              <p className="text-[10px] text-[#0066FF]/80 leading-tight truncate mt-0.5">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.SOPHIE_WHITENING.type}</p>
              <p className="text-[10px] text-[#0066FF]/80 leading-tight truncate">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.SOPHIE_WHITENING.doc}</p>
            </div>
          </div>

          {/* FRI 16:00 */}
          <div className="absolute top-[640px] left-[83.33%] w-[16.66%] p-1 h-[65px]">
            <div className="w-full h-full bg-[#F0F7FF] border border-[#0066FF]/30 rounded-lg p-2 hover:shadow-md cursor-pointer transition-shadow z-10">
              <p className="text-[11px] font-bold text-[#0066FF] leading-tight truncate">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.NOAH_CONSULTATION.name}</p>
              <p className="text-[10px] text-[#0066FF]/80 leading-tight truncate mt-0.5">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.NOAH_CONSULTATION.type}</p>
              <p className="text-[10px] text-[#0066FF]/80 leading-tight truncate">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.NOAH_CONSULTATION.doc}</p>
            </div>
          </div>

          {/* MON 14:00 (Yellow) */}
          <div className="absolute top-[480px] left-[16.66%] w-[16.66%] p-1 h-[65px]">
            <div className="w-full h-full bg-[#FEF9C3]/50 border border-[#F59E0B]/30 rounded-lg p-2 hover:shadow-md cursor-pointer transition-shadow z-10">
              <p className="text-[11px] font-bold text-[#D97706] leading-tight truncate">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.EMMA_CLEANING.name}</p>
              <p className="text-[10px] text-[#D97706]/80 leading-tight truncate mt-0.5">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.EMMA_CLEANING.type}</p>
              <p className="text-[10px] text-[#D97706]/80 leading-tight truncate">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.EMMA_CLEANING.doc}</p>
            </div>
          </div>

          {/* TUE 15:00 (Yellow) */}
          <div className="absolute top-[560px] left-[33.33%] w-[16.66%] p-1 h-[65px]">
            <div className="w-full h-full bg-[#FEF9C3]/50 border border-[#F59E0B]/30 rounded-lg p-2 hover:shadow-md cursor-pointer transition-shadow z-10">
              <p className="text-[11px] font-bold text-[#D97706] leading-tight truncate">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.LUCAS_XRAY.name}</p>
              <p className="text-[10px] text-[#D97706]/80 leading-tight truncate mt-0.5">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.LUCAS_XRAY.type}</p>
              <p className="text-[10px] text-[#D97706]/80 leading-tight truncate">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.LUCAS_XRAY.doc}</p>
            </div>
          </div>

          {/* THU 14:00 (Red) */}
          <div className="absolute top-[480px] left-[66.66%] w-[16.66%] p-1 h-[65px]">
            <div className="w-full h-full bg-[#FEE2E2]/50 border border-[#EF4444]/30 rounded-lg p-2 hover:shadow-md cursor-pointer transition-shadow z-10">
              <p className="text-[11px] font-bold text-[#B91C1C] leading-tight truncate">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.SOPHIE_ROOT_CANAL.name}</p>
              <p className="text-[10px] text-[#B91C1C]/80 leading-tight truncate mt-0.5">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.SOPHIE_ROOT_CANAL.type}</p>
              <p className="text-[10px] text-[#B91C1C]/80 leading-tight truncate">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.SOPHIE_ROOT_CANAL.doc}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
