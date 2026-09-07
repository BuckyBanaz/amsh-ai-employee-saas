"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

const calls = STRINGS.TABLES.CALL_LOGS.MOCK_DATA;

export function CallLogsTable() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
      <div className="overflow-x-auto scrollbar-hide flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-white">{STRINGS.TABLES.CALL_LOGS.HEADERS.CALLER}</th>
              <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-white">{STRINGS.TABLES.CALL_LOGS.HEADERS.DATE}</th>
              <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-white">{STRINGS.TABLES.CALL_LOGS.HEADERS.TIME}</th>
              <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-white">{STRINGS.TABLES.CALL_LOGS.HEADERS.DURATION}</th>
              <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-white">{STRINGS.TABLES.CALL_LOGS.HEADERS.INTENT}</th>
              <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-white">{STRINGS.TABLES.CALL_LOGS.HEADERS.AI_OUTCOME}</th>
              <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-white">{STRINGS.TABLES.CALL_LOGS.HEADERS.STATUS}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {calls.map((call, idx) => {
              const isSelected = idx === 0; // Highlight the first row as active
              
              return (
                <tr key={idx} className={`transition-colors cursor-pointer ${isSelected ? 'bg-[#F0F7FF]' : 'hover:bg-gray-50/50'}`}>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] ${
                        isSelected ? 'bg-[#0066FF] text-white shadow-md' : 'bg-gray-500 text-white'
                      }`}>
                        {call.initials}
                      </div>
                      <span className={`text-[13px] font-bold ${isSelected ? 'text-gray-900' : 'text-gray-900'}`}>{call.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-[13px] font-medium text-gray-500 whitespace-nowrap">{call.date}</td>
                  <td className="px-4 py-4 text-[13px] font-medium text-gray-500 whitespace-nowrap">{call.time}</td>
                  <td className="px-4 py-4 text-[13px] font-medium text-gray-500 whitespace-nowrap">{call.duration}</td>
                  <td className="px-4 py-4 text-[13px] font-medium text-gray-500 whitespace-nowrap max-w-[120px] truncate">{call.intent}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`text-[13px] font-bold ${call.outcome === 'Booked' ? 'text-[#0066FF]' : 'text-gray-500'}`}>
                      {call.outcome}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {call.status === 'Resolved' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#E6FBF3] text-[#10B981]">
                        {STRINGS.COMMON.STATUS.RESOLVED}
                      </span>
                    )}
                    {call.status === 'Transferred' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#FEF3C7] text-[#F59E0B]">
                        {STRINGS.COMMON.STATUS.TRANSFERRED}
                      </span>
                    )}
                    {call.status === 'Missed' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#FEE2E2] text-[#EF4444]">
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
