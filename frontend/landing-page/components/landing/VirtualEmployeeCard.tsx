"use client";

import React, { useState } from "react";
import { motion } from "motion/react";

interface EmployeePersona {
  id: string;
  name: string;
  role: string;
  region: string;
  flag: string;
  languages: string[];
  avatarBg: string;
  accentColor: string;
  bio: string;
  sampleQuote: string;
  skills: string[];
  metrics: {
    callsHandled: string;
    bookingRate: string;
    avgLatency: string;
  };
}

const PERSONAS: EmployeePersona[] = [
  {
    id: "priya",
    name: "Priya Sharma",
    role: "Autonomous Patient Coordinator",
    region: "India & South Asia",
    flag: "🇮🇳",
    languages: ["Hindi", "English", "Hinglish"],
    avatarBg: "from-blue-600 to-indigo-700",
    accentColor: "#2563EB",
    bio: "Specializes in multi-doctor dental & aesthetic clinics. Fluently bridges Hindi and English mid-call with warm hospital front-desk etiquette.",
    sampleQuote: "“Hello, Sunrise Clinic में आपका स्वागत है! Dr. Sharma कल दोपहर 2 बजे available हैं, क्या मैं स्लॉट बुक कर दूँ?”",
    skills: ["Google Calendar Sync", "WhatsApp Reminders", "Hindi/Hinglish Voice", "EMR Slot Locking"],
    metrics: { callsHandled: "14,200+", bookingRate: "94.2%", avgLatency: "140ms" },
  },
  {
    id: "sarah",
    name: "Sarah Jenkins",
    role: "Clinical Front-Desk Specialist",
    region: "North America (US & Canada)",
    flag: "🇺🇸",
    languages: ["US English", "Spanish (Bilingual)"],
    avatarBg: "from-emerald-600 to-teal-700",
    accentColor: "#059669",
    bio: "Trained on US dental practices, dermatology, and aesthetic medical spas. HIPAA-compliant intake, copay collection, and calendar management.",
    sampleQuote: "“Good morning! Dr. Miller has an opening tomorrow at 10:30 AM for a cleaning. Should I go ahead and reserve that for you?”",
    skills: ["HIPAA Compliant", "Insurance Verification", "Stripe Copays", "Spanish Switch"],
    metrics: { callsHandled: "28,400+", bookingRate: "96.1%", avgLatency: "155ms" },
  },
  {
    id: "emma",
    name: "Emma Watson",
    role: "Practice Receptionist",
    region: "United Kingdom & Europe",
    flag: "🇬🇧",
    languages: ["British English", "French"],
    avatarBg: "from-purple-600 to-violet-800",
    accentColor: "#7C3AED",
    bio: "Designed for private medical practices, physiotherapy, and Harley Street aesthetic consultants. Sophisticated, empathetic British cadence.",
    sampleQuote: "“Good afternoon, Kensington Medical. Dr. Davies is available on Thursday at 3:15 PM. Shall I confirm that visit?”",
    skills: ["GDPR Compliant", "Private Clinic Triage", "WhatsApp CRM", "Payment Links"],
    metrics: { callsHandled: "19,800+", bookingRate: "93.8%", avgLatency: "160ms" },
  },
  {
    id: "fatima",
    name: "Fatima Al-Mansoor",
    role: "Bilingual Patient Concierge",
    region: "UAE & Middle East (GCC)",
    flag: "🇦🇪",
    languages: ["Arabic", "English"],
    avatarBg: "from-amber-600 to-orange-700",
    accentColor: "#D97706",
    bio: "Tailored for premium multi-specialty polyclinics in Dubai and Abu Dhabi. Seamlessly switches between Arabic and English during caller questions.",
    sampleQuote: "“أهلاً بك في عيادة النخبة. دكتور أحمد متاح غداً الساعة الرابعة عصراً. هل تود تأكيد الموعد؟”",
    skills: ["Arabic Natural TTS", "WhatsApp Cloud API", "VIP Patient Flow", "Multi-Branch"],
    metrics: { callsHandled: "11,500+", bookingRate: "95.4%", avgLatency: "170ms" },
  },
];

export default function VirtualEmployeeCard() {
  const [selectedId, setSelectedId] = useState("priya");
  const current = PERSONAS.find((p) => p.id === selectedId) || PERSONAS[0];

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Persona Selection Strip */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
        <span className="font-mono-ui text-xs font-semibold uppercase tracking-wider text-slate-400 mr-2">
          Select Virtual Employee Persona:
        </span>
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelectedId(p.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedId === p.id
                ? "bg-slate-950 text-white shadow-md scale-105"
                : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 shadow-2xs"
            }`}
          >
            <span className="text-base">{p.flag}</span>
            <span>{p.name}</span>
            <span className="text-[10px] font-mono-ui text-slate-400">({p.region.split(" ")[0]})</span>
          </button>
        ))}
      </div>

      {/* Virtual Employee ID Badge & Performance Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.07)]">
        {/* Left Column: Official Digital Employee ID Card */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 via-white to-slate-50 p-6 shadow-2xs relative overflow-hidden">
          {/* Top Lanyard Clip Hole Visual */}
          <div className="w-16 h-3 rounded-full bg-slate-200 mx-auto mb-4 border border-slate-300/60 shadow-inner" />

          {/* Employee Avatar & Status */}
          <div className="text-center">
            <div className="relative inline-block mx-auto mb-3">
              <div className={`w-24 h-24 rounded-2xl bg-gradient-to-tr ${current.avatarBg} text-white font-extrabold text-3xl flex items-center justify-center shadow-lg mx-auto`}>
                {current.name[0]}
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
              </span>
            </div>

            <div className="flex items-center justify-center gap-1.5 mb-1">
              <h3 className="font-sora text-xl font-bold text-slate-950">{current.name}</h3>
              <span className="text-lg">{current.flag}</span>
            </div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider font-mono-ui">
              {current.role}
            </p>

            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold font-mono-ui">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              STATUS: ON DUTY &bull; 24/7/365
            </div>
          </div>

          {/* Quick Specifications */}
          <div className="mt-6 pt-5 border-t border-slate-200/80 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-mono-ui uppercase text-[10px] font-bold">EMPLOYEE ID</span>
              <span className="font-mono-ui font-semibold text-slate-800">AMSH-AI-00{current.id === "priya" ? "1" : current.id === "sarah" ? "2" : current.id === "emma" ? "3" : "4"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-mono-ui uppercase text-[10px] font-bold">FLUENT IN</span>
              <span className="font-semibold text-slate-800">{current.languages.join(" · ")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-mono-ui uppercase text-[10px] font-bold">MONTHLY COST</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                1/10th of human salary
              </span>
            </div>
          </div>

          {/* Badge Footer */}
          <div className="mt-6 pt-3 border-t border-dashed border-slate-200 text-center text-[10px] text-slate-400 font-mono-ui uppercase tracking-widest">
            Verified Autonomous Clinical Agent
          </div>
        </div>

        {/* Right Column: Skills, Performance Metrics & Live Spoken Dialogue */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div>
            <span className="font-mono-ui text-xs font-bold uppercase tracking-wider text-blue-600">
              EMPLOYEE DOSSIER &bull; {current.region}
            </span>
            <h4 className="font-sora text-2xl font-bold text-slate-950 mt-1">
              Trained to handle your clinic&apos;s phone &amp; WhatsApp traffic.
            </h4>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              {current.bio}
            </p>
          </div>

          {/* Live Spoken Sample Bubble */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono-ui font-bold uppercase text-blue-700 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                </svg>
                Spoken Greeting Sample:
              </span>
              <span className="text-[10px] text-slate-400 font-mono-ui">Natural Speech &bull; &lt;180ms</span>
            </div>
            <p className="text-sm font-medium text-slate-900 italic">
              {current.sampleQuote}
            </p>
          </div>

          {/* Core Certified Skills */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono-ui mb-2.5">
              Certified Autonomous Skills:
            </h5>
            <div className="flex flex-wrap gap-2">
              {current.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200/80"
                >
                  <svg className="w-3.5 h-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Real Operational Performance Metrics */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200/80 font-mono-ui">
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-bold">Calls Handled</div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">{current.metrics.callsHandled}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-bold">Slot Booking Rate</div>
              <div className="text-xl font-bold text-emerald-600 mt-0.5">{current.metrics.bookingRate}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-bold">Voice Latency</div>
              <div className="text-xl font-bold text-blue-600 mt-0.5">{current.metrics.avgLatency}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
