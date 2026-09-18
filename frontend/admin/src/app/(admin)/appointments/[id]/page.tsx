"use client";
import React, { useState } from 'react';
import Link from 'next/link';

export default function AppointmentDetailPage() {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [status, setStatus] = useState<'Confirmed' | 'Completed' | 'Cancelled' | 'No-show'>('Confirmed');

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-300">
      {/* Breadcrumb Navigation */}
      <div className="mb-2.5">
        <Link
          href="/appointments"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#475569] hover:text-[#2563EB] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Appointments
        </Link>
      </div>

      {/* Top Banner */}
      <div className="mb-3 flex items-center justify-between px-3 py-1.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-md text-[#2563EB]">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-wide">
            APPOINTMENT RECORD: APT-8921 · BOOKED VIA AI RECEPTIONIST (SARAH)
          </span>
        </div>
        <span className="text-[10px] font-semibold bg-white/90 px-1.5 py-0.5 rounded border border-[#BFDBFE]">
          Slot Confirmed
        </span>
      </div>

      {/* Appointment Main Header Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-3.5 sm:p-4 shadow-2xs mb-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">
                Teeth Cleaning & Oral Check-up
              </h1>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                status === 'Confirmed' ? 'bg-[#D1FAE5] text-[#065F46]' :
                status === 'Completed' ? 'bg-[#DBEAFE] text-[#1D4ED8]' :
                status === 'Cancelled' ? 'bg-[#FEE2E2] text-[#991B1B]' :
                'bg-[#FFEDD5] text-[#C2410C]'
              }`}>
                ● {status}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EFF6FF] text-[#2563EB]">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="10" rx="2"></rect>
                  <circle cx="12" cy="5" r="2"></circle>
                  <path d="M12 7v4"></path>
                  <line x1="8" y1="16" x2="8" y2="16"></line>
                  <line x1="16" y1="16" x2="16" y2="16"></line>
                </svg>
                Booked by AI
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[#475569] mt-1.5">
              <span className="flex items-center gap-1.5 font-medium">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#94A3B8]">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                </svg>
                Today, Jan 30, 2026 at 11:30 AM (45 min)
              </span>

              <span className="flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#94A3B8]">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                </svg>
                Tenant Business:{' '}
                <Link href="/businesses/b-1" className="font-semibold text-[#2563EB] hover:underline">
                  Smile Dental Clinic
                </Link>
              </span>
            </div>
          </div>

          {/* Quick Status Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setStatus('Completed')}
              className="px-2.5 py-1.5 bg-white border border-[#E2E8F0] hover:bg-gray-50 text-[#0F172A] rounded-md text-xs font-semibold shadow-2xs transition-colors"
            >
              Mark Completed
            </button>
            <button
              onClick={() => setStatus('Cancelled')}
              className="px-2.5 py-1.5 bg-white border border-[#EF4444] hover:bg-red-50 text-[#EF4444] rounded-md text-xs font-semibold shadow-2xs transition-colors"
            >
              Cancel Slot
            </button>
            <button className="px-2.5 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-2xs transition-colors">
              Reschedule
            </button>
          </div>
        </div>

        {/* 4 Quick Info Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-[#E2E8F0]">
          <div className="p-2 sm:p-2.5 bg-[#F8FAFC] rounded-md border border-[#E2E8F0]">
            <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-0.5">
              Patient Name
            </div>
            <div className="text-sm font-bold text-[#0F172A]">
              Sarah Wilson
            </div>
          </div>

          <div className="p-2 sm:p-2.5 bg-[#F8FAFC] rounded-md border border-[#E2E8F0]">
            <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-0.5">
              Assigned Practitioner
            </div>
            <div className="text-sm font-bold text-[#0F172A]">
              Dr. Michael Evans (Dentist)
            </div>
          </div>

          <div className="p-2 sm:p-2.5 bg-[#F8FAFC] rounded-md border border-[#E2E8F0]">
            <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-0.5">
              Service Fee
            </div>
            <div className="text-sm font-bold text-[#10B981]">
              €95.00 (Standard Rate)
            </div>
          </div>

          <div className="p-2 sm:p-2.5 bg-[#F8FAFC] rounded-md border border-[#E2E8F0]">
            <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-0.5">
              AI Booking Confidence
            </div>
            <div className="text-sm font-bold text-[#2563EB] flex items-center gap-1">
              <span>98.4%</span>
              <span className="text-[10px] font-normal text-[#94A3B8]">(Auto)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left 2 Cols (AI Transcript & Timeline), Right 1 Col (Patient Profile & Meta) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-3.5">
          {/* AI Voice Call Recording & Transcript */}
          <div className="bg-white border border-[#E2E8F0] rounded-lg p-3.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">
                  AI Call Recording & Transcript
                </h3>
                <p className="text-xs text-[#475569]">
                  Call handled by AI Receptionist <Link href="/receptionists" className="text-[#2563EB] font-semibold hover:underline">Sarah</Link> · Duration: 2 min 14 sec
                </p>
              </div>
              <span className="text-[10px] font-semibold bg-[#D1FAE5] text-[#065F46] px-1.5 py-0.5 rounded">
                High Audio Quality (Opus)
              </span>
            </div>

            {/* Audio Waveform Simulator */}
            <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md flex items-center gap-2.5">
              <button
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                className="w-7 h-7 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-2xs hover:bg-blue-700 transition-colors flex-shrink-0"
              >
                {isPlayingAudio ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                )}
              </button>

              <div className="flex-1">
                <div className="flex justify-between text-[10px] text-[#475569] mb-1 font-medium">
                  <span>{isPlayingAudio ? '0:42 / 2:14' : '0:00 / 2:14'}</span>
                  <span>Twilio Media Stream</span>
                </div>
                {/* Audio Progress Bar */}
                <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-[#2563EB] rounded-full transition-all duration-300 ${
                      isPlayingAudio ? 'w-2/5' : 'w-0'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Conversational Transcript */}
            <div className="space-y-2 pt-1">
              <div className="p-2.5 rounded-md bg-[#EFF6FF] text-xs border border-[#BFDBFE]/60 leading-relaxed">
                <span className="font-bold text-[#2563EB] flex items-center gap-1.5 mb-0.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="10" rx="2"></rect>
                    <circle cx="12" cy="5" r="2"></circle>
                  </svg>
                  Sarah (AI Receptionist):
                </span>
                &quot;Hello, thank you for calling Smile Dental Clinic. My name is Sarah. Are you looking to schedule an appointment today?&quot;
              </div>

              <div className="p-2.5 rounded-md bg-gray-50 text-xs border border-[#E2E8F0] leading-relaxed">
                <span className="font-bold text-[#0F172A] flex items-center gap-1.5 mb-0.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  Patient (Sarah Wilson):
                </span>
                &quot;Yes please! I need a routine teeth cleaning and oral check-up. Do you have anything available on Friday morning around 11:30?&quot;
              </div>

              <div className="p-2.5 rounded-md bg-[#EFF6FF] text-xs border border-[#BFDBFE]/60 leading-relaxed">
                <span className="font-bold text-[#2563EB] flex items-center gap-1.5 mb-0.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="10" rx="2"></rect>
                    <circle cx="12" cy="5" r="2"></circle>
                  </svg>
                  Sarah (AI Receptionist):
                </span>
                &quot;Let me check our schedule... Yes, Dr. Michael Evans has an opening for a Teeth Cleaning session at 11:30 AM this morning. Shall I lock that in for you?&quot;
              </div>

              <div className="p-2.5 rounded-md bg-gray-50 text-xs border border-[#E2E8F0] leading-relaxed">
                <span className="font-bold text-[#0F172A] flex items-center gap-1.5 mb-0.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  Patient (Sarah Wilson):
                </span>
                &quot;That works great! Please book it under Sarah Wilson.&quot;
              </div>

              <div className="p-2.5 rounded-md bg-[#EFF6FF] text-xs border border-[#BFDBFE]/60 leading-relaxed">
                <span className="font-bold text-[#2563EB] flex items-center gap-1.5 mb-0.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="10" rx="2"></rect>
                    <circle cx="12" cy="5" r="2"></circle>
                  </svg>
                  Sarah (AI Receptionist):
                </span>
                &quot;Perfect, your appointment with Dr. Evans is confirmed for today at 11:30 AM. I have sent a confirmation message to your phone. See you soon!&quot;
              </div>
            </div>
          </div>

          {/* Activity Timeline / Reminders */}
          <div className="bg-white border border-[#E2E8F0] rounded-lg p-3.5 shadow-2xs">
            <h3 className="text-sm font-bold text-[#0F172A] mb-2.5">
              Appointment Timeline & Automated Notifications
            </h3>

            <div className="space-y-2">
              <div className="flex items-start gap-2.5 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] mt-1.5 flex-shrink-0"></div>
                <div>
                  <div className="font-semibold text-[#0F172A]">AI Voice Call Completed & Slot Booked</div>
                  <div className="text-[10px] text-[#94A3B8]">Today at 09:12 AM via Twilio WebSocket Media Stream</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-[#2563EB] mt-1.5 flex-shrink-0"></div>
                <div>
                  <div className="font-semibold text-[#0F172A]">Automated SMS Confirmation Dispatched</div>
                  <div className="text-[10px] text-[#94A3B8]">Today at 09:13 AM · Delivered to +31 6 1234 5678</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-[#2563EB] mt-1.5 flex-shrink-0"></div>
                <div>
                  <div className="font-semibold text-[#0F172A]">Patient Confirmed Attendance via WhatsApp</div>
                  <div className="text-[10px] text-[#94A3B8]">Today at 09:45 AM (&quot;Yes, I will be there!&quot;)</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Patient Card & Practice Meta) */}
        <div className="space-y-3.5">
          {/* Patient Details */}
          <div className="bg-white border border-[#E2E8F0] rounded-lg p-3.5 shadow-2xs space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Patient Contact Card
            </h3>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                <span className="text-[#94A3B8]">Full Name</span>
                <span className="font-semibold text-[#0F172A]">Sarah Wilson</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                <span className="text-[#94A3B8]">Phone Number</span>
                <span className="font-semibold text-[#2563EB]">+31 6 1234 5678</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                <span className="text-[#94A3B8]">Email</span>
                <span className="font-semibold text-[#0F172A]">sarah.w@example.com</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#94A3B8]">Patient Type</span>
                <span className="font-semibold text-[#10B981]">Returning Patient (5 visits)</span>
              </div>
            </div>

            <button className="w-full mt-2 py-1.5 bg-[#F8FAFC] hover:bg-gray-100 border border-[#E2E8F0] rounded-md text-xs font-semibold text-[#0F172A] transition-colors shadow-2xs">
              Send Direct SMS to Patient
            </button>
          </div>

          {/* Business & Room Allocation */}
          <div className="bg-white border border-[#E2E8F0] rounded-lg p-3.5 shadow-2xs space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Clinic & Room Allocation
            </h3>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                <span className="text-[#94A3B8]">Clinic</span>
                <Link href="/businesses/b-1" className="font-semibold text-[#2563EB] hover:underline">
                  Smile Dental Clinic
                </Link>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                <span className="text-[#94A3B8]">Room</span>
                <span className="font-semibold text-[#0F172A]">Operatory Room #2</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#94A3B8]">Assigned AI</span>
                <Link href="/receptionists" className="font-semibold text-[#2563EB] hover:underline">
                  Sarah (Dutch/Eng)
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
