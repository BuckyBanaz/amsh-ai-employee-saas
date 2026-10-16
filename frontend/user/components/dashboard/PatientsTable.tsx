"use client";
import React, { useState } from 'react';
import { STRINGS } from '../../utils/strings/en';
import { CustomerItem } from '../../controllers/dashboard.controller';

import { TableSkeleton } from '../common/ShimmerSkeleton';

interface PatientsTableProps {
  patients: CustomerItem[];
  isLoading?: boolean;
  onEdit?: (patient: CustomerItem) => void;
  onRemove?: (patient: CustomerItem) => Promise<void>;
  onHistory?: (patient: CustomerItem) => void;
}

const TH = 'px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60';
const ICON_BTN = 'p-1.5 rounded-lg text-gray-400 transition-colors cursor-pointer';

export function PatientsTable({ patients, isLoading = false, onEdit, onRemove, onHistory }: PatientsTableProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const hasActions = Boolean(onEdit || onRemove || onHistory);

  const remove = async (patient: CustomerItem) => {
    if (!onRemove) return;
    setRemovingId(patient.id);
    try {
      await onRemove(patient);
      setConfirmId(null);
    } finally {
      setRemovingId(null);
    }
  };

  if (isLoading) {
    return (
      <TableSkeleton
        rows={6}
        headers={[
          STRINGS.TABLES.PATIENTS.HEADERS.NAME,
          STRINGS.TABLES.PATIENTS.HEADERS.PHONE,
          "Total Bookings",
          STRINGS.TABLES.PATIENTS.HEADERS.LAST_VISIT,
          "Next Visit",
          STRINGS.TABLES.PATIENTS.HEADERS.STATUS,
        ]}
        statusMessage="Loading patient records & profiles..."
      />
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className={TH}>{STRINGS.TABLES.PATIENTS.HEADERS.NAME}</th>
              <th className={TH}>{STRINGS.TABLES.PATIENTS.HEADERS.PHONE}</th>
              <th className={TH}>Total Bookings</th>
              <th className={TH}>{STRINGS.TABLES.PATIENTS.HEADERS.LAST_VISIT}</th>
              <th className={TH}>Next Visit</th>
              <th className={TH}>{STRINGS.TABLES.PATIENTS.HEADERS.STATUS}</th>
              {hasActions && <th className={`${TH} text-right`}>Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-xs">
            {patients.length === 0 ? (
              <tr>
                <td colSpan={hasActions ? 7 : 6} className="py-12 text-center text-xs text-gray-500">
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
                    <td className="px-3.5 py-2.5 text-xs font-medium text-gray-700 whitespace-nowrap">{patient.total_bookings ?? 0}</td>
                    <td className="px-3.5 py-2.5 text-xs text-gray-500 whitespace-nowrap">{patient.last_visit || '—'}</td>
                    <td className="px-3.5 py-2.5 text-xs text-gray-500 whitespace-nowrap">{patient.next_visit || '—'}</td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          patient.status === 'inactive' ? 'bg-gray-100 text-gray-500' : 'bg-[#E6FBF3] text-[#10B981]'
                        }`}
                      >
                        {patient.status || 'active'}
                      </span>
                    </td>
                    {hasActions && (
                      <td className="px-3.5 py-2 whitespace-nowrap text-right">
                        {confirmId === patient.id ? (
                          <div className="inline-flex items-center gap-1 animate-in fade-in duration-150">
                            <span className="text-[10px] text-gray-500 mr-1">Remove from list?</span>
                            <button
                              onClick={() => remove(patient)}
                              disabled={removingId === patient.id}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-60"
                            >
                              {removingId === patient.id ? 'Removing...' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-0.5">
                            {onHistory && (
                              <button type="button" onClick={() => onHistory(patient)} title="Visit history" aria-label={`Visit history of ${patient.name}`} className={`${ICON_BTN} hover:text-[#0066FF] hover:bg-blue-50`}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path>
                                  <path d="M3 3v5h5"></path>
                                  <path d="M12 7v5l3 2"></path>
                                </svg>
                              </button>
                            )}
                            {onEdit && (
                              <button type="button" onClick={() => onEdit(patient)} title="Edit patient" aria-label={`Edit ${patient.name}`} className={`${ICON_BTN} hover:text-[#0066FF] hover:bg-blue-50`}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                            )}
                            {onRemove && (
                              <button type="button" onClick={() => setConfirmId(patient.id)} title="Remove from list" aria-label={`Remove ${patient.name}`} className={`${ICON_BTN} hover:text-red-600 hover:bg-red-50`}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                                  <path d="M10 11v6"></path>
                                  <path d="M14 11v6"></path>
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
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
