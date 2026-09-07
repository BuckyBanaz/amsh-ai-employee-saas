"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

const appointments = STRINGS.TABLES.APPOINTMENTS.MOCK_DATA;

export function AppointmentsTable() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-gray-50">
        <h2 className="text-[17px] font-bold text-gray-900 tracking-tight">{STRINGS.TABLES.APPOINTMENTS.TITLE}</h2>
        <button className="text-[13px] font-bold text-[#0066FF] hover:text-[#0052cc] transition-colors">
          {STRINGS.TABLES.APPOINTMENTS.VIEW_ALL}
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/50">{STRINGS.TABLES.APPOINTMENTS.HEADERS.TIME}</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/50">{STRINGS.TABLES.APPOINTMENTS.HEADERS.PATIENT}</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/50">{STRINGS.TABLES.APPOINTMENTS.HEADERS.SERVICE}</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/50">{STRINGS.TABLES.APPOINTMENTS.HEADERS.PROVIDER}</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/50">{STRINGS.TABLES.APPOINTMENTS.HEADERS.STATUS}</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/50">{STRINGS.TABLES.APPOINTMENTS.HEADERS.SOURCE}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {appointments.map((appt, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-[13px] font-bold text-gray-900 whitespace-nowrap">{appt.time}</td>
                <td className="px-6 py-4 text-[13px] font-semibold text-gray-700 whitespace-nowrap">{appt.patient}</td>
                <td className="px-6 py-4 text-[13px] text-gray-500 whitespace-nowrap">{appt.service}</td>
                <td className="px-6 py-4 text-[13px] text-gray-500 whitespace-nowrap">{appt.doctor}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {appt.status === 'Confirmed' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#E6FBF3] text-[#10B981]">
                      {STRINGS.TABLES.APPOINTMENTS.STATUS.CONFIRMED}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#FEF3C7] text-[#F59E0B]">
                      {STRINGS.TABLES.APPOINTMENTS.STATUS.PENDING}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-[13px] font-semibold ${appt.source === 'AI' ? 'text-[#0066FF]' : 'text-gray-500'}`}>
                    {appt.source}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
