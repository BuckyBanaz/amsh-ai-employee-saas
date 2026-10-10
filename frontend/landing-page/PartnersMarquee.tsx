"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Reveal } from "./Motion";

// Consistent typography tokens matching landing page (Sora for display, clean system/mono)
const DISPLAY = "font-[family-name:var(--font-display)]";

interface PartnerDetail {
  id: string;
  name: string;
  category: "voice" | "ai" | "channels" | "clinical";
  categoryLabel: string;
  tagline: string;
  protocol: string;
  latency: string;
  chipLatency: string;
  compliance: string;
  color: string;
  accentGlow: string;
  description: string;
  codeSnippet: string;
  renderLogo: () => React.ReactNode;
}

const PARTNERS: PartnerDetail[] = [
  {
    id: "twilio",
    name: "Twilio Telephony",
    category: "voice",
    categoryLabel: "Telephony Gateway",
    tagline: "Bi-directional WebSocket audio media streams & global SIP trunking",
    protocol: "WSS Media Streams (8kHz mulaw / 16kHz PCM)",
    latency: "<45ms media transit",
    chipLatency: "<45ms",
    compliance: "ISO 27001 · SOC 2 Type II",
    color: "#F22F46",
    accentGlow: "rgba(242, 47, 70, 0.25)",
    description:
      "Direct WebSocket bridge streaming inbound clinic caller voice directly to AMSh's real-time turn detection and speech engine with zero analog latency.",
    codeSnippet: `// Inbound Twilio Voice WebSocket Gateway
{
  "event": "media",
  "streamSid": "MZ8a1928df77",
  "media": {
    "payload": "base64_encoded_audio_chunk...",
    "timestamp": 1728054000
  }
}`,
    renderLogo: () => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
        <path
          fill="#F22F46"
          d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.14a7.86 7.86 0 1 1 0 15.72 7.86 7.86 0 0 1 0-15.72zm-2.95 3.14a1.81 1.81 0 1 0 0 3.62 1.81 1.81 0 0 0 0-3.62zm5.9 0a1.81 1.81 0 1 0 0 3.62 1.81 1.81 0 0 0 0-3.62zm-5.9 5.9a1.81 1.81 0 1 0 0 3.62 1.81 1.81 0 0 0 0-3.62zm5.9 0a1.81 1.81 0 1 0 0 3.62 1.81 1.81 0 0 0 0-3.62z"
        />
      </svg>
    ),
  },
  {
    id: "meta",
    name: "Meta / WhatsApp",
    category: "channels",
    categoryLabel: "Conversational Messaging",
    tagline: "Official WhatsApp Cloud Business API for instant conversational triage",
    protocol: "Cloud API v20.0 Webhooks & Interactive Messages",
    latency: "<80ms message dispatch",
    chipLatency: "<80ms",
    compliance: "End-to-End Encryption · Meta Business Verified",
    color: "#25D366",
    accentGlow: "rgba(37, 211, 102, 0.25)",
    description:
      "Patients message your clinic 24/7. AMSh answers questions, shares doctor consultation slots, and books appointments directly inside WhatsApp.",
    codeSnippet: `// WhatsApp Cloud Business Webhook Event
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "+17185550142",
          "text": { "body": "Book dental cleaning tomorrow" }
        }]
      }
    }]
  }]
}`,
    renderLogo: () => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
        <path
          fill="#25D366"
          d="M19.05 4.91A9.816 9.816 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01zm-7.01 15.24c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.264 8.264 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.183 8.183 0 0 1 2.41 5.83c.02 4.54-3.68 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.98-.15.17-.29.19-.54.07-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.17-.25.25-.41.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.66.3-.23.25-.86.84-.86 2.06s.88 2.39 1 2.56c.12.17 1.73 2.64 4.19 3.7.59.25 1.05.4 1.41.51.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.17-.48-.29z"
        />
      </svg>
    ),
  },
  {
    id: "google",
    name: "Google Cloud & Calendar",
    category: "clinical",
    categoryLabel: "Scheduling & Calendar",
    tagline: "Real-time 2-way Google Calendar slot reservations & conflict checking",
    protocol: "Google Calendar API v3 · OAuth 2.0 PKCE",
    latency: "<120ms roundtrip",
    chipLatency: "<120ms",
    compliance: "Google Enterprise Security Certified",
    color: "#4285F4",
    accentGlow: "rgba(66, 133, 244, 0.25)",
    description:
      "When a caller requests Dr. Carter at 10 AM, AMSh queries live free/busy windows, locks the slot, creates the calendar event, and sends calendar invites.",
    codeSnippet: `// 2-Way Google Calendar Slot Confirmation
const event = await calendar.events.insert({
  calendarId: 'primary',
  requestBody: {
    summary: 'Dental Checkup - Parikshit (AMSh)',
    start: { dateTime: '2026-10-05T10:00:00+05:30' },
    end: { dateTime: '2026-10-05T10:30:00+05:30' },
    attendees: [{ email: 'patient@example.com' }]
  }
});`,
    renderLogo: () => (
      <svg viewBox="0 0 24 24" className="h-6 w-6">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        />
      </svg>
    ),
  },
  {
    id: "groq",
    name: "Groq LPU Inference",
    category: "ai",
    categoryLabel: "High-Speed Inference",
    tagline: "Sub-180ms conversational turn-taking powered by LPU Architecture",
    protocol: "Groq OpenAI-Compatible Chat Completions with Strict JSON Mode",
    latency: "<180ms TTFT (Time To First Token)",
    chipLatency: "<180ms",
    compliance: "Zero Data Retention Option Available",
    color: "#F55036",
    accentGlow: "rgba(245, 80, 54, 0.25)",
    description:
      "Language Processing Units (LPUs) give AMSh conversational velocity that feels instantaneous, preventing robotic pauses and awkward over-the-phone silence.",
    codeSnippet: `// Single-Pass Groq JSON NLU Turn
{
  "category": "action",
  "intent": "book_appointment",
  "extracted_slots": {
    "doctor": "Dr. Carter",
    "date": "2026-10-05",
    "time": "10:30 AM"
  },
  "confidence": 0.985
}`,
    renderLogo: () => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <rect width="24" height="24" rx="6" fill="#18181B" />
        <path
          d="M13 3L4 14h7l-2 7 9-11h-7l2-7z"
          fill="#F55036"
          stroke="#F55036"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "deepgram",
    name: "Deepgram Nova-2",
    category: "voice",
    categoryLabel: "Streaming Speech-to-Text",
    tagline: "Clinical vocabulary & multi-accent English and multilingual speech recognition",
    protocol: "WebSocket Streaming STT with Live VAD & Utterance Endpoints",
    latency: "<150ms real-time audio transcript",
    chipLatency: "<150ms",
    compliance: "HIPAA Compliant · BAA Available",
    color: "#13EF93",
    accentGlow: "rgba(19, 239, 147, 0.25)",
    description:
      "Trained on millions of hours of medical conversations and varied accents (American, British and global English accents, plus Spanish and more) for near-zero word error rates.",
    codeSnippet: `// Deepgram Streaming Realtime Transcript
{
  "type": "Results",
  "channel": {
    "alternatives": [{
      "transcript": "I need Dr. Nguyen for a root canal consultation",
      "confidence": 0.992
    }]
  },
  "is_final": true
}`,
    renderLogo: () => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <rect width="24" height="24" rx="6" fill="#0E1B17" />
        <circle cx="12" cy="12" r="5" stroke="#13EF93" strokeWidth="2.5" />
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="#13EF93" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "cartesia",
    name: "Cartesia Sonic",
    category: "voice",
    categoryLabel: "Neural Voice Synthesis",
    tagline: "Sub-90ms ultra-expressive humanlike multilingual text-to-speech",
    protocol: "Streaming Chunked WebSocket Audio (24kHz Raw PCM)",
    latency: "<90ms TTFB Audio Generation",
    chipLatency: "<90ms",
    compliance: "Enterprise Voice Synthesis Agreement",
    color: "#00E5FF",
    accentGlow: "rgba(0, 229, 255, 0.25)",
    description:
      "Generates warm, empathetic vocal responses in American English, Spanish, and 20+ other languages with natural breathing, cadence, and medical tone.",
    codeSnippet: `// Cartesia Sonic Streaming WebSocket Synthesis
{
  "model_id": "sonic-multilingual",
  "transcript": "Doctor Carter is available at 10:30 AM tomorrow.",
  "voice": { "id": "sarah-en-us" },
  "output_format": { "sample_rate": 24000, "encoding": "pcm_s16le" }
}`,
    renderLogo: () => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <rect width="24" height="24" rx="6" fill="#0A1826" />
        <path d="M4 12h2M8 8v8M12 5v14M16 8v8M20 12h2" stroke="#00E5FF" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "stripe",
    name: "Stripe Healthcare",
    category: "clinical",
    categoryLabel: "Payments & Copay",
    tagline: "Automated deposit collection, no-show fees & payment link generation",
    protocol: "Stripe API v2024 · PaymentIntents & Webhooks",
    latency: "<100ms checkout generation",
    chipLatency: "<100ms",
    compliance: "PCI-DSS Level 1 · SOC 1/2 Certified",
    color: "#635BFF",
    accentGlow: "rgba(99, 91, 255, 0.25)",
    description:
      "Eliminates no-shows by automatically generating WhatsApp payment links for consultation deposits, aesthetic procedure booking fees, and copays.",
    codeSnippet: `// PaymentIntent Deposit Request
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{
    price_data: { currency: 'usd', unit_amount: 5000, product_data: { name: 'Consultation Deposit' } },
    quantity: 1,
  }],
  mode: 'payment'
});`,
    renderLogo: () => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
        <path
          fill="#635BFF"
          d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.97 15.932.4 12.877.4 7.644.4 4.092 3.197 4.092 7.733c0 4.887 4.195 6.082 7.37 7.219 2.456.883 3.324 1.582 3.324 2.585 0 .976-.84 1.487-2.316 1.487-2.227 0-5.11-.962-6.953-2.046l-.924 5.568c1.97.94 4.795 1.54 7.514 1.54 5.485 0 9.248-2.673 9.248-7.394 0-4.992-4.04-6.248-7.379-7.492z"
        />
      </svg>
    ),
  },
  {
    id: "hl7",
    name: "Epic / HL7 FHIR",
    category: "clinical",
    categoryLabel: "Healthcare EMR / EHR",
    tagline: "Clinical EHR schedule sync, patient verification & HIPAA compliant data exchange",
    protocol: "HL7 FHIR R4 REST API · SMART on FHIR OAuth",
    latency: "<140ms record lookup",
    chipLatency: "<140ms",
    compliance: "HIPAA Compliant · HITECH Certified",
    color: "#10B981",
    accentGlow: "rgba(16, 185, 129, 0.25)",
    description:
      "Integrates with electronic health records (EHR/EMR) to verify active patient charts, update clinical appointment books, and maintain audit logs.",
    codeSnippet: `// HL7 FHIR Appointment Resource
{
  "resourceType": "Appointment",
  "status": "booked",
  "serviceCategory": [{ "text": "Dental Care" }],
  "participant": [
    { "actor": { "reference": "Practitioner/carter-ortho" }, "status": "accepted" },
    { "actor": { "reference": "Patient/patient-49102" }, "status": "accepted" }
  ]
}`,
    renderLogo: () => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <rect width="24" height="24" rx="6" fill="#061D15" />
        <path d="M12 4v16M4 12h16" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="12" cy="12" r="3" fill="#10B981" />
      </svg>
    ),
  },
];

export default function PartnersMarquee() {
  const [activeTab, setActiveTab] = useState<"all" | "voice" | "ai" | "channels" | "clinical">("all");
  const [selectedPartner, setSelectedPartner] = useState<PartnerDetail>(PARTNERS[0]);

  const filteredPartners =
    activeTab === "all" ? PARTNERS : PARTNERS.filter((p) => p.category === activeTab);

  return (
    <section
      id="integrations"
      className="relative scroll-mt-24 w-full max-w-full overflow-hidden bg-[#050816] py-16 sm:py-20 border-t border-b border-white/5"
      style={{ contain: "paint" }}
    >
      {/* Background radial lighting */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(125,211,252,0.22)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_42%,black,transparent_78%)]" />
        <div className="absolute left-1/2 top-1/2 h-[400px] sm:h-[500px] w-[500px] sm:w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-600/15 via-indigo-600/15 to-purple-600/10 blur-[130px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 w-full">
        
        {/* Section Header */}
        <Reveal className="mx-auto max-w-3xl text-center mb-8 sm:mb-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Ecosystem &amp; Infrastructure
          </span>
          <h2 className={`${DISPLAY} mt-5 text-balance text-2xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white`}>
            Engineered on the world&apos;s{" "}
            <span className="lp-gradient-text">best voice &amp; healthcare tech.</span>
          </h2>
          <p className="mt-4 text-pretty text-sm sm:text-base leading-relaxed text-slate-300 max-w-2xl mx-auto">
            AMSh doesn&apos;t require new hardware or changing your phone numbers. It links directly into your existing telephony, WhatsApp, calendars, and clinical software.
          </p>
        </Reveal>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8 w-full max-w-full px-2">
          {[
            { id: "all", label: "All Integrations (8)" },
            { id: "voice", label: "Voice & Audio (3)" },
            { id: "ai", label: "AI (1)" },
            { id: "channels", label: "WhatsApp (1)" },
            { id: "clinical", label: "Clinical & Calendars (3)" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`${DISPLAY} px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all ${
                activeTab === tab.id
                  ? "bg-cyan-400/15 text-cyan-300 border border-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.25)]"
                  : "bg-white/[0.03] text-slate-400 border border-white/10 hover:text-white hover:border-white/20"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Interactive Architecture Console: Partner Chips + Live Tech Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mb-10 w-full min-w-0">
          
          {/* Left Column: Interactive Partner Grid / Chips */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full min-w-0">
            {filteredPartners.map((p) => {
              const isSelected = selectedPartner.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPartner(p)}
                  className={`group relative text-left p-3.5 rounded-2xl border transition-all duration-200 overflow-hidden w-full ${
                    isSelected
                      ? "bg-gradient-to-br from-white/[0.08] to-white/[0.03] border-cyan-400/50 shadow-[0_10px_30px_-10px_rgba(34,211,238,0.3)] ring-1 ring-cyan-400/30"
                      : "bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <div className="p-1.5 rounded-lg bg-slate-900/90 border border-white/10 shrink-0">
                      {p.renderLogo()}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-medium border shrink-0 ${
                        isSelected
                          ? "bg-cyan-400/20 text-cyan-300 border-cyan-400/30"
                          : "bg-white/5 text-slate-400 border-white/10"
                      }`}
                    >
                      {p.chipLatency}
                    </span>
                  </div>

                  <h3 className={`${DISPLAY} text-xs sm:text-[13px] font-bold text-white group-hover:text-cyan-200 transition-colors`}>
                    {p.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                    {p.tagline}
                  </p>

                  {/* Active selection accent line */}
                  {isSelected && (
                    <motion.div
                      layoutId="activePartnerIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Column: Live Data Flow & Webhook Terminal Inspector */}
          <div className="lg:col-span-6 relative w-full min-w-0">
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#070D1A]/95 p-3.5 sm:p-4 backdrop-blur-2xl shadow-xl w-full min-w-0">
              
              {/* Terminal Top Bar */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="h-2 w-2 rounded-full bg-rose-500/80 shrink-0" />
                  <div className="h-2 w-2 rounded-full bg-amber-500/80 shrink-0" />
                  <div className="h-2 w-2 rounded-full bg-emerald-500/80 shrink-0" />
                  <span className="ml-1 text-[11px] font-mono font-semibold text-slate-400 truncate">
                    amsh-pipeline // {selectedPartner.id}.integration
                  </span>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live
                </span>
              </div>

              {/* Selected Partner Highlight Card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedPartner.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-2.5 w-full min-w-0"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-900 border border-white/10 shrink-0">
                      {selectedPartner.renderLogo()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className={`${DISPLAY} text-xs sm:text-sm font-bold text-white`}>
                          {selectedPartner.name}
                        </h4>
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-cyan-300">
                          {selectedPartner.categoryLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed line-clamp-2">
                        {selectedPartner.description}
                      </p>
                    </div>
                  </div>

                  {/* Architecture Specs Pills */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs w-full">
                    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 min-w-0">
                      <span className="block text-[9px] uppercase font-mono tracking-wider text-slate-400">
                        Protocol &amp; Format
                      </span>
                      <span className="font-semibold text-slate-200 mt-0.5 block truncate text-[10px]" title={selectedPartner.protocol}>
                        {selectedPartner.protocol}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 min-w-0">
                      <span className="block text-[9px] uppercase font-mono tracking-wider text-slate-400">
                        Compliance &amp; Security
                      </span>
                      <span className="font-semibold text-emerald-300 mt-0.5 block truncate text-[10px]" title={selectedPartner.compliance}>
                        {selectedPartner.compliance}
                      </span>
                    </div>
                  </div>

                  {/* Code Payload Inspector */}
                  <div className="rounded-lg bg-slate-950/80 p-2.5 border border-white/10 font-mono text-[10px] text-cyan-300/90 overflow-x-auto max-h-[90px] w-full min-w-0">
                    <pre className="leading-relaxed">
                      <code>{selectedPartner.codeSnippet}</code>
                    </pre>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Developer Docs Quicklink */}
              <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 text-[10px] sm:text-[11px]">
                  Ready to connect with your clinic software?
                </span>
                <Link
                  href="/docs"
                  className="font-semibold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 transition-colors text-[10px] sm:text-[11px]"
                >
                  Developer Docs &rarr;
                </Link>
              </div>

            </div>
          </div>

        </div>

        {/* Ambient Continuous Scrolling Logo Ribbon */}
        <div className="relative pt-4 border-t border-white/10 w-full max-w-full overflow-hidden" style={{ contain: "paint" }}>
          <div className="lp-marquee w-full max-w-full overflow-hidden" style={{ maxWidth: "100%", overflow: "hidden" }}>
            <div className="lp-marquee-track flex w-max gap-3 sm:gap-4 items-center">
              {[...PARTNERS, ...PARTNERS].map((p, i) => (
                <div
                  key={`${p.id}-${i}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 whitespace-nowrap hover:border-cyan-400/30 transition-colors shrink-0"
                >
                  <div className="scale-75 shrink-0">{p.renderLogo()}</div>
                  <span className={`${DISPLAY} text-xs font-semibold text-slate-200`}>{p.name}</span>
                  <span className="text-[10px] text-cyan-400 font-mono">({p.chipLatency})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
