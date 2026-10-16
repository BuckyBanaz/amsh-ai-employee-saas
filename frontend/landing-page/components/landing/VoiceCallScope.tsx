"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

interface Turn {
  id: string;
  speaker: "agent" | "caller";
  speakerName: string;
  text: string;
  actionNote?: string;
  startMs: number;
  endMs: number;
}

const TURNS: Turn[] = [
  {
    id: "t1",
    speaker: "agent",
    speakerName: "AMSh (AI Receptionist)",
    text: "Hello. Thanks for calling Smiles Orthodontics. How can I help you?",
    actionNote: "Inbound call answered on 1st ring · Sub-150ms latency",
    startMs: 0,
    endMs: 4500,
  },
  {
    id: "t2",
    speaker: "caller",
    speakerName: "Jennifer Robinson (Caller)",
    text: "Hi, I need to know if you're accepting new patients?",
    actionNote: "Intent classified: New Patient Intake",
    startMs: 4500,
    endMs: 8200,
  },
  {
    id: "t3",
    speaker: "agent",
    speakerName: "AMSh (AI Receptionist)",
    text: "Yes, we are currently accepting new patients. I can help you schedule your first appointment or answer any insurance questions.",
    actionNote: "Verified clinic intake policy via Knowledge Base (RAG)",
    startMs: 8200,
    endMs: 16500,
  },
  {
    id: "t4",
    speaker: "caller",
    speakerName: "Jennifer Robinson (Caller)",
    text: "Great, do you take Delta Dental?",
    actionNote: "Payer lookup: Delta Dental PPO / Premier",
    startMs: 16500,
    endMs: 19800,
  },
  {
    id: "t5",
    speaker: "agent",
    speakerName: "AMSh (AI Receptionist)",
    text: "Yes, we accept Delta Dental and most major insurance providers. You can fill out and submit our patient intake form on our website at www.smilesortho.com.",
    actionNote: "In-network payer verified · Patient intake form link ready",
    startMs: 19800,
    endMs: 30500,
  },
  {
    id: "t6",
    speaker: "caller",
    speakerName: "Jennifer Robinson (Caller)",
    text: "Awesome, can I go ahead and schedule an appointment?",
    actionNote: "Booking schedule workflow triggered",
    startMs: 30500,
    endMs: 34200,
  },
  {
    id: "t7",
    speaker: "agent",
    speakerName: "AMSh (AI Receptionist)",
    text: "Yes, let me get some information from you first. Can I get your name, phone number, and date of birth?",
    actionNote: "Collecting mandatory EHR patient intake fields",
    startMs: 34200,
    endMs: 42000,
  },
  {
    id: "t8",
    speaker: "caller",
    speakerName: "Jennifer Robinson (Caller)",
    text: "Yep, it's Jennifer Robinson, 123-456-7890, September 8th, 1987.",
    actionNote: "Captured: Jennifer Robinson · DOB 09/08/1987 · +1 123-456-7890",
    startMs: 42000,
    endMs: 49500,
  },
  {
    id: "t9",
    speaker: "agent",
    speakerName: "AMSh (AI Receptionist)",
    text: "Thank you. Let's go ahead and get you scheduled.",
    actionNote: "Calendar slot locked · Confirmation SMS dispatched",
    startMs: 49500,
    endMs: 53580,
  },
];

const TOTAL_DURATION_MS = 53580;
const AUDIO_SRC = "/demo_audio/air-healthcare.mp3";

export default function VoiceCallScope() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [viewMode, setViewMode] = useState<"live" | "transcript">("live");

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const currentTurnIdx = Math.max(
    0,
    TURNS.findIndex((t) => currentTimeMs >= t.startMs && currentTimeMs < t.endMs) !== -1
      ? TURNS.findIndex((t) => currentTimeMs >= t.startMs && currentTimeMs < t.endMs)
      : currentTimeMs >= TOTAL_DURATION_MS
      ? TURNS.length - 1
      : 0
  );

  const activeTurn = TURNS[currentTurnIdx] || TURNS[0];

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      stopAudio();
      if (audioRef.current) {
        audioRef.current.src = "";
      }
    };
  }, [stopAudio]);

  const initAudio = () => {
    if (audioRef.current) return;
    const audio = new Audio(AUDIO_SRC);
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      if (audioRef.current) {
        setCurrentTimeMs(audioRef.current.currentTime * 1000);
      }
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTimeMs(0);
    };

    audio.onerror = () => {
      setIsPlaying(false);
    };
  };

  const seekToMs = (targetMs: number) => {
    const clamped = Math.max(0, Math.min(TOTAL_DURATION_MS, targetMs));
    setCurrentTimeMs(clamped);

    if (!audioRef.current) {
      initAudio();
    }

    if (audioRef.current) {
      audioRef.current.currentTime = clamped / 1000;
      if (!isPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopAudio();
      return;
    }

    if (!audioRef.current) {
      initAudio();
    }

    if (audioRef.current) {
      audioRef.current.currentTime = currentTimeMs / 1000;
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  return (
    <div className="relative w-full max-w-[500px] mx-auto rounded-3xl border border-slate-200/90 bg-white p-4.5 sm:p-5 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.12)]">
      
      {/* ========================================================= */}
      {/* 1. CALL HEADER: ZERO-OVERFLOW RESPONSIVE ARCHITECTURE */}
      {/* ========================================================= */}
      <div className="pb-3.5 border-b border-slate-100">
        <div className="flex items-start justify-between gap-2.5">
          {/* Clinic Brand & Caller Meta */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0 shadow-2xs">
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 border-white" />
              </span>
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-[15px] sm:text-base font-bold text-slate-950 font-sora tracking-tight leading-none truncate">
                  Smiles Orthodontics
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-mono-ui truncate">
                Caller: <span className="text-slate-800 font-semibold">Jennifer Robinson</span>
              </p>
            </div>
          </div>

          {/* Clean Live Badge */}
          <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider font-mono-ui whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Call</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. MODE SWITCHER BAR: LIVE vs TRANSCRIPT */}
      {/* ========================================================= */}
      <div className="flex items-center justify-between pt-3 pb-2">
        <div className="inline-flex p-0.5 rounded-xl bg-slate-100 border border-slate-200/80 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setViewMode("live")}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              viewMode === "live"
                ? "bg-white text-slate-950 font-bold shadow-2xs"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            Live Visualizer
          </button>
          <button
            type="button"
            onClick={() => setViewMode("transcript")}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              viewMode === "transcript"
                ? "bg-white text-slate-950 font-bold shadow-2xs"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            Transcript ({TURNS.length})
          </button>
        </div>

        <span className="text-[11px] font-mono-ui text-slate-400 font-medium whitespace-nowrap">
          Turn <strong className="text-slate-800 font-bold">{currentTurnIdx + 1}</strong> of {TURNS.length}
        </span>
      </div>

      {/* ========================================================= */}
      {/* 3. CONVERSATION DISPLAY AREA */}
      {/* ========================================================= */}
      {viewMode === "live" ? (
        /* LIVE SYNCHRONIZED TURN CARD */
        <div className="my-2 rounded-2xl bg-gradient-to-b from-slate-50/80 via-white to-slate-50/50 p-4 border border-slate-200 min-h-[165px] flex flex-col justify-between shadow-2xs">
          <div>
            {/* Active Speaker Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold shadow-2xs shrink-0 ${
                    activeTurn.speaker === "agent"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-900 text-white"
                  }`}
                >
                  {activeTurn.speaker === "agent" ? "AI" : "JR"}
                </span>
                <span className="text-xs font-bold text-slate-900 font-sora">
                  {activeTurn.speakerName}
                </span>
              </div>

              <span className="text-[10px] font-mono-ui text-blue-600 font-bold bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md tabular-nums">
                {formatTime(activeTurn.startMs)}
              </span>
            </div>

            {/* Spoken Dialogue Text with Left Accent Bar */}
            <div className="pl-3 border-l-2 border-blue-500/80 mt-2">
              <p className="text-[14px] font-medium text-slate-900 leading-relaxed">
                &ldquo;{activeTurn.text}&rdquo;
              </p>
            </div>
          </div>

          {/* Clinical Action Note (Crisp, No Truncation, Perfectly Wrapped) */}
          {activeTurn.actionNote && (
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-start gap-2 text-[11.5px] font-semibold text-emerald-800 bg-emerald-50/80 p-2 rounded-xl border border-emerald-200/90 font-mono-ui leading-tight">
              <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{activeTurn.actionNote}</span>
            </div>
          )}
        </div>
      ) : (
        /* FULL SCROLLABLE CONVERSATION LOG */
        <div className="my-2 rounded-2xl bg-slate-50 p-3 border border-slate-200 max-h-[200px] overflow-y-auto space-y-2">
          {TURNS.map((t, idx) => {
            const isTurnActive = idx === currentTurnIdx;
            const isAgent = t.speaker === "agent";
            return (
              <div
                key={t.id}
                onClick={() => seekToMs(t.startMs)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isTurnActive
                    ? "bg-white border-blue-400 ring-2 ring-blue-500/20 shadow-xs"
                    : "bg-white/80 border-slate-200/80 hover:bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] font-mono-ui font-bold uppercase px-1.5 py-0.5 rounded ${
                        isAgent ? "bg-blue-600 text-white" : "bg-slate-800 text-white"
                      }`}
                    >
                      {isAgent ? "AI" : "Caller"}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{t.speakerName}</span>
                  </div>
                  <span className="text-[10px] font-mono-ui text-slate-400 tabular-nums">
                    {formatTime(t.startMs)}
                  </span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  &ldquo;{t.text}&rdquo;
                </p>
                {t.actionNote && (
                  <div className="mt-1 text-[10px] text-emerald-700 font-mono-ui font-medium flex items-center gap-1">
                    <span>✓ {t.actionNote}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. PROFESSIONAL AUDIO SCRUBBER WITH EMBEDDED TIME (NO OVERFLOW) */}
      {/* ========================================================= */}
      <div className="pt-1.5">
        {/* Scrubber Progress Bar Framed by Start & Total Time */}
        <div className="flex items-center gap-2 text-[11px] font-mono-ui font-semibold text-slate-500 mb-3">
          <span className="tabular-nums text-slate-800 shrink-0">{formatTime(currentTimeMs)}</span>
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickPos = (e.clientX - rect.left) / rect.width;
              seekToMs(clickPos * TOTAL_DURATION_MS);
            }}
            className="group relative flex-1 bg-slate-100 hover:bg-slate-200 h-2 rounded-full overflow-hidden cursor-pointer transition-colors"
          >
            <div
              className="bg-blue-600 h-full transition-all duration-75 rounded-full"
              style={{ width: `${Math.min(100, (currentTimeMs / TOTAL_DURATION_MS) * 100)}%` }}
            />
          </div>
          <span className="tabular-nums text-slate-400 shrink-0">{formatTime(TOTAL_DURATION_MS)}</span>
        </div>

        {/* Action Button: Full-Width Primary Audio Trigger */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={togglePlay}
            className="w-full inline-flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl bg-slate-950 hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer hover:shadow-md active:scale-98"
          >
            {isPlaying ? (
              <>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
                <span>Pause Call Audio</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>Listen to Call Audio (53s)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. TELEPHONY SPECS FOOTER (COMPACT, ZERO OVERLAP GUARANTEE) */}
      {/* ========================================================= */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-500 font-mono-ui">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
          <span>US English Audio</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-600 font-medium shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>&lt;150ms Edge Telephony</span>
        </div>
      </div>

    </div>
  );
}
