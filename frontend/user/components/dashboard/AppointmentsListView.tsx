"use client";
import React from 'react';
import { AppointmentItem } from '../../controllers/dashboard.controller';

import { TableSkeleton } from '../common/ShimmerSkeleton';

import { ChannelBadge } from './ChannelBadge';
import { channelOfAppointment } from '../../utils/channels';
interface AppointmentsListViewProps {
  appointments: AppointmentItem[];
  selectedAppointmentId?: string;
  onSelectAppointment: (appointment: AppointmentItem) => void;
  onUpdateStatus?: (appointmentId: string, status: string) => Promise<void>;
  onViewCalendar?: (appointment: AppointmentItem) => void;
  isLoading?: boolean;
}

export function AppointmentsListView({
  appointments,
  selectedAppointmentId,
  onSelectAppointment,
  onUpdateStatus,
  onViewCalendar,
  isLoading = false,
}: AppointmentsListViewProps) {
  if (isLoading) {
    return (
      <TableSkeleton
        rows={6}
        headers={["PATIENT", "DOCTOR", "SERVICE", "DATE & TIME", "STATUS"]}
        statusMessage="Loading clinic appointment calendar & roster..."
      />
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-2xs p-12 text-center flex flex-col items-center justify-center min-h-[360px]">
        <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0066FF] flex items-center justify-center mb-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        <h3 className="text-sm font-bold text-gray-900 mb-1">No Appointments Found</h3>
        <p className="text-xs text-gray-500 max-w-sm">
          No appointments match your current filters. You can schedule a new appointment using the button above or adjust filters.
        </p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const s = (status || 'confirmed').toLowerCase();
    if (s === 'confirmed') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#E6FBF3] text-[#10B981]">
          Confirmed
        </span>
      );
    }
    if (s === 'completed') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600">
          Completed
        </span>
      );
    }
    if (s === 'cancelled') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600">
          Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600">
        Pending
      </span>
    );
  };

  const getSourceBadge = (item: AppointmentItem) => (
    <ChannelBadge channel={channelOfAppointment(item)} label={item.channel_label} />
  );

  const getInitials = (name: string) => {
    if (!name) return 'PT';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <th className="py-3 px-4">Patient</th>
              <th className="py-3 px-4">Service</th>
              <th className="py-3 px-4">Doctor</th>
              <th className="py-3 px-4">Schedule</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Source</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {appointments.map((app) => {
              const isSelected = selectedAppointmentId === app.id;
              return (
                <tr
                  key={app.id}
                  onClick={() => onSelectAppointment(app)}
                  className={`cursor-pointer transition-colors hover:bg-blue-50/40 ${
                    isSelected ? 'bg-blue-50/70 font-medium' : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#E0E7FF] text-[#0066FF] flex items-center justify-center text-xs font-bold shrink-0">
                        {getInitials(app.customer_name)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 leading-tight">{app.customer_name || 'Guest Patient'}</p>
                        <p className="text-[11px] text-gray-500">{app.phone_number || 'No phone'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    {app.service_name || 'General Consultation'}
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    {app.doctor_name || 'Duty Doctor'}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-gray-900">{app.preferred_date}</span>
                    <span className="text-gray-500 block text-[11px]">{app.preferred_time}</span>
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(app.status)}
                  </td>
                  <td className="py-3 px-4">
                    {getSourceBadge(app)}
                  </td>
                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {onViewCalendar && (
                        <button
                          onClick={() => onViewCalendar(app)}
                          title="View on Calendar"
                          className="px-2 py-1 text-[11px] font-semibold bg-blue-50 text-[#0066FF] hover:bg-blue-100 rounded transition-colors"
                        >
                          Calendar
                        </button>
                      )}
                      {app.status !== 'completed' && onUpdateStatus && (
                        <button
                          onClick={() => onUpdateStatus(app.id, 'completed')}
                          title="Mark Completed"
                          className="px-2 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded transition-colors"
                        >
                          Done
                        </button>
                      )}
                      {app.status !== 'cancelled' && onUpdateStatus && (
                        <button
                          onClick={() => onUpdateStatus(app.id, 'cancelled')}
                          title="Cancel"
                          className="px-2 py-1 text-[11px] font-semibold bg-red-50 text-red-600 hover:bg-red-100 rounded transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
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
