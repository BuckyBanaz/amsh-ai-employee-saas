"use client";
import React, { useState } from 'react';
import { STRINGS } from '../../utils/strings/en';
import { AppointmentItem } from '../../controllers/dashboard.controller';

interface AppointmentDetailPanelProps {
  appointment: AppointmentItem | null;
  onUpdateStatus?: (status: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  onNewAppointmentClick?: () => void;
}

export function AppointmentDetailPanel({
  appointment,
  onUpdateStatus,
  onDelete,
  onNewAppointmentClick,
}: AppointmentDetailPanelProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  if (!appointment) {
    return (
      <div className="w-full bg-white border border-gray-100 rounded-xl shadow-2xs p-6 flex flex-col items-center justify-center text-center min-h-[380px]">
        <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0066FF] flex items-center justify-center mb-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
        <h3 className="text-sm font-bold text-gray-900 mb-1">Appointment Details</h3>
        <p className="text-xs text-gray-500 mb-4 max-w-[200px]">
          Select an appointment from the calendar or list to view full details and manage its status.
        </p>
        {onNewAppointmentClick && (
          <button
            onClick={onNewAppointmentClick}
            className="px-3 py-1.5 bg-[#0066FF] text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors cursor-pointer"
          >
            + New Appointment
          </button>
        )}
      </div>
    );
  }

  const handleAction = async (status: string) => {
    if (!onUpdateStatus) return;
    try {
      setLoadingAction(status);
      await onUpdateStatus(status);
    } finally {
      setLoadingAction(null);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'PT';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const status = (appointment.status || 'confirmed').toLowerCase();
  const isAIBooked = appointment.details?.source?.includes('ai') || Boolean(appointment.call_id);

  return (
    <div className="w-full bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col">
      <div className="p-3.5">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
          {STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.TITLE}
        </h3>

        {/* Patient Profile Info */}
        <div className="flex flex-col items-center mb-4">
          <div className="w-11 h-11 rounded-full bg-[#E0E7FF] text-[#0066FF] flex items-center justify-center text-sm font-bold mb-1.5 shadow-2xs">
            {getInitials(appointment.customer_name)}
          </div>
          <h2 className="text-sm font-bold text-gray-900">{appointment.customer_name || 'Guest Patient'}</h2>
          <p className="text-[11px] text-gray-500 font-medium">
            {appointment.phone_number || 'No contact phone'}
          </p>
        </div>

        <div className="w-full h-px bg-gray-100 mb-3"></div>

        {/* Appointment Data List */}
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs text-gray-500">{STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.SERVICE}</span>
            <span className="text-xs font-semibold text-gray-900 text-right">{appointment.service_name || 'General Consultation'}</span>
          </div>

          <div className="flex justify-between items-start">
            <span className="text-xs text-gray-500">{STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.DOCTOR}</span>
            <span className="text-xs font-semibold text-gray-900 text-right">{appointment.doctor_name || 'Duty Doctor'}</span>
          </div>

          <div className="flex justify-between items-start">
            <span className="text-xs text-gray-500">{STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.TIME}</span>
            <span className="text-xs font-semibold text-gray-900 text-right">
              {appointment.preferred_date} · {appointment.preferred_time}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">{STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.STATUS}</span>
            {status === 'confirmed' ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#E6FBF3] text-[#10B981]">
                Confirmed
              </span>
            ) : status === 'completed' ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600">
                Completed
              </span>
            ) : status === 'cancelled' ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600">
                Cancelled
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600">
                Pending
              </span>
            )}
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">{STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.SOURCE}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              isAIBooked ? 'bg-[#F0F7FF] text-[#0066FF]' : 'bg-gray-100 text-gray-600'
            }`}>
              {isAIBooked ? 'AI Voice Booked' : 'Dashboard'}
            </span>
          </div>
        </div>

        <div className="w-full h-px bg-gray-100 my-3"></div>

        {/* Notes Section */}
        <div className="mb-4">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
            {STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.NOTES}
          </h4>
          <div className="bg-gray-50 rounded-md p-2.5 text-xs text-gray-800 leading-relaxed border border-gray-100 font-medium min-h-[48px]">
            {appointment.notes || appointment.details?.notes || 'No special notes provided for this appointment.'}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-1.5">
          {status !== 'completed' && (
            <button
              onClick={() => handleAction('completed')}
              disabled={Boolean(loadingAction)}
              className="w-full py-1.5 bg-[#0066FF] text-white rounded-md text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors cursor-pointer disabled:opacity-50"
            >
              {loadingAction === 'completed' ? 'Updating...' : STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.BUTTONS.MARK_COMPLETED}
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            {status !== 'confirmed' && (
              <button
                onClick={() => handleAction('confirmed')}
                disabled={Boolean(loadingAction)}
                className="py-1.5 bg-white border border-gray-200 text-gray-700 rounded-md text-xs font-semibold hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {loadingAction === 'confirmed' ? 'Updating...' : STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.BUTTONS.CONFIRM}
              </button>
            )}
            {status !== 'pending' && (
              <button
                onClick={() => handleAction('pending')}
                disabled={Boolean(loadingAction)}
                className="py-1.5 bg-white border border-gray-200 text-gray-700 rounded-md text-xs font-semibold hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {loadingAction === 'pending' ? 'Updating...' : 'Set Pending'}
              </button>
            )}
          </div>

          {status !== 'cancelled' && (
            <button
              onClick={() => handleAction('cancelled')}
              disabled={Boolean(loadingAction)}
              className="w-full py-1.5 bg-white border border-red-200 text-red-500 rounded-md text-xs font-semibold shadow-2xs hover:bg-red-50 transition-colors mt-1 cursor-pointer disabled:opacity-50"
            >
              {loadingAction === 'cancelled' ? 'Cancelling...' : STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.BUTTONS.CANCEL}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
