"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function AppointmentDetailPanel() {
  return (
    <div className="w-full bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col">
      <div className="p-3.5">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">{STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.TITLE}</h3>
        
        {/* Patient Profile Info */}
        <div className="flex flex-col items-center mb-4">
          <div className="w-10 h-10 rounded-full bg-[#E0E7FF] text-[#0066FF] flex items-center justify-center text-sm font-bold mb-1.5 shadow-2xs">
            RS
          </div>
          <h2 className="text-sm font-bold text-gray-900">Rahul Sharma</h2>
          <p className="text-[11px] text-gray-500 font-medium">First-time clinic patient</p>
        </div>

        <div className="w-full h-px bg-gray-100 mb-3"></div>

        {/* Appointment Data List */}
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs text-gray-500">{STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.SERVICE}</span>
            <span className="text-xs font-semibold text-gray-900 text-right">Dental Consultation</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-xs text-gray-500">{STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.DOCTOR}</span>
            <span className="text-xs font-semibold text-gray-900 text-right">Dr. Sarah Wilson</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-xs text-gray-500">{STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.TIME}</span>
            <span className="text-xs font-semibold text-gray-900 text-right">Tue, Aug 12 · 09:30</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-xs text-gray-500">{STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.DURATION}</span>
            <span className="text-xs font-semibold text-gray-900 text-right">30 Minutes</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">{STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.STATUS}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#E6FBF3] text-[#10B981]">
              Confirmed
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">{STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.SOURCE}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#F0F7FF] text-[#0066FF]">
              AI Booked
            </span>
          </div>
        </div>

        <div className="w-full h-px bg-gray-100 my-3"></div>

        {/* Notes Section */}
        <div className="mb-4">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.NOTES}</h4>
          <div className="bg-gray-50 rounded-md p-2.5 text-xs text-gray-800 leading-relaxed border border-gray-100 font-medium">
            First-time patient, referred by website. Wants to check wisdom teeth alignment.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-1.5">
          <button className="w-full py-1.5 bg-[#0066FF] text-white rounded-md text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors">
            {STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.BUTTONS.MARK_COMPLETED}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button className="py-1.5 bg-white border border-gray-200 text-gray-700 rounded-md text-xs font-semibold hover:bg-gray-50 transition-colors shadow-2xs">
              {STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.BUTTONS.CONFIRM}
            </button>
            <button className="py-1.5 bg-white border border-gray-200 text-gray-700 rounded-md text-xs font-semibold hover:bg-gray-50 transition-colors shadow-2xs">
              {STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.BUTTONS.RESCHEDULE}
            </button>
          </div>
          <button className="w-full py-1.5 bg-white border border-red-200 text-red-500 rounded-md text-xs font-semibold shadow-2xs hover:bg-red-50 transition-colors mt-1">
            {STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.BUTTONS.CANCEL}
          </button>
        </div>
      </div>
    </div>
  );
}
