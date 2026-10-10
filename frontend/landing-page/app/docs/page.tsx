"use client";

import React, { useState } from "react";
import Link from "next/link";
import Nav from "@/components/landing/Nav";
import Footer3D from "@/components/landing/Footer3D";

type DocSection =
  | "quickstart"
  | "auth"
  | "telephony"
  | "api-calls"
  | "api-appointments"
  | "api-personas"
  | "api-kb"
  | "api-whatsapp"
  | "webhooks"
  | "sdks"
  | "compliance";

type Language = "curl" | "python" | "node" | "go";

interface EndpointDoc {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  title: string;
  description: string;
  auth: string;
  parameters: { name: string; type: string; required: boolean; desc: string }[];
  snippets: Record<Language, string>;
  response: string;
}

const ENDPOINTS: Record<string, EndpointDoc> = {
  dispatchCall: {
    method: "POST",
    path: "/api/v1/calls/dispatch",
    title: "Dispatch Outbound Call",
    description:
      "Initiates an autonomous outbound phone call to a patient using your clinic's AI Virtual Receptionist. Used for post-op checkups, recall reminders, and appointment re-confirmations.",
    auth: "Bearer amsh_live_...",
    parameters: [
      { name: "to", type: "string", required: true, desc: "Patient phone number in E.164 format (e.g. +919876543210 or +14155552671)" },
      { name: "from_did", type: "string", required: false, desc: "Specific clinic DID to display on caller ID. Defaults to primary line." },
      { name: "persona_id", type: "string", required: false, desc: "Virtual employee persona ('priya', 'sarah', 'emma', 'fatima')." },
      { name: "patient_name", type: "string", required: true, desc: "Patient full name for personalized greeting." },
      { name: "context", type: "object", required: false, desc: "Clinical context e.g. { doctor: 'Dr. Sharma', service: 'Root Canal' }" },
      { name: "webhook_url", type: "string", required: false, desc: "Override default webhook endpoint for this specific call lifecycle." },
    ],
    snippets: {
      curl: `curl -X POST https://api.amsh.ai/v1/calls/dispatch \\
  -H "Authorization: Bearer amsh_live_sec_9938217f2a" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+919876543210",
    "patient_name": "Rohan Verma",
    "persona_id": "priya",
    "context": {
      "clinic_name": "Sunrise Dental Care",
      "doctor_name": "Dr. Sharma",
      "purpose": "Appointment Confirmation"
    }
  }'`,
      python: `import os
from amsh import AmshClient

client = AmshClient(api_key=os.environ.get("AMSH_API_KEY"))

call = client.calls.dispatch(
    to="+919876543210",
    patient_name="Rohan Verma",
    persona_id="priya",
    context={
        "clinic_name": "Sunrise Dental Care",
        "doctor_name": "Dr. Sharma",
        "purpose": "Appointment Confirmation"
    }
)

print(f"Call Queued: {call.id} | Status: {call.status}")`,
      node: `import { AmshClient } from "@amsh/client";

const amsh = new AmshClient({ apiKey: process.env.AMSH_API_KEY });

const call = await amsh.calls.dispatch({
  to: "+919876543210",
  patientName: "Rohan Verma",
  personaId: "priya",
  context: {
    clinicName: "Sunrise Dental Care",
    doctorName: "Dr. Sharma",
    purpose: "Appointment Confirmation"
  }
});

console.log(\`Call dispatched: \${call.id}\`);`,
      go: `package main

import (
	"context"
	"fmt"
	"github.com/amsh-ai/amsh-go/client"
)

func main() {
	c := client.New("amsh_live_sec_9938217f2a")
	call, err := c.Calls.Dispatch(context.Background(), &client.DispatchParams{
		To:          "+919876543210",
		PatientName: "Rohan Verma",
		PersonaID:   "priya",
	})
	if err != nil {
		panic(err)
	}
	fmt.Printf("Dispatched call: %s\\n", call.ID)
}`,
    },
    response: `{
  "status": "queued",
  "call_id": "call_amsh_8f912be4a",
  "to": "+919876543210",
  "persona_id": "priya",
  "carrier": "twilio_sip_trunk",
  "created_at": "2026-10-10T15:45:00Z",
  "stream_url": "wss://stream.amsh.ai/v1/voice/call_amsh_8f912be4a"
}`,
  },

  getAvailableSlots: {
    method: "GET",
    path: "/api/v1/appointments/available-slots",
    title: "Query Doctor Available Slots",
    description:
      "Fetches real-time open clinical appointment slots from Google Calendar or integrated clinic EMR/HIS systems for a specific doctor or service specialty.",
    auth: "Bearer amsh_live_...",
    parameters: [
      { name: "doctor_id", type: "string", required: false, desc: "Doctor unique ID or 'all' for any available practitioner." },
      { name: "date", type: "string", required: true, desc: "Target date in ISO format YYYY-MM-DD (e.g. 2026-10-12)." },
      { name: "service_id", type: "string", required: false, desc: "Specific service ID (e.g. 'teeth_whitening', 'consultation')." },
      { name: "timezone", type: "string", required: false, desc: "Clinic timezone (defaults to Asia/Kolkata or clinic profile setting)." },
    ],
    snippets: {
      curl: `curl -X GET "https://api.amsh.ai/v1/appointments/available-slots?date=2026-10-12&doctor_id=doc_sharma_01" \\
  -H "Authorization: Bearer amsh_live_sec_9938217f2a"`,
      python: `slots = client.appointments.get_available_slots(
    date="2026-10-12",
    doctor_id="doc_sharma_01"
)

for slot in slots:
    print(f"Available: {slot.start_time} - {slot.doctor_name}")`,
      node: `const slots = await amsh.appointments.getAvailableSlots({
  date: "2026-10-12",
  doctorId: "doc_sharma_01"
});

console.log(slots.map(s => s.startTime));`,
      go: `slots, err := c.Appointments.GetAvailableSlots(ctx, "2026-10-12", "doc_sharma_01")
if err != nil {
    panic(err)
}
fmt.Println("Available slots:", len(slots))`,
    },
    response: `{
  "date": "2026-10-12",
  "doctor_id": "doc_sharma_01",
  "doctor_name": "Dr. Rohit Sharma (Orthodontist)",
  "clinic_id": "clinic_sunrise_01",
  "slots": [
    { "start_time": "10:30", "end_time": "11:00", "status": "open" },
    { "start_time": "11:15", "end_time": "11:45", "status": "open" },
    { "start_time": "14:00", "end_time": "14:30", "status": "open" },
    { "start_time": "16:45", "end_time": "17:15", "status": "open" }
  ]
}`,
  },

  bookAppointment: {
    method: "POST",
    path: "/api/v1/appointments/book",
    title: "Book & Lock Clinical Slot",
    description:
      "Atomically locks a calendar slot, creates the patient appointment record, syncs with Google Calendar, and automatically triggers an instant WhatsApp booking confirmation with clinic location.",
    auth: "Bearer amsh_live_...",
    parameters: [
      { name: "patient_name", type: "string", required: true, desc: "Full name of patient." },
      { name: "patient_phone", type: "string", required: true, desc: "Patient phone number with country code." },
      { name: "doctor_id", type: "string", required: true, desc: "Doctor ID receiving the booking." },
      { name: "slot_date", type: "string", required: true, desc: "Date in YYYY-MM-DD." },
      { name: "slot_time", type: "string", required: true, desc: "Slot time in HH:mm (24hr format, e.g. '14:00')." },
      { name: "service_name", type: "string", required: true, desc: "Treatment name (e.g. 'Dental Cleaning & Polish')." },
      { name: "notes", type: "string", required: false, desc: "Caller notes collected by the AI Receptionist." },
    ],
    snippets: {
      curl: `curl -X POST https://api.amsh.ai/v1/appointments/book \\
  -H "Authorization: Bearer amsh_live_sec_9938217f2a" \\
  -H "Content-Type: application/json" \\
  -d '{
    "patient_name": "Ananya Roy",
    "patient_phone": "+919811223344",
    "doctor_id": "doc_sharma_01",
    "slot_date": "2026-10-12",
    "slot_time": "14:00",
    "service_name": "Teeth Whitening Consultation",
    "send_whatsapp_confirmation": true
  }'`,
      python: `booking = client.appointments.book(
    patient_name="Ananya Roy",
    patient_phone="+919811223344",
    doctor_id="doc_sharma_01",
    slot_date="2026-10-12",
    slot_time="14:00",
    service_name="Teeth Whitening Consultation",
    send_whatsapp_confirmation=True
)

print(f"Booked ID: {booking.id} | WhatsApp Sent: {booking.whatsapp_sent}")`,
      node: `const booking = await amsh.appointments.book({
  patientName: "Ananya Roy",
  patientPhone: "+919811223344",
  doctorId: "doc_sharma_01",
  slotDate: "2026-10-12",
  slotTime: "14:00",
  serviceName: "Teeth Whitening Consultation",
  sendWhatsappConfirmation: true
});

console.log(\`Appointment booked: \${booking.id}\`);`,
      go: `booking, err := c.Appointments.Book(ctx, &client.BookParams{
	PatientName:  "Ananya Roy",
	PatientPhone: "+919811223344",
	DoctorID:     "doc_sharma_01",
	SlotDate:     "2026-10-12",
	SlotTime:     "14:00",
	ServiceName:  "Teeth Whitening",
})`,
    },
    response: `{
  "appointment_id": "apt_8832194b",
  "status": "confirmed",
  "patient_name": "Ananya Roy",
  "slot": "2026-10-12T14:00:00+05:30",
  "doctor_name": "Dr. Rohit Sharma",
  "google_calendar_event_id": "gcal_evt_772189a",
  "whatsapp_confirmation": {
    "status": "sent",
    "message_id": "wamid.HBgLMzk...",
    "delivered_to": "+919811223344"
  }
}`,
  },
};

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<DocSection>("quickstart");
  const [activeLang, setActiveLang] = useState<Language>("curl");
  const [copiedKey, setCopiedKey] = useState(false);

  // Playground simulation state
  const [sandboxPhone, setSandboxPhone] = useState("+919876543210");
  const [sandboxPersona, setSandboxPersona] = useState("priya");
  const [sandboxResponse, setSandboxResponse] = useState<string | null>(null);
  const [sandboxLoading, setSandboxLoading] = useState(false);

  const triggerSandboxTest = () => {
    setSandboxLoading(true);
    setTimeout(() => {
      setSandboxResponse(
        JSON.stringify(
          {
            status: "simulated_success",
            call_id: `call_sim_${Math.random().toString(36).substring(2, 9)}`,
            to: sandboxPhone,
            persona: sandboxPersona,
            greeting_audio: "https://cdn.amsh.ai/samples/priya_greeting_sample.mp3",
            latency_ms: 148,
            timestamp: new Date().toISOString(),
          },
          null,
          2
        )
      );
      setSandboxLoading(false);
    }, 700);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      <Nav />

      {/* Docs Header Banner */}
      <div className="pt-24 pb-8 bg-slate-50/80 border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 font-mono-ui text-xs text-blue-600 font-bold uppercase tracking-wider mb-2">
                <span>AMSh Platform v1.4.2</span>
                <span className="text-slate-300">&bull;</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  All APIs Operational (99.99%)
                </span>
              </div>
              <h1 className="font-sora text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
                Developer Documentation &amp; APIs
              </h1>
              <p className="mt-2 text-slate-600 text-sm max-w-2xl leading-relaxed">
                Connect your clinic telephony, WhatsApp Cloud channels, and Google Calendar to AMSh autonomous AI Virtual Employees. Built with low-latency WebSockets, Twilio Media Streams, and REST APIs.
              </p>
            </div>

            {/* Quick Actions Strip */}
            <div className="flex items-center gap-3 font-mono-ui text-xs">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-colors flex items-center gap-2 shadow-2xs"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                GitHub SDKs
              </a>

              <a
                href="http://localhost:3000/login"
                className="px-4 py-2 rounded-lg bg-[#0a0a0a] hover:bg-blue-600 text-white font-bold uppercase tracking-wider transition-all shadow-xs"
              >
                Get API Keys →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Documentation Two-Column Layout */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ========================================================= */}
          {/* LEFT SIDEBAR: DOCUMENTATION INDEX */}
          {/* ========================================================= */}
          <aside className="lg:col-span-3 sticky top-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs font-mono-ui text-xs">
            <div className="text-[10.5px] uppercase font-bold text-slate-400 px-3 py-1">
              Table of Contents
            </div>

            <nav className="space-y-1 mt-2">
              {[
                { id: "quickstart", label: "01. Quickstart (5-Min)" },
                { id: "auth", label: "02. Authentication & Keys" },
                { id: "telephony", label: "03. Audio WebSockets & SIP" },
                { id: "api-calls", label: "04. Calls Dispatch API" },
                { id: "api-appointments", label: "05. Calendar & Slots API" },
                { id: "api-personas", label: "06. AI Personas Config" },
                { id: "api-kb", label: "07. Knowledge Base RAG" },
                { id: "api-whatsapp", label: "08. WhatsApp Cloud API" },
                { id: "webhooks", label: "09. Webhooks & Signatures" },
                { id: "sdks", label: "10. Official Client SDKs" },
                { id: "compliance", label: "11. HIPAA & PHI Masking" },
              ].map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id as DocSection)}
                    className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-all flex items-center justify-between cursor-pointer ${
                      isActive
                        ? "bg-blue-50 text-blue-700 font-bold border border-blue-200"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                  </button>
                );
              })}
            </nav>

            {/* Quick Sandbox Banner */}
            <div className="mt-6 pt-4 border-t border-slate-100 p-3 rounded-xl bg-slate-50 text-[11px] text-slate-600 space-y-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                Live API Playground
              </span>
              <p className="text-[10.5px] leading-relaxed text-slate-500">
                Test requests directly in browser with mock carrier streaming.
              </p>
            </div>
          </aside>

          {/* ========================================================= */}
          {/* MAIN DOCUMENTATION PANE */}
          {/* ========================================================= */}
          <main className="lg:col-span-9 space-y-12">
            
            {/* Language Switcher Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 font-mono-ui text-xs">
                {(["curl", "python", "node", "go"] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setActiveLang(lang)}
                    className={`px-3 py-1.5 rounded-lg font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      activeLang === lang
                        ? "bg-white text-slate-950 shadow-xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {lang === "node" ? "Node / TS" : lang}
                  </button>
                ))}
              </div>

              <div className="hidden sm:flex items-center gap-2 text-xs font-mono-ui text-slate-500">
                <span>Base URL:</span>
                <code className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold border border-slate-200">
                  https://api.amsh.ai/v1
                </code>
              </div>
            </div>

            {/* SECTION 1: QUICKSTART */}
            {activeSection === "quickstart" && (
              <section className="space-y-6">
                <div>
                  <span className="font-mono-ui text-xs font-bold uppercase tracking-wider text-blue-600">
                    GETTING STARTED
                  </span>
                  <h2 className="font-sora text-2xl sm:text-3xl font-bold text-slate-950 mt-1">
                    5-Minute Developer Quickstart
                  </h2>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    Integrate your clinic with AMSh in three straightforward steps: obtain your API credentials, configure your doctor roster, and forward your inbound phone lines or dispatch outbound calls.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
                    <span className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center font-mono-ui">1</span>
                    <h3 className="font-sora font-semibold text-slate-900 text-sm">Generate API Key</h3>
                    <p className="text-xs text-slate-600">Access developer tokens in clinic dashboard with role-based scopes.</p>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
                    <span className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center font-mono-ui">2</span>
                    <h3 className="font-sora font-semibold text-slate-900 text-sm">Sync Calendars</h3>
                    <p className="text-xs text-slate-600">Connect Google Calendar or your EMR API for real-time doctor availability.</p>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
                    <span className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center font-mono-ui">3</span>
                    <h3 className="font-sora font-semibold text-slate-900 text-sm">Forward Phone Lines</h3>
                    <p className="text-xs text-slate-600">Point your Twilio, Exotel, Plivo or SIP trunk to AMSh WebSocket endpoint.</p>
                  </div>
                </div>

                {/* Code Block for Quickstart */}
                <div className="rounded-2xl border border-slate-900 bg-slate-950 p-5 text-white shadow-lg overflow-hidden font-mono-ui text-xs">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-slate-400">
                    <span>quickstart_init.{activeLang === "python" ? "py" : activeLang === "node" ? "ts" : activeLang === "go" ? "go" : "sh"}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(ENDPOINTS.dispatchCall.snippets[activeLang])}
                      className="hover:text-white transition-colors cursor-pointer"
                    >
                      {copiedKey ? "Copied ✓" : "Copy Code"}
                    </button>
                  </div>
                  <pre className="overflow-x-auto text-emerald-400 leading-relaxed">
                    {ENDPOINTS.dispatchCall.snippets[activeLang]}
                  </pre>
                </div>
              </section>
            )}

            {/* SECTION 2: AUTHENTICATION */}
            {activeSection === "auth" && (
              <section className="space-y-6">
                <div>
                  <span className="font-mono-ui text-xs font-bold uppercase tracking-wider text-blue-600">
                    SECURITY &amp; TOKENS
                  </span>
                  <h2 className="font-sora text-2xl sm:text-3xl font-bold text-slate-950 mt-1">
                    Authentication &amp; API Keys
                  </h2>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    All requests to the AMSh REST API and Audio Streaming WebSockets must be authenticated using Bearer tokens passed in the standard HTTP <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-900 font-mono-ui">Authorization</code> header.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Keep Secret Keys Secure
                  </div>
                  <p className="text-amber-800 leading-relaxed">
                    Never expose <code className="font-mono-ui">amsh_live_sec_...</code> keys in frontend code or client-side bundles. Always make calls from your backend server or secure microservice.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono-ui text-xs space-y-3">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Example Authorization Header:</span>
                    <span className="text-[11px] text-emerald-600 font-bold">256-bit TLS Enforced</span>
                  </div>
                  <code className="block p-3 rounded-lg bg-white border border-slate-200 text-slate-800 font-semibold select-all">
                    Authorization: Bearer amsh_live_sec_9938217f2a74e8bc92
                  </code>
                </div>
              </section>
            )}

            {/* SECTION 3: TELEPHONY & WEBSOCKETS */}
            {activeSection === "telephony" && (
              <section className="space-y-6">
                <div>
                  <span className="font-mono-ui text-xs font-bold uppercase tracking-wider text-blue-600">
                    REAL-TIME VOICE STREAMING
                  </span>
                  <h2 className="font-sora text-2xl sm:text-3xl font-bold text-slate-950 mt-1">
                    Twilio Media Streams &amp; SIP Gateway
                  </h2>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    AMSh streams raw bi-directional audio using low-latency WebSockets. The AI receptionist listens to the caller using streaming Deepgram STT, generates conversational responses via Groq LLM (&lt;140ms), and synthesizes natural voice via Cartesia / ElevenLabs in real-time.
                  </p>
                </div>

                {/* Packet Specification Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs font-mono-ui">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                      <tr>
                        <th className="p-3">Protocol Spec</th>
                        <th className="p-3">Requirement</th>
                        <th className="p-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="p-3 font-semibold text-blue-600">Audio Codec</td>
                        <td className="p-3 font-bold">PCM 16kHz / μ-law</td>
                        <td className="p-3 text-slate-500">16-bit Linear PCM at 16000Hz or G.711 mu-law 8000Hz (Twilio standard)</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-blue-600">Chunk Size</td>
                        <td className="p-3 font-bold">20ms Frame Packets</td>
                        <td className="p-3 text-slate-500">Send 640-byte audio chunks every 20 milliseconds over WebSocket</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-blue-600">Barge-in VAD</td>
                        <td className="p-3 font-bold">Silero VAD Enabled</td>
                        <td className="p-3 text-slate-500">AI automatically stops speaking within 60ms when caller interrupts</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-blue-600">End-to-End Latency</td>
                        <td className="p-3 font-bold">&lt;320ms Target</td>
                        <td className="p-3 text-slate-500">Combined STT + LLM First Token + TTS First Audio Chunk latency</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="rounded-2xl border border-slate-900 bg-slate-950 p-5 text-white shadow-lg font-mono-ui text-xs">
                  <div className="text-slate-400 pb-2 mb-2 border-b border-slate-800">
                    Twilio TwiML Inbound Media Stream Configuration:
                  </div>
                  <pre className="text-cyan-400 overflow-x-auto leading-relaxed">
{`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connecting to Sunrise Dental AI Receptionist...</Say>
  <Connect>
    <Stream url="wss://stream.amsh.ai/v1/voice/stream">
      <Parameter name="clinic_id" value="clinic_sunrise_01" />
      <Parameter name="persona" value="priya" />
      <Parameter name="language" value="auto_hindi_english" />
    </Stream>
  </Connect>
</Response>`}
                  </pre>
                </div>
              </section>
            )}

            {/* SECTION 4: CALLS DISPATCH API */}
            {(activeSection === "api-calls" || activeSection === "quickstart") && (
              <section className="space-y-6 pt-6">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-mono-ui text-xs font-extrabold">
                    {ENDPOINTS.dispatchCall.method}
                  </span>
                  <code className="font-mono-ui text-sm sm:text-base font-bold text-slate-900">
                    {ENDPOINTS.dispatchCall.path}
                  </code>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">
                  {ENDPOINTS.dispatchCall.description}
                </p>

                {/* Parameters List */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs font-mono-ui">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                      <tr>
                        <th className="p-3">Field</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Required</th>
                        <th className="p-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {ENDPOINTS.dispatchCall.parameters.map((param) => (
                        <tr key={param.name}>
                          <td className="p-3 font-semibold text-blue-600">{param.name}</td>
                          <td className="p-3 text-slate-500">{param.type}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${param.required ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
                              {param.required ? "REQUIRED" : "OPTIONAL"}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 font-sans">{param.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Request & Response Visualizer */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-900 bg-slate-950 p-4 text-white font-mono-ui text-xs">
                    <div className="text-slate-400 pb-2 mb-2 border-b border-slate-800 text-[11px] font-bold uppercase">
                      Request ({activeLang})
                    </div>
                    <pre className="overflow-x-auto text-emerald-300 leading-relaxed">
                      {ENDPOINTS.dispatchCall.snippets[activeLang]}
                    </pre>
                  </div>

                  <div className="rounded-xl border border-slate-900 bg-slate-950 p-4 text-white font-mono-ui text-xs">
                    <div className="text-slate-400 pb-2 mb-2 border-b border-slate-800 text-[11px] font-bold uppercase flex items-center justify-between">
                      <span>Response (200 OK)</span>
                      <span className="text-emerald-400 font-bold">Queued</span>
                    </div>
                    <pre className="overflow-x-auto text-cyan-300 leading-relaxed">
                      {ENDPOINTS.dispatchCall.response}
                    </pre>
                  </div>
                </div>
              </section>
            )}

            {/* SECTION 5: APPOINTMENTS API */}
            {activeSection === "api-appointments" && (
              <section className="space-y-8">
                {/* 1. GET Slots */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 font-mono-ui text-xs font-extrabold">
                      {ENDPOINTS.getAvailableSlots.method}
                    </span>
                    <code className="font-mono-ui text-sm sm:text-base font-bold text-slate-900">
                      {ENDPOINTS.getAvailableSlots.path}
                    </code>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    {ENDPOINTS.getAvailableSlots.description}
                  </p>

                  <div className="rounded-xl border border-slate-900 bg-slate-950 p-4 text-white font-mono-ui text-xs">
                    <div className="text-slate-400 pb-2 mb-2 border-b border-slate-800 text-[11px] font-bold uppercase flex justify-between">
                      <span>Code Example</span>
                      <span className="text-slate-500">{activeLang}</span>
                    </div>
                    <pre className="overflow-x-auto text-emerald-300 leading-relaxed">
                      {ENDPOINTS.getAvailableSlots.snippets[activeLang]}
                    </pre>
                  </div>
                </div>

                {/* 2. POST Book Slot */}
                <div className="space-y-4 pt-6 border-t border-slate-200">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-mono-ui text-xs font-extrabold">
                      {ENDPOINTS.bookAppointment.method}
                    </span>
                    <code className="font-mono-ui text-sm sm:text-base font-bold text-slate-900">
                      {ENDPOINTS.bookAppointment.path}
                    </code>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    {ENDPOINTS.bookAppointment.description}
                  </p>

                  <div className="rounded-xl border border-slate-900 bg-slate-950 p-4 text-white font-mono-ui text-xs">
                    <div className="text-slate-400 pb-2 mb-2 border-b border-slate-800 text-[11px] font-bold uppercase flex justify-between">
                      <span>Instant Booking Snippet</span>
                      <span className="text-slate-500">{activeLang}</span>
                    </div>
                    <pre className="overflow-x-auto text-cyan-300 leading-relaxed">
                      {ENDPOINTS.bookAppointment.snippets[activeLang]}
                    </pre>
                  </div>
                </div>
              </section>
            )}

            {/* SECTION 6: WEBHOOKS & SIGNATURES */}
            {activeSection === "webhooks" && (
              <section className="space-y-6">
                <div>
                  <span className="font-mono-ui text-xs font-bold uppercase tracking-wider text-blue-600">
                    EVENT STREAMING
                  </span>
                  <h2 className="font-sora text-2xl sm:text-3xl font-bold text-slate-950 mt-1">
                    Webhooks &amp; HMAC Signature Verification
                  </h2>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    AMSh dispatches real-time HTTPS webhooks for all call milestones. Each payload is cryptographically signed using an HMAC SHA-256 signature passed in the <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono-ui text-slate-900">X-AMSh-Signature</code> header.
                  </p>
                </div>

                {/* Supported Events Strip */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { event: "call.started", desc: "Fired when inbound phone line establishes connection." },
                    { event: "call.transcribed", desc: "Live streaming transcript chunk available in real-time." },
                    { event: "appointment.booked", desc: "Slot locked in calendar with patient WhatsApp sent." },
                    { event: "emergency.escalated", desc: "Safety guardrail triggered; call transferred to ER doctor." },
                    { event: "call.ended", desc: "Call terminated with full recording URL and summary." },
                  ].map((e) => (
                    <div key={e.event} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                      <div className="font-mono-ui text-xs font-bold text-blue-600">{e.event}</div>
                      <div className="text-xs text-slate-600">{e.desc}</div>
                    </div>
                  ))}
                </div>

                {/* Python HMAC Verification snippet */}
                <div className="rounded-2xl border border-slate-900 bg-slate-950 p-5 text-white shadow-lg font-mono-ui text-xs">
                  <div className="text-slate-400 pb-2 mb-2 border-b border-slate-800 text-[11px] font-bold uppercase">
                    HMAC-SHA256 Webhook Verification Example (Python FastAPI):
                  </div>
                  <pre className="text-emerald-300 overflow-x-auto leading-relaxed">
{`import hmac
import hashlib
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()
WEBHOOK_SECRET = "amsh_whsec_77812903bfe"

@app.post("/amsh-webhook")
async def handle_amsh_webhook(request: Request):
    payload = await request.body()
    signature_header = request.headers.get("X-AMSh-Signature")
    
    # Calculate expected HMAC signature
    computed = hmac.new(
        WEBHOOK_SECRET.encode(),
        msg=payload,
        digestmod=hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(f"sha256={computed}", signature_header):
        raise HTTPException(status_code=401, detail="Invalid HMAC Signature")
        
    event = await request.json()
    print(f"Received verified event: {event['type']} for Call ID: {event['data']['call_id']}")
    return {"status": "ok"}`}
                  </pre>
                </div>
              </section>
            )}

            {/* SECTION 7: INTERACTIVE SANDBOX TESTER */}
            <section className="mt-12 rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/50 via-white to-slate-50 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-blue-100">
                <div>
                  <span className="font-mono-ui text-xs font-bold uppercase text-blue-600">
                    INTERACTIVE API SANDBOX
                  </span>
                  <h3 className="font-sora text-lg font-bold text-slate-950 mt-0.5">
                    Test Live Receptionist Call API
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-mono-ui text-[11px] font-bold">
                  ● MOCK CARRIER ACTIVE
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 font-mono-ui mb-1.5 uppercase">
                    Test Phone Number:
                  </label>
                  <input
                    type="text"
                    value={sandboxPhone}
                    onChange={(e) => setSandboxPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-mono-ui text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 font-mono-ui mb-1.5 uppercase">
                    AI Employee Persona:
                  </label>
                  <select
                    value={sandboxPersona}
                    onChange={(e) => setSandboxPersona(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-mono-ui text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="priya">Priya (India · Hindi/English)</option>
                    <option value="sarah">Sarah (US · English/Spanish)</option>
                    <option value="emma">Emma (UK · British English)</option>
                    <option value="fatima">Fatima (UAE · Arabic/English)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={triggerSandboxTest}
                    disabled={sandboxLoading}
                    className="w-full py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono-ui text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {sandboxLoading ? "Simulating Stream..." : "Run Test Call →"}
                  </button>
                </div>
              </div>

              {sandboxResponse && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="text-[11px] font-mono-ui font-bold text-slate-500 mb-2">
                    Simulated Carrier Response:
                  </div>
                  <pre className="p-3 rounded-xl bg-slate-950 text-emerald-300 font-mono-ui text-xs overflow-x-auto">
                    {sandboxResponse}
                  </pre>
                </div>
              )}
            </section>

          </main>
        </div>
      </div>

      <Footer3D />
    </div>
  );
}
