"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardController, AgentItem } from '../../../controllers/dashboard.controller';

export function AppointmentsTab() {
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [noticeHours, setNoticeHours] = useState(24);
  const [allowCancel, setAllowCancel] = useState(true);
  const [allowReschedule, setAllowReschedule] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    DashboardController.getAgent()
      .then((agent: AgentItem) => {
        if (agent) {
          const limits = agent.config?.limits || {};
          if (limits.buffer_minutes) setBufferMinutes(limits.buffer_minutes);
          if (limits.notice_hours) setNoticeHours(limits.notice_hours);

          const toggles = agent.config?.toggles || {};
          if (toggles.allow_cancel !== undefined) setAllowCancel(toggles.allow_cancel);
          if (toggles.allow_reschedule !== undefined) setAllowReschedule(toggles.allow_reschedule);
        }
      })
      .catch((err) => console.warn('Failed to load appointment rules:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);

      await DashboardController.updateAgent({
        config: {
          limits: {
            buffer_minutes: bufferMinutes,
            notice_hours: noticeHours,
          },
          toggles: {
            allow_cancel: allowCancel,
            allow_reschedule: allowReschedule,
          },
        },
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save appointment rules:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-8 shadow-xs flex items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 border-2 border-[#0066FF]/20 border-t-[#0066FF] rounded-full animate-spin mr-3"></div>
        <span className="text-xs text-gray-500 font-medium">Loading appointment scheduling rules...</span>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 bg-white border border-gray-100 rounded-xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-gray-900">Appointment Scheduling</h2>
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 animate-in fade-in">
              ✓ Appointment rules updated!
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-6">Set constraints and rules for how the AI interacts with your calendar.</p>
        
        <div className="space-y-6">
          
          {/* Calendar Status Card */}
          <div className="bg-[#F0F7FF] border border-[#0066FF]/20 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shrink-0 shadow-xs">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900">Google Calendar Linked</div>
                <div className="text-[11px] text-[#0066FF] font-medium">Synced 2 minutes ago</div>
              </div>
            </div>
            <Link
              href="/appointments"
              className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              Manage Sync
            </Link>
          </div>

          {/* Limits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1">
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1.5">Minimum Buffer (Minutes)</label>
              <input 
                type="number" 
                min="0" 
                max="60" 
                value={bufferMinutes}
                onChange={(e) => setBufferMinutes(parseInt(e.target.value, 10) || 0)}
                className="w-full border border-gray-200 rounded-lg py-2 px-3 text-xs text-gray-800 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all" 
              />
              <p className="text-[11px] text-gray-400 mt-1.5">Time gap required between back-to-back bookings.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1.5">Advance Notice (Hours)</label>
              <input 
                type="number" 
                min="1" 
                max="72" 
                value={noticeHours}
                onChange={(e) => setNoticeHours(parseInt(e.target.value, 10) || 1)}
                className="w-full border border-gray-200 rounded-lg py-2 px-3 text-xs text-gray-800 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all" 
              />
              <p className="text-[11px] text-gray-400 mt-1.5">How far in advance a booking must be made.</p>
            </div>
          </div>

          <div className="h-px bg-gray-100 w-full my-2"></div>

          {/* Toggles */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-gray-900">Allow Cancellations</div>
                <div className="text-[11px] text-gray-500 mt-0.5">Callers can cancel their existing appointments via AI.</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={allowCancel}
                  onChange={(e) => setAllowCancel(e.target.checked)}
                />
                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#10B981]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-gray-900">Allow Rescheduling</div>
                <div className="text-[11px] text-gray-500 mt-0.5">Callers can shift their existing appointments to a new slot.</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={allowReschedule}
                  onChange={(e) => setAllowReschedule(e.target.checked)}
                />
                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#10B981]"></div>
              </label>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-[#0066FF] text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
              {isSaving ? 'Saving...' : 'Save Appointments Rules'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
