"use client";

import React from "react";
import VoiceCallScope from "./VoiceCallScope";

export default function Hero() {
  return (
    <section className="relative w-full overflow-hidden bg-white pt-24 pb-16 sm:pt-28 sm:pb-20 border-b border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Millimeter Ruler Guide */}
        <div className="tech-millimeter-ruler opacity-40 mb-3" />

        {/* 1. Kicker Strip: 01 24/7 AI FRONT-DESK EMPLOYEE */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono-ui text-[11px] uppercase tracking-[0.14em] text-slate-400 pb-5 border-b border-dashed border-slate-200">
          <div className="flex items-center gap-2 shrink-0">
            <span className="tabular-nums font-bold text-slate-800">01</span>
            <span className="h-px w-5 bg-slate-300"></span>
            <span className="font-semibold text-slate-700">24/7 ai front-desk employee</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-slate-700 font-mono-ui text-[11px] normal-case">
            <span className="text-slate-400 uppercase tracking-widest text-[10px] font-semibold">automating</span>
            <span className="text-slate-300">·</span>

            {/* Phone Calls Logo */}
            <div className="inline-flex items-center gap-1.5 font-medium text-slate-800">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 shadow-2xs shrink-0">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.61 21 3 13.39 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.24 1.01l-2.21 2.2z" />
                </svg>
              </span>
              <span>Phone Calls</span>
            </div>

            <span className="text-slate-300">·</span>

            {/* WhatsApp Logo */}
            <div className="inline-flex items-center gap-1.5 font-medium text-slate-800">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#25D366] text-white shadow-2xs shrink-0">
                <svg className="w-2.8 h-2.8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.05 4.91A9.816 9.816 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01zm-7.01 15.24c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.264 8.264 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.183 8.183 0 0 1 2.41 5.83c.02 4.54-3.68 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.98-.15.17-.29.19-.54.07-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.17-.25.25-.41.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.66.3-.23.25-.86.84-.86 2.06s.88 2.39 1 2.56c.12.17 1.73 2.64 4.19 3.7.59.25 1.05.4 1.41.51.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.17-.48-.29z" />
                </svg>
              </span>
              <span>WhatsApp</span>
            </div>

            <span className="text-slate-300">·</span>

            {/* Email Logo */}
            <div className="inline-flex items-center gap-1.5 font-medium text-slate-800">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-600 shadow-2xs shrink-0">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
              </span>
              <span>Email</span>
            </div>

            <span className="text-slate-300">·</span>

            {/* Calendar Logo */}
            <div className="inline-flex items-center gap-1.5 font-medium text-slate-800">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 shadow-2xs shrink-0">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z" />
                </svg>
              </span>
              <span>Calendar</span>
            </div>
          </div>
        </div>

        {/* 2. Headline + Demo Grid */}
        <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
          {/* Left Column: Headlines, Subtitles, CTA & Metrics */}
          <div className="lg:col-span-7 space-y-6">
            {/* Early Access Pilot Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/90 bg-blue-50/90 px-3 sm:px-3.5 py-1 text-xs text-blue-900 shadow-2xs max-w-full">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
              </span>
              <span className="font-semibold text-blue-700 shrink-0">14-Day Clinic Pilot</span>
              <span className="text-blue-300 select-none">&bull;</span>
              <span className="text-slate-600 truncate sm:overflow-visible text-[11.5px] sm:text-xs">
                Guided Onboarding for Practices
              </span>
            </div>

            {/* Sora Main Headline with Curved Underline Accent */}
            <h1 className="font-sora text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.16] tracking-tight text-slate-950">
              Be One of the First Clinics to Hire an{" "}
              <span className="relative inline-block text-blue-600">
                AI Employee.
                {/* Signature decorative underline */}
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3.5 text-blue-400/80"
                  viewBox="0 0 280 14"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M3 10C70 3 210 3 277 10"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="max-w-xl text-[16px] leading-relaxed text-slate-600 sm:text-[17px]">
              Join the AMSh Pilot Program to test an AI front-desk employee that answers calls, assists with appointment booking, and helps reduce missed enquiries for your practice.
            </p>

            {/* Guided Pilot Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-xl pt-1 text-xs text-slate-700">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
                <span className="text-blue-600 font-bold text-sm">✓</span>
                <span>Guided 1-on-1 onboarding</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
                <span className="text-blue-600 font-bold text-sm">✓</span>
                <span>Direct team feedback channel</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
                <span className="text-blue-600 font-bold text-sm">✓</span>
                <span>Agreed pilot terms</span>
              </div>
            </div>

            {/* CTA Button Group */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("open-pilot-modal"));
                  }
                }}
                className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-3.5 text-[14px] font-mono-ui font-semibold uppercase tracking-wider text-white transition-all shadow-lg shadow-blue-500/25 cursor-pointer active:scale-[0.98]"
              >
                <span>Apply for 14-Day Pilot</span>
                <svg
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>

              <a
                href="https://wa.me/918901414107?text=Hi%20TechyCodex%20%2F%20AMSh%20Team%2C%20I%20am%20interested%20in%20the%2014-Day%20AI%20Receptionist%20Pilot%20for%20my%20clinic.%20Please%20share%20details."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-emerald-300 px-5 py-3.5 text-[13px] font-mono-ui font-medium text-slate-700 hover:text-emerald-700 transition-colors shadow-2xs group"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#25D366] shrink-0" aria-hidden="true">
                  <path d="M19.05 4.91A9.816 9.816 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01zm-7.01 15.24c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.264 8.264 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.183 8.183 0 0 1 2.41 5.83c.02 4.54-3.68 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.98-.15.17-.29.19-.54.07-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.17-.25.25-.41.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.66.3-.23.25-.86.84-.86 2.06s.88 2.39 1 2.56c.12.17 1.73 2.64 4.19 3.7.59.25 1.05.4 1.41.51.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.17-.48-.29z" />
                </svg>
                <span>Chat on WhatsApp</span>
              </a>
            </div>

            {/* Verified Pilot Metrics Strip */}
            <dl className="mt-8 grid grid-cols-3 gap-6 border-t border-slate-200/80 pt-6 max-w-lg font-mono-ui">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-semibold">
                  pilot duration
                </dt>
                <dd className="font-sora mt-1 text-2xl font-bold tabular-nums text-slate-900 tracking-tight">
                  14<span className="text-sm font-normal text-slate-500"> Days</span>
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-semibold">
                  onboarding
                </dt>
                <dd className="font-sora mt-1 text-2xl font-bold tabular-nums text-blue-600 tracking-tight">
                  1<span className="text-sm font-normal text-slate-500">-on-1</span>
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-semibold">
                  calendar sync
                </dt>
                <dd className="font-sora mt-1 text-2xl font-bold tabular-nums text-emerald-600 tracking-tight">
                  2<span className="text-sm font-normal text-slate-500">-Way</span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Right Column: VoiceCallScope Interactive Oscilloscope */}
          <div className="lg:col-span-5 flex justify-center">
            <VoiceCallScope />
          </div>
        </div>
      </div>
    </section>
  );
}
