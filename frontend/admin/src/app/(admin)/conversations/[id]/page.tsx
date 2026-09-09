"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ConversationDetailPage() {
  const params = useParams();
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-5 md:p-6 animate-in fade-in duration-300 text-[13px]">
      {/* Breadcrumb Navigation */}
      <div className="mb-3">
        <Link
          href="/conversations"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#475569] hover:text-[#2563EB] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to AI Conversations
        </Link>
      </div>

      {/* Top Banner */}
      <div className="mb-4 flex items-center justify-between px-3.5 py-1.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg text-[#2563EB]">
        <div className="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span className="text-[11px] font-bold uppercase tracking-wide">
            CONVERSATION AUDIT TRACE: {params?.id || 'CNV-8912'} · RECEPTIONIST: SARAH
          </span>
        </div>
        <span className="text-[10px] font-semibold bg-white/80 px-2 py-0.5 rounded border border-[#BFDBFE]">
          Fully Resolved
        </span>
      </div>

      {/* Main Conversation Header Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[22px] font-bold text-[#0F172A] tracking-tight">
                Teeth Cleaning Booking · Sarah Wilson
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#D1FAE5] text-[#065F46]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Positive Sentiment
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-50 border border-[#E2E8F0] text-[11px] font-medium text-[#475569]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                Voice Call
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-[12px] text-[#475569] mt-1.5">
              <span className="flex items-center gap-1 font-medium">
                Business:{' '}
                <Link href="/businesses/b-1" className="text-[#2563EB] hover:underline font-semibold">
                  Smile Dental Clinic
                </Link>
              </span>
              <span>Caller: <strong>+31 6 1234 5678</strong></span>
              <span>Duration: <strong>2m 45s (6 dialogue turns)</strong></span>
              <span className="text-[#94A3B8]">Today at 10:24 AM</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/appointments/apt-1"
              className="px-3 py-1.5 bg-[#EFF6FF] border border-[#BFDBFE] hover:bg-blue-100 text-[#2563EB] rounded-lg text-[12px] font-semibold transition-colors flex items-center gap-1.5"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
              </svg>
              View Generated Booking
            </Link>
          </div>
        </div>

        {/* 4 Quick Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-[#E2E8F0]">
          <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
            <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-0.5">
              Total Tokens Used
            </div>
            <div className="text-[16px] font-bold text-[#0F172A]">
              1,480 Groq Tokens
            </div>
          </div>

          <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
            <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-0.5">
              Avg Voice Latency
            </div>
            <div className="text-[16px] font-bold text-[#10B981]">
              ~240ms (High Speed)
            </div>
          </div>

          <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
            <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-0.5">
              LLM Model Used
            </div>
            <div className="text-[14px] font-bold text-[#0F172A] mt-0.5">
              Llama 3.3 70B (Fast)
            </div>
          </div>

          <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
            <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-0.5">
              Tool Function Calls
            </div>
            <div className="text-[14px] font-bold text-[#2563EB] mt-0.5">
              2 Executed (100% Pass)
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Chat Messages (Col 7/12) & Right LLM RAG / Function Calls Trace (Col 5/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Dialogue Stream & Audio Player */}
        <div className="lg:col-span-7 space-y-4">
          {/* Audio Wave Player */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-[#0F172A]">
                Call Audio Recording
              </h3>
              <span className="text-[11px] text-[#475569] font-medium">Twilio Media Stream (Opus 48kHz)</span>
            </div>

            <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center gap-3">
              <button
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                className="w-9 h-9 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow hover:bg-blue-700 transition-colors flex-shrink-0"
              >
                {isPlayingAudio ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                )}
              </button>

              <div className="flex-1">
                <div className="flex justify-between text-[11px] text-[#475569] mb-1 font-medium">
                  <span>{isPlayingAudio ? '0:45' : '0:00'} / 2:45</span>
                  <span>Audio Latency: 240ms</span>
                </div>
                <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-[#2563EB] rounded-full transition-all duration-300 ${
                      isPlayingAudio ? 'w-1/3' : 'w-0'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Turn-by-turn Conversation Stream */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h3 className="text-[14px] font-bold text-[#0F172A]">
                Turn-by-Turn Dialogue Stream
              </h3>
              <span className="text-[11px] text-[#94A3B8]">Deepgram STT ➔ Groq LLM ➔ ElevenLabs TTS</span>
            </div>

            <div className="space-y-3 pt-1">
              {/* Turn 1 */}
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                  AI
                </div>
                <div className="flex-1 p-3 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE]/70 text-[12px] leading-relaxed">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-[#2563EB]">Sarah (AI Receptionist)</span>
                    <span className="text-[10px] text-[#94A3B8]">10:24:02 AM · Latency 210ms</span>
                  </div>
                  &quot;Good morning, thank you for calling Smile Dental Clinic. I am Sarah, your AI assistant. How may I help you today?&quot;
                </div>
              </div>

              {/* Turn 2 */}
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                  U
                </div>
                <div className="flex-1 p-3 rounded-xl bg-gray-50 border border-[#E2E8F0] text-[12px] leading-relaxed">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-[#0F172A]">Sarah Wilson (Caller)</span>
                    <span className="text-[10px] text-[#94A3B8]">10:24:08 AM</span>
                  </div>
                  &quot;Hi Sarah, I would like to book a routine teeth cleaning for next Tuesday morning if possible.&quot;
                </div>
              </div>

              {/* Turn 3 (Tool Call trigger) */}
              <div className="ml-10 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-700">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                  <span><strong>Tool Invoked:</strong> <code>{'check_doctor_availability(date="2026-02-03", service="teeth_cleaning")'}</code></span>
                </div>
                <span className="font-semibold text-emerald-700">Returned 2 slots (80ms)</span>
              </div>

              {/* Turn 4 */}
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                  AI
                </div>
                <div className="flex-1 p-3 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE]/70 text-[12px] leading-relaxed">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-[#2563EB]">Sarah (AI Receptionist)</span>
                    <span className="text-[10px] text-[#94A3B8]">10:24:14 AM · Latency 240ms</span>
                  </div>
                  &quot;Certainly! I have an opening at 10:00 AM on Tuesday with Dr. Evans. Would that work for you?&quot;
                </div>
              </div>

              {/* Turn 5 */}
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                  U
                </div>
                <div className="flex-1 p-3 rounded-xl bg-gray-50 border border-[#E2E8F0] text-[12px] leading-relaxed">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-[#0F172A]">Sarah Wilson (Caller)</span>
                    <span className="text-[10px] text-[#94A3B8]">10:24:19 AM</span>
                  </div>
                  &quot;Yes, 10:00 AM is perfect, thank you!&quot;
                </div>
              </div>

              {/* Turn 6 (Tool Call execute booking) */}
              <div className="ml-10 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-700">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                  <span><strong>Tool Invoked:</strong> <code>{'create_appointment(slot="10:00", patient="Sarah Wilson")'}</code></span>
                </div>
                <span className="font-semibold text-emerald-700">Booking ID: APT-8921 (110ms)</span>
              </div>

              {/* Turn 7 */}
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                  AI
                </div>
                <div className="flex-1 p-3 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE]/70 text-[12px] leading-relaxed">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-[#2563EB]">Sarah (AI Receptionist)</span>
                    <span className="text-[10px] text-[#94A3B8]">10:24:26 AM · Latency 220ms</span>
                  </div>
                  &quot;Splendid! Your appointment is locked in for Tuesday at 10:00 AM with Dr. Evans. I have sent an SMS confirmation to your number.&quot;
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Extracted Entities, RAG Trace & Technical Metadata */}
        <div className="lg:col-span-5 space-y-4">
          {/* Extracted Slots & Intent */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm space-y-3">
            <h3 className="text-[14px] font-bold text-[#0F172A]">
              Extracted Entities & State Machine
            </h3>

            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                <span className="text-[#94A3B8]">Detected Intent</span>
                <span className="font-bold text-[#2563EB]">Book New Appointment (99.2%)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                <span className="text-[#94A3B8]">Target Service</span>
                <span className="font-semibold text-[#0F172A]">Teeth Cleaning</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                <span className="text-[#94A3B8]">Selected Practitioner</span>
                <span className="font-semibold text-[#0F172A]">Dr. Michael Evans</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                <span className="text-[#94A3B8]">Slot Selected</span>
                <span className="font-semibold text-[#0F172A]">Tuesday at 10:00 AM</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#94A3B8]">Final State</span>
                <span className="font-bold text-[#10B981]">STATE_BOOKING_CONFIRMED</span>
              </div>
            </div>
          </div>

          {/* RAG Knowledge Base Sources Consulted */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm space-y-2.5">
            <h3 className="text-[14px] font-bold text-[#0F172A]">
              Knowledge Base / RAG Context
            </h3>
            <p className="text-[11px] text-[#475569]">
              Vector documents queried in real-time during this call:
            </p>
            <div className="space-y-1.5 text-[11px]">
              <div className="p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                <div className="font-semibold text-[#0F172A]">Smile_Dental_Services_and_Pricing.pdf</div>
                <div className="text-[10px] text-[#94A3B8]">Similarity Score: 0.94 · Chunk #14</div>
              </div>
              <div className="p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                <div className="font-semibold text-[#0F172A]">Practitioner_Doctor_Hours_2026.docx</div>
                <div className="text-[10px] text-[#94A3B8]">Similarity Score: 0.89 · Chunk #3</div>
              </div>
            </div>
          </div>

          {/* Linked Business & Caller Card */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm space-y-2.5">
            <h3 className="text-[14px] font-bold text-[#0F172A]">
              Caller & Business Metadata
            </h3>
            <div className="space-y-1.5 text-[12px]">
              <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                <span className="text-[#94A3B8]">Business Tenant</span>
                <Link href="/businesses/b-1" className="text-[#2563EB] font-semibold hover:underline">
                  Smile Dental Clinic
                </Link>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                <span className="text-[#94A3B8]">Caller Location</span>
                <span className="text-[#0F172A] font-medium">Amsterdam, Netherlands (NL)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#94A3B8]">Voice Provider</span>
                <span className="text-[#0F172A] font-medium">ElevenLabs (Rachel Dutch/EN)</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <Link
                href="/receptionists"
                className="w-full py-1.5 text-center bg-[#F8FAFC] hover:bg-gray-100 border border-[#E2E8F0] rounded text-[11px] font-semibold text-[#0F172A] transition-colors"
              >
                Inspect Receptionist Sarah
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
