"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';
import { CustomerItem } from '../../controllers/dashboard.controller';

interface PatientsTableProps {
  patients: CustomerItem[];
  isLoading?: boolean;
}

export function PatientsTable({ patients, isLoading = false }: PatientsTableProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">{STRINGS.TABLES.PATIENTS.HEADERS.NAME}</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">{STRINGS.TABLES.PATIENTS.HEADERS.PHONE}</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">Total Bookings</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">{STRINGS.TABLES.PATIENTS.HEADERS.LAST_VISIT}</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">{STRINGS.TABLES.PATIENTS.HEADERS.STATUS}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-xs text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#0066FF] animate-ping"></span>
                    <span>Loading patient records...</span>
                  </div>
                </td>
              </tr>
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-xs text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <p className="font-semibold text-gray-700">No patient records found</p>
                    <p className="text-[11px] text-gray-400">Callers and appointment bookings are automatically indexed into your CRM registry.</p>
                  </div>
                </td>
              </tr>
            ) : (
              patients.map((patient) => {
                const initials = (patient.name?.slice(0, 2) || 'PT').toUpperCase();
                return (
                  <tr key={patient.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center font-bold text-xs shadow-2xs group-hover:bg-[#0066FF] group-hover:text-white transition-colors">
                          {initials}
                        </div>
                        <span className="text-xs font-semibold text-gray-900">{patient.name}</span>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-xs text-gray-600 whitespace-nowrap">{patient.phone_number}</td>
                    <td className="px-3.5 py-2.5 text-xs font-medium text-gray-700 whitespace-nowrap">{patient.total_bookings ?? 1}</td>
                    <td className="px-3.5 py-2.5 text-xs text-gray-500 whitespace-nowrap">{patient.last_visit || 'Recent'}</td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#E6FBF3] text-[#10B981]">
                        {patient.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-gray-100 bg-white">
        <p className="text-xs text-gray-500">
          Showing {patients.length} {patients.length === 1 ? 'patient' : 'patients'}
        </p>
      </div>
    </div>
  );
}
