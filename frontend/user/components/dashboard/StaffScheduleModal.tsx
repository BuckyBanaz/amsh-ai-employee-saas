"use client";
import React, { useState } from 'react';
import { StaffCardProps } from './StaffCard';

interface StaffScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffCardProps | null;
  onSaveSchedule?: (staffId: string, scheduleData: any) => Promise<void>;
}

const DEFAULT_DAYS = [
  { day: 'Monday', active: true, start: '09:00 AM', end: '05:00 PM' },
  { day: 'Tuesday', active: true, start: '09:00 AM', end: '05:00 PM' },
  { day: 'Wednesday', active: true, start: '09:00 AM', end: '05:00 PM' },
  { day: 'Thursday', active: true, start: '09:00 AM', end: '05:00 PM' },
  { day: 'Friday', active: true, start: '09:00 AM', end: '05:00 PM' },
  { day: 'Saturday', active: true, start: '10:00 AM', end: '02:00 PM' },
  { day: 'Sunday', active: false, start: 'Closed', end: 'Closed' },
];

export function StaffScheduleModal({
  isOpen,
  onClose,
  staff,
  onSaveSchedule,
}: StaffScheduleModalProps) {
  const [schedule, setSchedule] = useState(DEFAULT_DAYS);
  const [status, setStatus] = useState<'Available' | 'On Leave'>(staff?.status || 'Available');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  React.useEffect(() => {
    if (staff?.status) {
      setStatus(staff.status);
    }
  }, [staff]);

  if (!isOpen || !staff) return null;

  const toggleDay = (idx: number) => {
    setSchedule((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, active: !d.active } : d))
    );
  };

  const updateTime = (idx: number, field: 'start' | 'end', val: string) => {
    setSchedule((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, [field]: val } : d))
    );
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (staff.id && onSaveSchedule) {
        await onSaveSchedule(staff.id, { schedule, status });
      }
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to save staff schedule:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center font-bold text-sm shadow-2xs">
              {staff.initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 leading-tight">{staff.name}</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-blue-100 text-blue-700">
                  {staff.role}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{staff.specialty} • Weekly Working Roster</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Quick Status Bar */}
          <div className="flex items-center justify-between p-3.5 bg-gray-50/80 border border-gray-200 rounded-xl">
            <div>
              <div className="text-xs font-bold text-gray-900">Current Availability Status</div>
              <div className="text-[11px] text-gray-500">When On Leave, AI receptionist automatically avoids booking slots for this staff member.</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStatus('Available')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  status === 'Available'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                ● Available
              </button>
              <button
                type="button"
                onClick={() => setStatus('On Leave')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  status === 'On Leave'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                On Leave
              </button>
            </div>
          </div>

          {/* Assigned Services Summary */}
          <div>
            <div className="text-xs font-bold text-gray-800 mb-1.5">Assigned Treatments & Procedures</div>
            <div className="flex flex-wrap gap-1.5">
              {staff.services && staff.services.length > 0 ? (
                staff.services.map((svc, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-blue-50 text-[#0066FF] border border-blue-100 rounded-md text-xs font-semibold">
                    {svc}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-400 italic">No specific services assigned (handles all general inquiries)</span>
              )}
            </div>
          </div>

          {/* Weekly Working Hours Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold text-gray-800">Weekly Shift Schedule</div>
              <span className="text-[11px] text-gray-400">Used by AI to offer open slots</span>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
              {schedule.map((item, idx) => (
                <div
                  key={item.day}
                  className={`flex items-center justify-between px-4 py-2.5 text-xs transition-colors ${
                    item.active ? 'bg-white' : 'bg-gray-50/70 text-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-3 w-32">
                    <input
                      type="checkbox"
                      checked={item.active}
                      onChange={() => toggleDay(idx)}
                      className="rounded border-gray-300 text-[#0066FF] focus:ring-[#0066FF] cursor-pointer"
                    />
                    <span className={`font-semibold ${item.active ? 'text-gray-900' : 'text-gray-400'}`}>
                      {item.day}
                    </span>
                  </div>

                  {item.active ? (
                    <div className="flex items-center gap-2 font-mono">
                      <input
                        type="text"
                        value={item.start}
                        onChange={(e) => updateTime(idx, 'start', e.target.value)}
                        className="px-2 py-1 border border-gray-200 rounded text-xs w-24 text-center focus:border-[#0066FF] outline-none"
                      />
                      <span className="text-gray-400 font-sans">to</span>
                      <input
                        type="text"
                        value={item.end}
                        onChange={(e) => updateTime(idx, 'end', e.target.value)}
                        className="px-2 py-1 border border-gray-200 rounded text-xs w-24 text-center focus:border-[#0066FF] outline-none"
                      />
                    </div>
                  ) : (
                    <span className="text-xs italic text-gray-400 font-medium">Day Off / Not on duty</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/60">
          <div>
            {savedSuccess && (
              <span className="text-xs font-bold text-emerald-600 animate-in fade-in">
                ✓ Roster Schedule Saved!
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 bg-[#0066FF] text-white rounded-lg text-xs font-semibold hover:bg-[#0052cc] transition-colors shadow-2xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isSaving && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
              <span>Save Schedule</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
