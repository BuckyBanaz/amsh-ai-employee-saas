"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

const calls = STRINGS.TABLES.CALL_LOGS.MOCK_DATA;

export function CallLogsTable() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col h-full">
      <div className="overflow-x-auto scrollbar-hide flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">{STRINGS.TABLES.CALL_LOGS.HEADERS.CALLER}</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">{STRINGS.TABLES.CALL_LOGS.HEADERS.DATE}</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">{STRINGS.TABLES.CALL_LOGS.HEADERS.TIME}</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">{STRINGS.TABLES.CALL_LOGS.HEADERS.DURATION}</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">{STRINGS.TABLES.CALL_LOGS.HEADERS.INTENT}</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">{STRINGS.TABLES.CALL_LOGS.HEADERS.AI_OUTCOME}</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">{STRINGS.TABLES.CALL_LOGS.HEADERS.STATUS}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {calls.map((call, idx) => {
              const isSelected = idx === 0;
              
              return (
                <tr key={idx} className={`transition-colors cursor-pointer ${isSelected ? 'bg-[#F0F7FF]' : 'hover:bg-gray-50/50'}`}>
                  <td className="px-3.5 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        isSelected ? 'bg-[#0066FF] text-white shadow-2xs' : 'bg-gray-400 text-white'
                      }`}>
                        {call.initials}
                      </div>
                      <span className={`text-xs font-semibold ${isSelected ? 'text-gray-900 font-bold' : 'text-gray-800'}`}>{call.name}</span>
                    </div>
                  </td>
                  <td className="px-3.5 py-2 text-xs text-gray-500 whitespace-nowrap">{call.date}</td>
                  <td className="px-3.5 py-2 text-xs text-gray-500 whitespace-nowrap">{call.time}</td>
                  <td className="px-3.5 py-2 text-xs text-gray-500 whitespace-nowrap">{call.duration}</td>
                  <td className="px-3.5 py-2 text-xs text-gray-600 whitespace-nowrap max-w-[120px] truncate">{call.intent}</td>
                  <td className="px-3.5 py-2 whitespace-nowrap">
                    <span className={`text-xs font-semibold ${call.outcome === 'Booked' ? 'text-[#0066FF]' : 'text-gray-600'}`}>
                      {call.outcome}
                    </span>
                  </td>
                  <td className="px-3.5 py-2 whitespace-nowrap">
                    {call.status === 'Resolved' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#E6FBF3] text-[#10B981]">
                        {STRINGS.COMMON.STATUS.RESOLVED}
                      </span>
                    )}
                    {call.status === 'Transferred' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#F59E0B]">
                        {STRINGS.COMMON.STATUS.TRANSFERRED}
                      </span>
                    )}
                    {call.status === 'Missed' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEE2E2] text-[#EF4444]">
                        {STRINGS.COMMON.STATUS.MISSED}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
