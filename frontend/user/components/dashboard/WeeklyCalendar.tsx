"use client";
import React from 'react';
import { AppointmentItem } from '../../controllers/dashboard.controller';
import { GlobalLoader } from '../common/GlobalLoader';

export interface DayInfo {
  dayName: string;
  dateNumber: number | string;
  fullDate: string; // YYYY-MM-DD
  isToday: boolean;
}

interface WeeklyCalendarProps {
  weekDays: DayInfo[];
  appointments: AppointmentItem[];
  selectedAppointmentId?: string;
  onSelectAppointment: (appointment: AppointmentItem) => void;
  isLoading?: boolean;
}

const HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00'
];

export function WeeklyCalendar({
  weekDays,
  appointments,
  selectedAppointmentId,
  onSelectAppointment,
  isLoading = false,
}: WeeklyCalendarProps) {
  // Helper to get matching appointments for a specific day and hour
  const getAppointmentsForCell = (fullDate: string, hourStr: string) => {
    const targetHourNum = parseInt(hourStr.split(':')[0], 10);

    return appointments.filter((app) => {
      // Check date match
      const appDate = (app.preferred_date || '').trim();
      if (appDate !== fullDate) return false;

      // Check hour match
      const timeLower = (app.preferred_time || '').toLowerCase().trim();
      const match = timeLower.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
      if (!match) return false;

      let h = parseInt(match[1], 10);
      const ampm = match[3];
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;

      return h === targetHourNum;
    });
  };

  const getCardStyle = (app: AppointmentItem) => {
    const isSelected = app.id === selectedAppointmentId;
    const status = (app.status || '').toLowerCase();

    if (status === 'cancelled') {
      return {
        container: `bg-red-50/80 border ${isSelected ? 'border-red-600 ring-2 ring-red-400 shadow-md' : 'border-red-200'} text-red-900`,
        title: 'text-red-700',
        subtitle: 'text-red-600/80',
      };
    }
    if (status === 'completed') {
      return {
        container: `bg-emerald-50/80 border ${isSelected ? 'border-emerald-600 ring-2 ring-emerald-400 shadow-md' : 'border-emerald-200'} text-emerald-900`,
        title: 'text-emerald-800',
        subtitle: 'text-emerald-700/80',
      };
    }
    return {
      container: `bg-[#F0F7FF] border ${isSelected ? 'border-[#0066FF] ring-2 ring-[#0066FF]/40 shadow-md bg-blue-50' : 'border-[#0066FF]/30'} text-[#0066FF]`,
      title: 'text-[#0066FF]',
      subtitle: 'text-[#0066FF]/80',
    };
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-2xs overflow-hidden">
        <GlobalLoader message="Loading weekly appointments calendar..." size="lg" />
      </div>
    );
  }

  const daysToShow = weekDays.length > 0 ? weekDays : [];

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-2xs p-3.5 overflow-x-auto">
      <div className="min-w-[780px]">
        {/* Header Row */}
        <div 
          className="grid mb-2"
          style={{ gridTemplateColumns: `52px repeat(${daysToShow.length}, minmax(0, 1fr))` }}
        >
          <div className="text-[10px] font-bold text-gray-400"></div> {/* Corner */}
          {daysToShow.map((d, i) => (
            <div key={i} className="flex flex-col items-center justify-center py-1">
              <span className={`text-xs font-bold ${d.isToday ? 'text-[#0066FF]' : 'text-gray-900'}`}>
                {d.dayName}
              </span>
              <span className={`text-[11px] font-medium mt-0.5 ${
                d.isToday
                  ? 'w-6 h-6 flex items-center justify-center bg-[#E0E7FF] text-[#0066FF] rounded-md font-bold shadow-2xs'
                  : 'text-gray-500'
              }`}>
                {d.dateNumber}
              </span>
            </div>
          ))}
        </div>

        {/* Calendar Grid Rows */}
        <div className="relative border-t border-l border-dashed border-gray-200 mt-1">
          {HOURS.map((hour, hourIdx) => (
            <div
              key={hourIdx}
              className="grid min-h-[52px]"
              style={{ gridTemplateColumns: `52px repeat(${daysToShow.length}, minmax(0, 1fr))` }}
            >
              {/* Hour Label */}
              <div className="border-b border-r border-dashed border-gray-200 -ml-px flex items-start justify-center pt-1.5 bg-gray-50/30">
                <span className="text-[10px] font-semibold text-gray-400">{hour}</span>
              </div>

              {/* Day Cells */}
              {daysToShow.map((day, dayIdx) => {
                const cellApps = getAppointmentsForCell(day.fullDate, hour);

                return (
                  <div
                    key={dayIdx}
                    className="border-b border-r border-dashed border-gray-200 p-0.5 relative flex flex-col gap-1 transition-colors hover:bg-gray-50/40"
                  >
                    {cellApps.map((app) => {
                      const style = getCardStyle(app);
                      return (
                        <div
                          key={app.id}
                          onClick={() => onSelectAppointment(app)}
                          className={`w-full rounded p-1.5 cursor-pointer transition-all shadow-2xs z-10 flex flex-col justify-center ${style.container}`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <p className={`text-[10px] font-bold leading-tight truncate ${style.title}`}>
                              {app.customer_name || 'Guest Patient'}
                            </p>
                            <span className="text-[9px] font-semibold opacity-75 shrink-0">
                              {app.preferred_time}
                            </span>
                          </div>
                          <p className={`text-[9px] leading-tight truncate mt-0.5 ${style.subtitle}`}>
                            {app.service_name || 'Consultation'} · {app.doctor_name || 'Duty Doctor'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
