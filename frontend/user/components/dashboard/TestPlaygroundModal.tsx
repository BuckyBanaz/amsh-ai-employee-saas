"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { STRINGS } from '../../utils/strings/en';
import { CallRecorder } from '../../utils/call_recorder';
import { BargeInDetector } from '../../utils/barge_in';
import { isEchoOfAI, isRealInterruption } from '../../utils/voice_echo';
import { DashboardController, AgentItem } from '../../controllers/dashboard.controller';
import { TestModeBanner, TestAction } from './TestModeBanner';
import { API_ENDPOINTS } from '../../utils/api_endpoints';
import { StorageService } from '../../services/storage.service';
import { ChooseVoiceModal, VoiceOption, AVAILABLE_VOICES } from './ai-studio/ChooseVoiceModal';
import { withPreviewToken } from '../../services/voice_preview.service';

const HeroOrb = dynamic(() => import('../landing/HeroOrb'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-24 h-24 rounded-full bg-cyan-500/20 blur-xl animate-pulse" />
    </div>
  ),
});

type ScenarioId = 'booking' | 'reschedule' | 'emergency' | 'faq';
type Mode = 'scenario' | 'live';
type Channel = 'browser_voice' | 'live_chat' | 'phone_exotel';
type CallPhase = 'idle' | 'dialing' | 'connected' | 'ended';
type Message = { speaker: 'AI' | 'User'; text: string; timestamp?: string };

interface TestPlaygroundModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUPPORTED_ACCENTS = [
  { code: 'hi-IN', label: 'Hindi / Hinglish (India)' },
  { code: 'en-IN', label: 'Indian English' },
  { code: 'pa-IN', label: 'Punjabi (India)' },
  { code: 'bn-IN', label: 'Bengali (India)' },
  { code: 'en-US', label: 'American English (US)' },
  { code: 'en-GB', label: 'British English (UK)' },
  { code: 'es-ES', label: 'Spanish' },
  { code: 'de-DE', label: 'German' },
  { code: 'nl-NL', label: 'Dutch' },
  { code: 'fr-FR', label: 'French' },
  { code: 'ar-SA', label: 'Arabic (Gulf / Saudi)' },
  { code: 'ar-AE', label: 'Arabic (UAE)' },
  { code: 'ar-EG', label: 'Arabic (Egyptian)' },
];

// Fallback canned reply in case backend is offline
function simulateReply(userText: string): string {
  const t = userText.toLowerCase();
  if (/(pain|emergency|urgent|hurt|bleeding|help me|ambulance)/.test(t)) {
    return "I understand this sounds urgent. I'm escalating this to our emergency medical staff right away. Please stay on the line.";
  }
  if (/(book|appointment|schedule|slot|doctor|milna)/.test(t)) {
    return 'I can help with that. Dr. Sarah Wilson is available tomorrow at 10:00 AM. Shall I reserve that for you?';
  }
  if (/(cancel|reschedule|move|change)/.test(t)) {
    return 'No problem, I can help you reschedule. What day and time works best for you?';
  }
  if (/(price|cost|how much|fee|charge)/.test(t)) {
    return 'Our general consultation starts at Rs. 500 and dental cleaning is Rs. 1,200. Would you like me to book an appointment?';
  }
  if (/(hour|open|close|time|sunday)/.test(t)) {
    return "We are open Monday to Saturday, 9:00 AM to 7:00 PM, and Sundays 10 AM to 2 PM. How can I assist you further?";
  }
  return "Thank you for the information. Could you tell me a little more so I can assist you accurately?";
}

export function TestPlaygroundModal({ isOpen, onClose }: TestPlaygroundModalProps) {
  const content = STRINGS.DASHBOARD.COMPONENTS.TEST_PLAYGROUND;
  const [mode, setMode] = useState<Mode>('live');
  const [channel, setChannel] = useState<Channel>('browser_voice');

  // Scripted scenario mode
  const [scenario, setScenario] = useState<ScenarioId>('booking');
  const [hasRun, setHasRun] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Live free-chat / simulated call mode
  const [phoneNumber, setPhoneNumber] = useState('+91 8901414107');
  const [callPhase, setCallPhase] = useState<CallPhase>('idle');
  const [callSeconds, setCallSeconds] = useState(0);
  const [dialStatusMsg, setDialStatusMsg] = useState('');
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [testActions, setTestActions] = useState<TestAction[]>([]);
  const [currentCallId, setCurrentCallId] = useState<string>(() => 'sim_' + Math.random().toString(36).slice(2, 9));
  const [playingMsgIndex, setPlayingMsgIndex] = useState<number | null>(null);

  // Browser Voice / WebRTC Simulation State
  const [isMicListening, setIsMicListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [interimSpeech, setInterimSpeech] = useState('');
  const [selectedAccent, setSelectedAccent] = useState('en-US');
  const [isMuted, setIsMuted] = useState(false);
  const [micSupported, setMicSupported] = useState(true);

  // Active Agent configuration
  const [isAgentLoading, setIsAgentLoading] = useState(true);
  const [businessInfo, setBusinessInfo] = useState<any>(null);
  const [agentConfig, setAgentConfig] = useState<AgentItem | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(AVAILABLE_VOICES[0]);
  const [isVoicePickerOpen, setIsVoicePickerOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<any>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Stale-closure prevention and safety watchdog refs
  const callPhaseRef = useRef<CallPhase>(callPhase);
  const channelRef = useRef<Channel>(channel);
  const isMutedRef = useRef<boolean>(isMuted);
  const isAISpeakingRef = useRef<boolean>(isAISpeaking);
  const selectedAccentRef = useRef<string>(selectedAccent);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechSafetyWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSpeechResultRef = useRef<(text: string) => void>(() => {});
  const echoLockRef = useRef<boolean>(false);
  const echoCooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAITextRef = useRef<string>('');
  const recentAITextsRef = useRef<string[]>([]);
  const isProcessingTurnRef = useRef<boolean>(false);
  const recorderRef = useRef<CallRecorder | null>(null);
  const playTokenRef = useRef(0);
  const turnIdRef = useRef(0);
  const bargeDetectorRef = useRef<BargeInDetector | null>(null);
  const aiSpeechStartedAtRef = useRef(0);
  const aiSpeechEndedAtRef = useRef(0);
  const activeTurnRef = useRef<{ cancel: () => void } | null>(null); // the streamed reply that is currently being spoken
  const startListeningRef = useRef<(duringAI?: boolean) => void>(() => {});

  useEffect(() => { callPhaseRef.current = callPhase; }, [callPhase]);
  useEffect(() => { channelRef.current = channel; }, [channel]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { isAISpeakingRef.current = isAISpeaking; }, [isAISpeaking]);
  useEffect(() => { selectedAccentRef.current = selectedAccent; }, [selectedAccent]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [liveMessages, interimSpeech, isTyping]);

  // Load Agent Settings
  useEffect(() => {
    if (isOpen) {
      setIsAgentLoading(true);
      Promise.all([
        DashboardController.getAgent().catch(() => null),
        DashboardController.getBusinessInfo().catch(() => null),
      ])
        .then(([agent, business]) => {
          setAgentConfig(agent);
          setBusinessInfo(business);
          const bCountry = (business?.country || '').toLowerCase();
          const isIndia = bCountry.includes('india') || bCountry.includes('+91');

          // 1. Prioritize exact accent saved in DB
          if (agent?.config?.accent) {
            setSelectedAccent(agent.config.accent);
          } else if (agent?.config?.stt?.language) {
            setSelectedAccent(agent.config.stt.language);
          } else if (agent?.primary_language) {
            const lang = agent.primary_language.toLowerCase();
            if (lang.includes('hi')) setSelectedAccent('hi-IN');
            else if (lang.includes('pa')) setSelectedAccent('pa-IN');
            else if (lang.includes('bn')) setSelectedAccent('bn-IN');
            else if (lang.includes('es')) setSelectedAccent('es-ES');
            else if (lang.includes('de')) setSelectedAccent('de-DE');
            else if (lang.includes('nl')) setSelectedAccent('nl-NL');
            else setSelectedAccent(isIndia ? 'en-IN' : 'en-US');
          } else {
            setSelectedAccent(isIndia ? 'en-IN' : 'en-US');
          }

          // 2. Prioritize exact voice saved in DB
          let voiceFound = false;
          if (agent?.voice_model) {
            const found = AVAILABLE_VOICES.find((v) => v.voice_id === agent.voice_model);
            if (found) { setSelectedVoice(found); voiceFound = true; }
          } else if (agent?.config?.tts_provider?.voice_id) {
            const found = AVAILABLE_VOICES.find(
              (v) => v.voice_id === agent.config?.tts_provider?.voice_id
            );
            if (found) { setSelectedVoice(found); voiceFound = true; }
          } else if (agent?.config?.tts_provider?.voice_name) {
            const found = AVAILABLE_VOICES.find(
              (v) => v.name.toLowerCase() === agent?.config?.tts_provider?.voice_name?.toLowerCase()
            );
            if (found) { setSelectedVoice(found); voiceFound = true; }
          }

          if (!voiceFound) {
            const fallbackVoice = isIndia
              ? AVAILABLE_VOICES.find((v) => v.voice_id === 'f8f5f1b2-f02d-4d8e-a40d-fd850a487b3d') || AVAILABLE_VOICES[0]
              : AVAILABLE_VOICES.find((v) => v.voice_id === '79a125e8-cd45-4c13-8a67-188112f4dd22') || AVAILABLE_VOICES[0];
            setSelectedVoice(fallbackVoice);
          }
        })
        .catch((err) => console.warn('Failed to load agent config for playground:', err))
        .finally(() => setIsAgentLoading(false));

      if (typeof window !== 'undefined') {
        const hasRecog = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
        setMicSupported(hasRecog);
      }
    }
  }, [isOpen]);

  // Call timer
  useEffect(() => {
    if (callPhase === 'connected') {
      timerRef.current = setInterval(() => setCallSeconds((s) => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callPhase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dialTimeoutRef.current) clearTimeout(dialTimeoutRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (speechSafetyWatchdogRef.current) clearTimeout(speechSafetyWatchdogRef.current);
      if (recognitionRestartTimerRef.current) clearTimeout(recognitionRestartTimerRef.current);
      if (audioRef.current) audioRef.current.pause();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      recorderRef.current?.discard();
      recorderRef.current = null;
      bargeDetectorRef.current?.close();
      bargeDetectorRef.current = null;
      stopListening();
    };
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Complete speech playback and trigger callback cleanly
  // `immediate`: another sentence of the same reply follows, so skip the echo cooldown (the mic stays locked) and run
  // the callback right away, otherwise every sentence boundary would add an 850ms silence.
  const finishSpeech = useCallback((onFinished?: () => void, immediate = false) => {
    if (speechSafetyWatchdogRef.current) {
      clearTimeout(speechSafetyWatchdogRef.current);
      speechSafetyWatchdogRef.current = null;
    }
    currentUtteranceRef.current = null;
    aiSpeechEndedAtRef.current = Date.now();
    setPlayingMsgIndex(null);
    if (echoCooldownTimerRef.current) {
      clearTimeout(echoCooldownTimerRef.current);
    }
    echoLockRef.current = true;
    if (immediate && onFinished) {
      onFinished(); // the next sentence's playSpeech() re-marks the AI as speaking straight away
      return;
    }
    bargeDetectorRef.current?.disarm();
    setIsAISpeaking(false);
    isAISpeakingRef.current = false;

    // Echo cancellation buffer: keep mic muted and locked for 850ms while acoustic waves clear the room & audio buffers flush
    echoCooldownTimerRef.current = setTimeout(() => {
      echoLockRef.current = false;
      if (onFinished) {
        onFinished();
      }
    }, 850);
  }, []);

  // 100% Reliable Speech Synthesis: Cartesia API with automatic Native Web Speech Synthesis fallback
  // `moreComing`: called when this audio ends; true means another sentence of the same reply is queued (or still being
  // written), so the hand-off to it is immediate instead of going through the echo cooldown.
  const playSpeech = useCallback((text: string, idx: number, onFinished?: () => void, moreComing?: () => boolean, voice?: { emotion?: string; ttsText?: string }) => {
    // 1. Immediately mark AI speaking and engage echo lock BEFORE aborting mic
    if (!isAISpeakingRef.current) aiSpeechStartedAtRef.current = Date.now();
    setIsAISpeaking(true);
    isAISpeakingRef.current = true;
    echoLockRef.current = true;
    lastAITextRef.current = text.toLowerCase().trim();
    recentAITextsRef.current = [text.toLowerCase().trim(), ...recentAITextsRef.current.slice(0, 4)];
    // Keep the microphone open while the AI talks (no restart between sentences), so the caller can interrupt by voice.
    // While the AI talks the caller is watched by a loudness detector on an echo-cancelled mic, not by speech recognition.
    bargeDetectorRef.current?.arm(() => {
      bargeIn();
      startListeningRef.current();
    });

    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setPlayingMsgIndex(idx);

    // Safety watchdog: auto-finish if audio or speech synthesis gets stuck
    const estimatedDurationMs = Math.max(3000, (text.length / 10) * 1000 + 2000);
    if (speechSafetyWatchdogRef.current) {
      clearTimeout(speechSafetyWatchdogRef.current);
    }
    speechSafetyWatchdogRef.current = setTimeout(() => {
      if (isAISpeakingRef.current) {
        console.warn('[VOICE] Watchdog auto-finished speech');
        finishSpeech(onFinished);
      }
    }, estimatedDurationMs);

    let fallbackTriggered = false;

    const triggerWebSpeechFallback = () => {
      if (fallbackTriggered) return;
      fallbackTriggered = true;

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = selectedAccentRef.current;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const prefix = selectedAccentRef.current.slice(0, 2).toLowerCase();
        const matched = voices.find((v) => v.lang.toLowerCase().includes(prefix));
        if (matched) utterance.voice = matched;

        utterance.onend = () => {
          finishSpeech(onFinished, moreComing?.() ?? false);
        };
        utterance.onerror = () => {
          finishSpeech(onFinished, moreComing?.() ?? false);
        };

        // Retain reference so Chrome does not garbage collect it mid-speech
        currentUtteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      } else {
        finishSpeech(onFinished);
      }
    };

    const voiceId = selectedVoice.voice_id || agentConfig?.config?.tts_provider?.voice_id || 'f8f5f1b2-f02d-4d8e-a40d-fd850a487b3d'; // Kiara (Indian accent)
    // `voice`: how this sentence should sound (the emotion engine's emotion, and a real laugh as a [laughter] prefix)
    const previewUrl = withPreviewToken(`${API_ENDPOINTS.VOICE.PREVIEW}?voice_id=${encodeURIComponent(voiceId)}&text=${encodeURIComponent((voice?.ttsText ?? text).slice(0, 250))}${voice?.emotion ? `&emotion=${encodeURIComponent(voice.emotion)}` : ''}`);
    const token = ++playTokenRef.current;
    const startAudio = (src: string, revoke?: () => void) => {
      if (token !== playTokenRef.current) { revoke?.(); return; } // a newer sentence / hang-up took over while this loaded
      const audio = new Audio(src);
      audioRef.current = audio;
      // While a call is being recorded the AI's voice has to pass through the recorder's audio graph.
      if (revoke) recorderRef.current?.tapAiAudio(audio);
      audio.onended = () => { revoke?.(); finishSpeech(onFinished, moreComing?.() ?? false); };
      audio.onerror = () => { revoke?.(); triggerWebSpeechFallback(); };
      audio.play().catch(() => { revoke?.(); triggerWebSpeechFallback(); });
    };

    if (recorderRef.current?.active) {
      // Fetch the audio as a blob: an element playing a cross-origin URL cannot be captured by the recorder.
      fetch(previewUrl)
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.blob(); })
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          startAudio(url, () => URL.revokeObjectURL(url));
        })
        .catch(() => { if (token === playTokenRef.current) triggerWebSpeechFallback(); });
    } else {
      startAudio(previewUrl);
    }
  }, [agentConfig?.config?.tts_provider?.voice_id, finishSpeech, selectedVoice.voice_id]);

  // One conversation turn, streamed: every sentence is shown and spoken as soon as the server has it, so the AI starts
  // talking while the model is still writing the rest (the server is already synthesising each sentence's audio).
  // `onAllSpoken` runs once the last sentence has finished playing (e.g. to resume listening).
  const runStreamedTurn = useCallback(
    async (
      payload: { user_transcript: string; call_id?: string; caller_number?: string; language?: string; accent?: string; voice_id?: string },
      msgIndex: number,
      onAllSpoken?: () => void
    ): Promise<any> => {
      const queue: { text: string; emotion?: string; ttsText?: string }[] = [];
      let speaking = false;
      let streamEnded = false;
      let heard = false;
      let cancelled = false; // the caller interrupted: stop speaking and stop showing the rest of this reply
      const turn = { cancel: () => { cancelled = true; queue.length = 0; speaking = false; } };
      activeTurnRef.current = turn;

      const pump = () => {
        if (speaking) return;
        const next = queue.shift();
        if (next === undefined) return;
        speaking = true;
        playSpeech(
          next.text,
          msgIndex,
          () => {
            speaking = false;
            if (queue.length > 0) pump();
            else if (streamEnded) onAllSpoken?.(); // the echo cooldown already ran inside finishSpeech
          },
          () => queue.length > 0 || !streamEnded,
          { emotion: next.emotion, ttsText: next.ttsText }
        );
      };

      const showSentence = (sentence: string, isFirst: boolean) => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLiveMessages((m) => {
          const last = m[m.length - 1];
          if (!isFirst && last && last.speaker === 'AI') {
            return [...m.slice(0, -1), { ...last, text: `${last.text} ${sentence}` }];
          }
          return [...m, { speaker: 'AI', text: sentence, timestamp: time }];
        });
      };

      const final = await DashboardController.simulateVoiceStream(payload, (sentence, meta) => {
        if (cancelled) return;
        const isFirst = !heard;
        heard = true;
        setIsTyping(false);
        showSentence(sentence, isFirst);
        queue.push({ text: sentence, ...meta });
        pump();
      });
      streamEnded = true;
      if (!final) throw new Error('The stream ended without a result');
      setTestActions(final.test_actions || []);
      if (activeTurnRef.current === turn) activeTurnRef.current = null;
      if (cancelled) return final; // the caller took over; nothing more to say or resume
      if (final?.bot_response) {
        // the server's full reply is the source of truth for the transcript (it can differ slightly from the pieces)
        setLiveMessages((m) => {
          const last = m[m.length - 1];
          return last && last.speaker === 'AI' ? [...m.slice(0, -1), { ...last, text: final.bot_response }] : m;
        });
      }
      // Everything already finished playing before the stream closed: resume through the normal echo cooldown.
      if (!speaking && queue.length === 0 && heard) finishSpeech(onAllSpoken);
      else pump();
      return final;
    },
    [finishSpeech, playSpeech]
  );

  // Barge-in: the caller talks over the AI (or presses Interrupt). The AI stops at once, its unspoken sentences are
  // dropped, and whatever the caller is saying becomes the next turn.
  const bargeIn = useCallback(() => {
    activeTurnRef.current?.cancel();
    activeTurnRef.current = null;
    bargeDetectorRef.current?.disarm();
    playTokenRef.current++;
    if (audioRef.current) audioRef.current.pause();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    if (speechSafetyWatchdogRef.current) {
      clearTimeout(speechSafetyWatchdogRef.current);
      speechSafetyWatchdogRef.current = null;
    }
    if (echoCooldownTimerRef.current) clearTimeout(echoCooldownTimerRef.current);
    currentUtteranceRef.current = null;
    aiSpeechEndedAtRef.current = Date.now();
    setPlayingMsgIndex(null);
    setIsAISpeaking(false);
    isAISpeakingRef.current = false;
    echoLockRef.current = false;
    isProcessingTurnRef.current = false;
    setIsTyping(false);
  }, []);

  const interruptAI = () => {
    bargeIn();
    startListening();
  };

  // Web Speech Recognition Management
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
    setIsMicListening(false);
    setInterimSpeech('');
  }, []);

  // `duringAI`: listen while the AI is talking, only to notice the caller interrupting it.
  const startListening = useCallback((duringAI = false) => {
    if (typeof window === 'undefined') return;
    if (isMutedRef.current) return;
    // Never listen while the AI talks: speech recognition would transcribe the AI itself (BargeInDetector watches instead).
    if (duringAI || isAISpeakingRef.current || echoLockRef.current || isProcessingTurnRef.current) return;
    if (callPhaseRef.current !== 'connected' || channelRef.current !== 'browser_voice') return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setMicSupported(false);
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedAccentRef.current;

      recognition.onstart = () => {
        setIsMicListening(true);
        setInterimSpeech('');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (isAISpeakingRef.current) {
          // The AI is talking: only a real interruption counts, not its own voice coming back through the speakers.
          const heard = `${final} ${interim}`.trim();
          if (!heard || Date.now() - aiSpeechStartedAtRef.current < 900) return;
          if (!isRealInterruption(heard, recentAITextsRef.current)) return; // its own voice through the speakers is not an interruption
          bargeIn(); // then handle this speech as the caller's turn below
        } else if (echoLockRef.current || isProcessingTurnRef.current) {
          return; // echo cooldown, or a reply is already being prepared
        }
        if (interim) setInterimSpeech(interim);
        if (final && final.trim()) {
          setInterimSpeech('');
          handleSpeechResultRef.current(final.trim());
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }
        console.warn('SpeechRecognition error:', event.error);
      };

      recognition.onend = () => {
        setIsMicListening(false);
        // Automatic restart loop: keep listening turn-after-turn (the browser ends a session after a pause).
        // While the AI speaks we keep listening for interruptions; otherwise never during echo cooldown, processing, or mute.
        const canListen = () =>
          callPhaseRef.current === 'connected' &&
          channelRef.current === 'browser_voice' &&
          !isMutedRef.current &&
          (!isAISpeakingRef.current && !echoLockRef.current && !isProcessingTurnRef.current);
        if (canListen()) {
          if (recognitionRestartTimerRef.current) {
            clearTimeout(recognitionRestartTimerRef.current);
          }
          recognitionRestartTimerRef.current = setTimeout(() => {
            if (canListen()) startListening();
          }, 200);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('Could not launch speech recognition:', e);
      setIsMicListening(false);
    }
  }, [bargeIn]);

  useEffect(() => { startListeningRef.current = startListening; }, [startListening]);

  const handleSpeechResult = useCallback(
    async (finalTranscript: string) => {
      const text = finalTranscript.trim();
      if (!text) return;
      if (isAISpeakingRef.current || echoLockRef.current || isProcessingTurnRef.current) return;

      // Echo suppression: only for speech that arrives right after the AI stopped (see utils/voice_echo.ts).
      if (!text.replace(/[.,!?\s]/g, '')) return;
      if (isEchoOfAI(text, recentAITextsRef.current, Date.now() - aiSpeechEndedAtRef.current < 1800)) {
        console.warn('[ECHO SUPPRESSION] Discarded echo of the AI:', text);
        setInterimSpeech('');
        return;
      }

      // Lock turn processing immediately and stop mic
      isProcessingTurnRef.current = true;
      const myTurn = ++turnIdRef.current;
      stopListening();

      // Append user message
      const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLiveMessages((m) => [...m, { speaker: 'User', text, timestamp: userTime }]);
      setIsTyping(true);

      try {
        // Streamed: each sentence is shown and spoken as soon as the server has it; listening resumes after the last one.
        const res = await runStreamedTurn(
          {
            user_transcript: text,
            call_id: currentCallId,
            caller_number: '', // a browser call has no caller ID; the agent asks for the number instead of inventing one
            language: selectedAccentRef.current,
            accent: selectedAccentRef.current,
            voice_id: selectedVoice.voice_id,
          },
          liveMessages.length + 1,
          () => {
            if (callPhaseRef.current === 'connected' && channelRef.current === 'browser_voice' && !isMutedRef.current) {
              startListening();
            }
          }
        );
        // The caller asked to switch language ("talk in Hindi"): listen for that language from now on.
        if (res?.stt_language) {
          selectedAccentRef.current = res.stt_language;
          setSelectedAccent(res.stt_language);
        }

        if (res?.should_hangup) {
          setTimeout(() => endCall(), 3000);
        }
      } catch (err) {
        console.error('Turn simulation error:', err);
        const fallback = simulateReply(text);
        const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLiveMessages((m) => [...m, { speaker: 'AI', text: fallback, timestamp: aiTime }]);
        playSpeech(fallback, liveMessages.length + 1, () => {
          if (callPhaseRef.current === 'connected' && channelRef.current === 'browser_voice' && !isMutedRef.current) {
            startListening();
          }
        });
      } finally {
        if (turnIdRef.current === myTurn) { // an interrupted turn must not unlock a newer one
          isProcessingTurnRef.current = false;
          setIsTyping(false);
        }
      }
    },
    [currentCallId, liveMessages.length, phoneNumber, playSpeech, startListening, stopListening, selectedVoice.voice_id]
  );

  // Link ref to latest handleSpeechResult
  useEffect(() => {
    handleSpeechResultRef.current = handleSpeechResult;
  }, [handleSpeechResult]);

  // Start Browser Voice Call
  const startWebVoiceCall = async () => {
    setCallPhase('connected');
    callPhaseRef.current = 'connected';
    setCallSeconds(0);
    setLiveMessages([]);
    setInterimSpeech('');
    const newCallId = 'webcall_' + Math.random().toString(36).slice(2, 9);
    setCurrentCallId(newCallId);

    const isIndia = (businessInfo?.country || '').toLowerCase().includes('india') || false;
    const clinicName = businessInfo?.name || 'our clinic';
    const defaultGreeting = isIndia
      ? `Namaste! Welcome to ${clinicName}. I am your AI receptionist. How can I help you today?`
      : `Hello, welcome to ${clinicName}. I am your AI receptionist. How may I help you today?`;

    const greeting = agentConfig?.greeting_message || defaultGreeting;

    setLiveMessages([{ speaker: 'AI', text: greeting, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);

    // Interruption detector (its own echo-cancelled mic stream; the call still works without it)
    bargeDetectorRef.current?.close();
    const detector = new BargeInDetector();
    bargeDetectorRef.current = (await detector.open()) ? detector : null;

    // Record the call (caller mic + AI voice) so it can be played back in /calls. If the mic is refused the call still works.
    if (CallRecorder.supported()) {
      recorderRef.current = new CallRecorder();
      const ok = await recorderRef.current.start();
      if (!ok) recorderRef.current = null;
    }

    // Play greeting aloud, then open mic for user reply!
    playSpeech(greeting, 0, () => {
      startListening();
    });
  };

  // Start Exotel Mobile Phone Call
  const startExotelCall = async () => {
    if (!phoneNumber.trim()) return;
    setCallPhase('dialing');
    callPhaseRef.current = 'dialing';
    setCallSeconds(0);
    setLiveMessages([]);
    setDialStatusMsg(`Calling ${phoneNumber}...`);

    let realCallId = 'test_call_' + Math.random().toString(36).slice(2, 9);

    try {
      const res = await DashboardController.triggerTestCall(phoneNumber.trim());
      if (res?.success) {
        if (res.call_sid) {
          realCallId = res.call_sid;
        }
        setDialStatusMsg(`Calling ${phoneNumber} from ${res.from_number || '09513886363'}. Pick up to speak with AI.`);
      } else {
        setDialStatusMsg(res?.message || 'Outbound call initiated.');
      }
    } catch (err: any) {
      console.warn('Real outbound call trigger:', err);
      setDialStatusMsg(`Calling ${phoneNumber}. (Or talk directly in Web Voice Call mode)`);
    }

    setCurrentCallId(realCallId);

    const isIndia = (businessInfo?.country || '').toLowerCase().includes('india') || false;
    const clinicName = businessInfo?.name || 'our clinic';
    const defaultGreeting = isIndia
      ? `Namaste! Welcome to ${clinicName}. I am your AI receptionist. How can I help you today?`
      : `Hello, welcome to ${clinicName}. I am your AI receptionist. How may I help you today?`;

    const greeting = agentConfig?.greeting_message || defaultGreeting;

    dialTimeoutRef.current = setTimeout(() => {
      setCallPhase('connected');
      callPhaseRef.current = 'connected';
      setLiveMessages([{ speaker: 'AI', text: greeting, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      // NOTE: During live phone calls, audio streams directly to the phone handset, never through laptop speakers!
    }, 2500);
  };

  // Poll live transcript from backend when a real phone call is active
  useEffect(() => {
    if (channel !== 'phone_exotel' || callPhase !== 'connected' || !currentCallId) return;

    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const detail = await DashboardController.getCallDetail(currentCallId);
        if (cancelled) return;
        if (detail?.messages && detail.messages.length > 0) {
          setLiveMessages(
            detail.messages.map((m: any) => ({
              speaker: m.speaker === 'caller' || m.speaker === 'user' ? 'User' : 'AI',
              text: m.text,
              timestamp: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
            }))
          );
        }
        if (detail?.outcome && detail.outcome !== 'live') {
          setCallPhase('ended');
          callPhaseRef.current = 'ended';
          setDialStatusMsg('Phone call ended.');
        }
      } catch (err) {
        console.debug('Polling live phone call:', err);
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [channel, callPhase, currentCallId]);

  // Hang-up bookkeeping on the server: attach the recording (if any) and stop the call showing as "live" forever.
  const finalizeCallOnServer = async (callId: string, recorder: CallRecorder | null) => {
    try {
      const blob = recorder ? await recorder.stop() : null;
      if (blob) await DashboardController.uploadCallRecording(callId, blob);
    } catch (err) {
      console.warn('[RECORDER] Recording upload failed:', err);
    }
    try {
      await DashboardController.endSimulatedCall(callId);
    } catch {
      /* the call row only exists once the tester has spoken; nothing to close otherwise */
    }
  };

  const endCall = () => {
    const wasLive = callPhaseRef.current === 'connected';
    const recorder = recorderRef.current;
    recorderRef.current = null;
    playTokenRef.current++;
    bargeDetectorRef.current?.close();
    bargeDetectorRef.current = null;
    if (wasLive && currentCallId) void finalizeCallOnServer(currentCallId, recorder);
    else recorder?.discard();
    if (dialTimeoutRef.current) clearTimeout(dialTimeoutRef.current);
    if (speechSafetyWatchdogRef.current) clearTimeout(speechSafetyWatchdogRef.current);
    if (recognitionRestartTimerRef.current) clearTimeout(recognitionRestartTimerRef.current);
    stopListening();
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPlayingMsgIndex(null);
    setIsAISpeaking(false);
    isAISpeakingRef.current = false;
    setCallPhase('ended');
    callPhaseRef.current = 'ended';
  };

  const resetLive = () => {
    endCall();
    setCallPhase('idle');
    callPhaseRef.current = 'idle';
    setCallSeconds(0);
    setDialStatusMsg('');
    setLiveMessages([]);
    setChatDraft('');
    setIsTyping(false);
    setCurrentCallId('sim_' + Math.random().toString(36).slice(2, 9));
    setTestActions([]);
  };

  // Send single chat turn
  const sendChat = async (overrideText?: string) => {
    const text = (overrideText || chatDraft).trim();
    if (!text) return;
    if (callPhase === 'idle') setCallPhase('connected');

    const userIdx = liveMessages.length;
    setLiveMessages((m) => [...m, { speaker: 'User', text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setChatDraft('');
    setIsTyping(true);

    try {
      const res = await runStreamedTurn(
        {
          user_transcript: text,
          call_id: currentCallId,
          caller_number: '',
          language: selectedAccentRef.current,
          accent: selectedAccentRef.current,
          voice_id: selectedVoice.voice_id,
        },
        userIdx + 1
      );
      if (res?.stt_language) {
        selectedAccentRef.current = res.stt_language;
        setSelectedAccent(res.stt_language);
      }

      if (res?.should_hangup) {
        setTimeout(() => setCallPhase('ended'), 2500);
      }
    } catch {
      const fallback = simulateReply(text);
      setLiveMessages((m) => [...m, { speaker: 'AI', text: fallback, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Dictate into chat draft via mic
  const triggerChatDictation = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Your browser does not support Speech Recognition. Please type in the chat box or use Chrome/Edge.');
      return;
    }
    if (isMicListening) {
      stopListening();
      return;
    }
    const recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = selectedAccent;

    recognition.onstart = () => setIsMicListening(true);
    recognition.onresult = (event: any) => {
      let text = '';
      for (let i = 0; i < event.results.length; ++i) {
        text += event.results[i][0].transcript;
      }
      setChatDraft(text);
    };
    recognition.onend = () => setIsMicListening(false);
    recognition.onerror = () => setIsMicListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      await DashboardController.updateAgent({ status: 'active' });
      setPublishSuccess(true);
      setTimeout(() => {
        setPublishSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to publish agent:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  const selectScenario = (id: ScenarioId) => {
    setScenario(id);
    setHasRun(false);
    setIsRunning(false);
  };

  const runTest = () => {
    setIsRunning(true);
    setHasRun(false);
    setTimeout(() => {
      setIsRunning(false);
      setHasRun(true);
    }, 800);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    if (m === 'scenario') resetLive();
  };

  if (!isOpen) return null;

  const transcript = content.TRANSCRIPTS[scenario];
  const results = content.RESULTS[scenario];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <style>{`
        @keyframes theme-orb-glow {
          0%, 100% { transform: scale(0.96); opacity: 0.5; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
        @keyframes theme-orb-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes orb-bar-active-1 {
          0%, 100% { height: 10px; }
          50% { height: 20px; }
        }
        @keyframes orb-bar-active-2 {
          0%, 100% { height: 16px; }
          50% { height: 32px; }
        }
        @keyframes orb-bar-active-3 {
          0%, 100% { height: 26px; }
          50% { height: 42px; }
        }
        @keyframes orb-bar-active-4 {
          0%, 100% { height: 16px; }
          50% { height: 30px; }
        }
        @keyframes orb-bar-active-5 {
          0%, 100% { height: 10px; }
          50% { height: 18px; }
        }
        @keyframes orb-bar-idle-1 {
          0%, 100% { height: 8px; }
          50% { height: 12px; }
        }
        @keyframes orb-bar-idle-2 {
          0%, 100% { height: 16px; }
          50% { height: 22px; }
        }
        @keyframes orb-bar-idle-3 {
          0%, 100% { height: 26px; }
          50% { height: 34px; }
        }
        @keyframes orb-bar-idle-4 {
          0%, 100% { height: 16px; }
          50% { height: 22px; }
        }
        @keyframes orb-bar-idle-5 {
          0%, 100% { height: 8px; }
          50% { height: 12px; }
        }
        @keyframes audio-spectrum {
          0%, 100% { transform: scaleY(0.4); opacity: 0.65; }
          50% { transform: scaleY(1.35); opacity: 1; }
        }
        .audio-spectrum-bar {
          transform-origin: bottom;
          animation: audio-spectrum 0.7s ease-in-out infinite alternate;
        }
      `}</style>
      <div className="bg-white border border-gray-100 rounded-2xl w-full max-w-5xl shadow-2xl p-4 sm:p-5 animate-in zoom-in-95 duration-200 max-h-[96vh] overflow-y-auto">
        <div className="mb-3"><TestModeBanner actions={testActions} /></div>
        {/* Header */}
        <div className="flex items-start justify-between mb-2.5">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">{content.TITLE}</h3>
              <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">
                {content.BADGE}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Test your AI Receptionist live via <strong className="text-gray-700">Browser Voice (Microphone)</strong>, Chat, or Phone call before publishing.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 p-1 rounded-md flex-shrink-0 cursor-pointer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Primary Mode toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => switchMode('live')}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                mode === 'live' ? 'border-[#0066FF] bg-[#F0F7FF] text-[#0066FF]' : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              Live Playground (Voice & Chat)
            </button>
            <button
              onClick={() => switchMode('scenario')}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                mode === 'scenario' ? 'border-[#0066FF] bg-[#F0F7FF] text-[#0066FF]' : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              Scripted Scenarios
            </button>
          </div>

          <span className="text-[10.5px] text-emerald-600 font-semibold flex items-center gap-1.5 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Realtime AI Engine Active (&lt;200ms)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
          {/* Left: Mode content */}
          <div className={`${mode === 'scenario' ? 'md:col-span-3' : 'md:col-span-2'} flex flex-col`}>
            {mode === 'scenario' ? (
              <>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex-1 flex flex-col min-h-[280px]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Simulated Caller</div>
                  <div className="flex-1 space-y-2 overflow-y-auto max-h-72 pr-1">
                    {!hasRun && !isRunning && (
                      <div className="h-full flex items-center justify-center text-[13px] text-gray-400 py-10">
                        Pick a scenario and run the test call to see a simulated transcript.
                      </div>
                    )}
                    {isRunning && (
                      <div className="h-full flex items-center justify-center text-[13px] text-gray-400 py-10 flex-col gap-2">
                        <div className="w-6 h-6 border-2 border-[#0066FF] border-t-transparent rounded-full animate-spin"></div>
                        Simulating call with AI receptionist...
                      </div>
                    )}
                    {hasRun &&
                      !isRunning &&
                      transcript.map((item, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-lg text-[12px] leading-relaxed ${
                            item.speaker === 'AI'
                              ? 'bg-[#F0F7FF] border border-[#BFDBFE]/60 text-gray-900'
                              : 'bg-white border border-gray-200 text-gray-900'
                          }`}
                        >
                          <span className={`font-bold block mb-0.5 ${item.speaker === 'AI' ? 'text-[#0066FF]' : 'text-gray-500'}`}>
                            {item.speaker === 'AI' ? 'AI Receptionist' : 'Caller'}:
                          </span>
                          {item.text}
                        </div>
                      ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={runTest}
                    disabled={isRunning}
                    className="flex-1 py-2 bg-[#0066FF] hover:bg-[#0052cc] text-white rounded-lg text-[13px] font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    {content.RUN_BTN}
                  </button>
                  <button
                    onClick={() => {
                      setHasRun(false);
                      setIsRunning(false);
                    }}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    {content.RESET_BTN}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Channel Selector: Web Voice (Recommended) | Chat | Exotel Phone */}
                <div className="flex items-center gap-1.5 mb-2 bg-gray-100/80 p-0.5 rounded-lg">
                  <button
                    onClick={() => setChannel('browser_voice')}
                    className={`flex-1 py-1 px-2 rounded-md text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      channel === 'browser_voice'
                        ? 'bg-white text-[#0066FF] shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                      <line x1="12" y1="19" x2="12" y2="23"></line>
                      <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                    Web Voice Call
                  </button>

                  <button
                    onClick={() => setChannel('live_chat')}
                    className={`flex-1 py-1 px-2 rounded-md text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      channel === 'live_chat'
                        ? 'bg-white text-[#0066FF] shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    Chat Only
                  </button>

                  <button
                    onClick={() => setChannel('phone_exotel')}
                    className={`flex-1 py-1 px-2 rounded-md text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      channel === 'phone_exotel'
                        ? 'bg-white text-[#0066FF] shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    Phone Call
                  </button>
                </div>

                {/* Top Channel Controls */}
                <div className="mb-1.5">
                  {channel === 'browser_voice' && (
                    <div className="bg-gradient-to-b from-slate-50 to-blue-50/30 border border-slate-200 rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center relative overflow-hidden shadow-xs">
                      {/* Voice & Accent Bar (Clean 2-Column Grid - No Overflow) */}
                      <div className="w-full grid grid-cols-2 gap-2 mb-2">
                        <div className="min-w-0">
                          <span className="block text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 pl-0.5">Voice</span>
                          <button
                            type="button"
                            onClick={() => setIsVoicePickerOpen(true)}
                            className="w-full flex items-center justify-between gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 transition-all cursor-pointer shadow-2xs overflow-hidden"
                            title={`Voice: ${selectedVoice?.name || 'Skylar'} (${selectedVoice?.accent || 'Global'})`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                              <span className="w-4 h-4 rounded-full bg-blue-100 text-[#0066FF] flex items-center justify-center font-bold text-[9px] shrink-0">
                                {selectedVoice?.name?.[0] || 'S'}
                              </span>
                              <span className="truncate text-[11px] font-bold text-slate-800">{selectedVoice?.name || 'Skylar'}</span>
                            </div>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400 shrink-0">
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </button>
                        </div>

                        <div className="min-w-0">
                          <span className="block text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 pl-0.5">Accent</span>
                          <div className="relative w-full">
                            <select
                              value={selectedAccent}
                              onChange={(e) => {
                                const newAcc = e.target.value;
                                setSelectedAccent(newAcc);
                                selectedAccentRef.current = newAcc;
                                DashboardController.updateAgent({
                                  primary_language: newAcc.slice(0, 2),
                                  config: {
                                    accent: newAcc,
                                    stt: { language: newAcc },
                                  },
                                }).catch((err) => console.warn('Failed to sync accent to DB:', err));
                                if (callPhaseRef.current === 'connected' && channelRef.current === 'browser_voice' && !isAISpeakingRef.current) {
                                  startListening();
                                }
                              }}
                              className="w-full appearance-none text-[11px] font-bold pl-2 pr-5 py-1 border border-slate-200 rounded-lg bg-white text-slate-800 outline-none focus:border-[#0066FF] cursor-pointer truncate shadow-2xs"
                            >
                              {SUPPORTED_ACCENTS.map((a) => (
                                <option key={a.code} value={a.code}>
                                  {a.label}
                                </option>
                              ))}
                            </select>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="absolute right-2 top-2.5 text-slate-400 pointer-events-none">
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* THE 3D LANDING PAGE ORB CARD */}
                      <div className="bg-[#050816] border border-slate-800/80 rounded-xl p-2.5 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden my-0.5 w-full">
                        {/* Top ambient radial glow */}
                        <div
                          className={`absolute inset-0 rounded-full blur-2xl transition-all duration-700 pointer-events-none ${
                            isMicListening
                              ? 'bg-emerald-500/25 scale-125'
                              : isAISpeaking
                              ? 'bg-[#0066FF]/30 scale-125'
                              : 'bg-indigo-600/20 scale-100'
                          }`}
                        />

                        {/* 3D WebGL Orb Canvas (Tap to Start / End Live Call) */}
                        <div
                          onClick={() => {
                            if (callPhase === 'connected') endCall();
                            else startWebVoiceCall();
                          }}
                          title={callPhase === 'connected' ? 'Click to End Call' : 'Click to Start Voice Call'}
                          className="relative w-full h-32 sm:h-36 flex items-center justify-center cursor-pointer group z-10"
                        >
                          <HeroOrb
                            isAISpeaking={isAISpeaking}
                            isUserSpeaking={isMicListening}
                            isLiveActive={callPhase === 'connected'}
                            animate={true}
                            distance={4.8}
                          />
                        </div>

                        {/* Status Badges & Caption */}
                        <div className="text-center mt-1 w-full z-10">
                          <div className="text-[11.5px] font-bold flex items-center justify-center gap-1.5 min-h-[20px]">
                            {isAISpeaking ? (
                              <>
                                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                                <span className="text-cyan-300 font-bold">AI Speaking (Cartesia Neural)...</span>
                              </>
                            ) : isMicListening ? (
                              <>
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                                <span className="text-emerald-400 font-bold">Listening to you... (Speak now)</span>
                              </>
                            ) : isTyping ? (
                              <>
                                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                                <span className="text-indigo-300 font-bold">AI is thinking (&lt;200ms)...</span>
                              </>
                            ) : callPhase === 'connected' ? (
                              <>
                                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                                <span className="text-white/80 font-semibold">Connected — {formatTime(callSeconds)} • Speak anytime</span>
                              </>
                            ) : (
                              <span className="text-white/90 font-bold">Click Orb to Start Browser Voice Call</span>
                            )}
                          </div>
                          <p className="text-[10px] text-white/50 mt-0.5">
                            {callPhase === 'connected'
                              ? `Voice: ${selectedVoice.name} • Accent: ${SUPPORTED_ACCENTS.find((a) => a.code === selectedAccent)?.label || selectedAccent}`
                              : 'Direct browser audio • No phone call needed'}
                          </p>
                        </div>
                      </div>

                      {/* In-Call Controls */}
                      {callPhase === 'connected' && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/80 w-full justify-center">
                          {isAISpeaking && (
                            <button
                              onClick={interruptAI}
                              className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10.5px] font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="4" width="4" height="16"></rect>
                                <rect x="14" y="4" width="4" height="16"></rect>
                              </svg>
                              Interrupt AI
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (isMuted) {
                                setIsMuted(false);
                                isMutedRef.current = false;
                                startListening();
                              } else {
                                setIsMuted(true);
                                isMutedRef.current = true;
                                stopListening();
                              }
                            }}
                            className={`px-3 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer border flex items-center gap-1 shadow-2xs ${
                              isMuted
                                ? 'bg-rose-50 text-rose-600 border-rose-200'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              {isMuted ? (
                                <>
                                  <line x1="1" y1="1" x2="23" y2="23"></line>
                                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                                  <line x1="12" y1="19" x2="12" y2="23"></line>
                                  <line x1="8" y1="23" x2="16" y2="23"></line>
                                </>
                              ) : (
                                <>
                                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                  <line x1="12" y1="19" x2="12" y2="23"></line>
                                  <line x1="8" y1="23" x2="16" y2="23"></line>
                                </>
                              )}
                            </svg>
                            {isMuted ? 'Unmute Mic' : 'Mute Mic'}
                          </button>
                          <button
                            onClick={endCall}
                            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10.5px] font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            End Call
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {channel === 'phone_exotel' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        disabled={callPhase === 'connected' || callPhase === 'dialing'}
                        placeholder="+91 89014 14107"
                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-[12px] font-mono font-bold focus:outline-none focus:border-[#0066FF] disabled:bg-gray-100"
                      />
                      {callPhase === 'idle' || callPhase === 'ended' ? (
                        <button
                          onClick={startExotelCall}
                          disabled={!phoneNumber.trim()}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                          </svg>
                          Call My Mobile
                        </button>
                      ) : (
                        <button onClick={endCall} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-bold cursor-pointer">
                          End Call
                        </button>
                      )}
                    </div>
                  )}

                  {channel === 'live_chat' && (
                    <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11.5px] text-gray-600">
                      <span>Type or click microphone to chat. No phone calls made.</span>
                      {liveMessages.length > 0 && (
                        <button onClick={resetLive} className="text-[#0066FF] hover:underline font-bold text-[10.5px] cursor-pointer">
                          Clear
                        </button>
                      )}
                    </div>
                  )}

                  {dialStatusMsg && channel === 'phone_exotel' && (
                    <div className="mt-1.5 text-[10.5px] text-gray-500 font-medium">{dialStatusMsg}</div>
                  )}
                </div>

                {/* Agent Configuration summary box beneath the Orb (compact badge strip) */}
                <div className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between text-[11px] text-gray-600 shadow-2xs">
                  <div className="truncate flex items-center gap-1.5">
                    <span className="text-gray-400 font-bold uppercase text-[9.5px]">Voice:</span>
                    <span className="font-semibold text-gray-800">{agentConfig?.config?.tts_provider?.voice_name || selectedVoice?.name || (isAgentLoading ? 'Loading...' : 'Neural Voice')}</span>
                  </div>
                  <span className="text-gray-300">•</span>
                  <div className="truncate flex items-center gap-1.5">
                    <span className="text-gray-400 font-bold uppercase text-[9.5px]">Greeting:</span>
                    <span className="font-semibold text-gray-800">{agentConfig?.greeting_message ? 'Custom' : 'Default'}</span>
                  </div>
                  <span className="text-gray-300">•</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1 text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Right Column: Scenario Config/Results OR Live Verification + Conversation Stream */}
          <div className={`${mode === 'scenario' ? 'md:col-span-2' : 'md:col-span-3'} flex flex-col gap-3`}>
            {mode === 'scenario' ? (
              <>
                <div>
                  <div className="text-[12px] font-bold text-gray-700 mb-2">{content.SCENARIOS_LABEL}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {content.SCENARIOS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => selectScenario(s.id as ScenarioId)}
                        className={`px-2.5 py-2 rounded-lg text-[12px] font-bold border transition-colors text-left cursor-pointer ${
                          scenario === s.id
                            ? 'border-[#0066FF] bg-[#F0F7FF] text-[#0066FF]'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-1.5 text-[12px]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">{content.CONFIG_TITLE}</div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{content.CONFIG.GREETING}</span>
                    <span className="font-semibold text-gray-900 truncate max-w-[130px]" title={agentConfig?.greeting_message || 'Custom'}>
                      {agentConfig?.greeting_message ? 'Custom Greeting' : 'Default'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{content.CONFIG.VOICE}</span>
                    <span className="font-semibold text-gray-900">
                      {agentConfig?.config?.tts_provider?.voice_name || 'Aanya (Indian Accent)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{content.CONFIG.KNOWLEDGE}</span>
                    <span className="font-semibold text-gray-900">Services, Doctors, FAQs</span>
                  </div>
                </div>

                <div className="p-3 border border-gray-100 rounded-xl flex-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">{content.RESULTS_TITLE}</div>
                  <div className="space-y-1.5">
                    {results.map((r, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[12px]">
                        {hasRun ? (
                          r.pass ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500 flex-shrink-0">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-500 flex-shrink-0">
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="12" y1="8" x2="12" y2="12"></line>
                              <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                          )
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-200 flex-shrink-0"></span>
                        )}
                        <span className={hasRun ? 'text-gray-900' : 'text-gray-400'}>{r.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Live Engine Verification - Placed on the RIGHT side of the Orb */}
                <div className="px-3 py-1.5 border border-emerald-100/90 rounded-xl text-[11px] bg-emerald-50/40 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Live Engine Verification
                    </div>
                    <span className="text-[9.5px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                      Engine Ready
                    </span>
                  </div>
                  <ul className="grid grid-cols-2 gap-x-2.5 gap-y-0.5 text-[10.5px]">
                    <li className="flex items-center gap-1.5 text-emerald-700 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                      <span className="truncate">WebRTC streaming active</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-emerald-700 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                      <span className="truncate">Connected to Groq NLU</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-emerald-700 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                      <span className="truncate">PostgreSQL turns recorded</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-emerald-700 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                      <span className="truncate">Cartesia Neural TTS active</span>
                    </li>
                  </ul>

                  {!micSupported && (
                    <div className="mt-1 p-1 bg-amber-50 border border-amber-200 rounded-lg text-[9.5px] text-amber-800">
                      Microphone speech recognition is not supported in this browser.
                    </div>
                  )}
                </div>

                {/* Live Transcript & Audio Feedback Box */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 sm:p-3 flex-1 flex flex-col min-h-[180px] max-h-[215px] relative shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                      Live Conversation Stream
                    </div>

                    {/* Accent / Dialect Selector */}
                    <div className="flex items-center gap-1">
                      <span className="text-[9.5px] text-gray-400 uppercase font-bold">Accent:</span>
                      <select
                        value={selectedAccent}
                        onChange={(e) => setSelectedAccent(e.target.value)}
                        className="text-[10.5px] font-bold bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-700 focus:outline-none focus:border-[#0066FF] cursor-pointer"
                      >
                        {SUPPORTED_ACCENTS.map((l) => (
                          <option key={l.code} value={l.code}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div ref={chatScrollRef} className="flex-1 space-y-2 overflow-y-auto max-h-[160px] pr-1">
                    {liveMessages.length === 0 && !interimSpeech && (
                      <div className="h-full flex items-center justify-center text-[12px] text-gray-400 py-3 text-center px-4 flex-col gap-1">
                        <div className="w-6 h-6 rounded-full bg-blue-50 text-[#0066FF] flex items-center justify-center mb-0.5">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                            <line x1="12" y1="19" x2="12" y2="23"></line>
                            <line x1="8" y1="23" x2="16" y2="23"></line>
                          </svg>
                        </div>
                        <span className="font-medium text-gray-600">Click the Orb on the left to begin voice call, or type below.</span>
                        <span className="text-[10px] text-gray-400">Supports Hindi, Hinglish, Indian English, US/UK, Spanish, German, Dutch.</span>
                      </div>
                    )}

                    {liveMessages.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl text-[11.5px] leading-relaxed relative shadow-2xs ${
                          item.speaker === 'AI'
                            ? 'bg-[#F0F7FF] border border-[#BFDBFE]/70 text-gray-900 mr-3'
                            : 'bg-white border border-gray-200 text-gray-900 ml-3'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`font-bold flex items-center gap-1.5 ${item.speaker === 'AI' ? 'text-[#0066FF]' : 'text-gray-700'}`}>
                            {item.speaker === 'AI' ? 'AI Receptionist' : 'You (Caller)'}:
                            {item.timestamp && <span className="text-[9.5px] font-normal text-gray-400">{item.timestamp}</span>}
                          </span>

                          {item.speaker === 'AI' && channel !== 'phone_exotel' && (
                            <button
                              type="button"
                              onClick={() => playSpeech(item.text, idx)}
                              className="text-gray-400 hover:text-[#0066FF] transition-colors p-0.5 rounded cursor-pointer"
                              title="Replay voice audio"
                            >
                              {playingMsgIndex === idx ? (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-emerald-600 animate-pulse">
                                  <rect x="6" y="4" width="4" height="16"></rect>
                                  <rect x="14" y="4" width="4" height="16"></rect>
                                </svg>
                              ) : (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                        <div className="text-[12px]">{item.text}</div>
                      </div>
                    ))}

                    {/* Live speech interim feedback */}
                    {interimSpeech && (
                      <div className="p-2 rounded-xl text-[11.5px] bg-emerald-50/80 border border-emerald-200 text-emerald-900 ml-3 animate-in fade-in flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        <span className="italic">&quot;{interimSpeech}...&quot;</span>
                      </div>
                    )}

                    {isTyping && (
                      <div className="p-2 rounded-xl text-[11.5px] bg-[#F0F7FF] border border-[#BFDBFE]/60 text-[#0066FF] italic flex items-center gap-2 mr-3">
                        <div className="w-3.5 h-3.5 border-2 border-[#0066FF] border-t-transparent rounded-full animate-spin"></div>
                        AI Receptionist is answering...
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Input: Live Phone Status OR Text input + Dictation Mic + Send */}
                {channel === 'phone_exotel' ? (
                  <div className="mt-1">
                    {callPhase === 'connected' ? (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/90 border border-blue-200 text-blue-900 text-[11px] font-medium w-full">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Live call in progress on <strong>{phoneNumber}</strong>. Speak on your phone — transcript updates above.</span>
                        </div>
                        <button
                          type="button"
                          onClick={endCall}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10.5px] font-bold cursor-pointer transition-colors"
                        >
                          End Call
                        </button>
                      </div>
                    ) : callPhase === 'dialing' ? (
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11.5px] font-medium w-full flex items-center gap-2">
                        <div className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Calling {phoneNumber}... Pick up your phone to speak with the AI receptionist.</span>
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 text-[11.5px] text-center w-full">
                        Select &quot;Phone Call&quot; on the left and click &quot;Call My Mobile&quot; to test.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="relative flex-1 flex items-center">
                      <input
                        type="text"
                        value={chatDraft}
                        onChange={(e) => setChatDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') sendChat();
                        }}
                        placeholder="Type a message or speak into mic..."
                        className="w-full pl-3 pr-8 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#0066FF]"
                      />
                      <button
                        type="button"
                        onClick={triggerChatDictation}
                        className={`absolute right-1.5 p-1 rounded-md transition-colors cursor-pointer ${
                          isMicListening
                            ? 'text-red-500 bg-red-50 animate-pulse'
                            : 'text-gray-400 hover:text-[#0066FF]'
                        }`}
                        title={isMicListening ? 'Listening... click to stop' : 'Click to dictate message'}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                          <line x1="12" y1="19" x2="12" y2="23"></line>
                          <line x1="8" y1="23" x2="16" y2="23"></line>
                        </svg>
                      </button>
                    </div>
                    <button
                      onClick={() => sendChat()}
                      disabled={!chatDraft.trim()}
                      className="px-3 py-1.5 bg-[#0066FF] hover:bg-[#0052cc] disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>Send</span>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 mt-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="px-3.5 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
            {content.CLOSE_BTN}
          </button>
          <div className="flex items-center gap-2">
            {publishSuccess && (
              <span className="text-[11px] font-bold text-emerald-600 mr-2 animate-in fade-in">
                Published to Production Line
              </span>
            )}
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              {content.SAVE_DRAFT_BTN}
            </button>
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="px-4 py-1.5 bg-[#0066FF] hover:bg-[#0052cc] disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {isPublishing && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
              {isPublishing ? 'Publishing...' : content.PUBLISH_BTN}
            </button>
          </div>
        </div>
      </div>

      <ChooseVoiceModal
        isOpen={isVoicePickerOpen}
        selectedVoice={selectedVoice}
        vertical={StorageService.getBusiness()?.vertical}
        onSelect={(voice) => {
          setSelectedVoice(voice);
          setIsVoicePickerOpen(false);
          DashboardController.updateAgent({
            voice_model: voice.voice_id,
            config: {
              tts_provider: {
                provider: 'cartesia',
                voice_id: voice.voice_id,
                voice_name: voice.name,
                accent: voice.accent,
                language: selectedAccent.slice(0, 2),
              },
            },
          }).catch((err) => console.warn('Failed to sync voice to DB:', err));
        }}
        onClose={() => setIsVoicePickerOpen(false)}
      />
    </div>
  );
}
