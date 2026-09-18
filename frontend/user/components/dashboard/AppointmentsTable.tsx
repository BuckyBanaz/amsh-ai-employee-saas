"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

const appointmentStrings = STRINGS.DASHBOARD.COMPONENTS.APPOINTMENTS_TABLE;
const appointments = appointmentStrings.MOCK_DATA;

export function AppointmentsTable() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-900 tracking-tight">{appointmentStrings.TITLE}</h2>
        <button className="text-xs font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors">
          {appointmentStrings.VIEW_ALL}
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/60">{appointmentStrings.HEADERS.TIME}</th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/60">{appointmentStrings.HEADERS.PATIENT}</th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/60">{appointmentStrings.HEADERS.SERVICE}</th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/60">{appointmentStrings.HEADERS.PROVIDER}</th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/60">{appointmentStrings.HEADERS.STATUS}</th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/60">{appointmentStrings.HEADERS.SOURCE}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {appointments.map((appt, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-2.5 text-xs font-semibold text-gray-900 whitespace-nowrap">{appt.time}</td>
                <td className="px-4 py-2.5 text-xs font-medium text-gray-700 whitespace-nowrap">{appt.patient}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{appt.service}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{appt.doctor}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {appt.status === 'Confirmed' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#E6FBF3] text-[#10B981]">
                      {appointmentStrings.STATUS.CONFIRMED}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#F59E0B]">
                      {appointmentStrings.STATUS.PENDING}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <span className={`text-xs font-semibold ${appt.source === 'AI' ? 'text-[#0066FF]' : 'text-gray-500'}`}>
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
