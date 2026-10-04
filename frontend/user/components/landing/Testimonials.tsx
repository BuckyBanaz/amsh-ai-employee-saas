"use client";

import React from "react";
import { Reveal } from "./Motion";
import { AI, MONO, aiMono, aiSans } from "./aiFonts";

// Illustrative scenarios, not named customer endorsements: no real person, photo or result is claimed. Each card describes what AMSh
// does for a practice type; swap in real, approved customer stories here when there are some.
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
    clinic: "Dental practice",
    location: "Austin, TX",
    metric: "After-hours coverage",
    metricSub: "Nights and weekends answered",
    specialty: "Dental",
    initial: "D",
    summary:
      "Calls that used to reach voicemail after closing are answered on the first ring. Patients book, reschedule or ask about insurance, and the confirmed visit lands straight in the calendar.",
  },
  {
    id: "aesthetics",
    clinic: "Dermatology & aesthetics",
    location: "Miami, FL",
    metric: "Instant replies",
    metricSub: "Phone and WhatsApp, English and Spanish",
    specialty: "Aesthetics",
    initial: "A",
    summary:
      "Questions about consultation fees, treatment timings and doctor availability are answered in seconds in the patient's language, so the front desk can focus on the people in the clinic.",
  },
  {
    id: "multi",
    clinic: "Multi-specialty group",
    location: "Toronto, ON",
    metric: "Parallel calls",
    metricSub: "No more busy tones",
    specialty: "Multi-specialty",
    initial: "M",
    summary:
      "When several lines ring at once during the morning rush, AMSh handles every caller in parallel with natural voice, so nobody waits on hold or hangs up.",
  },
  {
    id: "physio",
    clinic: "Physiotherapy & rehab",
    location: "London, UK",
    metric: "Fewer no-shows",
    metricSub: "Automated reminders",
    specialty: "Rehab",
    initial: "P",
    summary:
      "Appointment reminders go out by WhatsApp or SMS with a one-tap reschedule, which keeps the calendar full and cuts the empty slots that no-shows leave behind.",
  },
  {
    id: "eye",
    clinic: "Eye care & surgery",
    location: "Sydney, AU",
    metric: "Urgent triage",
    metricSub: "Emergencies escalated to staff",
    specialty: "Ophthalmology",
    initial: "E",
    summary:
      "Post-procedure patients who call late with urgent questions get answers on the first ring, and genuine emergencies are escalated straight to the on-call clinician.",
  },
  {
    id: "womens",
    clinic: "Women's health",
    location: "Dubai, UAE",
    metric: "Multilingual",
    metricSub: "English and Arabic, mid-call",
    specialty: "Women's health",
    initial: "W",
    summary:
      "Patients can switch between English and Arabic mid-conversation and AMSh keeps up, without a separate line or a second receptionist for each language.",
  },
];

const FACTS = [
  { value: "24/7", label: "Always answering", sub: "Nights, weekends, holidays" },
  { value: "20+", label: "Languages", sub: "Switches mid-call" },
  { value: "3", label: "Channels", sub: "Phone, WhatsApp, web chat" },
  { value: "8", label: "Integrations", sub: "Calendars, EHR, payments" },
];

function ScenarioCard({ s }: { s: Scenario }) {
  return (
    <div className="relative group flex w-[270px] sm:w-[340px] md:w-[380px] shrink-0 flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/40 hover:bg-white/[0.06] hover:shadow-[0_20px_50px_-20px_rgba(79,70,229,0.35)]">
      <div>
        <div className="mb-3 flex items-start justify-between gap-3">
          <span className={`${MONO} rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-slate-400`}>
            Illustrative scenario
          </span>
          <div className="flex flex-col items-end">
            <span className={`${AI} rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300`}>{s.metric}</span>
            <span className="mt-1 text-[10px] font-medium text-slate-400">{s.metricSub}</span>
          </div>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-slate-200">{s.summary}</p>
      </div>

      <div className="mt-auto flex items-center gap-3 border-t border-white/10 pt-3">
        <div className={`${AI} flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400/30 to-violet-500/30 text-sm font-semibold text-white ring-1 ring-white/15`}>
          {s.initial}
        </div>
        <div className="min-w-0">
          <h3 className={`${AI} truncate text-sm font-semibold text-white transition-colors group-hover:text-cyan-200`}>{s.clinic}</h3>
          <p className="truncate text-[11px] text-slate-400">
            {s.specialty} &bull; {s.location}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Testimonials() {
  return (
    <section id="testimonials" className={`${aiSans.variable} ${aiMono.variable} relative scroll-mt-24 overflow-hidden bg-[#050816] py-16 sm:py-20`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(125,211,252,0.2)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_40%,black,transparent_78%)]" />
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600/15 via-cyan-600/15 to-purple-600/10 blur-[150px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto mb-8 max-w-3xl text-center">
          <span className={`${MONO} inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-300 shadow-[0_0_24px_-6px_rgba(34,211,238,0.5)]`}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
            Built for every clinic
          </span>
          <h2 className={`${AI} mt-4 text-balance text-3xl font-semibold tracking-[-0.02em] text-white sm:text-5xl`}>
            What clinics like yours{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-400 bg-clip-text text-transparent">can expect.</span>
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-slate-300 sm:text-lg">
            Illustrative scenarios of how modern medical, dental and aesthetic practices use AMSh to stop missing calls and keep the calendar full.
          </p>
        </Reveal>

        <div
          className="lp-marquee relative w-full max-w-full overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
          style={{ contain: "paint" }}
        >
          <div className="lp-marquee-track flex w-max items-stretch gap-4">
            {[...SCENARIOS, ...SCENARIOS].map((s, idx) => (
              <ScenarioCard key={`${s.id}-${idx}`} s={s} />
            ))}
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-slate-500">Hover over a card to pause</p>

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:divide-x md:divide-white/10">
            {FACTS.map((m, idx) => (
              <div key={m.label} className={idx > 0 ? "text-center md:pl-6 sm:text-left" : "text-center sm:text-left"}>
                <span className={`${AI} text-3xl font-semibold tracking-tight text-white sm:text-4xl`}>{m.value}</span>
                <h4 className="mt-1.5 text-sm font-semibold text-slate-200">{m.label}</h4>
                <p className="mt-0.5 text-xs text-slate-400">{m.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
