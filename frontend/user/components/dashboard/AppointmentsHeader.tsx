"use client";
import React, { useRef } from 'react';
import { STRINGS } from '../../utils/strings/en';

interface AppointmentsHeaderProps {
  onNewAppointment: () => void;
  dateRangeText?: string;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  onToday?: () => void;
  onSelectDate?: (dateStr: string) => void;
}

export function AppointmentsHeader({
  onNewAppointment,
  dateRangeText,
  onPrevWeek,
  onNextWeek,
  onToday,
  onSelectDate,
}: AppointmentsHeaderProps) {
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleDateBadgeClick = () => {
    if (dateInputRef.current) {
      if ('showPicker' in HTMLInputElement.prototype) {
        try {
          dateInputRef.current.showPicker();
        } catch {
          dateInputRef.current.focus();
        }
      } else {
        dateInputRef.current.focus();
      }
    }
  };

  return (
    <div className="flex items-center justify-between mb-2 py-0.5 flex-wrap gap-2">
      <div>
        <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-tight">
          {STRINGS.HEADERS.APPOINTMENTS.TITLE}
        </h1>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {STRINGS.HEADERS.APPOINTMENTS.SUBTITLE}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Hidden Date Picker Input for jumping to any future date */}
        <input
          ref={dateInputRef}
          type="date"
          className="sr-only"
          onChange={(e) => {
            if (e.target.value && onSelectDate) {
              onSelectDate(e.target.value);
            }
          }}
        />

        {/* Date / Week Navigator */}
        <div className="flex items-center border border-gray-200 bg-white rounded-lg shadow-2xs overflow-hidden">
          {onPrevWeek && (
            <button
              onClick={onPrevWeek}
              title="Previous week"
              className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors border-r border-gray-100 cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
          )}

          <button
            onClick={handleDateBadgeClick}
            title="Click to jump to any date / week"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>{dateRangeText || 'This Week'}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {onToday && (
            <button
              onClick={onToday}
              title="Jump to current week"
              className="px-2 py-1 text-[11px] font-semibold text-[#0066FF] hover:bg-blue-50 transition-colors border-l border-gray-100 cursor-pointer"
            >
              Today
            </button>
          )}

          {onNextWeek && (
            <button
              onClick={onNextWeek}
              title="Next week"
              className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors border-l border-gray-100 cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          )}
        </div>

        {/* New Appointment Action Button */}
        <button
          type="button"
          onClick={onNewAppointment}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066FF] text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors cursor-pointer active:scale-95"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>{STRINGS.COMMON.BUTTONS.NEW_APPOINTMENT}</span>
        </button>
      </div>
    </div>
  );
}
