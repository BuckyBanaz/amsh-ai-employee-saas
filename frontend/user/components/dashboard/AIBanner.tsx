"use client";
import React from 'react';
import Image from 'next/image';
import aiRobotImg from '../../assets/icons/ai.png';

interface AIBannerProps {
  calls?: number;
  appointments?: number;
  resolutionRate?: string | null;
  callsTrend?: string | null;
  appointmentsTrend?: string | null;
  resolutionTrend?: string | null;
  loading?: boolean;
  businessType?: string;
  onTestClick?: () => void;
}

export function AIBanner({
  calls = 0,
  appointments = 0,
  resolutionRate = null,
  callsTrend = null,
  appointmentsTrend = null,
  resolutionTrend = null,
  loading = false,
  businessType = 'clinic',
  onTestClick,
}: AIBannerProps) {
  return (
    <div className="w-full bg-gradient-to-r from-[#0055FE] via-[#0066FF] to-[#0A7BFF] rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 text-white relative overflow-hidden shadow-md shadow-blue-500/10">
      {/* Background Lighting Gradients & Stars */}
      <div className="absolute -left-16 -top-16 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute right-1/4 -bottom-16 w-60 h-60 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />

      {/* Decorative Sparkles */}
      <div className="absolute left-[36%] top-2 w-1.5 h-1.5 bg-white/60 rounded-full blur-[0.5px] animate-pulse" />
      <div className="absolute right-[40%] bottom-2 w-1.5 h-1.5 bg-blue-200/50 rounded-full blur-[0.5px] animate-pulse" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-3 sm:gap-5">

        {/* Left Column: Pill + Title + Description */}
        <div className="flex-1 min-w-0 text-left">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md rounded-full px-2.5 py-0.5 mb-1.5 border border-white/20 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-white/95">
              AI Receptionist Online
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
            Your {businessType === 'clinic' ? 'clinic' : 'business'} is in good hands today.
          </h2>

          <p className="text-[11px] sm:text-xs text-blue-100/90 mt-0.5 font-medium max-w-md line-clamp-1 sm:line-clamp-none">
            Handling calls, chats, bookings and patient inquiries 24/7.
          </p>
        </div>

        {/* Center: 3D AI Robot Character with Glow */}
        <div className="relative shrink-0 flex items-center justify-center my-[-8px] lg:my-[-12px]">
          <div className="absolute w-24 h-24 bg-cyan-400/25 rounded-full blur-xl pointer-events-none" />
          <div className="relative w-18 h-18 sm:w-20 sm:h-20 lg:w-22 lg:h-22 transform hover:scale-105 transition-transform duration-300">
            <Image
              src={aiRobotImg}
              alt="AI Receptionist Avatar"
              fill
              sizes="(max-width: 640px) 72px, (max-width: 1024px) 80px, 88px"
              className="object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.2)] select-none pointer-events-none"
              priority
            />
          </div>
        </div>

        {/* Right Section: Stats Pills + Action Button */}
        <div className="flex flex-wrap items-center justify-center lg:justify-end gap-3.5 sm:gap-5 shrink-0">
          
          {/* Stat 1: Calls Handled */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                {loading ? (
                  <span className="inline-block w-8 h-4 bg-white/25 animate-pulse rounded" />
                ) : (
                  <span className="text-sm sm:text-base font-black leading-none">{calls}</span>
                )}
                <span className="text-[10px] font-bold text-blue-100">Calls Handled</span>
              </div>
              {callsTrend && <span className="text-[9px] font-bold text-emerald-300 flex items-center gap-0.5 mt-0.5">{callsTrend}</span>}
            </div>
          </div>

          {/* Stat 2: Appointments Booked */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                {loading ? (
                  <span className="inline-block w-8 h-4 bg-white/25 animate-pulse rounded" />
                ) : (
                  <span className="text-sm sm:text-base font-black leading-none">{appointments}</span>
                )}
                <span className="text-[10px] font-bold text-blue-100">Appointments Booked</span>
              </div>
              {appointmentsTrend && <span className="text-[9px] font-bold text-emerald-300 flex items-center gap-0.5 mt-0.5">{appointmentsTrend}</span>}
            </div>
          </div>

          {/* Stat 3: Resolution Rate */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                {loading ? (
                  <span className="inline-block w-8 h-4 bg-white/25 animate-pulse rounded" />
                ) : (
                  <span className="text-sm sm:text-base font-black leading-none">{resolutionRate ?? '—'}</span>
                )}
                <span className="text-[10px] font-bold text-blue-100">Resolution Rate</span>
              </div>
              {resolutionTrend && <span className="text-[9px] font-bold text-emerald-300 flex items-center gap-0.5 mt-0.5">{resolutionTrend}</span>}
            </div>
          </div>

          {/* Action Button: Test AI Receptionist */}
          <button
            onClick={onTestClick}
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 bg-white text-[#0066FF] hover:bg-blue-50 active:scale-95 rounded-full font-extrabold text-[11px] sm:text-xs transition-all shadow-sm cursor-pointer shrink-0"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <span>Test AI Receptionist</span>
          </button>

        </div>

      </div>
    </div>
  );
}
