import type { Metadata } from "next";
import JsonLd from "@/components/landing/JsonLd";
import { pageMetadata } from "@/lib/site";
import { landingPageSchemas } from "@/lib/schema";
import Link from "next/link";
import Nav from "@/components/landing/Nav";
import Footer3D from "@/components/landing/Footer3D";

export const metadata: Metadata = pageMetadata({
  path: "/ai-answering-service-medical",
  title: "AI Answering Service for Medical Offices & Clinics | AMSh",
  description:
    "Replace outdated offshore call centers with autonomous 24/7 medical AI phone answering. Sub-150ms voice latency, HIPAA-compliant patient intake, 2-way doctor calendar sync, and zero hold times.",
  ogTitle: "AI Answering Service for Medical Offices & Clinics | AMSh",
  ogDescription:
    "HIPAA-compliant, 24/7 AI medical phone answering service. Never put another patient on hold.",
});

const COMPARISON = [
  {
    feature: "Average Hold / Ring Time",
    humanCallCenter: "2 to 8 minutes",
    voicemail: "No answer (unreturned)",
    amsh: "< 1 ring (<150ms)",
    highlight: true,
  },
  {
    feature: "2-Way Calendar Booking",
    humanCallCenter: "Takes notes only (staff re-calls)",
    voicemail: "None",
    amsh: "Instant 2-way live slot locking",
    highlight: true,
  },
  {
    feature: "Insurance & Copay Ingestion",
    humanCallCenter: "Generic scripts, frequent errors",
    voicemail: "None",
    amsh: "Knowledge base verification (RAG)",
    highlight: false,
  },
  {
    feature: "After-Hours & Weekend Coverage",
    humanCallCenter: "$1.50 - $3.00 / minute surcharge",
    voicemail: "Fills up, delayed triage",
    amsh: "Included 24/7/365 at flat rate",
    highlight: true,
  },
  {
    feature: "Clinical Emergency Escalation",
    humanCallCenter: "Delayed callback dispatch",
    voicemail: "Dangerous for urgent cases",
    amsh: "Immediate deterministic physician bridge",
    highlight: false,
  },
  {
    feature: "Monthly Cost (1,000 calls)",
    humanCallCenter: "$1,800 - $3,500 / month",
    voicemail: "Costs $10k+ in lost patient revenue",
    amsh: "From $49 / month",
    highlight: true,
  },
];

export default function MedicalAnsweringServicePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <Nav />
      <JsonLd data={landingPageSchemas("/ai-answering-service-medical", String(metadata.description))} />

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-24 border-b border-slate-100 bg-gradient-to-b from-blue-50/30 via-white to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-4 py-1.5 font-mono-ui text-xs font-semibold text-blue-700 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>NEXT-GEN MEDICAL ANSWERING SERVICE (AI-POWERED)</span>
            </div>

            <h1 className="font-sora text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.12] tracking-tight text-slate-950">
              The AI answering service built for medical offices.
            </h1>

            <p className="max-w-2xl mx-auto text-base sm:text-lg leading-relaxed text-slate-600">
              Traditional medical call centers leave patients on hold for minutes and take messy notes. AMSh answers on the first ring, understands clinical nuances, and actually books the appointment in your calendar.
            </p>

            {/* CTA Group */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              <a
                href="/pilot"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0a0a0a] hover:bg-blue-600 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white transition-all shadow-md hover:shadow-lg cursor-pointer"
              >
                <span>Upgrade Your Medical Answering Service</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>

              <a
                href="http://localhost:3000/login"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-800 transition-all shadow-xs"
              >
                <span>Compare Pricing &amp; ROI</span>
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* 2. HEAD-TO-HEAD COMPARISON TABLE */}
      <section className="py-24 bg-slate-50/60 border-b border-slate-200/80">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="font-mono-ui text-xs uppercase tracking-[0.16em] text-blue-600 font-bold">
              CALL CENTER VS. AUTONOMOUS AI
            </span>
            <h2 className="font-sora text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 mt-3">
              Why medical practices are firing traditional call centers.
            </h2>
            <p className="mt-3 text-slate-600 text-sm leading-relaxed">
              Human answering services have high turnover, misspell patient names, and charge $1.50+ per minute. AMSh provides superhuman consistency at a flat predictable fee.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-mono-ui uppercase text-[11px] text-slate-500">
                    <th className="p-4 sm:p-5 font-bold">Feature / Performance</th>
                    <th className="p-4 sm:p-5 font-bold">Traditional Call Center</th>
                    <th className="p-4 sm:p-5 font-bold">Voicemail Machine</th>
                    <th className="p-4 sm:p-5 font-bold text-blue-600 bg-blue-50/60">AMSh Autonomous AI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {COMPARISON.map((row) => (
                    <tr key={row.feature} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 sm:p-5 font-bold text-slate-900">
                        {row.feature}
                      </td>
                      <td className="p-4 sm:p-5 text-slate-600">
                        {row.humanCallCenter}
                      </td>
                      <td className="p-4 sm:p-5 text-slate-400 font-mono-ui">
                        {row.voicemail}
                      </td>
                      <td className="p-4 sm:p-5 font-semibold text-blue-700 bg-blue-50/40">
                        {row.amsh}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CARRIER COMPATIBILITY SECTION */}
      <section className="py-20 bg-white border-b border-slate-200/80">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <span className="font-mono-ui text-xs font-bold uppercase tracking-wider text-blue-600">
            SEAMLESS TELEPHONY INTEGRATION
          </span>
          <h3 className="font-sora text-3xl font-bold text-slate-950">
            Keep your existing clinic phone number.
          </h3>
          <p className="max-w-2xl mx-auto text-slate-600 text-sm leading-relaxed">
            No need to port numbers or replace your desk phones. Set up call forwarding in 60 seconds with AT&amp;T, Verizon, Spectrum, BT, Vodafone, RingCentral, or 8x8.
          </p>

          <div className="pt-4 flex flex-wrap justify-center gap-3 font-mono-ui text-xs">
            {["AT&T Business", "Verizon Wireless", "BT Business (UK)", "RingCentral", "Spectrum Business", "Nextiva", "Vonage", "Twilio SIP"].map((c) => (
              <span key={c} className="px-3.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-semibold">
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      <Footer3D />
    </div>
  );
}
