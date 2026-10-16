"use client";
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { STRINGS } from '../../utils/strings/en';
import { DashboardController, AppointmentItem } from '../../controllers/dashboard.controller';
import { StorageService } from '../../services/storage.service';

import { ChannelBadge } from './ChannelBadge';
import { channelOfAppointment } from '../../utils/channels';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
const appointmentStrings = STRINGS.DASHBOARD.COMPONENTS.APPOINTMENTS_TABLE;

interface AppointmentsTableProps {
  items?: AppointmentItem[];
  loading?: boolean;
}

export function AppointmentsTable({ items, loading: propLoading }: AppointmentsTableProps) {
  const [appointments, setAppointments] = useState<AppointmentItem[]>(items || []);
  const [loading, setLoading] = useState<boolean>(propLoading ?? !items);

  const refresh = useCallback(() => {
    if (!StorageService.getToken() || !StorageService.getBusinessId()) {
      setLoading(false);
      return;
    }

    DashboardController.getAppointments()
      .then((data) => {
        setAppointments(data || []);
      })
      .catch((err) => {
        if (!StorageService.getToken()) return;
        console.error('Failed to load dashboard appointments:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (items) {
      setAppointments(items);
      setLoading(false);
      return;
    }

    refresh();
  }, [items, refresh]);

  // The AI moves and books appointments from WhatsApp and calls while the dashboard is open: keep the table current.
  useAutoRefresh(() => {
    if (!items) refresh();
  });

  // Only real bookings are listed; with none, the card says so instead of showing sample patients.
  const displayList = (appointments ?? []).slice(0, 5);

  const getInitials = (name: string) => {
    if (!name) return 'PT';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || 'PT';
  };

  const getStatusBadge = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          Completed
        </span>
      );
    }
    if (s === 'pending') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
          Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50/80 text-emerald-600 border border-emerald-200/60">
        Confirmed
      </span>
    );
  };

  return (
    <div className="bg-white border border-gray-100/90 rounded-2xl shadow-xs overflow-hidden h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 tracking-tight">Recent Appointments</h2>
          <Link href="/appointments" className="text-xs font-bold text-[#0066FF] hover:underline transition-colors">
            View All
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-[#F9FAFB]/70">
                <th className="px-3.5 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">TIME</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">PATIENT</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">SERVICE</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">PROVIDER</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">STATUS</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">SOURCE</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-3.5 py-3"><div className="h-3 w-12 bg-gray-200 rounded" /></td>
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0" />
                        <div className="h-3 w-24 bg-gray-200 rounded" />
                      </div>
                    </td>
                    <td className="px-3.5 py-3"><div className="h-3 w-20 bg-gray-200 rounded" /></td>
                    <td className="px-3.5 py-3"><div className="h-3 w-20 bg-gray-200 rounded" /></td>
                    <td className="px-3.5 py-3"><div className="h-5 w-16 bg-gray-200 rounded-full" /></td>
                    <td className="px-3.5 py-3"><div className="h-5 w-16 bg-gray-200 rounded-full" /></td>
                    <td className="px-3.5 py-3 text-right"><div className="h-3 w-6 bg-gray-200 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : displayList.length === 0 ? (
                <tr><td colSpan={7} className="px-3.5 py-8 text-center text-xs text-gray-500">No appointments yet. Bookings made by the AI or your team will appear here.</td></tr>
              ) : (
                displayList.map((appt) => (
                  <tr key={appt.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-3.5 py-2 text-xs font-bold text-gray-900 whitespace-nowrap">
                      {appt.preferred_time || '—'}
                    </td>
                    <td className="px-3.5 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-100/80 text-[#0066FF] flex items-center justify-center font-bold text-[9px] shrink-0">
                          {getInitials(appt.customer_name)}
                        </span>
                        <span className="text-xs font-bold text-gray-800">{appt.customer_name}</span>
                      </div>
                    </td>
                    <td className="px-3.5 py-2 text-xs text-gray-600 font-medium whitespace-nowrap">
                      {appt.service_name || 'Consultation'}
                    </td>
                    <td className="px-3.5 py-2 text-xs text-gray-600 font-medium whitespace-nowrap">
                      {appt.doctor_name || 'Unassigned'}
                    </td>
                    <td className="px-3.5 py-2 whitespace-nowrap">
                      {getStatusBadge(appt.status)}
                    </td>
                    <td className="px-3.5 py-2 whitespace-nowrap">
                      <ChannelBadge channel={channelOfAppointment(appt)} label={appt.channel_label} />
                    </td>
                    <td className="px-3.5 py-2 text-right whitespace-nowrap">
                      <button className="text-gray-400 hover:text-gray-700 p-0.5 rounded-md transition-colors cursor-pointer font-bold text-sm leading-none">
                        ···
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 bg-gray-50/40">
        <span>Showing {displayList.length} most recent {displayList.length === 1 ? 'booking' : 'bookings'}</span>
        <span className="text-[#0066FF] font-semibold">Synced in real-time</span>
      </div>
    </div>
  );
}
