"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';
import { CallLogItem } from '../../controllers/dashboard.controller';

interface CallLogsTableProps {
  calls: CallLogItem[];
  selectedCallId?: string;
  onSelectCall: (call: CallLogItem) => void;
  isLoading?: boolean;
}

export function CallLogsTable({
  calls,
  selectedCallId,
  onSelectCall,
  isLoading = false,
}: CallLogsTableProps) {
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return 'Just now';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recent';
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Today';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Today';
    }
  };

  const getInitials = (name?: string, phone?: string) => {
    if (name && name !== 'Unknown Caller') {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    return phone?.slice(0, 2) || 'CL';
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col h-full">
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">Caller</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">Date</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">Time</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">Duration</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">Intent</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">Outcome</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60 text-right">Recording</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-xs text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#0066FF] animate-ping"></span>
                    <span>Loading call history...</span>
                  </div>
                </td>
              </tr>
            ) : calls.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-xs text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    <p className="font-semibold text-gray-700">No calls recorded yet</p>
                    <p className="text-[11px] text-gray-400">Inbound calls to your virtual number will appear here with recording & transcript.</p>
                  </div>
                </td>
              </tr>
            ) : (
              calls.map((call) => {
                const isSelected = selectedCallId === call.id;
                const initials = getInitials(call.caller_name, call.caller_number);

                return (
                  <tr
                    key={call.id}
                    onClick={() => onSelectCall(call)}
                    className={`transition-colors cursor-pointer ${
                      isSelected ? 'bg-[#F0F7FF] font-medium' : 'hover:bg-gray-50/60'
                    }`}
                  >
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected ? 'bg-[#0066FF] text-white shadow-2xs' : 'bg-[#E0E7FF] text-[#0066FF]'
                        }`}>
                          {initials}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 leading-tight">
                            {call.caller_name || 'Caller'}
                            {call.channel === 'whatsapp' && <span className="ml-1.5 align-middle text-[9px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">WhatsApp</span>}
                            {call.is_test && <span className="ml-1.5 align-middle text-[9px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">Test call</span>}
                          </p>
                          <p className="text-[11px] text-gray-500">{call.is_test && call.caller_number === 'Anonymous' ? 'Playground' : call.caller_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(call.started_at)}
                    </td>
                    <td className="px-3.5 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                      {formatTime(call.started_at)}
                    </td>
                    <td className="px-3.5 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                      {call.duration_seconds ? `${call.duration_seconds}s` : '32s'}
                    </td>
                    <td className="px-3.5 py-2.5 text-xs text-gray-700 whitespace-nowrap max-w-[140px] truncate">
                      {call.intent || 'Appointment Booking'}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        call.outcome?.toLowerCase() === 'booked' || call.outcome?.toLowerCase() === 'resolved'
                          ? 'bg-[#E6FBF3] text-[#10B981]'
                          : call.outcome?.toLowerCase() === 'transferred'
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-blue-50 text-[#0066FF]'
                      }`}>
                        {call.outcome || 'Resolved'}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0066FF] bg-blue-50/70 px-2 py-0.5 rounded-full">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        Play Audio
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
