"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

const patients = STRINGS.TABLES.PATIENTS.MOCK_DATA;

export function PatientsTable() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">{STRINGS.TABLES.PATIENTS.HEADERS.NAME}</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">{STRINGS.TABLES.PATIENTS.HEADERS.PHONE}</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">{STRINGS.TABLES.PATIENTS.HEADERS.EMAIL}</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">{STRINGS.TABLES.PATIENTS.HEADERS.LAST_VISIT}</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">{STRINGS.TABLES.PATIENTS.HEADERS.UPCOMING}</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">{STRINGS.TABLES.PATIENTS.HEADERS.STATUS}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {patients.map((patient, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-3.5 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center font-bold text-xs shadow-2xs group-hover:bg-[#0066FF] group-hover:text-white transition-colors">
                      {patient.initials}
                    </div>
                    <span className="text-xs font-semibold text-gray-900">{patient.name}</span>
                  </div>
                </td>
                <td className="px-3.5 py-2 text-xs text-gray-500 whitespace-nowrap">{patient.phone}</td>
                <td className="px-3.5 py-2 text-xs text-gray-500 whitespace-nowrap">{patient.email}</td>
                <td className="px-3.5 py-2 text-xs text-gray-500 whitespace-nowrap">{patient.lastAppt}</td>
                <td className="px-3.5 py-2 whitespace-nowrap">
                  {patient.nextAppt !== '-' ? (
                    <span className="text-xs font-semibold text-[#0066FF]">{patient.nextAppt}</span>
                  ) : (
                    <span className="text-xs text-gray-400">{patient.nextAppt}</span>
                  )}
                </td>
                <td className="px-3.5 py-2 whitespace-nowrap">
                  {patient.status === 'ACTIVE' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#E6FBF3] text-[#10B981]">
                      {STRINGS.COMMON.STATUS.ACTIVE}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500">
                      {STRINGS.COMMON.STATUS.INACTIVE}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-gray-100 bg-white">
        <p className="text-xs text-gray-500">
          {STRINGS.TABLES.PATIENTS.PAGINATION.INFO}
        </p>
        <div className="flex items-center gap-1">
          <button className="px-2.5 py-1 bg-white border border-gray-200 text-gray-600 rounded text-xs font-medium hover:bg-gray-50 transition-colors shadow-2xs">{STRINGS.TABLES.PATIENTS.PAGINATION.PREV}</button>
          <button className="w-7 h-7 flex items-center justify-center bg-[#E0E7FF] text-[#0066FF] rounded text-xs font-bold">1</button>
          <button className="w-7 h-7 flex items-center justify-center bg-transparent text-gray-500 hover:bg-gray-50 rounded text-xs font-medium">2</button>
          <button className="w-7 h-7 flex items-center justify-center bg-transparent text-gray-500 hover:bg-gray-50 rounded text-xs font-medium">3</button>
          <button className="px-2.5 py-1 bg-white border border-gray-200 text-gray-600 rounded text-xs font-medium hover:bg-gray-50 transition-colors shadow-2xs">{STRINGS.TABLES.PATIENTS.PAGINATION.NEXT}</button>
        </div>
      </div>
    </div>
  );
}
