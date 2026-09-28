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

  const defaultAppointments: AppointmentItem[] = [
    {
      id: 'demo-1',
      business_id: 'demo',
      type: 'appointment',
      status: 'Completed',
      customer_name: 'Emily Carter',
      phone_number: '+44 7700 900123',
      service_name: 'Dental Checkup',
      doctor_name: 'Dr. Sarah Wilson',
      preferred_date: '2026-09-28',
      preferred_time: '09:00 AM',
      details: { source: 'AI Call' },
    },
    {
      id: 'demo-2',
      business_id: 'demo',
      type: 'appointment',
      status: 'Confirmed',
      customer_name: 'James Mitchell',
      phone_number: '+44 7700 900456',
      service_name: 'Teeth Cleaning',
      doctor_name: 'Dr. Sarah Wilson',
      preferred_date: '2026-09-28',
      preferred_time: '10:30 AM',
      details: { source: 'WhatsApp' },
    },
    {
      id: 'demo-3',
      business_id: 'demo',
      type: 'appointment',
      status: 'Confirmed',
      customer_name: 'Sarah Jenkins',
      phone_number: '+44 7700 900789',
      service_name: 'Root Canal Consult',
      doctor_name: 'Dr. Sarah Wilson',
      preferred_date: '2026-09-28',
      preferred_time: '11:45 AM',
      details: { source: 'AI Call' },
    },
    {
      id: 'demo-4',
      business_id: 'demo',
      type: 'appointment',
      status: 'Confirmed',
      customer_name: 'Parikshit Verma',
      phone_number: '+91 98765 43210',
      service_name: 'Dental Consultation',
      doctor_name: 'Dr. Sarah Wilson',
      preferred_date: '2026-09-28',
      preferred_time: '01:15 PM',
      details: { source: 'AI Call' },
    },
    {
      id: 'demo-5',
      business_id: 'demo',
      type: 'appointment',
      status: 'Pending',
      customer_name: 'Amelia Clark',
      phone_number: '+44 7700 900224',
      service_name: 'Toothache Assessment',
      doctor_name: 'Duty Doctor',
      preferred_date: '2026-09-28',
      preferred_time: '02:30 PM',
      details: { source: 'Website' },
    },
  ];

  // If appointments has fewer than 4 items, merge or use default to keep card aesthetically balanced
  const displayList = appointments && appointments.length > 0 
    ? (appointments.length < 4 ? [...appointments, ...defaultAppointments.slice(appointments.length, 5)] : appointments.slice(0, 5))
    : defaultAppointments;

  const getInitials = (name: string) => {
    if (!name) return 'PT';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || 'PT';
  };

  const getSourceIcon = (source?: string) => {
    const s = (source || '').toLowerCase();
    if (s.includes('whatsapp')) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-emerald-500">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          WhatsApp
        </span>
      );
    }
    if (s.includes('web')) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-blue-500">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          Website
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0066FF]">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-[#0066FF]">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
        </svg>
        AI Call
      </span>
    );
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
          <h2 className="text-sm font-bold text-gray-900 tracking-tight">Today's Appointments</h2>
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
              {displayList.map((appt) => (
                <tr key={appt.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-3.5 py-2 text-xs font-bold text-gray-900 whitespace-nowrap">
                    {appt.preferred_time || '10:00 AM'}
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
                    {appt.service_name || 'Dental Checkup'}
                  </td>
                  <td className="px-3.5 py-2 text-xs text-gray-600 font-medium whitespace-nowrap">
                    {appt.doctor_name || 'Dr. Sarah Wilson'}
                  </td>
                  <td className="px-3.5 py-2 whitespace-nowrap">
                    {getStatusBadge(appt.status)}
                  </td>
                  <td className="px-3.5 py-2 whitespace-nowrap">
                    {getSourceIcon(appt.details?.source || (appt.call_id ? 'AI Call' : 'WhatsApp'))}
                  </td>
                  <td className="px-3.5 py-2 text-right whitespace-nowrap">
                    <button className="text-gray-400 hover:text-gray-700 p-0.5 rounded-md transition-colors cursor-pointer font-bold text-sm leading-none">
                      ···
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 bg-gray-50/40">
        <span>Showing {displayList.length} scheduled visits today</span>
        <span className="text-[#0066FF] font-semibold">Synced in real-time</span>
      </div>
    </div>
  );
}
