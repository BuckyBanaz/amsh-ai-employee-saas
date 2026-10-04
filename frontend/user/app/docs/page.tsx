"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sora } from "next/font/google";
import { Logo } from "@/components/landing/Logo";

const sora = Sora({ subsets: ["latin"], variable: "--font-display", display: "swap" });

interface Endpoint {
  method: "GET" | "POST" | "DELETE" | "PUT";
  path: string;
  desc: string;
  badge: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: "POST",
    path: "/api/v1/appointments/book",
    desc: "Book a new patient appointment, hold slot in Google Calendar, and dispatch WhatsApp confirmation.",
    badge: "Calendar 2-Way",
  },
  {
    method: "GET",
    path: "/api/v1/calendar/availability",
    desc: "Retrieve real-time available doctor consultation slots for any date range.",
    badge: "Conflict Free",
  },
  {
    method: "GET",
    path: "/api/v1/calls/{call_id}/transcript",
    desc: "Retrieve verbatim call transcript, speaker diarization, audio recording URL, and AI ledger actions.",
    badge: "Audio & Text",
  },
  {
    method: "POST",
    path: "/api/v1/voice/simulate/stream",
    desc: "Simulate a live caller turn with sentence-by-sentence streaming for testing your custom prompts.",
    badge: "Streaming NLU",
  },
  {
    method: "POST",
    path: "/api/v1/webhooks/subscribe",
    desc: "Register a webhook endpoint to receive real-time appointment and emergency escalation events.",
    badge: "Event Driven",
  },
];

const CODE_EXAMPLES = {
  curl: `curl -X POST https://api.amsh.ai/v1/appointments/book \\
  -H "Authorization: Bearer amsh_live_key_9f82d1c" \\
  -H "Content-Type: application/json" \\
  -d '{
    "patient_name": "Rohan Verma",
    "patient_phone": "+919876543210",
    "doctor_id": "doc_dr_sharma_01",
    "service": "Root Canal Consultation",
    "datetime": "2026-10-06T10:30:00+05:30",
    "send_whatsapp_confirmation": true
  }'`,

  node: `import { AmshClient } from "@amsh/sdk";

const amsh = new AmshClient({
  apiKey: process.env.AMSH_API_KEY,
});

// Book appointment & trigger instant WhatsApp notification
const booking = await amsh.appointments.book({
  patientName: "Rohan Verma",
  patientPhone: "+919876543210",
  doctorId: "doc_dr_sharma_01",
  service: "Root Canal Consultation",
  datetime: "2026-10-06T10:30:00+05:30",
  sendWhatsAppConfirmation: true,
});

console.log("Appointment confirmed:", booking.id, booking.googleCalendarEventId);`,

  python: `import httpx

headers = {
    "Authorization": "Bearer amsh_live_key_9f82d1c",
    "Content-Type": "application/json",
}

payload = {
    "patient_name": "Rohan Verma",
    "patient_phone": "+919876543210",
    "doctor_id": "doc_dr_sharma_01",
    "service": "Root Canal Consultation",
    "datetime": "2026-10-06T10:30:00+05:30",
    "send_whatsapp_confirmation": True,
}

response = httpx.post("https://api.amsh.ai/v1/appointments/book", json=payload, headers=headers)
print(response.json())`,
};

const WEBHOOK_EXAMPLE = `{
  "event": "appointment.booked",
  "event_id": "evt_98fbc127",
  "created_at": "2026-10-04T20:30:00Z",
  "data": {
    "booking_id": "apt_0470b45a",
    "business_id": "biz_demo_clinic_703b",
    "caller_number": "+918901414107",
    "patient_name": "Rohan Verma",
    "doctor": "Dr. Sharma (BDS, MDS)",
    "slot": "2026-10-06 10:30 AM",
    "channel": "phone_call",
    "google_calendar_event_id": "gcal_event_84128919",
    "whatsapp_status": "delivered"
  }
}`;

export default function DocsPage() {
  const [activeLang, setActiveLang] = useState<"curl" | "node" | "python">("node");
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`${sora.variable} min-h-screen bg-[#050816] text-slate-100`}>
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/landing" className="flex items-center gap-2">
              <Logo />
            </Link>
            <span className="hidden sm:inline-block rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 text-xs font-mono font-semibold text-cyan-300">
              v1.0 REST &amp; Webhooks
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/landing"
              className="text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              ← Back to Main Site
            </Link>
            <Link
              href="/login"
              className="rounded-xl bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-all border border-white/15"
            >
              Developer Console
            </Link>
          </div>
        </div>
      </header>

      {/* Main Documentation Container */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Navigation Sidebar */}
        <aside className="lg:col-span-3 hidden lg:block sticky top-24 self-start space-y-6">
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Getting Started
            </h4>
            <ul className="space-y-1.5 text-sm text-slate-300">
              <li>
                <a href="#overview" className="block px-2.5 py-1.5 rounded-lg bg-white/5 text-cyan-300 font-medium">
                  Architecture Overview
                </a>
              </li>
              <li>
                <a href="#authentication" className="block px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-white/5 transition-colors">
                  Authentication &amp; Keys
                </a>
              </li>
              <li>
                <a href="#endpoints" className="block px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-white/5 transition-colors">
                  Core REST API
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Protocols &amp; Integration
            </h4>
            <ul className="space-y-1.5 text-sm text-slate-300">
              <li>
                <a href="#telephony" className="block px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-white/5 transition-colors">
                  Twilio Media Streams (WebSocket)
                </a>
              </li>
              <li>
                <a href="#calendar" className="block px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-white/5 transition-colors">
                  Google Calendar 2-Way Sync
                </a>
              </li>
              <li>
                <a href="#webhooks" className="block px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-white/5 transition-colors">
                  Webhooks &amp; Events
                </a>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-xs text-slate-400">
            <p className="font-semibold text-white mb-1">Need enterprise custom EHR?</p>
            <p className="leading-relaxed mb-3">We support direct Epic, Cerner &amp; HL7 FHIR integrations.</p>
            <Link href="/register" className="text-cyan-400 hover:underline font-semibold">
              Contact Solutions Engineering →
            </Link>
          </div>
        </aside>

        {/* Right Main Content */}
        <main className="lg:col-span-9 space-y-12">
          
          {/* Header Hero */}
          <section id="overview" className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
              Developer Documentation
            </span>
            <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-5xl font-bold tracking-tight text-white">
              Integrate AMSh into your healthcare system.
            </h1>
            <p className="text-base sm:text-lg leading-relaxed text-slate-300 max-w-3xl">
              Connect your clinic&apos;s existing phone lines, WhatsApp numbers, EHR software, and calendar systems. AMSh provides low-latency streaming endpoints, webhooks, and complete telephony orchestration.
            </p>
          </section>

          {/* Architecture Pipeline Diagram Card */}
          <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Real-Time Voice Pipeline Architecture
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center text-xs font-mono pt-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
                <div className="text-cyan-300 font-bold mb-1">1. Audio Ingestion</div>
                <div className="text-slate-300">Twilio Media Stream</div>
                <div className="text-[10px] text-slate-500 mt-1">audio/x-mulaw 8kHz</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
                <div className="text-emerald-400 font-bold mb-1">2. Streaming STT</div>
                <div className="text-slate-300">Deepgram Nova-2</div>
                <div className="text-[10px] text-slate-500 mt-1">&lt;150ms transcription</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
                <div className="text-indigo-300 font-bold mb-1">3. Orchestration</div>
                <div className="text-slate-300">Groq LPU (Llama 3.3)</div>
                <div className="text-[10px] text-slate-500 mt-1">Deterministic State Machine</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
                <div className="text-cyan-300 font-bold mb-1">4. Neural Voice</div>
                <div className="text-slate-300">Cartesia Sonic</div>
                <div className="text-[10px] text-slate-500 mt-1">&lt;90ms TTFB Audio Out</div>
              </div>
            </div>
          </section>

          {/* Authentication Section */}
          <section id="authentication" className="space-y-3">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">
              Authentication
            </h2>
            <p className="text-sm leading-relaxed text-slate-300">
              All API requests must include your secret API key in the <code className="text-cyan-300 font-mono">Authorization</code> HTTP header as a Bearer token:
            </p>
            <div className="rounded-2xl border border-white/10 bg-black/60 p-4 font-mono text-xs text-cyan-300">
              Authorization: Bearer amsh_live_xxxxxxxxxxxxxxxxxxxxxxxx
            </div>
          </section>

          {/* Code Integration Examples with Language Tabs */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">
                Code Integration Examples
              </h2>
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1 text-xs">
                {(["node", "python", "curl"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setActiveLang(lang)}
                    className={`px-3 py-1 rounded-lg font-semibold capitalize transition-all ${
                      activeLang === lang
                        ? "bg-cyan-500 text-slate-950 font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {lang === "node" ? "Node.js" : lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Code Block */}
            <div className="relative rounded-2xl border border-white/10 bg-[#070D1B] overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs font-mono text-slate-400">
                <span>Book Appointment &amp; Send WhatsApp Reminder</span>
                <button
                  type="button"
                  onClick={() => handleCopy(CODE_EXAMPLES[activeLang])}
                  className="hover:text-white transition-colors"
                >
                  {copied ? "✓ Copied!" : "Copy Snippet"}
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
                {CODE_EXAMPLES[activeLang]}
              </pre>
            </div>
          </section>

          {/* Core REST Endpoints Table */}
          <section id="endpoints" className="space-y-4">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">
              Core REST Endpoints
            </h2>
            <div className="space-y-3">
              {ENDPOINTS.map((ep) => (
                <div
                  key={ep.path}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          ep.method === "POST"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {ep.method}
                      </span>
                      <code className="text-xs font-mono font-semibold text-white">{ep.path}</code>
                    </div>
                    <p className="text-xs text-slate-300">{ep.desc}</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-white/5 border border-white/10 text-cyan-300 self-start sm:self-center shrink-0">
                    {ep.badge}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Webhooks Section */}
          <section id="webhooks" className="space-y-4">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">
              Real-Time Webhooks
            </h2>
            <p className="text-sm leading-relaxed text-slate-300">
              AMSh delivers instant webhook events to your backend whenever an appointment is confirmed, rescheduled, or when emergency escalation is detected:
            </p>
            <div className="rounded-2xl border border-white/10 bg-[#070D1B] p-4 overflow-x-auto">
              <div className="text-[11px] font-mono text-slate-500 mb-2">Example: appointment.booked webhook payload</div>
              <pre className="text-xs font-mono text-emerald-300 leading-relaxed">
                {WEBHOOK_EXAMPLE}
              </pre>
            </div>
          </section>

        </main>

      </div>
    </div>
  );
}
