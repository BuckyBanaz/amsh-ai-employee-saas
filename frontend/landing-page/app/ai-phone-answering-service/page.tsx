import type { Metadata } from "next";
import JsonLd from "@/components/landing/JsonLd";
import { pageMetadata } from "@/lib/site";
import { landingPageSchemas } from "@/lib/schema";
import Link from "next/link";
import Nav from "@/components/landing/Nav";
import Footer3D from "@/components/landing/Footer3D";

export const metadata: Metadata = pageMetadata({
  path: "/ai-phone-answering-service",
  title: "AI Phone Answering Service for Healthcare & Clinics | AMSh",
  description:
    "24/7 AI phone answering service for clinics and medical practices. Handles 50+ concurrent patient calls, answers on the first ring, books appointments, and integrates with your existing clinic phone number.",
  ogTitle: "AI Phone Answering Service for Healthcare & Clinics | AMSh",
  ogDescription:
    "Never let a patient hear a busy signal again. AMSh answers inbound clinic calls with ultra-low latency voice AI and direct calendar scheduling.",
});

const PHONE_FEATURES = [
  {
    title: "Infinite Concurrent Call Lines",
    badge: "Zero Busy Signals",
    desc: "Monday 9:00 AM rush when 20 patients dial at once? AMSh handles all 20 calls concurrently in parallel. Every caller is greeted on the first ring without hold music or voicemail queues.",
    stat: "50+ Lines",
    statLabel: "Simultaneous Call Capacity",
  },
  {
    title: "10-Minute Carrier Forwarding",
    badge: "Keep Your Existing Phone Number",
    desc: "Keep your trusted clinic phone number. Enable conditional or after-hours call forwarding via standard carrier dial codes (*71 or *004) on Verizon, AT&T, T-Mobile, BT, Vodafone, or SIP trunks.",
    stat: "<10 mins",
    statLabel: "Setup & Activation Time",
  },
  {
    title: "Human-Speed Natural Interruption",
    badge: "Silero VAD + 180ms Latency",
    desc: "Callers can interrupt mid-sentence ('Wait, actually make it Thursday afternoon') without awkward robotic delays. Full duplex conversational turn-taking feels completely natural.",
    stat: "<180ms",
    statLabel: "Voice Inference Latency",
  },
  {
    title: "Instant Staff Audio Logs & Summaries",
    badge: "HIPAA Safe Audit Logs",
    desc: "Every completed call generates an immediate structured transcription, clinical triage note, and audio recording delivered to your team dashboard and secure WhatsApp/email alerts.",
    stat: "100%",
    statLabel: "Logged & Transcribed",
  },
];

const CARRIERS = [
  { name: "AT&T Business", type: "Standard Conditional Forwarding" },
  { name: "Verizon Wireless", type: "*71 Busy/No Answer Forwarding" },
  { name: "T-Mobile", type: "**61* / **62* Forwarding" },
  { name: "British Telecom (BT)", type: "UK Clinic Direct Forwarding" },
  { name: "Twilio / Vonage / RingCentral", type: "SIP Trunking & Webhooks" },
  { name: "Vodafone / Deutsche Telekom", type: "European Landline & PBX Forwarding" },
];

export default function AiPhoneAnsweringServicePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <Nav />
      <JsonLd data={landingPageSchemas("/ai-phone-answering-service", String(metadata.description))} />

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28 border-b border-slate-100 bg-gradient-to-b from-blue-50/50 via-white to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1.5 font-mono-ui text-xs font-semibold text-blue-700 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>CARRIER-COMPATIBLE AI PHONE ANSWERING FOR HEALTHCARE</span>
            </div>

            <h1 className="font-sora text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.15] tracking-tight text-slate-950">
              The AI Phone Answering Service that never puts patients on hold.
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed font-normal">
              Eliminate busy signals, endless voicemail boxes, and front-desk phone fatigue. AMSh connects to your existing clinic phone number in 10 minutes, answering every call on the first ring with clinical intelligence.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <a
                href="/pilot"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 hover:shadow-blue-500/35 active:scale-[0.98]"
              >
                Start 14-Day Free Pilot
                <span className="ml-2 font-bold">&rarr;</span>
              </a>
              <a
                href="#carriers"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-base font-medium text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition-colors"
              >
                Supported Carriers &amp; PBX
              </a>
            </div>

            {/* Metrics Row */}
            <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-100 max-w-2xl mx-auto text-left">
              <div>
                <div className="font-sora text-2xl font-bold text-slate-900">0s</div>
                <div className="text-xs text-slate-500">Hold Queue Time</div>
              </div>
              <div>
                <div className="font-sora text-2xl font-bold text-blue-600">50+</div>
                <div className="text-xs text-slate-500">Parallel Lines</div>
              </div>
              <div>
                <div className="font-sora text-2xl font-bold text-emerald-600">&lt;180ms</div>
                <div className="text-xs text-slate-500">Speech Response</div>
              </div>
              <div>
                <div className="font-sora text-2xl font-bold text-purple-600">100%</div>
                <div className="text-xs text-slate-500">HIPAA Compliant</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. CORE FEATURES */}
      <section className="py-20 sm:py-28 bg-slate-50/60 border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <h2 className="font-sora text-3xl font-bold text-slate-950">
              Enterprise Telephony Built for Clinical Speed.
            </h2>
            <p className="text-slate-600 text-base">
              Engineered with carrier-grade WebRTC and SIP gateways to guarantee crystal-clear audio and zero dropped calls.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {PHONE_FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs hover:shadow-xl hover:border-blue-300 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                    {feat.badge}
                  </span>
                  <span className="font-sora text-xl font-bold text-blue-600">
                    {feat.stat}
                  </span>
                </div>
                <h3 className="font-sora text-xl font-bold text-slate-950 mb-3">
                  {feat.title}
                </h3>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  {feat.desc}
                </p>
                <div className="mt-4 text-xs text-slate-400 font-medium">
                  {feat.statLabel}
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 3. CARRIER COMPATIBILITY */}
      <section id="carriers" className="py-16 sm:py-24 bg-white border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <h2 className="font-sora text-2xl sm:text-3xl font-bold text-slate-950">
              Keep your existing clinic phone number.
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              No porting required. Just forward your unanswered or after-hours calls to your dedicated AMSh clinic number.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {CARRIERS.map((c) => (
              <div
                key={c.name}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 hover:bg-white hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="font-sora text-base font-bold text-slate-900">{c.name}</div>
                <div className="text-xs text-slate-500 mt-1">{c.type}</div>
                <div className="text-[11px] text-emerald-600 font-medium mt-2 flex items-center gap-1">
                  <span>&check;</span> Instant 1-Click Code Activation
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. CALL TO ACTION STRIP */}
      <section className="py-16 sm:py-20 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-purple-900/30" />
        <div className="relative mx-auto max-w-4xl px-4 text-center space-y-6">
          <h2 className="font-sora text-3xl sm:text-4xl font-bold tracking-tight">
            Ready to give your patients first-ring service 24/7?
          </h2>
          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto">
            Activate your clinic&apos;s AI phone answering service today. Try it free for 14 days with zero risk.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <a
              href="/pilot"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-7 py-4 text-base font-semibold text-white shadow-xl shadow-blue-500/30 hover:bg-blue-500 transition-all active:scale-[0.98]"
            >
              Start 14-Day Pilot
              <span className="ml-2 font-bold">&rarr;</span>
            </a>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-6 py-4 text-base font-medium text-white hover:bg-white/10 transition-colors"
            >
              Back to Main Platform
            </Link>
          </div>
        </div>
      </section>

      <Footer3D />
    </div>
  );
}
