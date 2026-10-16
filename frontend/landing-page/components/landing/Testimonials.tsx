"use client";

import React from "react";
import { Reveal } from "./Motion";

interface Scenario {
  id: string;
  clinic: string;
  location: string;
  metric: string;
  metricSub: string;
  summary: string;
  specialty: string;
  initial: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: "dental",
    clinic: "Dental Practice",
    location: "Mumbai, MH",
    metric: "After-Hours Coverage",
    metricSub: "100% calls answered 24/7",
    specialty: "Dental Care",
    initial: "D",
    summary:
      "Calls that used to reach voicemail after 8 PM are answered on the first ring. Patients book, reschedule, or ask about tooth pain costs, and the confirmed visit lands directly in Google Calendar.",
  },
  {
    id: "aesthetics",
    clinic: "Aesthetic & Skin Clinic",
    location: "Delhi NCR",
    metric: "Instant Replies",
    metricSub: "Phone & WhatsApp in Hindi/English",
    specialty: "Dermatology",
    initial: "A",
    summary:
      "Questions about consultation fees, laser timings, and doctor availability are answered in seconds in the patient's language, allowing front-desk staff to focus entirely on in-clinic patients.",
  },
  {
    id: "multi",
    clinic: "Multi-Specialty Center",
    location: "Bengaluru, KA",
    metric: "Zero Busy Tones",
    metricSub: "5 concurrent calls handled",
    specialty: "Multi-Specialty",
    initial: "M",
    summary:
      "When several lines ring at once during the 10 AM morning rush, AMSh answers every caller in parallel with natural voice, so nobody waits on hold or abandons the call.",
  },
  {
    id: "physio",
    clinic: "Physiotherapy & Rehab",
    location: "Pune, MH",
    metric: "40% Fewer No-Shows",
    metricSub: "Automated WhatsApp reminders",
    specialty: "Rehab & Physio",
    initial: "P",
    summary:
      "Appointment reminders go out via WhatsApp with a 1-tap reschedule option, keeping the doctor's calendar full and reducing empty slots caused by forgotten visits.",
  },
  {
    id: "eye",
    clinic: "Eye Care & Lasik Center",
    location: "Hyderabad, TS",
    metric: "Safety Triage",
    metricSub: "Emergencies transferred instantly",
    specialty: "Ophthalmology",
    initial: "E",
    summary:
      "Post-procedure patients calling late with urgent questions get instant triage. Genuine emergencies are immediately escalated to the on-call doctor's phone line.",
  },
  {
    id: "womens",
    clinic: "Women's Wellness Care",
    location: "Chandigarh",
    metric: "Multilingual Voice",
    metricSub: "Hindi, English & Punjabi support",
    specialty: "Gynecology",
    initial: "W",
    summary:
      "Patients can switch between Hindi and English mid-conversation and AMSh seamlessly adapts, without needing multiple receptionists for different language callers.",
  },
];

const FACTS = [
  { value: "24/7", label: "Always Answering", sub: "Nights, Sundays & holidays" },
  { value: "20+", label: "Languages & Accents", sub: "Hindi, English, Hinglish & more" },
  { value: "2", label: "Core Channels", sub: "Voice calls & WhatsApp" },
  { value: "<180ms", label: "Turn Latency", sub: "Near-instant conversational speed" },
];

function ScenarioCard({ s }: { s: Scenario }) {
  return (
    <div className="relative group flex w-[280px] sm:w-[350px] md:w-[380px] shrink-0 flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:border-slate-300 hover:shadow-md transition-all">
      <div>
        <div className="mb-3.5 flex items-start justify-between gap-3">
          <span className="font-mono-ui rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            PRACTICE OUTCOME
          </span>
          <div className="flex flex-col items-end">
            <span className="font-mono-ui rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
              {s.metric}
            </span>
            <span className="mt-1 text-[10px] text-slate-500 font-mono-ui">{s.metricSub}</span>
          </div>
        </div>
        <p className="mb-4 text-xs sm:text-sm leading-relaxed text-slate-600">{s.summary}</p>
      </div>

      <div className="mt-auto flex items-center gap-3 border-t border-slate-100 pt-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB] font-sora font-bold text-sm border border-blue-100">
          {s.initial}
        </div>
        <div className="min-w-0">
          <h3 className="font-sora truncate text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
            {s.clinic}
          </h3>
          <p className="truncate text-xs text-slate-500 font-mono-ui">
            {s.specialty} &bull; {s.location}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Testimonials() {
  return (
    <section id="testimonials" className="relative scroll-mt-24 overflow-hidden bg-white py-20 border-b border-slate-200/80">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto mb-12 max-w-3xl text-center">
          <span className="font-mono-ui text-xs uppercase tracking-[0.16em] text-blue-600 font-bold">
            04 — CLINIC CASE STUDIES
          </span>
          <h2 className="font-sora mt-3 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-slate-950">
            What clinics like yours can expect.
          </h2>
          <p className="mt-3 text-slate-600 text-base leading-relaxed max-w-2xl mx-auto">
            Operational outcomes from modern medical, dental, and aesthetic practices using AMSh to stop missing patient calls and keep appointment schedules full.
          </p>
        </Reveal>

        {/* Marquee Carousel of Cards */}
        <div
          className="lp-marquee relative w-full max-w-full overflow-hidden py-2"
          style={{ contain: "paint" }}
        >
          <div className="lp-marquee-track flex w-max items-stretch gap-4">
            {[...SCENARIOS, ...SCENARIOS].map((s, idx) => (
              <ScenarioCard key={`${s.id}-${idx}`} s={s} />
            ))}
          </div>
        </div>
        <p className="mt-3 text-center text-xs font-mono-ui text-slate-400">
          Hover over any card to pause auto-scroll
        </p>

        {/* Fact Statistics Strip */}
        <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50/60 p-7 shadow-2xs">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:divide-x md:divide-slate-200">
            {FACTS.map((m, idx) => (
              <div key={m.label} className={idx > 0 ? "text-center md:pl-6 sm:text-left" : "text-center sm:text-left"}>
                <span className="font-sora text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                  {m.value}
                </span>
                <h4 className="mt-1.5 font-sora text-sm font-semibold text-slate-800">{m.label}</h4>
                <p className="mt-0.5 text-xs text-slate-500 font-mono-ui">{m.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
