"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AdminReceptionistItem, updateAdminReceptionist } from "@/lib/api";
import { VoicePlayer, streamTurn, StreamSentence } from "@/lib/voiceCall";
import {
  AVAILABLE_VOICES,
  SUPPORTED_ACCENTS,
  getVoiceByModelId,
  getAccentByCode,
  VoiceOption,
  AccentOption,
} from "@/lib/voices";

const HeroOrb = dynamic(() => import("./HeroOrb"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center min-h-[260px]">
      <div className="w-24 h-24 rounded-full bg-cyan-500/20 blur-xl animate-pulse" />
    </div>
  ),
});

interface AdminVoiceStudioModalProps {
  agent: AdminReceptionistItem;
  onClose: () => void;
  onAgentUpdated?: (updated: Partial<AdminReceptionistItem>) => void;
}

interface TestAction {
  kind: string;
  summary: string;
}

interface SimResult {
  call_id: string;
  bot_response: string;
  latency_ms?: number;
  llm_provider?: string;
  test_actions?: TestAction[];
  should_transfer?: boolean;
}

interface ChatMessage {
  sender: "caller" | "ai";
  text: string;
  latency?: number;
  provider?: string;
}

const QUICK_SCENARIOS = [
  { label: "Book Appointment", text: "I want to book an appointment tomorrow at 10 AM", icon: "📅" },
  { label: "Reschedule", text: "Can I reschedule my appointment to Friday?", icon: "🔄" },
  { label: "Timings & Fees", text: "What are your clinic consultation hours and fees?", icon: "⏰" },
  { label: "Dental Emergency", text: "Emergency: severe tooth pain and bleeding, need help now", icon: "🚨" },
  { label: "Hindi Booking", text: "नमस्ते! मुझे कल डॉक्टर से मिलने का समय चाहिए।", icon: "🇮🇳" },
];

export function AdminVoiceStudioModal({
  agent,
  onClose,
  onAgentUpdated,
}: AdminVoiceStudioModalProps) {
  // Voice & Persona Selection
  const initialVoice = getVoiceByModelId(agent.voiceModel);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(initialVoice);
  const initialAccent = getAccentByCode(agent.primaryLanguage);
  const [selectedAccent, setSelectedAccent] = useState<AccentOption>(initialAccent);

  // Live Duplex Call States
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [voiceAudioEnabled, setVoiceAudioEnabled] = useState(true);

  // Call Session Identity
  const [callId, setCallId] = useState<string>(
    () => `studio_admin_${agent.id.slice(0, 8)}_${Math.random().toString(36).slice(2, 9)}`
  );

  // Editable Greeting & Settings
  const [greeting, setGreeting] = useState(
    agent.greeting || "नमस्ते! हमारे क्लिनिक में आपका स्वागत है। मैं आपकी AI रिसेप्शनिस्ट हूँ। आज मैं आपकी कैसे मदद कर सकती हूँ?"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Conversation Log & Actions
  const [userText, setUserText] = useState("");
  const [conversation, setConversation] = useState<ChatMessage[]>([
    {
      sender: "ai",
      text: agent.greeting || "नमस्ते! हमारे क्लिनिक में आपका स्वागत है। मैं आपकी AI रिसेप्शनिस्ट हूँ। आज मैं आपकी कैसे मदद कर सकती हूँ?",
    },
  ]);
  const [actions, setActions] = useState<TestAction[]>([]);

  // Synchronized Mutable Refs
  const playerRef = useRef<VoicePlayer | null>(null);
  const recognitionRef = useRef<any>(null);
  const recognitionRestartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const turnCounterRef = useRef(0);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const isLiveActiveRef = useRef(isLiveActive);
  const isMutedRef = useRef(isMuted);
  const isAISpeakingRef = useRef(isAISpeaking);
  const isThinkingRef = useRef(isThinking);
  const echoLockRef = useRef(false);
  const selectedVoiceRef = useRef(selectedVoice);
  const selectedAccentRef = useRef(selectedAccent);
  const voiceAudioEnabledRef = useRef(voiceAudioEnabled);

  // Keep the refs read by speech / audio callbacks in step with state (after commit, not during render)
  useEffect(() => {
    isLiveActiveRef.current = isLiveActive;
    isMutedRef.current = isMuted;
    isAISpeakingRef.current = isAISpeaking;
    isThinkingRef.current = isThinking;
    selectedVoiceRef.current = selectedVoice;
    selectedAccentRef.current = selectedAccent;
    voiceAudioEnabledRef.current = voiceAudioEnabled;
  }, [isLiveActive, isMuted, isAISpeaking, isThinking, selectedVoice, selectedAccent, voiceAudioEnabled]);

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // Forward ref for handleSendTurn to avoid circular closures in recognition
  const sendTurnHandlerRef = useRef<(text: string, isSpoken?: boolean) => Promise<void>>(async () => {});
  // Same for barge-in and the recognition restart, which are declared after (or are) startListening
  const interruptHandlerRef = useRef<() => void>(() => {});
  const startListeningRef = useRef<() => void>(() => {});

  // Continuous Speech Recognition Engine
  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    if (
      !isLiveActiveRef.current ||
      isMutedRef.current ||
      isAISpeakingRef.current ||
      isThinkingRef.current ||
      echoLockRef.current
    ) {
      return;
    }

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      console.warn("SpeechRecognition not supported in this browser.");
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = selectedAccentRef.current.speechLang || "hi-IN";

      rec.onstart = () => {
        setIsUserSpeaking(true);
        setInterimTranscript("");
      };

      rec.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (isAISpeakingRef.current) {
          // Caller spoke over AI -> Barge In!
          if (final.trim() || interim.trim()) {
            interruptHandlerRef.current();
          }
          return;
        }

        if (interim) {
          setInterimTranscript(interim);
        }

        if (final.trim()) {
          setInterimTranscript("");
          void sendTurnHandlerRef.current(final.trim(), true);
        }
      };

      rec.onerror = (event: any) => {
        if (event.error !== "no-speech" && event.error !== "aborted") {
          console.warn("SpeechRecognition error:", event.error);
        }
      };

      rec.onend = () => {
        setIsUserSpeaking(false);
        // Automatically restart speech loop if call is active and idle
        if (
          isLiveActiveRef.current &&
          !isMutedRef.current &&
          !isAISpeakingRef.current &&
          !isThinkingRef.current &&
          !echoLockRef.current
        ) {
          if (recognitionRestartTimerRef.current) {
            clearTimeout(recognitionRestartTimerRef.current);
          }
          recognitionRestartTimerRef.current = setTimeout(() => {
            if (
              isLiveActiveRef.current &&
              !isMutedRef.current &&
              !isAISpeakingRef.current &&
              !isThinkingRef.current &&
              !echoLockRef.current
            ) {
              startListeningRef.current();
            }
          }, 200);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e) {
      console.warn("Could not start SpeechRecognition:", e);
      setIsUserSpeaking(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRestartTimerRef.current) {
      clearTimeout(recognitionRestartTimerRef.current);
      recognitionRestartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    setIsUserSpeaking(false);
    setInterimTranscript("");
  }, []);

  // Initialize Voice Player with Auto-Resume of Mic when AI speech finishes
  const getPlayer = useCallback(() => {
    if (!playerRef.current) {
      playerRef.current = new VoicePlayer(
        (speaking) => {
          isAISpeakingRef.current = speaking;
          setIsAISpeaking(speaking);
        },
        (errorMsg) => {
          console.warn("[VoicePlayer error]:", errorMsg);
        },
        () => {
          // onFinished callback: AI finished talking!
          echoLockRef.current = true;
          // 650ms echo suppression cooldown while acoustics clear
          setTimeout(() => {
            echoLockRef.current = false;
            if (isLiveActiveRef.current && !isMutedRef.current) {
              startListening();
            }
          }, 650);
        }
      );
    }
    return playerRef.current;
  }, [startListening]);

  // Execute one conversational turn using streaming
  const handleSendTurn = async (queryText?: string, isSpoken = false) => {
    const textToSend = (queryText || userText).trim();
    if (!textToSend || !agent.businessId || (isThinking && !isSpoken)) return;

    // Disengage microphone while AI is preparing reply and speaking
    stopListening();
    echoLockRef.current = true;

    const p = getPlayer();
    p.stop();
    abortRef.current?.abort();

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const turnId = ++turnCounterRef.current;

    setUserText("");
    setIsThinking(true);
    setConversation((prev) => [...prev, { sender: "caller", text: textToSend }]);

    try {
      const result = await streamTurn<SimResult>(
        {
          business_id: agent.businessId,
          call_id: callId,
          caller_number: "+918901414107",
          user_transcript: textToSend,
        },
        (sentence: StreamSentence) => {
          if (voiceAudioEnabledRef.current && turnId === turnCounterRef.current) {
            p.enqueue({
              ...sentence,
              voiceId: sentence.voiceId || selectedVoiceRef.current.voice_id,
              language: sentence.language || selectedAccentRef.current.speechLang.slice(0, 2),
            });
          }
        },
        ctrl.signal
      );

      if (turnId !== turnCounterRef.current) return;

      setConversation((prev) => [
        ...prev,
        {
          sender: "ai",
          text: result.bot_response || "Thank you for reaching out. How else can I assist you?",
          latency: result.latency_ms,
          provider: result.llm_provider,
        },
      ]);

      if (result.test_actions?.length) {
        setActions(result.test_actions);
      }
    } catch (err: unknown) {
      if (ctrl.signal.aborted || turnId !== turnCounterRef.current) return;
      console.error("Simulation error:", err);
      const fallbackReply = "I understand. Let me note that down for our clinic reception staff.";
      setConversation((prev) => [...prev, { sender: "ai", text: fallbackReply }]);
      if (voiceAudioEnabledRef.current) {
        p.enqueue({
          text: fallbackReply,
          voiceId: selectedVoiceRef.current.voice_id,
          language: selectedAccentRef.current.speechLang.slice(0, 2),
        });
      }
    } finally {
      if (turnId === turnCounterRef.current) {
        setIsThinking(false);
      }
    }
  };

  // Interrupt AI (Barge-in): stops speech immediately and opens mic
  const handleInterrupt = useCallback(() => {
    getPlayer().stop();
    abortRef.current?.abort();
    setIsAISpeaking(false);
    isAISpeakingRef.current = false;
    setIsThinking(false);
    echoLockRef.current = false;
    if (isLiveActiveRef.current && !isMutedRef.current) {
      startListening();
    }
  }, [getPlayer, startListening]);

  useEffect(() => {
    sendTurnHandlerRef.current = handleSendTurn;
    interruptHandlerRef.current = handleInterrupt;
    startListeningRef.current = startListening;
  });

  // Start Live Duplex Call
  const handleStartLiveCall = () => {
    setIsLiveActive(true);
    isLiveActiveRef.current = true;
    setIsMuted(false);
    isMutedRef.current = false;
    setCallSeconds(0);

    if (callTimerRef.current) clearInterval(callTimerRef.current);
    callTimerRef.current = setInterval(() => {
      setCallSeconds((s) => s + 1);
    }, 1000);

    // Speak initial greeting via Cartesia voice; on completion, onFinished triggers startListening()
    const p = getPlayer();
    p.stop();
    echoLockRef.current = true;
    p.enqueue({
      text: greeting,
      voiceId: selectedVoice.voice_id,
      language: selectedAccent.speechLang.slice(0, 2),
    });
  };

  // End Live Call
  const handleEndCall = () => {
    setIsLiveActive(false);
    isLiveActiveRef.current = false;
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    stopListening();
    getPlayer().stop();
    abortRef.current?.abort();
    setIsAISpeaking(false);
    setIsUserSpeaking(false);
    setIsThinking(false);
    echoLockRef.current = false;
  };

  // Toggle Mute
  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      isMutedRef.current = false;
      if (!isAISpeaking && !isThinking) {
        startListening();
      }
    } else {
      setIsMuted(true);
      isMutedRef.current = true;
      stopListening();
    }
  };

  // Reset Session
  const handleResetCall = () => {
    handleEndCall();
    turnCounterRef.current++;
    setCallId(`studio_admin_${agent.id.slice(0, 8)}_${Math.random().toString(36).slice(2, 9)}`);
    setConversation([
      {
        sender: "ai",
        text: greeting,
      },
    ]);
    setActions([]);
  };

  // Auto-scroll chat log
  useEffect(() => {
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [conversation, isThinking]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      handleEndCall();
    };
  }, []);

  // Save Settings
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      await updateAdminReceptionist(agent.id, {
        greeting,
        voice_model: selectedVoice.voice_id,
        primary_language: selectedAccent.code,
      });
      setSaveSuccess(true);
      if (onAgentUpdated) {
        onAgentUpdated({
          greeting,
          voiceModel: selectedVoice.voice_id,
          primaryLanguage: selectedAccent.code,
        });
      }
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error("Failed to save receptionist settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#070D1B] text-slate-100 border border-slate-800/80 rounded-3xl w-full max-w-5xl max-h-[94vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700/80 shrink-0">
              <img
                src={selectedVoice.avatarUrl}
                alt={selectedVoice.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">{agent.name}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Voice Studio
                </span>
                {isLiveActive && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    {formatDuration(callSeconds)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Assigned Clinic:{" "}
                <Link href={`/businesses/${agent.businessId}`} className="text-cyan-400 hover:underline font-medium">
                  {agent.businessName}
                </Link>{" "}
                · Engine: <span className="text-slate-200 font-semibold">Cartesia Sonic + Groq Llama 3.3</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setVoiceAudioEnabled(!voiceAudioEnabled)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                voiceAudioEnabled
                  ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
              title="Toggle Audio Playback"
            >
              <span>{voiceAudioEnabled ? "🔊 Sound ON" : "🔇 Sound OFF"}</span>
            </button>

            {/* Reset Session */}
            <button
              type="button"
              onClick={handleResetCall}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1"
              title="Reset Call Conversation"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              <span>Reset</span>
            </button>

            {/* Close Button */}
            <button
              onClick={() => {
                handleEndCall();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors ml-1"
              aria-label="Close studio"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Studio Content Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80">
          
          {/* Left Column: 3D Orb Stage, Status & Voice Controls */}
          <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col items-center justify-between bg-gradient-to-b from-[#090F1F] to-[#040711] relative">
            
            {/* Top Selector Bar: Voice Model & Accent Configuration */}
            <div className="w-full grid grid-cols-2 gap-2 mb-2 z-10">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <span>Voice Character</span>
                </label>
                <select
                  value={selectedVoice.id}
                  onChange={(e) => {
                    const v = AVAILABLE_VOICES.find((voice) => voice.id === e.target.value);
                    if (v) setSelectedVoice(v);
                  }}
                  className="bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {AVAILABLE_VOICES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.accent})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <span>Accent & Language</span>
                </label>
                <select
                  value={selectedAccent.code}
                  onChange={(e) => {
                    const a = SUPPORTED_ACCENTS.find((acc) => acc.code === e.target.value);
                    if (a) setSelectedAccent(a);
                  }}
                  className="bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {SUPPORTED_ACCENTS.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.flag} {a.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3D WebGL Reactive Orb Stage */}
            <div
              onClick={isLiveActive ? handleEndCall : handleStartLiveCall}
              title={isLiveActive ? "Click Orb to End Call" : "Click Orb to Start Live Voice Call"}
              className="relative w-full h-44 sm:h-48 flex items-center justify-center cursor-pointer group z-10 my-0.5"
            >
              {/* Radial dynamic ambient glow */}
              <div
                className={`absolute inset-0 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
                  isUserSpeaking
                    ? "bg-emerald-500/25 scale-125"
                    : isAISpeaking
                    ? "bg-cyan-500/30 scale-125"
                    : isThinking
                    ? "bg-indigo-500/25 scale-110"
                    : "bg-blue-600/15 scale-95"
                }`}
              />
              <HeroOrb
                isAISpeaking={isAISpeaking}
                isUserSpeaking={isUserSpeaking}
                isLiveActive={isLiveActive}
                animate={true}
                distance={4.8}
              />
            </div>

            {/* Center Status, Speaker Identification & Persona Pill Badge */}
            <div className="text-center w-full z-10 mb-2">
              <div className="text-xs font-bold flex items-center justify-center gap-1.5 min-h-[22px]">
                {isAISpeaking ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-cyan-300 font-bold">{agent.name} is speaking...</span>
                  </>
                ) : isUserSpeaking ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-emerald-400 font-bold">Listening to your voice... (Speak now)</span>
                  </>
                ) : isThinking ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                    <span className="text-indigo-300 font-bold">AI reasoning & generating audio (&lt;200ms)...</span>
                  </>
                ) : isLiveActive ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span className="text-white/80 font-semibold">
                      Connected — {formatDuration(callSeconds)} • Speak anytime
                    </span>
                  </>
                ) : (
                  <span className="text-white/90 font-bold">Tap Orb or click Start Call to test live</span>
                )}
              </div>

              {/* Persona Pill Badge (Exact matching user dashboard) */}
              <div className="flex items-center justify-center gap-2 mt-1.5">
                <div className="flex items-center gap-1.5 bg-slate-900/90 border border-white/10 px-3 py-0.5 rounded-full text-[11px] text-white/80 font-medium shadow-2xs">
                  <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-800 shrink-0">
                    <img
                      src={selectedVoice.avatarUrl}
                      alt={selectedVoice.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="font-semibold text-white">{selectedVoice.name}</span>
                  <span className="text-white/30">•</span>
                  <span className="text-white/70">{selectedVoice.accent}</span>
                  <span className="text-white/30">•</span>
                  <span className="text-cyan-400 font-semibold">{selectedAccent.label}</span>
                </div>
              </div>

              {/* Interim voice recognition feedback */}
              {interimTranscript && (
                <div className="mt-1 text-[11px] text-emerald-400 font-mono animate-pulse">
                  &ldquo;{interimTranscript}&hellip;&rdquo;
                </div>
              )}
            </div>

            {/* In-Call Controls Dock */}
            <div className="w-full flex items-center justify-center gap-2 pt-2 border-t border-slate-800/80 z-10 mb-2">
              {isLiveActive ? (
                <>
                  {isAISpeaking && (
                    <button
                      type="button"
                      onClick={handleInterrupt}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                      </svg>
                      Interrupt
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={toggleMute}
                    className={`px-3.5 py-1.5 text-[11px] font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-md ${
                      isMuted
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        : "bg-slate-900 text-white/90 border-white/15 hover:bg-slate-800"
                    }`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      {isMuted ? (
                        <>
                          <line x1="1" y1="1" x2="23" y2="23" />
                          <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                          <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                          <line x1="12" y1="19" x2="12" y2="23" />
                          <line x1="8" y1="23" x2="16" y2="23" />
                        </>
                      ) : (
                        <>
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          <line x1="12" y1="19" x2="12" y2="23" />
                          <line x1="8" y1="23" x2="16" y2="23" />
                        </>
                      )}
                    </svg>
                    {isMuted ? "Unmute Mic" : "Mute Mic"}
                  </button>
                  <button
                    type="button"
                    onClick={handleEndCall}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    End Call
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleStartLiveCall}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all cursor-pointer flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  Start Live Voice Call
                </button>
              )}
            </div>

            {/* Quick 1-Click Test Scenarios */}
            <div className="w-full mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Quick Test Scenarios:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SCENARIOS.map((sc, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={isThinking}
                    onClick={() => handleSendTurn(sc.text)}
                    className="px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 hover:border-cyan-500/40 text-[11px] text-slate-200 flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <span>{sc.icon}</span>
                    <span>{sc.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Text Input Simulation Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendTurn();
              }}
              className="w-full flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl p-1.5 focus-within:border-cyan-500/50 transition-colors"
            >
              <input
                type="text"
                value={userText}
                onChange={(e) => setUserText(e.target.value)}
                placeholder="Type a message (or speak via live mic above)..."
                disabled={isThinking}
                className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!userText.trim() || isThinking}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-semibold hover:opacity-95 disabled:opacity-40 transition-opacity flex items-center gap-1 shrink-0"
              >
                {isThinking ? "Thinking..." : "Send"}
              </button>
            </form>

            {/* Architecture Details Bar */}
            <div className="w-full mt-2.5 pt-2 border-t border-slate-800/60 grid grid-cols-3 gap-2 text-[10px] text-slate-400 font-mono">
              <div className="truncate">
                <span className="text-slate-500">TTS Engine:</span> <span className="text-slate-300 font-semibold">{selectedVoice.engine}</span>
              </div>
              <div className="truncate text-center">
                <span className="text-slate-500">NLU:</span> <span className="text-slate-300 font-semibold">Groq Llama 3.3 70B</span>
              </div>
              <div className="truncate text-right">
                <span className="text-slate-500">Latency:</span> <span className="text-emerald-400 font-semibold">&lt;250ms target</span>
              </div>
            </div>

          </div>

          {/* Right Column: Live Transcript, Actions & Prompt Tuning */}
          <div className="lg:col-span-5 flex flex-col h-full bg-[#090F1F]">
            
            {/* Top: Live Conversation Log */}
            <div className="flex-1 p-4 overflow-y-auto space-y-2.5 max-h-[320px]" ref={chatScrollRef}>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Simulation Transcript</span>
                <span className="text-[10px] font-normal text-slate-500">{conversation.length} turns</span>
              </div>

              {conversation.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.sender === "caller" ? "items-end" : "items-start"}`}>
                  <span className="text-[10px] text-slate-500 mb-0.5 px-1 font-mono">
                    {msg.sender === "caller" ? "Caller (You)" : `${agent.name} (AI)`}
                  </span>
                  <div
                    className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      msg.sender === "caller"
                        ? "bg-blue-600 text-white rounded-tr-xs"
                        : "bg-slate-800/90 border border-slate-700/80 text-slate-200 rounded-tl-xs"
                    }`}
                  >
                    {msg.text}
                    {msg.latency != null && (
                      <div className="mt-1 text-[9px] text-cyan-400 font-mono flex items-center gap-2">
                        <span>Latency: {Math.round(msg.latency)}ms</span>
                        {msg.provider && <span>· Provider: {msg.provider}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isThinking && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 text-xs animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  Streaming AI response from Cartesia &amp; Groq...
                </div>
              )}
            </div>

            {/* Middle: Sandbox Tool Executions */}
            {actions.length > 0 && (
              <div className="px-4 py-2 bg-emerald-950/20 border-t border-b border-emerald-500/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                  AI Action Executed in Sandbox:
                </span>
                <div className="space-y-1">
                  {actions.map((act, i) => (
                    <div key={i} className="text-xs text-emerald-200 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <strong className="uppercase font-mono text-[10px] bg-emerald-900/60 px-1 py-0.5 rounded text-emerald-300">
                        {act.kind}
                      </strong>
                      <span className="truncate">{act.summary}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom: Prompt & Model Quick Configuration */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Live Greeting Prompt</span>
                {saveSuccess && (
                  <span className="text-[10px] font-semibold text-emerald-400 animate-in fade-in">
                    ✓ Saved to database
                  </span>
                )}
              </div>

              <textarea
                rows={2}
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors"
              />

              <div className="flex items-center justify-between gap-3 pt-0.5">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                  <span>Voice ID:</span>
                  <span className="text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[10px]">
                    {selectedVoice.voice_id.slice(0, 14)}...
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
