"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardController, AgentItem } from '../../../controllers/dashboard.controller';
import { ApiService } from '../../../services/api.service';
import { StorageService } from '../../../services/storage.service';
import { API_ENDPOINTS } from '../../../utils/api_endpoints';
import { FormSkeleton } from '../../common/ShimmerSkeleton';

export function AppointmentsTab() {
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [noticeHours, setNoticeHours] = useState(24);
  const [allowCancel, setAllowCancel] = useState(true);
  const [allowReschedule, setAllowReschedule] = useState(true);

  const [gcalIntegration, setGcalIntegration] = useState<any | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchIntegrationsList = async (): Promise<any[]> => {
    try {
      if (typeof (DashboardController as any)?.getIntegrations === 'function') {
        return await (DashboardController as any).getIntegrations();
      }
      const bId = StorageService.getBusinessId();
      if (bId) {
        return await ApiService.get<any[]>(API_ENDPOINTS.INTEGRATIONS.DASHBOARD_LIST(bId));
      }
    } catch (err) {
      console.warn('Failed to load integrations list:', err);
    }
    return [];
  };

  useEffect(() => {
    Promise.all([
      DashboardController.getAgent().catch(() => null),
      fetchIntegrationsList(),
    ])
      .then(([agent, integrations]) => {
        if (agent) {
          const limits = agent.config?.limits || {};
          if (limits.buffer_minutes) setBufferMinutes(limits.buffer_minutes);
          if (limits.notice_hours) setNoticeHours(limits.notice_hours);

          const toggles = agent.config?.toggles || {};
          if (toggles.allow_cancel !== undefined) setAllowCancel(toggles.allow_cancel);
          if (toggles.allow_reschedule !== undefined) setAllowReschedule(toggles.allow_reschedule);
        }
        if (Array.isArray(integrations)) {
          const found = integrations.find(
            (i: any) => i.provider === 'google_calendar' && i.status === 'connected'
          );
          setGcalIntegration(found || null);
        }
      })
      .catch((err) => console.warn('Failed to load appointment rules or integrations:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSyncNow = async () => {
    try {
      setIsSyncing(true);
      setSyncFeedback(null);
      let res: { synced: number; skipped: number };
      if (typeof (DashboardController as any)?.syncGoogleCalendar === 'function') {
        res = await (DashboardController as any).syncGoogleCalendar();
      } else {
        const bId = StorageService.getBusinessId() || '';
        res = await ApiService.post<{ synced: number; skipped: number }>(
          API_ENDPOINTS.INTEGRATIONS.GOOGLE_SYNC(bId),
          {}
        );
      }
      setSyncFeedback(`Successfully synced ${res.synced} upcoming appointment(s) to Google Calendar.`);
      setTimeout(() => setSyncFeedback(null), 5000);
    } catch (err: any) {
      console.error('Failed to sync Google Calendar:', err);
      setSyncFeedback(err?.message || 'Failed to sync with Google Calendar.');
      setTimeout(() => setSyncFeedback(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

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
    return <FormSkeleton title="Loading appointment scheduling rules..." />;
  }

  const isConnected = !!gcalIntegration;
  const connectedEmail = gcalIntegration?.config?.email || '';

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
          <div className={`border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all ${
            isConnected ? 'bg-[#F0F7FF] border-[#0066FF]/20' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center gap-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs ${
                isConnected ? 'bg-[#0066FF]' : 'bg-gray-400'
              }`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900">
                  {isConnected ? 'Google Calendar Connected' : 'Google Calendar Not Connected'}
                </div>
                <div className={`text-[11px] font-medium ${isConnected ? 'text-[#0066FF]' : 'text-gray-500'}`}>
                  {isConnected 
                    ? (connectedEmail ? `Account: ${connectedEmail}` : 'Sync active')
                    : 'Connect to auto-sync bookings to your calendar'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {isConnected && (
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="px-4 py-2 border border-[#0066FF] bg-[#0066FF] text-white rounded-lg text-xs font-semibold shadow-2xs hover:bg-[#0052cc] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSyncing ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                      </svg>
                      <span>Sync Now</span>
                    </>
                  )}
                </button>
              )}

              <Link
                href="/integrations"
                className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
              >
                {isConnected ? 'Manage Integration' : 'Connect Calendar'}
              </Link>
            </div>
          </div>

          {/* Sync Feedback Toast */}
          {syncFeedback && (
            <div className={`text-xs p-3 rounded-lg border flex items-center gap-2 animate-in fade-in ${
              syncFeedback.startsWith('Successfully')
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <span>{syncFeedback}</span>
            </div>
          )}

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
