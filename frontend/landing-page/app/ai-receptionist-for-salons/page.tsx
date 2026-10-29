import type { Metadata } from "next";
import JsonLd from "@/components/landing/JsonLd";
import { pageMetadata } from "@/lib/site";
import { landingPageSchemas } from "@/lib/schema";
import Link from "next/link";
import Nav from "@/components/landing/Nav";
import Footer3D from "@/components/landing/Footer3D";

export const metadata: Metadata = pageMetadata({
  path: "/ai-receptionist-for-salons",
  title: "AI Receptionist for Hair Salons & Barbershops | AMSh Beauty",
  description:
    "Autonomous 24/7 AI front-desk employee for hair salons, barbershops, and beauty studios. Answers client phone calls instantly, books appointments with preferred stylists, and collects WhatsApp deposits to prevent no-shows.",
  ogTitle: "AI Receptionist for Hair Salons & Barbershops | AMSh Beauty",
  ogDescription:
    "Never drop scissors to answer the phone again. AMSh books stylists, manages chair rotas, and secures deposits 24/7 via phone and WhatsApp.",
});

const SALON_FEATURES = [
  {
    title: "Stylist & Station Rota Matching",
    badge: "Smart Chair Allocation",
    desc: "Pairs clients with their requested hair stylist or color specialist based on specific service durations (cut vs. balayage vs. keratin) without calendar collisions.",
    metric: "100%",
    metricLabel: "Stylist Calendar Accuracy",
  },
  {
    title: "Never Drop Scissors for a Call",
    badge: "Infinite Concurrency",
    desc: "When stylists are mid-fade or foil application, AMSh answers 10+ calls simultaneously. Zero hold music, zero lost bookings, and uninterrupted client attention.",
    metric: "0 sec",
    metricLabel: "Average Wait Time",
  },
  {
    title: "WhatsApp Booking & Deposit Links",
    badge: "No-Show Elimination",
    desc: "Sends instant WhatsApp confirmations and automated Stripe deposit links for high-ticket services like extensions and balayage to guarantee chair occupancy.",
    metric: "52%",
    metricLabel: "Reduction in No-Shows",
  },
  {
    title: "After-Hours Appointment Capture",
    badge: "24/7 Night Bookings",
    desc: "Over 38% of salon clients try to book after 8 PM when salons are closed. AMSh captures every late-night enquiry and locks them into your booking system.",
    metric: "+34%",
    metricLabel: "After-Hours Revenue",
  },
];

const SALON_TYPES = [
  { name: "Hair Salons & Color Studios", icon: "💇‍♀️", desc: "Balayage, highlights, blowouts, haircuts, toner consultations" },
  { name: "Modern Barbershops", icon: "💈", desc: "Skin fades, beard trims, hot towel shaves, walk-in queue estimates" },
  { name: "Nail & Lash Boutiques", icon: "💅", desc: "Gel manis, acrylics, lash extensions, refill appointments" },
  { name: "Aesthetic & Skin Studios", icon: "✨", desc: "Facials, microdermabrasion, peel consultations, patch tests" },
  { name: "Eyebrow & Microblading Lounges", icon: "👁️", desc: "Brow shaping, lamination, touch-ups, pre-care guides" },
  { name: "Multi-Location Salon Chains", icon: "🏢", desc: "Cross-location chair sharing, master stylist pricing tiers" },
];

const METRICS = [
  { value: "42%", label: "Potential salon clients hang up if a call goes to voicemail" },
  { value: "$3,400", label: "Average monthly cost of a full-time human salon receptionist" },
  { value: "$49", label: "AMSh autonomous AI receptionist monthly cost" },
  { value: "99.99%", label: "Telephony uptime ensuring every caller gets booked" },
];

export default function SalonsLandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-amber-100 selection:text-amber-900">
      <Nav />
      <JsonLd data={landingPageSchemas("/ai-receptionist-for-salons", String(metadata.description))} />

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-24 border-b border-slate-100 bg-gradient-to-b from-amber-50/40 via-white to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50/80 px-4 py-1.5 font-mono-ui text-xs font-semibold text-amber-800 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>24/7 AUTONOMOUS FRONT-DESK FOR SALONS &amp; BARBERSHOPS</span>
            </div>

            <h1 className="font-sora text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.12] tracking-tight text-slate-950">
              Fill every chair while your stylists focus on creating art.
            </h1>

            <p className="max-w-2xl mx-auto text-base sm:text-lg leading-relaxed text-slate-600">
              Never let a ringing phone interrupt a haircut. AMSh answers on the 1st ring, matches clients to their favorite stylist, schedules appointments in Fresha, Square, or Boulevard, and collects WhatsApp deposits 24/7.
            </p>

            {/* CTA Group */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              <a
                href="/pilot"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0a0a0a] hover:bg-amber-600 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white transition-all shadow-md hover:shadow-lg cursor-pointer"
              >
                <span>Join Salon Pilot Cohort</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>

              <Link
                href="/#calculator"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-800 transition-all shadow-xs"
              >
                <span>Calculate Salon Savings</span>
              </Link>
            </div>

            <p className="font-mono-ui text-xs text-slate-400">
              Syncs with Fresha, Square, Boulevard &bull; Real-time WhatsApp deposits &bull; No hardware required
            </p>

          </div>
        </div>
      </section>

      {/* 2. INDUSTRY BENCHMARKS & PROBLEM SECTION */}
      <section className="py-16 bg-slate-950 text-white border-b border-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {METRICS.map((m) => (
              <div key={m.label} className="border-l border-white/15 pl-6 font-mono-ui">
                <div className="font-sora text-3xl sm:text-4xl font-bold text-amber-400 tracking-tight">
                  {m.value}
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {m.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. CORE SALON CAPABILITIES */}
      <section className="py-24 bg-slate-50/50 border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="font-mono-ui text-xs uppercase tracking-[0.16em] text-amber-700 font-bold">
              BUILT FOR HIGH-TOUCH BEAUTY OPERATIONS
            </span>
            <h2 className="font-sora text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 mt-3">
              Everything your salon front desk handles — automated with charm.
            </h2>
            <p className="mt-3 text-slate-600 text-base leading-relaxed">
              Designed specifically for hair studios, barbershops, and beauty salons where client relationships and calendar accuracy build repeat loyalty.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {SALON_FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs hover:border-amber-300 transition-all hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold font-mono-ui bg-amber-50 text-amber-800 border border-amber-200">
                      {f.badge}
                    </span>
                    <span className="text-2xl font-bold text-slate-950 font-mono-ui">
                      {f.metric}
                    </span>
                  </div>
                  <h3 className="font-sora text-xl font-bold text-slate-950 mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-mono-ui text-slate-400">
                  Benchmarked: <strong className="text-slate-700">{f.metricLabel}</strong>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 4. SALON TYPES SUPPORTED */}
      <section className="py-24 bg-white border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="font-mono-ui text-xs uppercase tracking-[0.16em] text-amber-700 font-bold">
              STYLIST &amp; SERVICE AWARE
            </span>
            <h2 className="font-sora text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 mt-3">
              Pre-trained on hair, grooming &amp; beauty workflows.
            </h2>
            <p className="mt-3 text-slate-600 text-base leading-relaxed">
              AMSh understands processing times, foil techniques, patch testing rules, and service add-ons to keep your day running on schedule.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SALON_TYPES.map((s) => (
              <div
                key={s.name}
                className="p-6 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-amber-300 transition-all hover:shadow-sm"
              >
                <div className="text-3xl mb-3">{s.icon}</div>
                <h4 className="font-sora text-base font-bold text-slate-900 mb-1.5">
                  {s.name}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center">
            <a
              href="/pilot"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider px-7 py-3.5 transition-colors shadow-md cursor-pointer"
            >
              <span>Deploy AMSh to Your Salon in 10 Minutes</span>
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
