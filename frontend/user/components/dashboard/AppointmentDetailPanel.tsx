"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

// This is a static representation matching the design.
export function AppointmentDetailPanel() {
  return (
    <div className="w-full bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      <div className="p-6">
        <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-6">{STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.TITLE}</h3>
        
        {/* Patient Profile Info */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#E0E7FF] text-[#0066FF] flex items-center justify-center text-xl font-bold mb-3 shadow-sm">
            RS
          </div>
          <h2 className="text-lg font-bold text-gray-900">Rahul Sharma</h2>
          <p className="text-[13px] text-gray-500 font-medium">First-time clinic patient</p>
        </div>

        <div className="w-full h-px bg-gray-100 mb-6"></div>

        {/* Appointment Data List */}
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <span className="text-[13px] text-gray-500">{STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.SERVICE}</span>
            <span className="text-[13px] font-bold text-gray-900 text-right">Dental Consultation</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-[13px] text-gray-500">{STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.DOCTOR}</span>
            <span className="text-[13px] font-bold text-gray-900 text-right">Dr. Sarah Wilson</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-[13px] text-gray-500">{STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.TIME}</span>
            <span className="text-[13px] font-bold text-gray-900 text-right">Tuesday, Aug 12 · 09:30</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-[13px] text-gray-500">{STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.DURATION}</span>
            <span className="text-[13px] font-bold text-gray-900 text-right">30 Minutes</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-gray-500">{STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.STATUS}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#E6FBF3] text-[#10B981]">
              Confirmed
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-gray-500">{STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.SOURCE}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#F0F7FF] text-[#0066FF]">
              AI Booked
            </span>
          </div>
        </div>

        <div className="w-full h-px bg-gray-100 my-6"></div>

        {/* Notes Section */}
        <div className="mb-8">
          <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">{STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.NOTES}</h4>
          <div className="bg-gray-50 rounded-lg p-4 text-[13px] text-gray-800 leading-relaxed border border-gray-100">
            First-time patient, referred by website. Wants to check wisdom teeth alignment.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button className="w-full py-2.5 bg-[#0066FF] text-white rounded-lg text-[13px] font-bold shadow-sm hover:bg-[#0052cc] transition-colors">
            {STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.BUTTONS.MARK_COMPLETED}
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button className="py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-[13px] font-bold hover:bg-gray-50 transition-colors shadow-sm">
              {STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.BUTTONS.CONFIRM}
            </button>
            <button className="py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-[13px] font-bold hover:bg-gray-50 transition-colors shadow-sm">
              {STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.BUTTONS.RESCHEDULE}
            </button>
          </div>
          <button className="w-full py-2.5 bg-white border border-red-200 text-red-500 rounded-lg text-[13px] font-bold shadow-sm hover:bg-red-50 transition-colors mt-2">
            {STRINGS.DASHBOARD_PANELS.APPOINTMENT_DETAIL.BUTTONS.CANCEL}
          </button>
        </div>
      </div>
    </div>
  );
}
