"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { CallLogItem, DashboardController } from '../../controllers/dashboard.controller';
import { StorageService } from '../../services/storage.service';

interface ConversationInspectorProps {
  call: CallLogItem | null;
  onRefresh?: () => void;
}

export function ConversationInspector({ call, onRefresh }: ConversationInspectorProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!call) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-6 h-full flex flex-col items-center justify-center text-center shadow-xs">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center mb-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        </div>
        <h4 className="text-xs font-bold text-gray-800">No Call Selected</h4>
        <p className="text-[11px] text-gray-400 mt-0.5">Select a conversation to view insights and call details.</p>
      </div>
    );
  }

  // Duration
  const durationMin = Math.floor((call.duration_seconds || 0) / 60);
  const durationSec = (call.duration_seconds || 0) % 60;
  const durationStr = `${durationMin}m ${durationSec < 10 ? '0' : ''}${durationSec}s`;

  // Formatted date & time
  const dateStr = call.started_at
    ? new Date(call.started_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recent Call';

  // Dynamic tenant / business name
  const storedBusiness = StorageService.getBusiness();
  const businessName = call.business_name || storedBusiness?.name || 'Clinic';

  // Dynamic AI Agent Name & Role
  const agentDisplayName = call.agent_name
    ? `${call.agent_name} (${call.agent_role || 'Clinic Receptionist'})`
    : 'Sarah (Clinic Receptionist)';

  // Real Call Classification
  const isTest = Boolean(call.is_test);
  const callType = call.call_type || (isTest ? 'Outbound (Test)' : (call.id.startsWith('out_') ? 'Outbound' : 'Inbound'));
  const channelDisplay = call.channel === 'whatsapp' ? 'WhatsApp' : (call.channel === 'playground' ? 'Web Call (Studio)' : 'Phone Call');

  // Outcome status badge
  const outcomeRaw = (call.outcome || 'resolved').toLowerCase();
  const isLive = outcomeRaw === 'live';
  const isBooked = outcomeRaw === 'booked' || Boolean(call.appointment);
  const isTransferred = outcomeRaw === 'transferred';
  const isFailed = outcomeRaw === 'failed';

  // AI Insights
  const intent = call.intent || (isBooked ? 'Appointment Booking' : isTransferred ? 'Staff Transfer' : 'General Inquiry');
  const sentiment = (call.sentiment || 'positive').toLowerCase();
  const language = call.language || 'Hindi / Hinglish';
  const resolution = isLive ? 'In Progress' : (isFailed ? 'Unresolved' : 'Successful');

  // Real Appointment Information (from linked Transaction or summary extraction)
  const appt = call.appointment;
  const apptService = appt?.service_name || call.summary?.match(/(teeth whitening|dental consultation|dental cleaning|root canal|cleaning|checkup|consultation)/i)?.[0]?.replace(/\b\w/g, (c) => c.toUpperCase()) || 'Dental Consultation';
  const apptDate = appt?.preferred_date 
    ? (appt.preferred_time ? `${appt.preferred_date}, ${appt.preferred_time}` : appt.preferred_date)
    : (call.summary?.match(/(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?(?:, \d{4})?(?: at \d{1,2}(?::\d{2})? ?(?:AM|PM|am|pm))?)/i)?.[0] || 'Scheduled');
  const apptPatient = appt?.patient_name || call.caller_name || 'Caller';
  const apptStatus = appt?.status ? appt.status.charAt(0).toUpperCase() + appt.status.slice(1) : 'Confirmed';
  const apptChannel = appt?.channel || (call.channel === 'whatsapp' ? 'Sent via WhatsApp' : 'Confirmed on Call');

  const handleSaveNote = async () => {
    if (!noteText.trim() || !call.id) return;
    try {
      setIsSavingNote(true);
      await DashboardController.updateCall(call.id, { notes: noteText }, call.business_id);
      setNoteSaved(true);
      setTimeout(() => {
        setNoteSaved(false);
        setNoteOpen(false);
        setNoteText('');
        onRefresh?.();
      }, 1200);
    } catch (err: any) {
      alert(err?.message || 'Failed to save note');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!call.id) return;
    const newOutcome = outcomeRaw === 'resolved' ? 'pending' : 'resolved';
    try {
      setIsUpdatingStatus(true);
      await DashboardController.updateCall(call.id, { outcome: newOutcome }, call.business_id);
      onRefresh?.();
    } catch (err: any) {
      alert(err?.message || 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (!call.id) return;
    if (!confirm('Are you sure you want to permanently delete this conversation log?')) {
      return;
    }
    try {
      setIsDeleting(true);
      await DashboardController.deleteCall(call.id, call.business_id);
      onRefresh?.();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete conversation');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 h-full flex flex-col space-y-4 overflow-y-auto scrollbar-hide shadow-xs text-xs">
      {/* 1. Call Details Card */}
      <div className="space-y-2.5 pb-3 border-b border-gray-100">
        <h3 className="text-[13px] font-bold text-gray-900 tracking-tight">Call Details</h3>

        <div className="space-y-2 text-[11.5px]">
          <div className="flex items-center justify-between text-gray-600">
            <span className="flex items-center gap-2 text-gray-500">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              Phone Number
            </span>
            <span className="font-semibold text-gray-900">{call.caller_number || 'Unknown'}</span>
          </div>

          <div className="flex items-center justify-between text-gray-600">
            <span className="flex items-center gap-2 text-gray-500">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Date & Time
            </span>
            <span className="font-medium text-gray-700">{dateStr}</span>
          </div>

          <div className="flex items-center justify-between text-gray-600">
            <span className="flex items-center gap-2 text-gray-500">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Duration
            </span>
            <span className="font-medium text-gray-700">{durationStr}</span>
          </div>

          <div className="flex items-center justify-between text-gray-600">
            <span className="flex items-center gap-2 text-gray-500">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              Business
            </span>
            <span className="font-semibold text-[#0066FF] hover:underline cursor-pointer">{businessName}</span>
          </div>

          <div className="flex items-center justify-between text-gray-600">
            <span className="flex items-center gap-2 text-gray-500">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              AI Employee
            </span>
            <span className="font-medium text-gray-700">{agentDisplayName}</span>
          </div>

          <div className="flex items-center justify-between text-gray-600">
            <span className="flex items-center gap-2 text-gray-500">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
              Call Type
            </span>
            <span className="font-medium text-gray-700">{callType}</span>
          </div>

          <div className="flex items-center justify-between text-gray-600">
            <span className="flex items-center gap-2 text-gray-500">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
              </svg>
              Channel
            </span>
            <span className="font-medium text-gray-700">{channelDisplay}</span>
          </div>

          <div className="flex items-center justify-between text-gray-600">
            <span className="flex items-center gap-2 text-gray-500">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 14 14"></polyline>
              </svg>
              Status
            </span>
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                Live
              </span>
            ) : isBooked ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-50 text-[#0066FF] border border-blue-200">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF]"></span>
                Booked
              </span>
            ) : isTransferred ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Transferred
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Resolved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. AI Insights Card */}
      <div className="space-y-2.5 pb-3 border-b border-gray-100">
        <h3 className="text-[13px] font-bold text-gray-900 tracking-tight">AI Insights</h3>

        <div className="space-y-2 text-[11.5px]">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Intent</span>
            <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-blue-50 text-[#0066FF] border border-blue-200/60">
              {intent}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-500">Sentiment</span>
            {sentiment === 'positive' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                  <line x1="9" y1="9" x2="9.01" y2="9"></line>
                  <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
                Positive
              </span>
            ) : sentiment === 'negative' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M16 16s-1.5-2-4-2-4 2-4 2"></path>
                  <line x1="9" y1="9" x2="9.01" y2="9"></line>
                  <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
                Negative
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="8" y1="14" x2="16" y2="14"></line>
                  <line x1="9" y1="9" x2="9.01" y2="9"></line>
                  <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
                Neutral
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-500">Language</span>
            <span className="font-semibold text-gray-800">{language}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-500">Resolution</span>
            <span className={`font-semibold ${resolution === 'Successful' ? 'text-gray-800' : resolution === 'In Progress' ? 'text-[#0066FF]' : 'text-rose-600'}`}>
              {resolution}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-500">Transfer to Human</span>
            <span className="font-semibold text-gray-800">{isTransferred ? 'Yes' : 'No'}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-500">Appointment Booked</span>
            <span className={`font-semibold ${isBooked ? 'text-emerald-600' : 'text-gray-500'}`}>
              {isBooked ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Appointment Details Card (Only shown if booked / appointment exists) */}
      <div className="space-y-2.5 pb-3 border-b border-gray-100">
        <h3 className="text-[13px] font-bold text-gray-900 tracking-tight">Appointment Details</h3>

        {isBooked ? (
          <div className="space-y-2 text-[11.5px]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-gray-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                Service
              </span>
              <span className="font-semibold text-gray-900">{apptService}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-gray-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Date & Time
              </span>
              <span className="font-medium text-gray-700">{apptDate}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-gray-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Patient Name
              </span>
              <span className="font-semibold text-gray-900">{apptPatient}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-gray-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Status
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {apptStatus}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-gray-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
                Confirmation
              </span>
              <span className="font-medium text-emerald-700 flex items-center gap-1">
                {apptChannel}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-center space-y-1.5">
            <p className="text-[11px] font-semibold text-gray-700">No appointment scheduled</p>
            <p className="text-[10px] text-gray-400">
              {isTransferred
                ? 'Call was escalated and transferred to staff.'
                : 'Caller inquiry was answered without creating an appointment.'}
            </p>
            <Link
              href="/appointments"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0066FF] hover:underline pt-0.5"
            >
              + Book appointment manually
            </Link>
          </div>
        )}
      </div>

      {/* 4. Actions Grid */}
      <div className="space-y-2 pt-1">
        <h3 className="text-[13px] font-bold text-gray-900 tracking-tight">Actions</h3>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/appointments"
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold text-[11px] transition-colors shadow-2xs"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#0066FF]">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            <span>View in Appt</span>
          </Link>

          <Link
            href="/appointments"
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold text-[11px] transition-colors shadow-2xs"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            <span>Edit Appt</span>
          </Link>

          <button
            type="button"
            disabled={isUpdatingStatus}
            onClick={handleToggleStatus}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold text-[11px] transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={outcomeRaw === 'resolved' ? "text-amber-500" : "text-emerald-500"}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{outcomeRaw === 'resolved' ? 'Unresolve' : 'Mark Resolved'}</span>
          </button>

          <button
            type="button"
            onClick={() => setNoteOpen(!noteOpen)}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold text-[11px] transition-colors shadow-2xs cursor-pointer"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#0066FF]">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <line x1="12" y1="11" x2="12" y2="17"></line>
              <line x1="9" y1="14" x2="15" y2="14"></line>
            </svg>
            <span>Add Note</span>
          </button>
        </div>

        {noteOpen && (
          <div className="p-2.5 bg-blue-50/70 border border-blue-200/70 rounded-xl space-y-2 mt-2">
            <textarea
              rows={2}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add internal staff note for this patient..."
              className="w-full text-xs p-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#0066FF]"
            />
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setNoteOpen(false)}
                className="px-2 py-1 text-[10.5px] font-bold text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingNote}
                onClick={handleSaveNote}
                className="px-2.5 py-1 text-[10.5px] font-bold text-white bg-[#0066FF] hover:bg-blue-700 rounded shadow-2xs disabled:opacity-60"
              >
                {noteSaved ? 'Saved!' : isSavingNote ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={isDeleting}
          onClick={handleDeleteConversation}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-bold text-[11px] transition-colors shadow-2xs cursor-pointer mt-1 disabled:opacity-60"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          <span>{isDeleting ? 'Deleting...' : 'Delete Conversation'}</span>
        </button>
      </div>
    </div>
  );
}
