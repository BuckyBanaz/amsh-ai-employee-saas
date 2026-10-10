"use client";

import React from "react";
import InteractiveGlobe from "./InteractiveGlobe";

const COMPLIANCE_ITEMS = [
  {
    code: "HIPAA",
    region: "United States",
    title: "HIPAA Compliant & BAA Ready",
    desc: "Protected Health Information (PHI) is masked in real-time. Automated Business Associate Agreements (BAA) available on request.",
    icon: "🇺🇸",
  },
  {
    code: "GDPR",
    region: "UK & European Union",
    title: "GDPR & Data Protection",
    desc: "Right to be forgotten, strict tenant isolation, encrypted audio recordings stored within sovereign EU / UK regions.",
    icon: "🇪🇺",
  },
  {
    code: "DPDP 2023",
    region: "India & APAC",
    title: "DPDP Act 2023 & DISHA Ready",
    desc: "Strict consent logging, purpose-bound appointment collection, and zero third-party training data leakage.",
    icon: "🇮🇳",
  },
  {
    code: "SOC 2",
    region: "Global Infrastructure",
    title: "SOC 2 Type II & ISO 27001",
    desc: "Carrier-grade WebRTC and SIP telephony gateways with 256-bit TLS/SRTP in-transit and AES-256 at-rest encryption.",
    icon: "🌐",
  },
];

const GLOBAL_STATS = [
  { label: "Country Coverage", value: "50+ Countries", sub: "Local DIDs in US, UK, IN, UAE, AU" },
  { label: "Global Edge Latency", value: "<180ms", sub: "Anycast edge-accelerated STT/TTS" },
  { label: "Platform SLA", value: "99.99%", sub: "High-availability redundant clusters" },
  { label: "Languages & Accents", value: "20+ Global", sub: "Hindi, English, Spanish, Arabic, etc." },
];

export default function GlobalPresence() {
  return (
    <section id="global" className="py-24 bg-white border-b border-slate-200/80 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="font-mono-ui text-xs uppercase tracking-[0.16em] text-blue-600 font-bold">
            GLOBAL TELEPHONY &amp; HEALTHCARE COMPLIANCE
          </span>
          <h2 className="font-sora text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-950 mt-3">
            Deployed across 50+ countries. Compliant worldwide.
          </h2>
          <p className="mt-4 text-slate-600 text-base leading-relaxed">
            Whether your practice is a dental clinic in Mumbai, a medical spa in Beverly Hills, or a private Harley Street clinic in London, AMSh provides local phone numbers, native accents, and medical data compliance.
          </p>
        </div>

        {/* 3D Globe + Specifications Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left: 21st.dev Interactive 3D Globe */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <InteractiveGlobe />
          </div>

          {/* Right: Global Healthcare Compliance Badges */}
          <div className="lg:col-span-6 space-y-4">
            <h3 className="font-sora text-xl font-bold text-slate-900 mb-2">
              Enterprise Healthcare Data Security
            </h3>

            <div className="grid gap-3.5 sm:grid-cols-2">
              {COMPLIANCE_ITEMS.map((item) => (
                <div
                  key={item.code}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 shadow-2xs space-y-2 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base">{item.icon}</span>
                    <span className="font-mono-ui text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {item.code}
                    </span>
                  </div>
                  <h4 className="font-sora text-sm font-bold text-slate-900">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Global Telephony Capabilities */}
            <div className="p-4 rounded-2xl border border-blue-200/80 bg-blue-50/50 mt-4">
              <div className="flex items-start gap-3">
                <span className="p-2 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </span>
                <div className="text-xs">
                  <h5 className="font-sora font-bold text-slate-900">Keep your existing clinic number or get a local DID</h5>
                  <p className="text-slate-600 mt-1 leading-relaxed">
                    Instantly forward calls from Airtel, Jio, AT&amp;T, Verizon, Vodafone, or BT to AMSh. Dedicated local phone numbers available across North America, Europe, Australia, GCC, and Asia.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Global Telemetry Metrics */}
        <div className="mt-16 pt-10 border-t border-slate-200/80 grid grid-cols-2 md:grid-cols-4 gap-6 font-mono-ui">
          {GLOBAL_STATS.map((s) => (
            <div key={s.label}>
              <div className="text-[10.5px] uppercase font-bold text-slate-400">{s.label}</div>
              <div className="text-2xl font-extrabold text-slate-950 mt-1">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
