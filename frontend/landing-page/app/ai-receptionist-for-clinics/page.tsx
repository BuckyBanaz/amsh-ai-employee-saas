import type { Metadata } from "next";
import JsonLd from "@/components/landing/JsonLd";
import { pageMetadata } from "@/lib/site";
import { landingPageSchemas } from "@/lib/schema";
import Link from "next/link";
import Nav from "@/components/landing/Nav";
import Footer3D from "@/components/landing/Footer3D";

export const metadata: Metadata = pageMetadata({
  path: "/ai-receptionist-for-clinics",
  title: "AI Receptionist for Medical Clinics | AMSh Healthcare",
  description:
    "Autonomous 24/7 AI front-desk employee for medical clinics and healthcare practices. Answers patient calls on the first ring, triages symptoms, books doctor appointments, and reduces receptionist burnout.",
  ogTitle: "AI Receptionist for Medical Clinics | AMSh Healthcare",
  ogDescription:
    "Automate patient calls, doctor scheduling, symptom triage, and follow-ups with AMSh's HIPAA-compliant AI medical receptionist.",
});

const CLINIC_FEATURES = [
  {
    title: "Multi-Doctor Schedule Coordination",
    badge: "Smart Calendar Routing",
    desc: "Seamlessly routes patients to the correct physician based on specialty, symptoms, and availability. Handles complex doctor rotas across multiple clinic branches without double-booking.",
    metric: "100%",
    metricLabel: "Calendar Synchronization",
  },
  {
    title: "High-Volume Front-Desk Relief",
    badge: "Infinite Concurrency",
    desc: "Monday morning rush? AMSh handles 50+ patient phone calls simultaneously. Zero hold music, zero busy tones, and zero patient abandonment while your physical staff manages in-clinic check-ins.",
    metric: "0 sec",
    metricLabel: "Average Queue Time",
  },
  {
    title: "Clinical Safety & Emergency Escalation",
    badge: "Deterministic Guardrails",
    desc: "Hardcoded clinical safety protocols detect emergency keywords (chest pain, severe breathlessness, allergic reactions) and immediately advise 911/112 or bridge directly to the on-call medical team.",
    metric: "<250ms",
    metricLabel: "Emergency Transfer Speed",
  },
  {
    title: "Automated WhatsApp & SMS Intake",
    badge: "Omnichannel Follow-up",
    desc: "Dispatches patient intake forms, clinic directions, pre-visit fasting instructions, and prescription renewal reminders via official WhatsApp Business API and HIPAA-compliant SMS.",
    metric: "48%",
    metricLabel: "Fewer Front-Desk Calls",
  },
];

const SPECIALTIES = [
  { name: "General Practice & Family Medicine", icon: "🩺", desc: "Routine consultations, flu triage, prescription refills" },
  { name: "Dermatology & Aesthetic Clinics", icon: "✨", desc: "Cosmetic procedures, skin consultations, deposit collection" },
  { name: "Physiotherapy & Sports Rehab", icon: "🏃", desc: "Session packages, injury intake, recurring bookings" },
  { name: "Pediatrics & Child Care", icon: "👶", desc: "Urgent parental inquiries, vaccination appointments" },
  { name: "Cardiology & Internal Medicine", icon: "❤️", desc: "Specialist referrals, ECG follow-ups, strict emergency gates" },
  { name: "Orthopedics & Joint Clinics", icon: "🦴", desc: "X-ray scheduling, pre-op instructions, surgeon consultations" },
];

const METRICS = [
  { value: "67%", label: "Patients who hang up on busy signals and never call back" },
  { value: "$4.80", label: "Average human receptionist cost per call handled" },
  { value: "$0.12", label: "AMSh autonomous AI cost per call handled" },
  { value: "99.98%", label: "Guaranteed uptime across carrier telephony trunks" },
];

export default function ClinicsLandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <Nav />
      <JsonLd data={landingPageSchemas("/ai-receptionist-for-clinics", String(metadata.description))} />

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-24 border-b border-slate-100 bg-gradient-to-b from-slate-50 via-white to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-4 py-1.5 font-mono-ui text-xs font-semibold text-blue-700 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>24/7 AUTONOMOUS FRONT-DESK WORKFORCE FOR CLINICS</span>
            </div>

            <h1 className="font-sora text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.12] tracking-tight text-slate-950">
              The AI Receptionist that frees your clinic staff from the phone.
            </h1>

            <p className="max-w-2xl mx-auto text-base sm:text-lg leading-relaxed text-slate-600">
              Stop losing patients to busy lines. AMSh answers every phone call on the first ring, books doctor visits directly into your calendar, triages routine queries, and follows up over WhatsApp — 24/7/365.
            </p>

            {/* CTA Group */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              <a
                href="/pilot"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0a0a0a] hover:bg-blue-600 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white transition-all shadow-md hover:shadow-lg cursor-pointer"
              >
                <span>Join Clinic Pilot Cohort</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>

              <a
                href="http://localhost:3000/login"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-800 transition-all shadow-xs"
              >
                <span>Book Live 1-on-1 Demo</span>
              </a>
            </div>

            <p className="font-mono-ui text-xs text-slate-400">
              Zero hardware installation &bull; Compatible with any clinic phone line &bull; HIPAA &amp; GDPR compliant
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
                <div className="font-sora text-3xl sm:text-4xl font-bold text-blue-400 tracking-tight">
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

      {/* 3. CORE CLINICAL CAPABILITIES */}
      <section className="py-24 bg-slate-50/50 border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="font-mono-ui text-xs uppercase tracking-[0.16em] text-blue-600 font-bold">
              BUILT FOR MODERN CLINICAL WORKFLOWS
            </span>
            <h2 className="font-sora text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 mt-3">
              Everything a seasoned clinic receptionist does — powered by AI.
            </h2>
            <p className="mt-3 text-slate-600 text-base leading-relaxed">
              Designed specifically for medical outpatient clinics where patient empathy, accuracy, and compliance cannot be compromised.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {CLINIC_FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs hover:border-blue-300 transition-all hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold font-mono-ui bg-blue-50 text-blue-700 border border-blue-100">
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

      {/* 4. CLINICAL SPECIALTIES SUPPORTED */}
      <section className="py-24 bg-white border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="font-mono-ui text-xs uppercase tracking-[0.16em] text-blue-600 font-bold">
              SPECIALTY ADAPTIVE NLU
            </span>
            <h2 className="font-sora text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 mt-3">
              Pre-trained on your medical specialty.
            </h2>
            <p className="mt-3 text-slate-600 text-base leading-relaxed">
              AMSh adapts its terminology, questions, appointment durations, and pre-visit intake requirements to match your practice&apos;s field.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SPECIALTIES.map((s) => (
              <div
                key={s.name}
                className="p-6 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-300 transition-all hover:shadow-sm"
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
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider px-7 py-3.5 transition-colors shadow-md"
            >
              <span>Deploy AMSh to Your Clinic in 10 Minutes</span>
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
