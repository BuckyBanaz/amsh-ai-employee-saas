"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

interface Scenario {
  id: string;
  label: string;
  specialty: string;
  turns: Turn[];
}

interface Turn {
  id: string;
  speaker: "agent" | "caller";
  speakerName: string;
  text: string;
  actionNote?: string;
  startMs: number;
  endMs: number;
}

const SCENARIOS: Scenario[] = [
  {
    id: "booking",
    label: "Dental Booking",
    specialty: "Dental Clinic",
    turns: [
      {
        id: "b1",
        speaker: "agent",
        speakerName: "Priya (AI Receptionist)",
        text: "Hello, Sunrise Dental Clinic में आपका स्वागत है। मैं Priya बात कर रही हूँ। बताइए, मैं आपकी कैसे मदद कर सकती हूँ?",
        startMs: 0,
        endMs: 4600,
      },
      {
        id: "b2",
        speaker: "caller",
        speakerName: "Patient (Caller)",
        text: "नमस्ते, मुझे Dr. Sharma के साथ दांतों में दर्द के लिए कल का appointment चाहिए।",
        startMs: 4600,
        endMs: 8800,
      },
      {
        id: "b3",
        speaker: "agent",
        speakerName: "Priya (AI Receptionist)",
        text: "ज़रूर! Dr. Sharma कल दोपहर 2:00 बजे और 4:30 बजे available हैं। आपके लिए कौनसा समय सही रहेगा?",
        actionNote: "Checked Google Calendar availability (120ms)",
        startMs: 8800,
        endMs: 13800,
      },
      {
        id: "b4",
        speaker: "caller",
        speakerName: "Patient (Caller)",
        text: "हाँ, 2:00 बजे का समय बिल्कुल सही रहेगा।",
        startMs: 13800,
        endMs: 16400,
      },
      {
        id: "b5",
        speaker: "agent",
        speakerName: "Priya (AI Receptionist)",
        text: "Done! आपकी appointment कल दोपहर 2:00 बजे confirm कर दी गई है। हमने WhatsApp पर confirmation भेज दिया है।",
        actionNote: "Calendar slot locked · WhatsApp confirmation sent",
        startMs: 16400,
        endMs: 21500,
      },
    ],
  },
  {
    id: "fees",
    label: "FAQ & Fees",
    specialty: "Dermatology",
    turns: [
      {
        id: "f1",
        speaker: "agent",
        speakerName: "Priya (AI Receptionist)",
        text: "Hi! Welcome to Glow Aesthetic Clinic. How can I help you today?",
        startMs: 0,
        endMs: 3800,
      },
      {
        id: "f2",
        speaker: "caller",
        speakerName: "Patient (Caller)",
        text: "Hi, what is Dr. Kapoor's consultation fee for skin acne treatment?",
        startMs: 3800,
        endMs: 7600,
      },
      {
        id: "f3",
        speaker: "agent",
        speakerName: "Priya (AI Receptionist)",
        text: "Dr. Kapoor's initial consultation is ₹800, which includes a digital skin scan. We have an opening today at 5:00 PM if you'd like to visit.",
        actionNote: "Retrieved from Clinic Knowledge Base (RAG)",
        startMs: 7600,
        endMs: 13200,
      },
    ],
  },
  {
    id: "urgent",
    label: "Emergency Gate",
    specialty: "Cardiology / General",
    turns: [
      {
        id: "u1",
        speaker: "caller",
        speakerName: "Patient (Caller)",
        text: "Doctor, mere father ko chest mein severe pain aur sweating ho rahi hai!",
        startMs: 0,
        endMs: 4200,
      },
      {
        id: "u2",
        speaker: "agent",
        speakerName: "Priya (Safety Guardrail)",
        text: "यह emergency लग रही है! कृपया तुरंत 112 या 108 डायल करें। मैं अभी call हमारे emergency doctor को transfer कर रही हूँ।",
        actionNote: "⚠️ Emergency Protocol Triggered · Transferring to On-call Doctor",
        startMs: 4200,
        endMs: 9800,
      },
    ],
  },
];

export default function VoiceCallScope() {
  const [activeScenarioId, setActiveScenarioId] = useState("booking");
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressMs, setProgressMs] = useState(0);
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0);

  const activeScenario = SCENARIOS.find((s) => s.id === activeScenarioId) || SCENARIOS[0];
  const totalDurationMs = activeScenario.turns[activeScenario.turns.length - 1]?.endMs || 20000;

  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Play synthetic voice via Web SpeechSynthesis API
  const speakTurn = useCallback((turn: Turn) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(turn.text);
      utterance.lang = "hi-IN";
      utterance.rate = 1.05;
      utterance.pitch = turn.speaker === "agent" ? 1.15 : 0.95;
      window.speechSynthesis.speak(utterance);
    } catch {}
  }, []);

  const handlePlay = () => {
    if (isPlaying) return;
    setIsPlaying(true);
    startTimeRef.current = performance.now() - progressMs;
    speakTurn(activeScenario.turns[currentTurnIdx] || activeScenario.turns[0]);
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  const handleToggle = () => {
    if (isPlaying) handlePause();
    else handlePlay();
  };

  const switchScenario = (scenarioId: string) => {
    handlePause();
    setActiveScenarioId(scenarioId);
    setProgressMs(0);
    setCurrentTurnIdx(0);
  };

  // Animation frame loop
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const loop = (now: number) => {
      const elapsed = now - startTimeRef.current;
      if (elapsed >= totalDurationMs) {
        setProgressMs(0);
        setCurrentTurnIdx(0);
        setIsPlaying(false);
        return;
      }

      setProgressMs(elapsed);

      const idx = activeScenario.turns.findIndex(
        (t) => elapsed >= t.startMs && elapsed < t.endMs
      );
      if (idx !== -1 && idx !== currentTurnIdx) {
        setCurrentTurnIdx(idx);
        speakTurn(activeScenario.turns[idx]);
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, currentTurnIdx, totalDurationMs, activeScenario, speakTurn]);

  const activeTurn = activeScenario.turns[currentTurnIdx] || activeScenario.turns[0];

  return (
    <div className="relative w-full max-w-[560px] mx-auto rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_12px_40px_-15px_rgba(15,23,42,0.12)]">
      {/* 1. Header Bar: Simulated Inbound Call */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-live-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900 leading-tight">
                Sunrise Dental Clinic
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live Call
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Caller: +91 987•• ••210 &bull; Handled by <span className="font-semibold text-blue-600">Priya (AI)</span>
            </p>
          </div>
        </div>

        {/* Live Audio Indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-0.5 h-3">
            {[40, 90, 60, 100, 50].map((h, i) => (
              <span
                key={i}
                className={`w-0.5 rounded-full bg-blue-600 transition-all ${
                  isPlaying ? "animate-pulse" : "opacity-40"
                }`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <span className="text-[11px] text-slate-600">
            {isPlaying ? "Speaking..." : "00:24"}
          </span>
        </div>
      </div>

      {/* 2. Interactive Scenario Tabs */}
      <div className="flex items-center gap-1.5 pt-3.5 pb-3">
        <span className="text-[11px] font-semibold text-slate-400 mr-1 hidden sm:inline">
          Test Case:
        </span>
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => switchScenario(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeScenarioId === s.id
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* 3. Live Turn-by-Turn Speech Bubble Display */}
      <div className="my-3 rounded-2xl bg-slate-50/80 p-4 border border-slate-200 min-h-[160px] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${
                activeTurn.speaker === "agent"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {activeTurn.speakerName}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              Turn {currentTurnIdx + 1} of {activeScenario.turns.length}
            </span>
          </div>

          <p className="text-sm font-medium text-slate-900 leading-relaxed mt-2">
            &ldquo;{activeTurn.text}&rdquo;
          </p>
        </div>

        {/* Live Automatic Backend Action Trigger (if any) */}
        {activeTurn.actionNote && (
          <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span>{activeTurn.actionNote}</span>
          </div>
        )}
      </div>

      {/* 4. Timeline Progress & Interactive Audio Controls */}
      <div className="pt-2">
        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-3.5">
          <div
            className="bg-blue-600 h-full transition-all duration-100 rounded-full"
            style={{ width: `${(progressMs / totalDurationMs) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleToggle}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer hover:shadow-md"
          >
            {isPlaying ? (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
                <span>Pause Call</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>Listen to Call Audio</span>
              </>
            )}
          </button>

          <a
            href="http://localhost:3000/login"
            className="py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-2xs"
          >
            Test on WhatsApp →
          </a>
        </div>
      </div>

      {/* 5. Telephony Specs Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <div>
          Language: <span className="text-slate-700 font-semibold">Hindi &bull; English &bull; Hinglish</span>
        </div>
        <div className="text-blue-600 font-semibold">
          Latency: &lt;180ms
        </div>
      </div>
    </div>
  );
}
