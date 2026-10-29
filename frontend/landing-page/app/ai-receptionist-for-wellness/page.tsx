import type { Metadata } from "next";
import JsonLd from "@/components/landing/JsonLd";
import { pageMetadata } from "@/lib/site";
import { landingPageSchemas } from "@/lib/schema";
import Link from "next/link";
import Nav from "@/components/landing/Nav";
import Footer3D from "@/components/landing/Footer3D";

export const metadata: Metadata = pageMetadata({
  path: "/ai-receptionist-for-wellness",
  title: "AI Receptionist for Spas & Wellness Centers | AMSh Wellness",
  description:
    "Autonomous 24/7 AI front-desk employee for luxury day spas, massage clinics, saunas, and wellness centers. Quietly manages guest bookings, therapist preferences, room reservations, and pre-arrival intake.",
  ogTitle: "AI Receptionist for Spas & Wellness Centers | AMSh Wellness",
  ogDescription:
    "Whisper-quiet front desk operations. AMSh takes guest calls, coordinates treatment rooms and therapists, and sends digital health screening links 24/7.",
});

const WELLNESS_FEATURES = [
  {
    title: "Therapist & Suite Synchronization",
    badge: "Smart Room Assignment",
    desc: "Coordinates single and couples suites, steam rooms, and therapist specialties (deep tissue, hot stone, prenatal) without double bookings or room turnover friction.",
    metric: "100%",
    metricLabel: "Treatment Room Utilization",
  },
  {
    title: "Preserve Sanctuary Silence",
    badge: "Whisper Desk",
    desc: "Loud phone ringing shatters relaxation. AMSh handles phone calls autonomously in the cloud, allowing your in-spa staff to welcome arriving guests in tranquil silence.",
    metric: "0 dB",
    metricLabel: "Front Desk Disruption",
  },
  {
    title: "Digital Health & Allergy Screening",
    badge: "Pre-Visit Intake",
    desc: "Dispatches automated WhatsApp intake links to capture essential oil sensitivities, injuries, pregnancy alerts, and massage pressure preferences before arrival.",
    metric: "94%",
    metricLabel: "Completed Pre-Arrival Forms",
  },
  {
    title: "High-Ticket Package & Add-On Upsell",
    badge: "Gentle Concierge",
    desc: "Politely informs callers of couples upgrades, private sauna access, infrared light therapy, and scalp treatments during reservation setup.",
    metric: "+35%",
    metricLabel: "Couples Package Upsell",
  },
];

const WELLNESS_TYPES = [
  { name: "Luxury Day Spas & Resorts", icon: "🌸", desc: "Full-day packages, facial therapies, hydrotherapy pools, afternoon tea add-ons" },
  { name: "Massage & Bodywork Studios", icon: "💆", desc: "Deep tissue, Swedish, Thai massage, sports recovery therapy" },
  { name: "Ayurvedic & Holistic Centers", icon: "🌿", desc: "Panchakarma consultations, dosha assessments, herbal therapy courses" },
  { name: "Sauna, Cold Plunge & Cryo", icon: "❄️", desc: "Contrast therapy, private thermal suites, membership passes" },
  { name: "Floatation & Sound Bath Lounges", icon: "✨", desc: "Sensory deprivation tanks, meditation pods, sound frequency sessions" },
  { name: "Acupuncture & Wellness Clinics", icon: "🪡", desc: "Initial health history, meridian assessments, insurance superbills" },
];

const METRICS = [
  { value: "54%", label: "Spa guests report phone ringing at reception detracts from their relaxation experience" },
  { value: "$3,500", label: "Average monthly cost of a human spa receptionist" },
  { value: "$49", label: "AMSh autonomous AI receptionist monthly cost" },
  { value: "4.9 / 5", label: "Average caller satisfaction across autonomous spa bookings" },
];

export default function WellnessLandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      <Nav />
      <JsonLd data={landingPageSchemas("/ai-receptionist-for-wellness", String(metadata.description))} />

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-24 border-b border-slate-100 bg-gradient-to-b from-emerald-50/40 via-white to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-4 py-1.5 font-mono-ui text-xs font-semibold text-emerald-800 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>24/7 AUTONOMOUS RECEPTION DESK FOR SPAS &amp; WELLNESS CENTERS</span>
            </div>

            <h1 className="font-sora text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.12] tracking-tight text-slate-950">
              Maintain serene sanctuary silence with whisper-quiet bookings.
            </h1>

            <p className="max-w-2xl mx-auto text-base sm:text-lg leading-relaxed text-slate-600">
              Eliminate blaring front-desk phones. AMSh handles reservations in the cloud with calm, conversational warmth: therapist matching, couples suite scheduling, and pre-arrival intake.
            </p>

            {/* CTA Group */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              <a
                href="/pilot"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0a0a0a] hover:bg-emerald-600 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white transition-all shadow-md hover:shadow-lg cursor-pointer"
              >
                <span>Join Wellness Pilot Cohort</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>

              <Link
                href="/#calculator"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-800 transition-all shadow-xs"
              >
                <span>Calculate Spa Savings</span>
              </Link>
            </div>

            <p className="font-mono-ui text-xs text-slate-400">
              Syncs with Mindbody, Fresha, Zenoti, Booker &bull; Instant WhatsApp health intake &bull; HIPAA &amp; GDPR compliant
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
                <div className="font-sora text-3xl sm:text-4xl font-bold text-emerald-400 tracking-tight">
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

      {/* 3. CORE WELLNESS CAPABILITIES */}
      <section className="py-24 bg-slate-50/50 border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="font-mono-ui text-xs uppercase tracking-[0.16em] text-emerald-700 font-bold">
              BUILT FOR HIGH-END RELAXATION RETREATS
            </span>
            <h2 className="font-sora text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 mt-3">
              Give every guest immediate, calm, 5-star attention.
            </h2>
            <p className="mt-3 text-slate-600 text-base leading-relaxed">
              Designed specifically for spas, retreat sanctuaries, and massage studios where hospitality begins with the very first greeting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {WELLNESS_FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs hover:border-emerald-300 transition-all hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold font-mono-ui bg-emerald-50 text-emerald-800 border border-emerald-200">
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

      {/* 4. WELLNESS TYPES SUPPORTED */}
      <section className="py-24 bg-white border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="font-mono-ui text-xs uppercase tracking-[0.16em] text-emerald-700 font-bold">
              TREATMENT &amp; PACKAGE RECOGNITION
            </span>
            <h2 className="font-sora text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 mt-3">
              Pre-trained on wellness, spa &amp; recovery therapies.
            </h2>
            <p className="mt-3 text-slate-600 text-base leading-relaxed">
              AMSh understands room turnarounds, essential oil protocols, pregnancy contraindications, and thermal suite access durations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {WELLNESS_TYPES.map((s) => (
              <div
                key={s.name}
                className="p-6 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-emerald-300 transition-all hover:shadow-sm"
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
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-7 py-3.5 transition-colors shadow-md cursor-pointer"
            >
              <span>Deploy AMSh to Your Spa in 10 Minutes</span>
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
