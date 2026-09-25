"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { STRINGS } from '../../utils/strings/en';
import { DashboardController, AppointmentItem } from '../../controllers/dashboard.controller';

const appointmentStrings = STRINGS.DASHBOARD.COMPONENTS.APPOINTMENTS_TABLE;

interface AppointmentsTableProps {
  items?: AppointmentItem[];
  loading?: boolean;
}

export function AppointmentsTable({ items, loading: propLoading }: AppointmentsTableProps) {
  const [appointments, setAppointments] = useState<AppointmentItem[]>(items || []);
  const [loading, setLoading] = useState<boolean>(propLoading ?? !items);

  useEffect(() => {
    if (items) {
      setAppointments(items);
      setLoading(false);
      return;
    }

    DashboardController.getAppointments()
      .then((data) => {
        setAppointments(data || []);
      })
      .catch((err) => {
        console.error('Failed to load dashboard appointments:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [items]);

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-900 tracking-tight">{appointmentStrings.TITLE}</h2>
        <Link href="/appointments" className="text-xs font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors">
          {appointmentStrings.VIEW_ALL}
        </Link>
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
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#0066FF] animate-ping"></span>
                    <span>Loading appointments...</span>
                  </div>
                </td>
              </tr>
            ) : appointments.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <p className="font-semibold text-gray-700">No appointments booked yet</p>
                    <p className="text-[11px] text-gray-400">Appointments scheduled by your AI receptionist or staff will appear here.</p>
                  </div>
                </td>
              </tr>
            ) : (
              appointments.slice(0, 5).map((appt) => (
                <tr key={appt.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-2.5 text-xs font-semibold text-gray-900 whitespace-nowrap">
                    {appt.preferred_time || '10:00 AM'}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-medium text-gray-700 whitespace-nowrap">
                    {appt.customer_name}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                    {appt.service_name || 'General Consultation'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                    {appt.doctor_name || 'Assigned Staff'}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {appt.status?.toLowerCase() === 'confirmed' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#E6FBF3] text-[#10B981]">
                        {appointmentStrings.STATUS.CONFIRMED}
                      </span>
                    ) : appt.status?.toLowerCase() === 'cancelled' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600">
                        Cancelled
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#F59E0B]">
                        {appointmentStrings.STATUS.PENDING}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className={`text-xs font-semibold ${appt.call_id ? 'text-[#0066FF]' : 'text-gray-500'}`}>
                      {appt.call_id ? 'AI Call' : 'Direct'}
                    </span>
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
