"use client";
import React from 'react';

import { STRINGS } from '../../utils/strings/en';

const streams = STRINGS.TABLES.CALL_STREAMS.MOCK_DATA;

export function CallStreamsTable() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-900 tracking-tight">{STRINGS.TABLES.CALL_STREAMS.TITLE}</h2>
        <button className="text-xs font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors">
          {STRINGS.TABLES.CALL_STREAMS.VIEW_ALL}
        </button>
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
            {streams.map((stream, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-2.5 text-xs font-semibold text-gray-900 whitespace-nowrap">{stream.caller}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{stream.time}</td>
                <td className="px-4 py-2.5 text-xs text-gray-700 font-medium whitespace-nowrap">{stream.intent}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{stream.duration}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {stream.outcome === 'Booked' || stream.outcome === 'Resolved' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#E6FBF3] text-[#10B981]">
                      {stream.outcome}
                    </span>
                  ) : stream.outcome === 'Transferred' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#F59E0B]">
                      {stream.outcome}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
