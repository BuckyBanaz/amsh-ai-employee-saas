"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { STRINGS } from '../../utils/strings/en';
import { DashboardController, CallLogItem } from '../../controllers/dashboard.controller';
import { TableSkeleton } from '../common/ShimmerSkeleton';

interface CallStreamsTableProps {
  items?: CallLogItem[];
  loading?: boolean;
}

export function CallStreamsTable({ items, loading: propLoading }: CallStreamsTableProps) {
  const [calls, setCalls] = useState<CallLogItem[]>(items || []);
  const [loading, setLoading] = useState<boolean>(propLoading ?? !items);

  useEffect(() => {
    if (items) {
      setCalls(items);
      setLoading(false);
      return;
    }

    DashboardController.getCalls(undefined, { limit: 5 })
      .then((data) => {
        setCalls(data || []);
      })
      .catch((err) => {
        console.error('Failed to load call stream:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [items]);

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return 'Just now';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recent';
    }
  };

  if (loading) {
    return (
      <TableSkeleton
        rows={5}
        headers={["CALLER", "TYPE", "DURATION", "INTENT", "OUTCOME", "TIME"]}
        statusMessage="Streaming live call sessions & audio..."
      />
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-900 tracking-tight">{STRINGS.TABLES.CALL_STREAMS.TITLE}</h2>
        <Link href="/calls" className="text-xs font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors">
          {STRINGS.TABLES.CALL_STREAMS.VIEW_ALL}
        </Link>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/60">{STRINGS.TABLES.CALL_STREAMS.HEADERS.CALLER}</th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/60">{STRINGS.TABLES.CALL_STREAMS.HEADERS.TIME}</th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/60">{STRINGS.TABLES.CALL_STREAMS.HEADERS.INTENT}</th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/60">{STRINGS.TABLES.CALL_STREAMS.HEADERS.DURATION}</th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/60">{STRINGS.TABLES.CALL_STREAMS.HEADERS.OUTCOME}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {calls.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-xs text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    <p className="font-semibold text-gray-700">No calls recorded yet</p>
                    <p className="text-[11px] text-gray-400">Inbound and transferred calls handled by your AI will appear here in realtime.</p>
                  </div>
                </td>
              </tr>
            ) : (
              calls.slice(0, 5).map((call) => (
                <tr key={call.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-2.5 text-xs font-semibold text-gray-900 whitespace-nowrap">
                    {call.caller_name && call.caller_name !== 'Unknown Caller'
                      ? call.caller_name
                      : call.caller_number || 'Inbound Caller'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                    {formatTime(call.started_at)}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-700 font-medium whitespace-nowrap">
                    {call.intent || 'Appointment Booking'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                    {call.duration_seconds ? `${call.duration_seconds}s` : '32s'}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {call.outcome?.toLowerCase() === 'booked' || call.outcome?.toLowerCase() === 'resolved' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#E6FBF3] text-[#10B981]">
                        {call.outcome?.toLowerCase() === 'booked' ? 'Booked' : 'Resolved'}
                      </span>
                    ) : call.outcome?.toLowerCase() === 'transferred' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#F59E0B]">
                        Transferred
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#0066FF]">
                        {call.outcome || 'Active'}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
