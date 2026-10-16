import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/landing/Nav";
import VoiceCallScope from "@/components/landing/VoiceCallScope";
import Footer3D from "@/components/landing/Footer3D";

export const metadata: Metadata = {
  title: "AI Receptionist for Dentists & Orthodontists | AMSh Dental",
  description:
    "The 24/7 AI dental answering service and virtual receptionist. Answers every patient call on the first ring, verifies dental insurance, and books chair appointments directly in your PMS calendar.",
  openGraph: {
    title: "AI Receptionist for Dentists & Orthodontists | AMSh Dental",
    description:
      "Automate dental patient calls, emergency toothache triage, Delta Dental insurance checks, and appointment scheduling 24/7.",
  },
};

const DENTAL_WORKFLOWS = [
  {
    title: "Zero Missed Dental Inquiries",
    badge: "24/7 Inbound Voice",
    desc: "Patients with acute toothaches or chipped teeth call multiple clinics. AMSh answers on the first ring, triages pain severity, and secures the appointment before they dial your competitor.",
    stat: "100%",
    statLabel: "First-Ring Answer Rate",
  },
  {
    title: "Insurance Payer Pre-Verification",
    badge: "Delta Dental & Major PPO",
    desc: "Answers complex payer queries instantly: 'Do you take Delta Dental Premier?' 'Is orthodontic consultation covered?' Directs patients to online intake forms without holding up front desk staff.",
    stat: "<150ms",
    statLabel: "Knowledge Base Query",
  },
  {
    title: "Chairside Calendar Slot Locking",
    badge: "2-Way Calendar Sync",
    desc: "Syncs directly with practice schedules. Respects chair lengths: 60 mins for new patient cleanings, 30 mins for check-ups, and reserved emergency buffer slots.",
    stat: "96.4%",
    statLabel: "Booking Completion",
  },
  {
    title: "Automated WhatsApp & SMS Recalls",
    badge: "Hygiene & Post-Op Follow-up",
    desc: "Dispatches automated WhatsApp appointment confirmations, digital intake links, Google Maps directions, and 6-month hygiene recall reminders that prevent no-shows.",
    stat: "42%",
    statLabel: "Lower No-Show Rate",
  },
];

const PMS_INTEGRATIONS = [
  "Dentrix",
  "Open Dental",
  "Eaglesoft",
  "Curve Dental",
  "Dentally (UK)",
  "Carestream",
  "Google Calendar",
  "Microsoft Outlook",
];

const FAQS = [
  {
    q: "How does AMSh handle dental emergencies (severe toothache, broken crowns)?",
    a: "AMSh recognizes urgent clinical pain vocabulary. It checks your practice's same-day emergency buffer slots, reserves the chair, and can instantly bridge high-priority cases to your on-call dentist or practice manager.",
  },
  {
    q: "Can AMSh answer questions about dental insurance like Delta Dental or MetLife?",
    a: "Yes. During onboarding, AMSh ingests your clinic's accepted PPO payers, out-of-network policies, copay rules, and self-pay fees. It provides clear, accurate answers without guessing.",
  },
  {
    q: "Will AMSh integrate with our existing clinic phone number?",
    a: "Yes. You keep your existing clinic phone number. You can forward calls to AMSh on overflow, after-hours, during lunch, or 24/7 with a simple carrier forwarding code (AT&T, Verizon, BT, Jio, Airtel).",
  },
  {
    q: "Is AMSh HIPAA and GDPR compliant for patient records?",
    a: "Yes. All audio streams are encrypted end-to-end (256-bit TLS/SRTP). Protected Health Information (PHI) is masked in-memory, and we sign standard HIPAA Business Associate Agreements (BAA) and GDPR Data Processing Agreements (DPA).",
  },
];

export default function DentalLandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <Nav />

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28 border-b border-slate-100 bg-gradient-to-b from-blue-50/40 via-white to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Dental Value Proposition */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1.5 font-mono-ui text-xs font-semibold text-blue-700 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>AI RECEPTIONIST FOR DENTAL &amp; ORTHODONTIC PRACTICES</span>
              </div>

              <h1 className="font-sora text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.15] tracking-tight text-slate-950">
                The 24/7 AI Dental Receptionist that never misses a patient.
              </h1>

              <p className="max-w-xl text-base sm:text-lg leading-relaxed text-slate-600">
                Dental patients call when in pain. If your front desk is on another call or assisting chairside, they hang up and dial the next clinic. AMSh answers instantly, checks insurance, and locks the appointment directly into your calendar.
              </p>

              {/* CTA Row */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <a
                  href="/pilot"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0a0a0a] hover:bg-blue-600 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white transition-all shadow-md hover:shadow-lg cursor-pointer"
                >
                  <span>Apply for Dental Pilot Cohort</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>

                <a
                  href="#demo"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-800 transition-all shadow-xs"
                >
                  <span>Listen to Live Call</span>
                </a>
              </div>

              {/* Key Trust Stats */}
              <div className="pt-4 grid grid-cols-3 gap-6 border-t border-slate-200/80 font-mono-ui text-xs max-w-lg">
                <div>
                  <div className="text-slate-400 font-semibold uppercase text-[10px]">Avg Dental Value</div>
                  <div className="text-xl sm:text-2xl font-bold text-slate-950 mt-0.5">$380 - $2,400</div>
                  <div className="text-[10px] text-slate-500">Per new patient</div>
                </div>
                <div>
                  <div className="text-slate-400 font-semibold uppercase text-[10px]">Missed Inbound</div>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-600 mt-0.5">0% Calls Lost</div>
                  <div className="text-[10px] text-emerald-700">1st ring pickup</div>
                </div>
                <div>
                  <div className="text-slate-400 font-semibold uppercase text-[10px]">Chairside Relief</div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600 mt-0.5">2.5 hrs/day</div>
                  <div className="text-[10px] text-blue-700">Staff time saved</div>
                </div>
              </div>

            </div>

            {/* Right Column: Live Dental Voice Call Scope (Smiles Orthodontics) */}
            <div id="demo" className="lg:col-span-5 flex justify-center">
              <VoiceCallScope />
            </div>

          </div>

        </div>
      </section>

      {/* 2. DENTAL WORKFLOWS SECTION */}
      <section className="py-24 bg-slate-50/60 border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="font-mono-ui text-xs uppercase tracking-[0.16em] text-blue-600 font-bold">
              ENGINEERED FOR DENTAL OPERATORIES
            </span>
            <h2 className="font-sora text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 mt-3">
              How AMSh handles your dental front-desk traffic.
            </h2>
            <p className="mt-3 text-slate-600 text-base leading-relaxed">
              From routine cleanings to urgent Saturday root canal inquiries, AMSh provides empathetic, clinical front-desk support that books real patients.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {DENTAL_WORKFLOWS.map((w) => (
              <div
                key={w.title}
                className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs hover:border-blue-300 transition-all hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold font-mono-ui bg-blue-50 text-blue-700 border border-blue-100">
                      {w.badge}
                    </span>
                    <span className="text-2xl font-extrabold text-slate-950 font-mono-ui">
                      {w.stat}
                    </span>
                  </div>
                  <h3 className="font-sora text-xl font-bold text-slate-950 mb-2">
                    {w.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {w.desc}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-mono-ui text-slate-400">
                  Metric: <strong className="text-slate-700">{w.statLabel}</strong>
                </div>
              </div>
            ))}
          </div>

          {/* PMS Systems Ribbon */}
          <div className="mt-16 rounded-2xl bg-white border border-slate-200/90 p-6 text-center shadow-2xs">
            <p className="font-mono-ui text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Compatible with Dental Practice Management Software &amp; Calendars
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {PMS_INTEGRATIONS.map((pms) => (
                <span
                  key={pms}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                >
                  {pms}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. DENTAL PRACTICE ROI CALCULATOR CARD */}
      <section className="py-20 bg-white border-b border-slate-200/80">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-slate-950 text-white p-8 sm:p-12 shadow-xl relative overflow-hidden">
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7 space-y-4">
                <span className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-mono-ui font-semibold uppercase tracking-wider border border-blue-500/30">
                  DENTAL ROI BENCHMARK
                </span>
                <h3 className="font-sora text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  A single missed crown or implant call costs you $1,200+.
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Average dental practices miss 20% to 35% of inbound calls during busy mornings and lunch hours. Catching just 2 additional patients per month completely covers the entire annual cost of AMSh.
                </p>
              </div>

              <div className="md:col-span-5 bg-white/5 border border-white/10 rounded-2xl p-6 text-center backdrop-blur-md">
                <div className="text-xs uppercase text-slate-400 font-mono-ui font-bold">
                  Estimated Monthly Recovered Revenue
                </div>
                <div className="font-sora text-4xl sm:text-5xl font-bold text-emerald-400 mt-2">
                  $14,400<span className="text-sm font-normal text-slate-300">/mo</span>
                </div>
                <p className="text-[11px] font-mono-ui text-slate-400 mt-2">
                  Based on 12 recovered patient slots @ $1,200 lifetime value
                </p>
                <div className="mt-5">
                  <a
                    href="/pilot"
                    className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider py-3 transition-colors shadow-md"
                  >
                    Start 14-Day Free Dental Pilot
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. DENTAL FAQ SECTION */}
      <section className="py-20 bg-slate-50/50 border-b border-slate-200/80">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="font-mono-ui text-xs font-bold uppercase tracking-wider text-blue-600">
              FREQUENTLY ASKED QUESTIONS
            </span>
            <h2 className="font-sora text-3xl font-bold text-slate-950 mt-2">
              Everything dental practice owners ask about AMSh.
            </h2>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq) => (
              <div
                key={faq.q}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs"
              >
                <h4 className="font-sora text-base font-bold text-slate-900 mb-2">
                  {faq.q}
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-xs font-mono-ui text-slate-500 mb-4">
              Have specific practice questions or custom EHR/PMS requirements?
            </p>
            <a
              href="/pilot"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 hover:bg-blue-600 text-white px-6 py-3 text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
            >
              <span>Speak with a Clinical AI Engineer</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      <Footer3D />
    </div>
  );
}
