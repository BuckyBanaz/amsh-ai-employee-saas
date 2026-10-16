import type { Metadata } from "next";
import JsonLd from "@/components/landing/JsonLd";
import { pageMetadata } from "@/lib/site";
import { landingPageSchemas } from "@/lib/schema";
import Link from "next/link";
import Nav from "@/components/landing/Nav";
import VoiceCallScope from "@/components/landing/VoiceCallScope";
import Footer3D from "@/components/landing/Footer3D";

export const metadata: Metadata = pageMetadata({
  path: "/dental-answering-service",
  title: "Dental Answering Service (24/7 AI-Powered) | AMSh Dental",
  description:
    "Upgrade from slow, expensive call centers to AMSh's 24/7 AI dental answering service. Answers on the first ring, triages dental emergencies, verifies insurance, and books directly into Dentrix & Open Dental.",
  ogTitle: "Dental Answering Service (24/7 AI-Powered) | AMSh Dental",
  ogDescription:
    "Replace legacy answering services with AMSh. Instant first-ring response, chairside scheduling, and emergency triage for modern dental practices.",
});

const COMPARISON_ROWS = [
  {
    feature: "Response Time",
    traditional: "Ring-and-hold (3 to 8 minutes on hold)",
    amsh: "First ring (<200ms instant voice pickup)",
  },
  {
    feature: "Appointment Booking",
    traditional: "Takes a message; calls back 4 hours later",
    amsh: "Direct 2-way booking in Dentrix / Open Dental / Cal",
  },
  {
    feature: "Dental Insurance Pre-Verification",
    traditional: "Cannot answer; advises patient to call during business hours",
    amsh: "Verifies Delta Dental, MetLife, Cigna & PPO networks instantly",
  },
  {
    feature: "Emergency Toothache Triage",
    traditional: "Wakes up on-call dentist for non-urgent inquiries",
    amsh: "Clinical pain triage: filters genuine emergencies vs routine queries",
  },
  {
    feature: "Monthly Practice Cost",
    traditional: "$800 &ndash; $1,800/mo (per-minute overage penalty)",
    amsh: "From $49/mo flat (Unlimited concurrency, no overages)",
  },
];

const DENTAL_BENEFITS = [
  {
    title: "Never Miss an Emergency Patient",
    desc: "Patients with acute abscesses, broken crowns, or severe pulpitis call 3 dentists until one answers. AMSh answers immediately, captures patient details, and locks them into your next day's emergency chair.",
    icon: "🚨",
  },
  {
    title: "No More Lunchtime & After-Hours Phone Tag",
    desc: "35% of all dental patient calls occur between 12:00 PM - 2:00 PM and after 5:00 PM when your front desk is away. AMSh handles peak overflow without burning out your staff.",
    icon: "⏰",
  },
  {
    title: "PMS Direct Sync & Confirmation",
    desc: "Syncs directly with Dentrix, Open Dental, Eaglesoft, Curve Dental, and Google Calendar. Automatically sends SMS/WhatsApp directions and intake paperwork before their appointment.",
    icon: "🦷",
  },
  {
    title: "HIPAA Compliant & Encrypted",
    desc: "Full HIPAA BAA execution. All calls, audio streams, and patient PHI are encrypted with 256-bit TLS/SRTP with automatic redaction of sensitive payment details.",
    icon: "🛡️",
  },
];

export default function DentalAnsweringServicePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <Nav />
      <JsonLd data={landingPageSchemas("/dental-answering-service", String(metadata.description))} />

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28 border-b border-slate-100 bg-gradient-to-b from-cyan-50/40 via-white to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Headline */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50/80 px-3.5 py-1.5 font-mono-ui text-xs font-semibold text-cyan-800 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-cyan-600 animate-pulse" />
                <span>NEXT-GEN AI DENTAL ANSWERING SERVICE</span>
              </div>

              <h1 className="font-sora text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.15] tracking-tight text-slate-950">
                Replace expensive dental call centers with 24/7 AI.
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 leading-relaxed font-normal max-w-2xl">
                Traditional answering services take scribbled messages and put your patients on hold. AMSh answers on the first ring, verifies insurance, triages toothaches, and books chairs directly into your schedule.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <a
                  href="/pilot"
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 hover:shadow-blue-500/35 active:scale-[0.98]"
                >
                  Start Dental Pilot Program
                  <span className="ml-2 font-bold">&rarr;</span>
                </a>
                <Link
                  href="/ai-receptionist-for-dentists"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-base font-medium text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  View Dentist Feature Suite
                </Link>
              </div>

              {/* Trust Metric Chips */}
              <div className="pt-4 grid grid-cols-3 gap-4 border-t border-slate-100 max-w-lg">
                <div>
                  <div className="font-sora text-2xl font-bold text-slate-900">&lt;200ms</div>
                  <div className="text-xs text-slate-500 font-medium">Pickup Latency</div>
                </div>
                <div>
                  <div className="font-sora text-2xl font-bold text-cyan-700">100%</div>
                  <div className="text-xs text-slate-500 font-medium">Calls Answered</div>
                </div>
                <div>
                  <div className="font-sora text-2xl font-bold text-emerald-600">85%</div>
                  <div className="text-xs text-slate-500 font-medium">Cost Savings vs Call Center</div>
                </div>
              </div>
            </div>

            {/* Right: Real Dental Audio Player */}
            <div className="lg:col-span-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500">
                    Live Dental Receptionist Recording
                  </span>
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Verified Patient Call
                  </span>
                </div>
                <VoiceCallScope />
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 2. TRADITIONAL CALL CENTER VS AMSH COMPARISON */}
      <section className="py-20 sm:py-28 bg-slate-50/60 border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="font-mono-ui text-xs font-bold uppercase tracking-wider text-cyan-700">
              Direct Practice Comparison
            </h2>
            <p className="font-sora text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
              Why dental practices are retiring legacy answering services.
            </p>
            <p className="text-base sm:text-lg text-slate-600">
              Human answering services have high turnover, lack dental clinical context, and force callers to wait. AMSh is your clinic&apos;s dedicated digital employee.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 bg-slate-100/70 p-4 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <div className="md:col-span-4">Capability</div>
              <div className="md:col-span-4 text-rose-700">Legacy Answering Services</div>
              <div className="md:col-span-4 text-emerald-700">AMSh AI Dental Receptionist</div>
            </div>

            <div className="divide-y divide-slate-100">
              {COMPARISON_ROWS.map((row, idx) => (
                <div
                  key={row.feature}
                  className={`grid grid-cols-1 md:grid-cols-12 p-5 text-sm gap-3 items-center ${
                    idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                  }`}
                >
                  <div className="md:col-span-4 font-semibold text-slate-900">
                    {row.feature}
                  </div>
                  <div className="md:col-span-4 text-slate-500 flex items-start gap-2">
                    <span className="text-rose-500 font-bold shrink-0">&times;</span>
                    <span>{row.traditional}</span>
                  </div>
                  <div className="md:col-span-4 text-slate-900 font-medium flex items-start gap-2 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                    <span className="text-emerald-600 font-bold shrink-0">&check;</span>
                    <span dangerouslySetInnerHTML={{ __html: row.amsh }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* 3. DENTAL PRACTICE PILLARS */}
      <section className="py-20 sm:py-24 bg-white border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <h2 className="font-sora text-3xl font-bold text-slate-950">
              Designed specifically for dental practices.
            </h2>
            <p className="text-slate-600 text-base">
              Built to understand dental nomenclature, tooth numbers, hygiene intervals, and chair scheduling.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {DENTAL_BENEFITS.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:shadow-lg hover:border-cyan-300 transition-all"
              >
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="font-sora text-lg font-bold text-slate-950 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 4. CALL TO ACTION STRIP */}
      <section className="py-16 sm:py-20 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-950/40 via-blue-900/30 to-indigo-950/40" />
        <div className="relative mx-auto max-w-4xl px-4 text-center space-y-6">
          <h2 className="font-sora text-3xl sm:text-4xl font-bold tracking-tight">
            Stop overpaying call centers that let patients slip through the cracks.
          </h2>
          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto">
            Switch your dental practice phone forwarding to AMSh in 10 minutes. 14-day risk-free pilot.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <a
              href="/pilot"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-7 py-4 text-base font-semibold text-white shadow-xl shadow-blue-500/30 hover:bg-blue-500 transition-all active:scale-[0.98]"
            >
              Start 14-Day Dental Pilot
              <span className="ml-2 font-bold">&rarr;</span>
            </a>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-6 py-4 text-base font-medium text-white hover:bg-white/10 transition-colors"
            >
              Back to Overview
            </Link>
          </div>
        </div>
      </section>

      <Footer3D />
    </div>
  );
}
