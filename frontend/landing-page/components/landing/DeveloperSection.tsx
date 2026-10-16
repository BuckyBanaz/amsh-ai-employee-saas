"use client";

import React, { useState } from "react";
import Link from "next/link";

type DocTab = "dispatch" | "stream" | "slots" | "whatsapp";
type CodeLang = "curl" | "python" | "node";

interface CodeSample {
  title: string;
  method: string;
  endpoint: string;
  desc: string;
  snippets: Record<CodeLang, string>;
  response: string;
  latency: string;
}

const SAMPLES: Record<DocTab, CodeSample> = {
  dispatch: {
    title: "Autonomous Call Dispatch",
    method: "POST",
    endpoint: "/api/v1/calls/dispatch",
    desc: "Trigger an AI receptionist call for appointment recalls, post-op triage, or instant caller callbacks.",
    latency: "128ms",
    snippets: {
      curl: `curl -X POST https://api.amsh.ai/v1/calls/dispatch \\
  -H "Authorization: Bearer amsh_live_sec_88329b" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+919876543210",
    "persona_id": "priya",
    "patient_name": "Rohan Verma",
    "context": {
      "doctor": "Dr. Sharma",
      "service": "Dental Checkup",
      "preferred_time": "Tomorrow 2 PM"
    }
  }'`,
      python: `from amsh import AmshClient

client = AmshClient(api_key="amsh_live_sec_88329b")

call = client.calls.dispatch(
    to="+919876543210",
    persona_id="priya",
    patient_name="Rohan Verma",
    context={
        "doctor": "Dr. Sharma",
        "service": "Dental Checkup",
        "preferred_time": "Tomorrow 2 PM"
    }
)

print(f"Call Queued: {call.id} | Status: {call.status}")`,
      node: `import { AmshClient } from "@amsh/client";

const amsh = new AmshClient({ apiKey: "amsh_live_sec_88329b" });

const call = await amsh.calls.dispatch({
  to: "+919876543210",
  personaId: "priya",
  patientName: "Rohan Verma",
  context: {
    doctor: "Dr. Sharma",
    service: "Dental Checkup"
  }
});

console.log(\`Call dispatched: \${call.id}\`);`,
    },
    response: `{
  "status": "queued",
  "call_id": "call_amsh_9921b7a",
  "to": "+919876543210",
  "persona": "priya",
  "estimated_latency": "140ms",
  "carrier": "twilio_media_streams"
}`,
  },
  stream: {
    title: "Bi-directional Audio WebSockets",
    method: "WSS",
    endpoint: "/v1/voice/stream",
    desc: "Stream raw 16kHz linear PCM or μ-law audio chunks directly from Twilio, Exotel, or your PBX.",
    latency: "45ms",
    snippets: {
      curl: `# Connect via WebSocket audio client:
websocat wss://stream.amsh.ai/v1/voice/stream \\
  --header "Authorization: Bearer amsh_live_sec_88329b" \\
  --header "X-Clinic-ID: clinic_sunrise_01"`,
      python: `import asyncio
import websockets
import json

async def stream_audio():
    uri = "wss://stream.amsh.ai/v1/voice/stream"
    async with websockets.connect(uri, extra_headers={"Authorization": "Bearer amsh_live_sec_88329b"}) as ws:
        # Send 20ms audio frame chunks (640 bytes PCM 16kHz)
        await ws.send(raw_pcm_audio_chunk)
        response_audio = await ws.recv()
        play_speaker(response_audio)

asyncio.run(stream_audio())`,
      node: `import WebSocket from "ws";

const ws = new WebSocket("wss://stream.amsh.ai/v1/voice/stream", {
  headers: { Authorization: "Bearer amsh_live_sec_88329b" }
});

ws.on("open", () => {
  ws.send(JSON.stringify({ event: "start", clinicId: "clinic_sunrise_01" }));
});

ws.on("message", (audioData) => {
  outputToSpeaker(audioData); // <180ms synthesized speech
});`,
    },
    response: `{
  "event": "media_stream_connected",
  "session_id": "stream_sess_8812a",
  "vad_active": true,
  "barge_in_latency_ms": 55,
  "codec": "pcm_16khz"
}`,
  },
  slots: {
    title: "Lock Calendar Slot",
    method: "POST",
    endpoint: "/api/v1/appointments/book",
    desc: "Directly book into Google Calendar or clinic EMR with automatic patient deduplication.",
    latency: "165ms",
    snippets: {
      curl: `curl -X POST https://api.amsh.ai/v1/appointments/book \\
  -H "Authorization: Bearer amsh_live_sec_88329b" \\
  -H "Content-Type: application/json" \\
  -d '{
    "doctor_id": "doc_sharma_01",
    "patient_name": "Pooja Mehta",
    "patient_phone": "+919811223344",
    "slot_date": "2026-10-12",
    "slot_time": "14:00",
    "send_whatsapp": true
  }'`,
      python: `booking = client.appointments.book(
    doctor_id="doc_sharma_01",
    patient_name="Pooja Mehta",
    patient_phone="+919811223344",
    slot_date="2026-10-12",
    slot_time="14:00",
    send_whatsapp=True
)

print(f"Appointment Confirmed: {booking.id}")`,
      node: `const booking = await amsh.appointments.book({
  doctorId: "doc_sharma_01",
  patientName: "Pooja Mehta",
  patientPhone: "+919811223344",
  slotDate: "2026-10-12",
  slotTime: "14:00",
  sendWhatsapp: true
});

console.log(\`Confirmed ID: \${booking.id}\`);`,
    },
    response: `{
  "status": "confirmed",
  "appointment_id": "apt_89123b",
  "doctor": "Dr. Sharma",
  "slot": "2026-10-12T14:00:00+05:30",
  "google_calendar_event_id": "gcal_evt_9918a",
  "whatsapp_message_status": "delivered"
}`,
  },
  whatsapp: {
    title: "Official WhatsApp Cloud API",
    method: "POST",
    endpoint: "/api/v1/whatsapp/send-template",
    desc: "Dispatch Meta-verified WhatsApp templates with interactive booking buttons and clinic directions.",
    latency: "112ms",
    snippets: {
      curl: `curl -X POST https://api.amsh.ai/v1/whatsapp/send-template \\
  -H "Authorization: Bearer amsh_live_sec_88329b" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+919876543210",
    "template_name": "clinic_booking_confirmation",
    "parameters": {
      "patient": "Rohan",
      "date": "12 Oct 2026",
      "time": "2:00 PM",
      "doctor": "Dr. Sharma"
    }
  }'`,
      python: `msg = client.whatsapp.send_template(
    to="+919876543210",
    template_name="clinic_booking_confirmation",
    parameters={
        "patient": "Rohan",
        "date": "12 Oct 2026",
        "time": "2:00 PM",
        "doctor": "Dr. Sharma"
    }
)`,
      node: `await amsh.whatsapp.sendTemplate({
  to: "+919876543210",
  templateName: "clinic_booking_confirmation",
  parameters: {
    patient: "Rohan",
    date: "12 Oct 2026",
    time: "2:00 PM",
    doctor: "Dr. Sharma"
  }
});`,
    },
    response: `{
  "whatsapp_id": "wamid.HBgLMzkxOD...",
  "status": "sent",
  "meta_cloud_verified": true,
  "read_receipt": "pending"
}`,
  },
};

export default function DeveloperSection() {
  const [activeTab, setActiveTab] = useState<DocTab>("dispatch");
  const [lang, setLang] = useState<CodeLang>("curl");
  const [copied, setCopied] = useState(false);

  const sample = SAMPLES[activeTab];

  const handleCopy = () => {
    navigator.clipboard.writeText(sample.snippets[lang]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="developers" className="py-24 bg-white border-b border-slate-200/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <span className="font-mono-ui text-xs uppercase tracking-[0.16em] text-blue-600 font-bold block mb-2">
              DEVELOPER FIRST &bull; TELEPHONY &amp; REST APIS
            </span>
            <h2 className="font-sora text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-950">
              Integrate your clinic telephony in 5 lines of code.
            </h2>
            <p className="mt-3 text-slate-600 text-base leading-relaxed">
              Direct REST APIs, bi-directional audio WebSockets, and SDKs for Python, Node.js and cURL. Connect your existing Twilio, Exotel, Plivo or SIP trunk to AMSh in minutes.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-mono-ui text-xs font-bold uppercase tracking-wider px-5 py-3 transition-all shadow-xs"
            >
              <span>Explore Developer Docs</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-slate-200">
          {(
            [
              { id: "dispatch", label: "01. Call Dispatch (REST)" },
              { id: "stream", label: "02. Audio Stream (WebSocket)" },
              { id: "slots", label: "03. Calendar Booking (REST)" },
              { id: "whatsapp", label: "04. WhatsApp Cloud API" },
            ] as { id: DocTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl font-mono-ui text-xs font-semibold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-slate-950 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Interactive Code Container */}
        <div className="mt-6 rounded-3xl border border-slate-800 bg-[#090d16] text-white overflow-hidden shadow-2xl">
          {/* Top Bar: Method, Endpoint, Language Switcher, Copy */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 bg-slate-950/80 border-b border-slate-800/80 font-mono-ui text-xs">
            <div className="flex items-center gap-2.5">
              <span
                className={`px-2 py-0.5 rounded text-[10.5px] font-extrabold uppercase ${
                  sample.method === "POST"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : sample.method === "WSS"
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                }`}
              >
                {sample.method}
              </span>
              <span className="font-bold text-slate-200">{sample.endpoint}</span>
              <span className="text-slate-500 hidden md:inline">&bull;</span>
              <span className="text-slate-400 text-[11px] hidden md:inline">{sample.desc}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800">
                {(["curl", "python", "node"] as CodeLang[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    className={`px-2.5 py-1 rounded text-[10.5px] font-bold uppercase transition-all cursor-pointer ${
                      lang === l ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {l === "node" ? "Node/TS" : l}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {copied ? (
                  <>
                    <span className="text-emerald-400">✓</span> Copied
                  </>
                ) : (
                  <>Copy</>
                )}
              </button>
            </div>
          </div>

          {/* Two-Column Code & Live Response */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 font-mono-ui text-xs">
            {/* Left: Request Snippet */}
            <div className="lg:col-span-7 p-6 overflow-x-auto">
              <div className="text-[10px] text-slate-500 uppercase font-bold mb-3 flex items-center justify-between">
                <span>Request Payload ({lang})</span>
                <span className="text-slate-500">Bearer Token Auth</span>
              </div>
              <pre className="text-emerald-300 leading-relaxed overflow-x-auto font-mono">
                {sample.snippets[lang]}
              </pre>
            </div>

            {/* Right: Live Response Body */}
            <div className="lg:col-span-5 p-6 bg-slate-950/40">
              <div className="text-[10px] text-slate-500 uppercase font-bold mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Response (200 OK)
                </span>
                <span className="text-emerald-400 font-bold">{sample.latency}</span>
              </div>
              <pre className="text-cyan-300 leading-relaxed overflow-x-auto font-mono">
                {sample.response}
              </pre>
            </div>
          </div>
        </div>

        {/* Feature Badges Strip */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 font-mono-ui text-xs">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="font-semibold text-slate-800">16kHz Linear PCM Audio</span>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="font-semibold text-slate-800">Silero Barge-in VAD (&lt;60ms)</span>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            <span className="font-semibold text-slate-800">HMAC-SHA256 Webhooks</span>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-600" />
            <span className="font-semibold text-slate-800">HIPAA BAA PHI Masked</span>
          </div>
        </div>

      </div>
    </section>
  );
}
