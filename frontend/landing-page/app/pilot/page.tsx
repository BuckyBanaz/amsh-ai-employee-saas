import type { Metadata } from "next";
import JsonLd from "@/components/landing/JsonLd";
import { pageMetadata } from "@/lib/site";
import { breadcrumbSchema } from "@/lib/schema";
import PilotCtaButton from "@/components/landing/PilotCtaButton";
import Link from "next/link";
import Nav from "@/components/landing/Nav";
import Footer3D from "@/components/landing/Footer3D";

export const metadata: Metadata = pageMetadata({
  path: "/pilot",
  title: "Join the AMSh Clinic Pilot Program | 14-Day Guided Access",
  description:
    "Apply to test AMSh's AI front-desk employee for your medical or dental clinic. Selected clinics receive guided onboarding, direct founder support, and agreed pilot terms before activation.",
  ogTitle: "Join the AMSh Clinic Pilot Program | 14-Day Guided Access",
  ogDescription:
    "Be one of the first clinics to hire an AI employee. Apply for our 14-day guided pilot program.",
});

const PILOT_PERKS = [
  {
    feature: "Duration",
    detail: "14 Days",
    desc: "Full access to test inbound AI calls and appointment workflows in real practice conditions.",
  },
  {
    feature: "Setup",
    detail: "Guided Onboarding",
    desc: "1-on-1 setup session with AMSh founders to ingest your services, accepted insurances, and doctor calendar.",
  },
  {
    feature: "Product",
    detail: "Calls & Booking",
    desc: "Dedicated AI phone answering, appointment scheduling, and WhatsApp follow-up testing.",
  },
  {
    feature: "Support",
    detail: "Direct Founder Channel",
    desc: "Direct WhatsApp and email channel for immediate issue reporting, tuning, and prompt adjustments.",
  },
  {
    feature: "Pricing",
    detail: "Zero Upfront Cost",
    desc: "Terms clearly agreed upon before activation. No surprise billing or automatic renewals.",
  },
  {
    feature: "Goal",
    detail: "Real Clinical Validation",
    desc: "Validate voice latency, call quality, and calendar accuracy with real patients.",
  },
];

export default function PilotProgramPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <Nav />
      <JsonLd data={breadcrumbSchema("/pilot")} />

      {/* Hero Header */}
      <section className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24 border-b border-slate-100 bg-gradient-to-b from-blue-50/50 via-white to-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1.5 font-mono-ui text-xs font-semibold text-blue-700 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>getamsh.com &bull; EARLY ACCESS PILOT PROGRAM</span>
          </div>

          <h1 className="font-sora text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.15] tracking-tight text-slate-950">
            Be One of the First Clinics to Hire an AI Employee.
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 leading-relaxed font-normal max-w-2xl mx-auto">
            Join the AMSh Pilot Program to test an AI front-desk employee that answers calls, assists with appointment booking, and helps reduce missed enquiries.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <PilotCtaButton className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-7 py-4 text-base font-semibold text-white shadow-xl shadow-blue-500/25 hover:bg-blue-700 transition cursor-pointer active:scale-[0.98]">
              Apply for 14-Day Pilot Now
              <span className="ml-2 font-bold">&rarr;</span>
            </PilotCtaButton>
            <Link
              href="/#demo"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-4 text-base font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Hear Audio Demo First
            </Link>
          </div>

          {/* Three Key Pillars */}
          <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left border-t border-slate-100 max-w-3xl mx-auto text-xs sm:text-sm">
            <div className="flex items-start gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
              <span className="text-blue-600 font-bold text-base">&check;</span>
              <span className="text-slate-700 font-medium">
                <strong>Selected clinics</strong> get guided 1-on-1 onboarding.
              </span>
            </div>
            <div className="flex items-start gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
              <span className="text-blue-600 font-bold text-base">&check;</span>
              <span className="text-slate-700 font-medium">
                <strong>Direct feedback channel</strong> with the AMSh founders.
              </span>
            </div>
            <div className="flex items-start gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
              <span className="text-blue-600 font-bold text-base">&check;</span>
              <span className="text-slate-700 font-medium">
                <strong>Pilot terms agreed</strong> before activation.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Pilot Program Structure Table */}
      <section className="py-20 bg-slate-50/60 border-b border-slate-100">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <h2 className="font-sora text-3xl font-bold text-slate-950">
              What does the Pilot Program include?
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              A transparent, low-friction pilot designed to validate real clinic impact.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {PILOT_PERKS.map((p) => (
              <div
                key={p.feature}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-blue-300 hover:shadow-md transition"
              >
                <div className="text-xs font-mono font-bold text-blue-600 uppercase tracking-wider mb-1">
                  {p.feature}
                </div>
                <div className="font-sora text-xl font-bold text-slate-950 mb-2">
                  {p.detail}
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <PilotCtaButton className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-blue-600 transition cursor-pointer">
              Open Pilot Application Form &rarr;
            </PilotCtaButton>
          </div>
        </div>
      </section>

      <Footer3D />
    </div>
  );
}
