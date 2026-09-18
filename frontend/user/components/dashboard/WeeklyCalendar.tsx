"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

const DAYS = STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.DAYS;
const HOURS = STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.HOURS;

export function WeeklyCalendar() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-2xs p-3.5 overflow-x-auto">
      <div className="min-w-[650px]">
        {/* Header Row */}
        <div className="grid grid-cols-6 mb-2">
          <div className="text-[10px] font-bold text-gray-400"></div> {/* Empty corner */}
          {DAYS.map((d, i) => (
            <div key={i} className="flex flex-col items-center justify-center">
              <span className={`text-xs font-bold ${d.active ? 'text-[#0066FF]' : 'text-gray-900'}`}>{d.day}</span>
              <span className={`text-[11px] font-medium mt-0.5 ${
                d.active ? 'w-5 h-5 flex items-center justify-center bg-[#E0E7FF] text-[#0066FF] rounded-md font-bold' : 'text-gray-500'
              }`}>
                {d.date}
              </span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="relative border-t border-l border-dashed border-gray-100 mt-1">
          
          {/* Background Grid Lines */}
          {HOURS.map((hour, i) => (
            <div key={i} className="grid grid-cols-6 h-[46px]">
              <div className="border-b border-r border-dashed border-gray-100 -ml-px flex items-start justify-center pt-1">
                <span className="text-[10px] font-semibold text-gray-400">{hour}</span>
              </div>
              <div className="border-b border-r border-dashed border-gray-100"></div>
              <div className="border-b border-r border-dashed border-gray-100"></div>
              <div className="border-b border-r border-dashed border-gray-100"></div>
              <div className="border-b border-r border-dashed border-gray-100"></div>
              <div className="border-b border-r border-dashed border-gray-100"></div>
            </div>
          ))}

          {/* Absolute Positioned Appointments (scaled to 46px per hour slot) */}
          {/* WED 09:00 */}
          <div className="absolute top-[46px] left-[50%] w-[16.66%] p-0.5 h-[42px]">
            <div className="w-full h-full bg-[#F0F7FF] border border-[#0066FF]/40 rounded p-1.5 hover:shadow-md cursor-pointer transition-shadow shadow-2xs z-10 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-[#0066FF] leading-none truncate">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.RAHUL_CONSULTATION.name}</p>
              <p className="text-[9px] text-[#0066FF]/80 leading-none truncate mt-0.5">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.RAHUL_CONSULTATION.type} · {STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.RAHUL_CONSULTATION.doc}</p>
            </div>
          </div>

          {/* TUE 10:00 */}
          <div className="absolute top-[92px] left-[33.33%] w-[16.66%] p-0.5 h-[42px]">
            <div className="w-full h-full bg-[#F0F7FF] border border-[#0066FF]/40 rounded p-1.5 hover:shadow-md cursor-pointer transition-shadow shadow-2xs z-10 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-[#0066FF] leading-none truncate">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.RAHUL_CONSULTATION.name}</p>
              <p className="text-[9px] text-[#0066FF]/80 leading-none truncate mt-0.5">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.RAHUL_CONSULTATION.type} · {STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.RAHUL_CONSULTATION.doc}</p>
            </div>
          </div>

          {/* WED 11:00 */}
          <div className="absolute top-[138px] left-[50%] w-[16.66%] p-0.5 h-[42px]">
            <div className="w-full h-full bg-[#F0F7FF] border border-[#0066FF]/40 rounded p-1.5 hover:shadow-md cursor-pointer transition-shadow shadow-2xs z-10 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-[#0066FF] leading-none truncate">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.JAMES_WHITENING.name}</p>
              <p className="text-[9px] text-[#0066FF]/80 leading-none truncate mt-0.5">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.JAMES_WHITENING.type} · {STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.JAMES_WHITENING.doc}</p>
            </div>
          </div>

          {/* FRI 09:00 */}
          <div className="absolute top-[46px] left-[83.33%] w-[16.66%] p-0.5 h-[42px]">
            <div className="w-full h-full bg-[#F0F7FF] border border-[#0066FF]/40 rounded p-1.5 hover:shadow-md cursor-pointer transition-shadow shadow-2xs z-10 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-[#0066FF] leading-none truncate">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.SOPHIE_WHITENING.name}</p>
              <p className="text-[9px] text-[#0066FF]/80 leading-none truncate mt-0.5">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.SOPHIE_WHITENING.type} · {STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.SOPHIE_WHITENING.doc}</p>
            </div>
          </div>

          {/* MON 14:00 (Yellow) */}
          <div className="absolute top-[276px] left-[16.66%] w-[16.66%] p-0.5 h-[42px]">
            <div className="w-full h-full bg-[#FEF9C3]/70 border border-[#F59E0B]/40 rounded p-1.5 hover:shadow-md cursor-pointer transition-shadow shadow-2xs z-10 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-[#D97706] leading-none truncate">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.EMMA_CLEANING.name}</p>
              <p className="text-[9px] text-[#D97706]/80 leading-none truncate mt-0.5">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.EMMA_CLEANING.type} · {STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.EMMA_CLEANING.doc}</p>
            </div>
          </div>

          {/* TUE 15:00 (Yellow) */}
          <div className="absolute top-[322px] left-[33.33%] w-[16.66%] p-0.5 h-[42px]">
            <div className="w-full h-full bg-[#FEF9C3]/70 border border-[#F59E0B]/40 rounded p-1.5 hover:shadow-md cursor-pointer transition-shadow shadow-2xs z-10 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-[#D97706] leading-none truncate">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.LUCAS_XRAY.name}</p>
              <p className="text-[9px] text-[#D97706]/80 leading-none truncate mt-0.5">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.LUCAS_XRAY.type} · {STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.LUCAS_XRAY.doc}</p>
            </div>
          </div>

          {/* THU 14:00 (Red) */}
          <div className="absolute top-[276px] left-[66.66%] w-[16.66%] p-0.5 h-[42px]">
            <div className="w-full h-full bg-[#FEE2E2]/70 border border-[#EF4444]/40 rounded p-1.5 hover:shadow-md cursor-pointer transition-shadow shadow-2xs z-10 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-[#B91C1C] leading-none truncate">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.SOPHIE_ROOT_CANAL.name}</p>
              <p className="text-[9px] text-[#B91C1C]/80 leading-none truncate mt-0.5">{STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.SOPHIE_ROOT_CANAL.type} · {STRINGS.DASHBOARD.COMPONENTS.WEEKLY_CALENDAR.EVENTS.SOPHIE_ROOT_CANAL.doc}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

