"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { STRINGS } from '../../../utils/strings/en';

const initialSchedule = [
  { day: 'Monday', active: true, ranges: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }] },
  { day: 'Tuesday', active: true, ranges: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }] },
  { day: 'Wednesday', active: true, ranges: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }] },
  { day: 'Thursday', active: true, ranges: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }] },
  { day: 'Friday', active: true, ranges: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '17:00' }] },
  { day: 'Saturday', active: true, ranges: [{ start: '09:00', end: '13:00' }] },
  { day: 'Sunday', active: false, ranges: [] },
];

export default function HoursOnboardingPage() {
  const router = useRouter();
  const [schedule, setSchedule] = useState(initialSchedule);

  const toggleDay = (dayName: string) => {
    setSchedule(schedule.map(d => 
      d.day === dayName ? { ...d, active: !d.active, ranges: d.active ? [] : [{ start: '09:00', end: '17:00' }] } : d
    ));
  };

  const addRange = (dayName: string) => {
    setSchedule(schedule.map(d => 
      d.day === dayName ? { ...d, ranges: [...d.ranges, { start: '09:00', end: '17:00' }] } : d
    ));
  };

  const updateRange = (dayName: string, idx: number, field: 'start' | 'end', value: string) => {
    setSchedule(schedule.map(d => {
      if (d.day === dayName) {
        const newRanges = [...d.ranges];
        newRanges[idx] = { ...newRanges[idx], [field]: value };
        return { ...d, ranges: newRanges };
      }
      return d;
    }));
  };

  const removeRange = (dayName: string, idx: number) => {
    setSchedule(schedule.map(d => {
      if (d.day === dayName) {
        return { ...d, ranges: d.ranges.filter((_, i) => i !== idx) };
      }
      return d;
    }));
  };

  return (
    <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-3">{STRINGS.ONBOARDING.HOURS.TITLE}</h1>
        <p className="text-gray-500 leading-relaxed">
          {STRINGS.ONBOARDING.HOURS.SUBTITLE}
        </p>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden mb-8">
        <div className="flex items-center justify-between bg-gray-50 px-6 py-3.5 border-b border-gray-200">
          <div className="w-[140px] text-xs font-bold text-gray-500 uppercase tracking-wider">{STRINGS.ONBOARDING.HOURS.DAY_HEADER}</div>
          <div className="flex-1 text-xs font-bold text-gray-500 uppercase tracking-wider">{STRINGS.ONBOARDING.HOURS.TIME_RANGES_HEADER}</div>
        </div>

        <div className="divide-y divide-gray-200">
          {schedule.map((item) => (
            <div key={item.day} className={`flex items-start md:items-center justify-between px-6 py-4 ${!item.active ? 'bg-gray-50/50 opacity-60' : 'bg-white'}`}>
              
              {/* Day Toggle */}
              <div className="flex items-center gap-3 w-[140px] pt-2 md:pt-0 shrink-0">
                <button 
                  type="button" 
                  onClick={() => toggleDay(item.day)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus:outline-none ${item.active ? 'bg-[#0066FF]' : 'bg-gray-200'}`}
                >
                  <span className={`pointer-events-none absolute left-0.5 inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${item.active ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
                <span className="text-sm font-semibold text-gray-900">{item.day}</span>
              </div>

              {/* Time Ranges */}
              <div className="flex-1 flex flex-col md:flex-row md:items-center gap-4 md:gap-6 w-full">
                {item.active ? (
                  <>
                    <div className="flex flex-wrap items-center gap-3 w-full">
                      {item.ranges.map((range, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          {idx > 0 && <span className="text-sm text-gray-400 font-medium px-1">&amp;</span>}
                          <div className="flex items-center bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-[#0066FF] focus-within:border-transparent">
                            <input 
                              type="time" 
                              value={range.start}
                              onChange={(e) => updateRange(item.day, idx, 'start', e.target.value)}
                              className="px-2 py-1.5 text-sm text-gray-900 focus:outline-none bg-transparent"
                            />
                          </div>
                          <span className="text-sm text-gray-400">{STRINGS.ONBOARDING.HOURS.TO}</span>
                          <div className="flex items-center bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-[#0066FF] focus-within:border-transparent">
                            <input 
                              type="time" 
                              value={range.end}
                              onChange={(e) => updateRange(item.day, idx, 'end', e.target.value)}
                              className="px-2 py-1.5 text-sm text-gray-900 focus:outline-none bg-transparent"
                            />
                          </div>
                          <button 
                            onClick={() => removeRange(item.day, idx)}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-md transition-colors ml-1"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      ))}
                      
                      <button 
                        onClick={() => addRange(item.day)}
                        className="flex items-center gap-1.5 text-sm font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors ml-2"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        {STRINGS.ONBOARDING.HOURS.ADD_BREAK}
                      </button>
                    </div>
                  </>
                ) : (
                  <span className="text-sm font-medium text-gray-500">{STRINGS.ONBOARDING.HOURS.CLOSED}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8 space-y-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-1">{STRINGS.ONBOARDING.HOURS.HOLIDAYS_TITLE}</h2>
          <p className="text-sm text-gray-500">
            {STRINGS.ONBOARDING.HOURS.HOLIDAYS_SUBTITLE}
          </p>
        </div>
        <button type="button" className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-900 font-semibold text-sm px-4 py-2.5 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          {STRINGS.ONBOARDING.HOURS.ADD_HOLIDAY}
        </button>
      </div>

      {/* Footer Buttons */}
      <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
        <button 
          type="button" 
          onClick={() => router.push('/onboarding/staff')}
          className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.HOURS.BACK_BTN}
        </button>
        <button 
          type="button" 
          onClick={() => router.push('/onboarding/ai-receptionist')}
          className="px-8 py-2.5 rounded-lg bg-[#0066FF] text-white font-medium hover:bg-[#0052cc] transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.HOURS.CONTINUE_BTN}
        </button>
      </div>
    </div>
  );
}
