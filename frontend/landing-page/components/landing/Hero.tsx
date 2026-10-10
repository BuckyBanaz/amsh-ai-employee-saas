"use client";

import React from "react";
import VoiceCallScope from "./VoiceCallScope";

export default function Hero() {
  return (
    <section className="relative w-full overflow-hidden bg-white pt-24 pb-16 sm:pt-28 sm:pb-20 border-b border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Millimeter Ruler Guide */}
        <div className="tech-millimeter-ruler opacity-40 mb-3" />

        {/* 1. Kicker Strip: 01 24/7 AI CLINIC RECEPTIONIST ------ HEALTHCARE TELEPHONY & WHATSAPP */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono-ui text-[11px] uppercase tracking-[0.14em] text-slate-400 pb-5 border-b border-dashed border-slate-200">
          <div className="flex items-center gap-2 shrink-0">
            <span className="tabular-nums font-bold text-slate-800">01</span>
            <span className="h-px w-5 bg-slate-300"></span>
            <span className="font-semibold text-slate-700">24/7 ai clinic receptionist</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-slate-500 font-mono-ui">
            <span className="text-slate-400">deployed on</span>
            <span className="text-slate-300">·</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 font-medium text-slate-700">voice call</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 font-medium text-slate-700">whatsapp</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 font-medium text-slate-700">calendar</span>
          </div>
        </div>

        {/* 2. Headline + Demo Grid */}
        <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
          {/* Left Column: Headlines, Subtitles, CTA & Metrics */}
          <div className="lg:col-span-7 space-y-6">
            {/* Pricing / Feature Pill */}
            <div className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-slate-200 bg-slate-50/80 px-3.5 py-1.5 font-mono-ui text-[11.5px] text-slate-600 shadow-2xs">
              <span>
                AI Receptionist from{" "}
                <span className="font-bold text-slate-900">$49</span>/mo
              </span>
              <span aria-hidden="true" className="h-3 w-px bg-slate-300"></span>
              <span>
                Zero Missed Calls &bull;{" "}
                <span className="font-bold text-slate-900">Hindi + English</span>
              </span>
            </div>

            {/* Sora Main Headline with Curved Underline Accent */}
            <h1 className="font-sora text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.18] sm:leading-[1.12] tracking-tight text-slate-950">
              Never miss another{" "}
              <span className="relative inline-block mt-1">
                <span className="relative z-10 text-slate-950">
                  patient phone call
                </span>
                {/* Plivo signature blue decorative underline */}
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3.5 text-blue-500"
                  viewBox="0 0 280 14"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M3 10C70 3 210 3 277 10"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="max-w-xl text-[16px] leading-relaxed text-slate-600 sm:text-[17px]">
              When patients call your clinic, AMSh answers on the first ring, speaks fluent Hindi, English &amp; Hinglish, checks doctor availability in real time, and sends instant WhatsApp confirmations — while your front desk cares for in-clinic patients.
            </p>

            {/* CTA Button Group */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <a
                href="http://localhost:3000/login"
                className="group inline-flex items-center gap-2 rounded-md bg-[#0a0a0a] hover:bg-[#323dfe] px-5 py-3 text-[13.5px] font-mono-ui font-semibold uppercase tracking-wider text-white transition-all shadow-xs cursor-pointer"
              >
                <span>Start for free</span>
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
              </a>

              <span className="font-mono-ui text-[12px] text-slate-500">
                ₹1,000 in free voice credits.
              </span>
            </div>

            {/* Trust Metrics Strip */}
            <dl className="mt-8 grid grid-cols-3 gap-6 border-t border-slate-200/80 pt-6 max-w-lg font-mono-ui">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-semibold">
                  latency
                </dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums text-slate-900 tracking-tight">
                  &lt;180<span className="text-sm font-normal text-slate-500">ms</span>
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-semibold">
                  missed calls
                </dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums text-slate-900 tracking-tight">
                  0<span className="text-sm font-normal text-slate-500">%</span>
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-semibold">
                  languages
                </dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums text-slate-900 tracking-tight">
                  20<span className="text-sm font-normal text-slate-500">+ accents</span>
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
