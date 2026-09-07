"use client";
import React from 'react';

import { STRINGS } from '../../utils/strings/en';

const streams = STRINGS.TABLES.CALL_STREAMS.MOCK_DATA;

export function CallStreamsTable() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] overflow-hidden mt-6">
      <div className="flex items-center justify-between p-6 border-b border-gray-50">
        <h2 className="text-[17px] font-bold text-gray-900 tracking-tight">{STRINGS.TABLES.CALL_STREAMS.TITLE}</h2>
        <button className="text-[13px] font-bold text-[#0066FF] hover:text-[#0052cc] transition-colors">
          {STRINGS.TABLES.CALL_STREAMS.VIEW_ALL}
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/50">{STRINGS.TABLES.CALL_STREAMS.HEADERS.CALLER}</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/50">{STRINGS.TABLES.CALL_STREAMS.HEADERS.TIME}</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/50">{STRINGS.TABLES.CALL_STREAMS.HEADERS.INTENT}</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/50">{STRINGS.TABLES.CALL_STREAMS.HEADERS.DURATION}</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/50">{STRINGS.TABLES.CALL_STREAMS.HEADERS.OUTCOME}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {streams.map((stream, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-[13px] font-bold text-gray-900 whitespace-nowrap">{stream.caller}</td>
                <td className="px-6 py-4 text-[13px] text-gray-500 whitespace-nowrap">{stream.time}</td>
                <td className="px-6 py-4 text-[13px] text-gray-600 font-medium whitespace-nowrap">{stream.intent}</td>
                <td className="px-6 py-4 text-[13px] text-gray-500 whitespace-nowrap">{stream.duration}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {stream.outcome === 'Booked' || stream.outcome === 'Resolved' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#E6FBF3] text-[#10B981]">
                      {stream.outcome}
                    </span>
                  ) : stream.outcome === 'Transferred' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#FEF3C7] text-[#F59E0B]">
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
