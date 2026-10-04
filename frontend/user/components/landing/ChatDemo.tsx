"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Icon } from "./icons";

const HeroOrb = dynamic(() => import("./HeroOrb"), {
  ssr: false,
  loading: () => (
    <div aria-hidden="true" className="h-full w-full flex items-center justify-center min-h-[200px]">
      <div className="h-28 w-28 rounded-full bg-cyan-400/20 blur-xl animate-pulse" />
    </div>
  ),
});

interface Turn {
  id: number;
  from: "user" | "ai";
  text: string;
  action?: { kind: string; summary: string };
  latency?: number;
}

const QUICK_SCENARIOS = [
  { label: "Book Appointment", text: "Book an appointment for tomorrow at 10 AM", icon: "calendar" },
  { label: "Timings & Fees", text: "What are your clinic consultation hours and fees?", icon: "sparkles" },
  { label: "Spanish", text: "¡Hola! ¿Puedo reservar una cita para mañana por la mañana?", icon: "message" },
  { label: "Dental Emergency", text: "Emergency: severe tooth pain and bleeding, need help now", icon: "phone" },
  { label: "Staff Replacement", text: "Will you replace my clinic's front-desk receptionist?", icon: "repeat" },
];

const PREVIEW_ANSWERS: { keys: string[]; text: string; action?: { kind: string; summary: string } }[] = [
  {
    keys: ["book", "appointment", "tomorrow", "kal", "slot", "schedule"],
    text: "I have Dr. Carter available tomorrow at 10:30 AM and 3:00 PM. I have tentatively reserved 10:30 AM for you. Would you like me to confirm this and send you a WhatsApp reminder?",
    action: { kind: "appointment.booked", summary: "Slot held: Tomorrow 10:30 AM • Synced with Google Calendar" },
  },
  {
    keys: ["timing", "hour", "fee", "cost", "charge", "open", "price", "fees"],
    text: "Our clinic is open Monday through Saturday from 9:00 AM to 8:00 PM. General consultation is $50, and specialized dental/aesthetic treatments start at $120. Would you like to schedule a visit?",
    action: { kind: "faq.retrieved", summary: "Clinic hours: 9AM-8PM • Consultation fee verified" },
  },
  {
    keys: ["hola", "español", "spanish", "cita", "mañana", "reservar", "buenos"],
    text: "¡Hola! Sí, mañana tengo disponibles las 11:00 AM y las 2:30 PM con la Dra. Carter. ¿Le reservo las 11:00 AM y le envío un recordatorio por WhatsApp?",
    action: { kind: "appointment.proposed", summary: "Spanish consultation slot selected: 11:00 AM" },
  },
  {
    keys: ["emergency", "pain", "bleeding", "severe", "urgent"],
    text: "Severe dental pain and bleeding requires immediate care. I am alerting our on-call dental surgeon and transferring your call right now. Please keep firm pressure on the bleeding area.",
    action: { kind: "safety.emergency_escalation", summary: "Direct transfer triggered to on-call surgeon" },
  },
  {
    keys: ["replace", "receptionist", "staff", "team", "job", "fire"],
    text: "No, I never replace your front-desk staff. I work alongside them as their 24/7 digital co-worker, taking repetitive phone calls, WhatsApp messages, and after-hours bookings so your team can focus on in-clinic patients.",
    action: { kind: "persona.clarification", summary: "AI Co-worker scope explained" },
  },
];

const FALLBACK_REPLY =
  "I understand! In a live setup, I answer directly from your clinic's verified information, doctors, fees, and real-time calendar slots. Try asking about booking an appointment, timings, or in Spanish!";

export default function ChatDemo() {
  const reduce = useReducedMotion();

  // Conversation turns
  const [turns, setTurns] = useState<Turn[]>([
    {
      id: 0,
      from: "ai",
      text: "Hello! Welcome to AMSh. I'm your clinic's 24/7 AI employee. Try asking me anything as a patient or a clinic owner!",
      action: { kind: "agent.greeting", summary: "Online · 24/7 Multilingual Active" },
    },
  ]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState<{ id: number; shown: number } | null>(null);

  // Audio & 3D Voice Orb States
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const idRef = useRef(1);
  const listRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const el = listRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [turns, streaming, busy, reduce]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Web Speech Synthesis preview
  const speakText = (text: string) => {
    if (!soundEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const isSpanish = /[¿¡ñáéíóú]/i.test(text);
    const matchedVoice = voices.find((v) =>
      isSpanish ? v.lang.startsWith("es") : v.lang.includes("en-US") || v.lang.includes("en-GB")
    );
    if (matchedVoice) utterance.voice = matchedVoice;

    setIsAISpeaking(true);
    utterance.onend = () => setIsAISpeaking(false);
    utterance.onerror = () => setIsAISpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const ask = (userQuery: string) => {
    const q = userQuery.trim();
    if (!q || busy) return;

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsAISpeaking(false);

    setDraft("");
    setBusy(true);

    const userId = idRef.current++;
    const aiId = idRef.current++;

    // Find best answer
    const lower = q.toLowerCase();
    const match = PREVIEW_ANSWERS.map((a) => ({
      a,
      score: a.keys.filter((k) => lower.includes(k)).length,
    }))
      .filter((x) => x.score > 0)
      .sort((x, y) => y.score - x.score)[0];

    const answerText = match?.a.text ?? FALLBACK_REPLY;
    const actionData = match?.a.action ?? { kind: "agent.response", summary: "Response generated in 180ms" };

    setTurns((t) => [...t, { id: userId, from: "user", text: q }]);

    // Simulated streaming response
    timers.current.push(
      setTimeout(() => {
        setTurns((t) => [
          ...t,
          {
            id: aiId,
            from: "ai",
            text: answerText,
            action: actionData,
            latency: 175,
          },
        ]);

        speakText(answerText);

        const words = answerText.split(" ").length;
        if (reduce) {
          setBusy(false);
          return;
        }

        for (let w = 1; w <= words; w++) {
          timers.current.push(
            setTimeout(() => {
              setStreaming(w < words ? { id: aiId, shown: w } : null);
              if (w === words) setBusy(false);
            }, w * 30)
          );
        }
        setStreaming({ id: aiId, shown: 0 });
      }, reduce ? 0 : 500)
    );
  };

  const handleTestGreeting = () => {
    const greetingText =
      "Hello! Welcome to our clinic. I'm your AI receptionist. How can I help you today?";
    speakText(greetingText);
  };

  return (
    <div className="relative mx-auto w-full max-w-6xl px-2 sm:px-4">
      {/* Outer ambient blur glow */}
      <div
        aria-hidden="true"
        className="absolute -inset-4 sm:-inset-8 rounded-[3rem] bg-gradient-to-r from-cyan-500/20 via-indigo-600/20 to-purple-600/20 blur-3xl pointer-events-none"
      />

      {/* Main Glassmorphic Interactive Console Container */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#070D1B]/95 shadow-[0_40px_120px_-30px_rgba(79,70,229,0.5)] backdrop-blur-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
          
          {/* ========================================================= */}
          {/* LEFT COLUMN: 3D VOICE ORB & INTERACTIVE AUDIO CONTROLS */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between bg-gradient-to-b from-white/[0.03] to-transparent relative">
            
            {/* Top Status & Sound Toggle */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span
                    className={`absolute inline-flex h-full w-full rounded-full ${
                      isAISpeaking ? "bg-cyan-400 animate-ping" : "bg-emerald-400"
                    }`}
                  />
                  <span
                    className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                      isAISpeaking ? "bg-cyan-500" : "bg-emerald-500"
                    }`}
                  />
                </span>
                <span className="text-xs font-bold text-white tracking-wide uppercase">
                  {isAISpeaking ? "AMSh Speaking..." : isUserSpeaking ? "Listening..." : "Voice Stage Active"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  soundEnabled
                    ? "bg-cyan-400/10 text-cyan-300 border-cyan-400/30"
                    : "bg-white/5 text-slate-400 border-white/10"
                }`}
                title="Toggle voice preview speech"
              >
                {soundEnabled ? "🔊 Voice Preview ON" : "🔇 Sound OFF"}
              </button>
            </div>

            {/* 3D WebGL Voice Orb Stage */}
            <div className="relative my-1 w-full h-36 sm:h-44 flex items-center justify-center">
              {/* Radial dynamic glow */}
              <div
                className={`absolute inset-0 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
                  isAISpeaking
                    ? "bg-cyan-400/30 scale-125"
                    : isUserSpeaking
                    ? "bg-emerald-400/30 scale-125"
                    : "bg-indigo-600/20 scale-100"
                }`}
              />
              <HeroOrb
                isAISpeaking={isAISpeaking}
                isUserSpeaking={isUserSpeaking}
                isLiveActive={true}
                animate={true}
                distance={5.0}
              />
            </div>

            {/* Center Persona Pill Badge (Matching User App Parity) */}
            <div className="flex flex-col items-center justify-center gap-2 my-2">
              <div className="flex items-center gap-2 bg-slate-900/90 border border-white/10 px-3.5 py-1.5 rounded-full text-xs text-white/90 font-medium shadow-lg">
                <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-800 shrink-0 border border-white/20">
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop&q=80"
                    alt="Sarah AI"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="font-bold text-white">Sarah</span>
                <span className="text-white/30">•</span>
                <span className="text-white/80">American English</span>
                <span className="text-white/30">•</span>
                <span className="text-cyan-400 font-semibold">Spanish &amp; 20+ more</span>
              </div>

              {/* Soundwave equalizer indicator */}
              <div className="flex items-center gap-1 h-4">
                {[...Array(9)].map((_, i) => (
                  <span
                    key={i}
                    className={`w-0.5 rounded-full bg-cyan-400 transition-all duration-150 ${
                      isAISpeaking ? "h-3 animate-pulse" : "h-1 opacity-30"
                    }`}
                    style={{ animationDelay: `${i * 100}ms` }}
                  />
                ))}
              </div>
            </div>

            {/* Voice Control Buttons */}
            <div className="space-y-3 pt-3">
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleTestGreeting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>Hear Voice Greeting</span>
                </button>
              </div>

              {/* Quick Scenario Chips */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  1-Click Test Scenarios:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SCENARIOS.map((sc) => (
                    <button
                      key={sc.label}
                      type="button"
                      onClick={() => ask(sc.text)}
                      disabled={busy}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/40 text-[11px] text-slate-200 transition-all disabled:opacity-40"
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: REAL-TIME CONVERSATION & REASONING STREAM */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-[#050914] p-4 sm:p-5">
            
            {/* Console Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-600 text-white font-bold shadow-md">
                  A
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">AMSh Interactive Console</h3>
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Sub-200ms Turn Latency · Groq Llama 3.3
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-semibold bg-white/5 border border-white/10 text-cyan-300">
                Interactive Preview
              </span>
            </div>

            {/* Conversation Log (Expansive Height & Balanced Scroll) */}
            <div
              ref={listRef}
              className="flex-1 flex flex-col gap-3.5 overflow-y-auto max-h-[300px] pr-2 scrollbar-thin"
              aria-live="polite"
            >
              <AnimatePresence initial={false}>
                {turns.map((t) => {
                  const text =
                    streaming?.id === t.id ? t.text.split(" ").slice(0, streaming.shown).join(" ") : t.text;
                  return (
                    <motion.div
                      key={t.id}
                      initial={reduce ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className={`flex flex-col ${t.from === "user" ? "items-end" : "items-start"}`}
                    >
                      <span className="text-[10px] font-mono text-slate-500 mb-1 px-1">
                        {t.from === "user" ? "You (Patient / Clinic Owner)" : "AMSh (AI Front Desk)"}
                      </span>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          t.from === "user"
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-xs"
                            : "bg-slate-900 border border-white/10 text-slate-100 rounded-tl-xs shadow-lg"
                        }`}
                      >
                        {text}
                        {streaming?.id === t.id && (
                          <span className="ml-1 inline-block h-3.5 w-1 bg-cyan-300 animate-pulse" />
                        )}

                        {/* Executed Action Ledger Card (Parity with Real Engine) */}
                        {t.action && (
                          <div className="mt-2.5 pt-2 border-t border-white/10 text-[11px] text-cyan-300 font-mono flex items-center gap-1.5">
                            <span className="text-emerald-400">✓</span>
                            <span className="font-bold uppercase tracking-wider">{t.action.kind}:</span>
                            <span className="text-slate-300 truncate">{t.action.summary}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {busy && !streaming && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900/60 border border-white/10 text-slate-400 text-xs animate-pulse w-max">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                  Reasoning &amp; generating speech audio...
                </div>
              )}
            </div>

            {/* Bottom Composer Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(draft);
              }}
              className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask anything as a patient or doctor (e.g. 'Can I book a consultation tomorrow?')..."
                disabled={busy}
                className="flex-1 min-h-12 bg-slate-950 border border-white/10 rounded-xl px-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 transition-colors"
              />
              <button
                type="submit"
                disabled={busy || !draft.trim()}
                className="h-12 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold shadow-md hover:opacity-95 disabled:opacity-40 transition-opacity flex items-center gap-1.5 shrink-0"
              >
                <span>Send</span>
                <Icon name="arrow" className="h-4 w-4" />
              </button>
            </form>

          </div>

        </div>
      </div>
    </div>
  );
}
