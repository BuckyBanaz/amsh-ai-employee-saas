"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { STRINGS } from '../../../utils/strings/en';

interface Holiday {
  id: string;
  name: string;
  date: string;
}

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
  const [holidays, setHolidays] = useState<Holiday[]>([
    { id: '1', name: 'Christmas Day', date: '2026-12-25' },
    { id: '2', name: "New Year's Day", date: '2027-01-01' },
  ]);
  const [isAddingHoliday, setIsAddingHoliday] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

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

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName.trim() || !newHolidayDate) return;
    setHolidays([
      ...holidays,
      { id: Date.now().toString(), name: newHolidayName.trim(), date: newHolidayDate }
    ]);
    setNewHolidayName('');
    setNewHolidayDate('');
    setIsAddingHoliday(false);
  };

  const handleDeleteHoliday = (id: string) => {
    setHolidays(holidays.filter(h => h.id !== id));
  };

  return (
    <div className="w-full max-w-3xl bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1.5">{STRINGS.ONBOARDING.HOURS.TITLE}</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          {STRINGS.ONBOARDING.HOURS.SUBTITLE}
        </p>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
        <div className="flex items-center justify-between bg-gray-50 px-3 sm:px-4 py-2 border-b border-gray-200">
          <div className="w-[120px] text-[11px] font-bold text-gray-500 uppercase tracking-wider">{STRINGS.ONBOARDING.HOURS.DAY_HEADER}</div>
          <div className="flex-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider">{STRINGS.ONBOARDING.HOURS.TIME_RANGES_HEADER}</div>
        </div>

        <div className="divide-y divide-gray-200">
          {schedule.map((item) => (
            <div key={item.day} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 px-3 sm:px-4 py-2.5 ${!item.active ? 'bg-gray-50/50 opacity-60' : 'bg-white'}`}>
              
              {/* Day Toggle */}
              <div className="flex items-center gap-2.5 w-[120px] pt-1 md:pt-0 shrink-0">
                <button 
                  type="button" 
                  onClick={() => toggleDay(item.day)}
                  className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus:outline-none ${item.active ? 'bg-[#0066FF]' : 'bg-gray-200'}`}
                >
                  <span className={`pointer-events-none absolute left-0.5 inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${item.active ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <span className="text-xs font-semibold text-gray-900">{item.day}</span>
              </div>

              {/* Time Ranges */}
              <div className="flex-1 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 w-full">
                {item.active ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2 w-full">
                      {item.ranges.map((range, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          {idx > 0 && <span className="text-xs text-gray-400 font-medium px-0.5">&amp;</span>}
                          <div className="flex items-center bg-white border border-gray-200 rounded shadow-xs overflow-hidden focus-within:ring-1 focus-within:ring-[#0066FF]">
                            <input 
                              type="time" 
                              value={range.start}
                              onChange={(e) => updateRange(item.day, idx, 'start', e.target.value)}
                              className="px-1.5 py-0.5 text-xs text-gray-900 focus:outline-none bg-transparent"
                            />
                          </div>
                          <span className="text-xs text-gray-400">{STRINGS.ONBOARDING.HOURS.TO}</span>
                          <div className="flex items-center bg-white border border-gray-200 rounded shadow-xs overflow-hidden focus-within:ring-1 focus-within:ring-[#0066FF]">
                            <input 
                              type="time" 
                              value={range.end}
                              onChange={(e) => updateRange(item.day, idx, 'end', e.target.value)}
                              className="px-1.5 py-0.5 text-xs text-gray-900 focus:outline-none bg-transparent"
                            />
                          </div>
                          <button 
                            onClick={() => removeRange(item.day, idx)}
                            className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      ))}
                      
                      <button 
                        onClick={() => addRange(item.day)}
                        className="flex items-center gap-1 text-xs font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors ml-1"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        {STRINGS.ONBOARDING.HOURS.ADD_BREAK}
                      </button>
                    </div>
                  </>
                ) : (
                  <span className="text-xs font-medium text-gray-500">{STRINGS.ONBOARDING.HOURS.CLOSED}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Holidays & Special Closures */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-0.5">{STRINGS.ONBOARDING.HOURS.HOLIDAYS_TITLE}</h2>
            <p className="text-xs text-gray-500">
              {STRINGS.ONBOARDING.HOURS.HOLIDAYS_SUBTITLE}
            </p>
          </div>
          {!isAddingHoliday && (
            <button 
              type="button" 
              onClick={() => setIsAddingHoliday(true)}
              className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-900 font-semibold text-xs px-3 py-1.5 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              {STRINGS.ONBOARDING.HOURS.ADD_HOLIDAY}
            </button>
          )}
        </div>

        {/* Add Holiday Form */}
        {isAddingHoliday && (
          <form onSubmit={handleAddHoliday} className="border border-[#0066FF] bg-blue-50/40 rounded-lg p-3 sm:p-4 space-y-3">
            <h4 className="text-xs font-bold text-gray-900">Add Special Closure / Holiday</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-700 mb-1 block">Holiday / Reason Name</label>
                <input 
                  type="text" 
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  placeholder="e.g. Independence Day, Annual Clinic Renovation"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-700 mb-1 block">Date</label>
                <input 
                  type="date" 
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button 
                type="button" 
                onClick={() => { setIsAddingHoliday(false); setNewHolidayName(''); setNewHolidayDate(''); }}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={!newHolidayName.trim() || !newHolidayDate}
                className="px-4 py-1.5 text-xs font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-md transition-colors disabled:opacity-50"
              >
                Save Holiday
              </button>
            </div>
          </form>
        )}

        {/* Existing Holidays List */}
        {holidays.length > 0 && (
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden bg-white">
            {holidays.map((holiday) => (
              <div key={holiday.id} className="flex items-center justify-between px-3.5 py-2 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="text-xs font-semibold text-gray-900">{holiday.name}</span>
                  <span className="text-[11px] text-gray-500 font-mono">({holiday.date})</span>
                </div>
                <button 
                  type="button"
                  onClick={() => handleDeleteHoliday(holiday.id)}
                  title="Remove Holiday"
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Buttons */}
      <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
        <button 
          type="button" 
          onClick={() => router.push('/onboarding/staff')}
          className="px-5 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.HOURS.BACK_BTN}
        </button>
        <button 
          type="button" 
          onClick={() => router.push('/onboarding/ai-receptionist')}
          className="px-6 py-2 rounded-lg bg-[#0066FF] text-white text-sm font-medium hover:bg-[#0052cc] transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.HOURS.CONTINUE_BTN}
        </button>
      </div>
    </div>
  );
}
