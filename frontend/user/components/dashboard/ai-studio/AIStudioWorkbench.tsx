"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { DashboardController, AgentItem, LlmModelOption } from '../../../controllers/dashboard.controller';
import { API_ENDPOINTS } from '../../../utils/api_endpoints';
import { StorageService } from '../../../services/storage.service';
import { BargeInDetector } from '../../../utils/barge_in';
import { CallRecorder } from '../../../utils/call_recorder';
import { isEchoOfAI, isRealInterruption } from '../../../utils/voice_echo';
import { ChooseVoiceModal, VoiceOption, AVAILABLE_VOICES } from './ChooseVoiceModal';

const HeroOrb = dynamic(() => import('../../landing/HeroOrb'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-24 h-24 rounded-full bg-cyan-500/20 blur-xl animate-pulse" />
    </div>
  ),
});

interface AIStudioWorkbenchProps {
  onBack?: () => void;
  onSave?: (agent: Partial<AgentItem>) => void;
}

interface Message {
  speaker: 'AI' | 'User';
  text: string;
  time: string;
}

const ACCENT_GROUPS = [
  {
    region: 'India & South Asia',
    accents: [
      { code: 'hi-IN', label: 'Hindi / Hinglish', speechLang: 'hi-IN' },
      { code: 'en-IN', label: 'Indian English', speechLang: 'en-IN' },
      { code: 'pa-IN', label: 'Punjabi Accent', speechLang: 'pa-IN' },
      { code: 'bn-IN', label: 'Bengali Accent', speechLang: 'bn-IN' },
    ],
  },
  {
    region: 'Global & International',
    accents: [
      { code: 'en-US', label: 'American English (US)', speechLang: 'en-US' },
      { code: 'en-GB', label: 'British English (UK)', speechLang: 'en-GB' },
      { code: 'es-ES', label: 'Spanish (Castilian)', speechLang: 'es-ES' },
      { code: 'de-DE', label: 'German (Standard)', speechLang: 'de-DE' },
      { code: 'nl-NL', label: 'Dutch (Netherlands)', speechLang: 'nl-NL' },
    ],
  },
];

export function AIStudioWorkbench({ onBack, onSave }: AIStudioWorkbenchProps) {
  // Agent configuration state
  const [agentName, setAgentName] = useState('AMSh Receptionist');
  const [isEditingName, setIsEditingName] = useState(false);
  // The model list is fetched live from the server (Groq + Gemini APIs); nothing here is hard-coded.
  const [model, setModel] = useState('');
  const [llmModels, setLlmModels] = useState<LlmModelOption[]>([]);
  const [llmDefault, setLlmDefault] = useState('');
  const [llmMessage, setLlmMessage] = useState('Loading models…');
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(AVAILABLE_VOICES[0]);
  const [selectedAccentCode, setSelectedAccentCode] = useState('hi-IN');
  const [emotion, setEmotion] = useState('Empathetic & Calm');
  const [welcomeMessage, setWelcomeMessage] = useState(
    'Namaste! Welcome to our clinic. I am your AI receptionist. How can I help you today?'
  );
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a professional, HIPAA-compliant medical receptionist. Greet callers warmly, offer open appointment slots, confirm patient name and contact number, and answer clinic FAQs accurately. For medical emergencies, advise immediate emergency care.'
  );

  // DB Sync Status
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Modals & Popovers
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isAccentMenuOpen, setIsAccentMenuOpen] = useState(false);

  // Live Testing & Voice Engine State
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  // References to guarantee state consistency in event callbacks & prevent stale closures
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<any>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const isLiveActiveRef = useRef(false);
  const isMutedRef = useRef(false);
  const isAISpeakingRef = useRef(false);
  const selectedAccentRef = useRef('hi-IN');
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechSafetyWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callIdRef = useRef<string>('studio_' + Math.random().toString(36).slice(2, 8));
  const handleUserTurnRef = useRef<(text: string) => void>(() => {});
  const echoLockRef = useRef<boolean>(false);
  const echoCooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recentAITextsRef = useRef<string[]>([]);
  const isProcessingTurnRef = useRef<boolean>(false);
  const turnIdRef = useRef(0);
  const bargeDetectorRef = useRef<BargeInDetector | null>(null);
  const recorderRef = useRef<CallRecorder | null>(null);
  const aiSpeechStartedAtRef = useRef(0);
  const aiSpeechEndedAtRef = useRef(0);
  const speakTokenRef = useRef(0);
  const activeTurnRef = useRef<{ cancel: () => void } | null>(null); // the streamed reply currently being spoken

  useEffect(() => { isLiveActiveRef.current = isLiveActive; }, [isLiveActive]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { isAISpeakingRef.current = isAISpeaking; }, [isAISpeaking]);
  useEffect(() => { selectedAccentRef.current = selectedAccentCode; }, [selectedAccentCode]);

  // Live model catalogue (Groq + Gemini)
  useEffect(() => {
    DashboardController.getLlmModels()
      .then((catalog) => {
        setLlmModels(catalog.models || []);
        setLlmDefault(catalog.default || '');
        const problems = Object.entries(catalog.errors || {}).map(([p, e]) => `${p}: ${e}`);
        setLlmMessage(catalog.models?.length ? problems.join(' · ') : problems.join(' · ') || 'No models available');
      })
      .catch(() => setLlmMessage('Could not load models from the server'));
  }, []);

  // Load existing agent configuration from Database Server
  useEffect(() => {
    DashboardController.getAgent()
      .then((agent) => {
        if (agent) {
          if (agent.name) setAgentName(agent.name);
          if (agent.greeting_message) setWelcomeMessage(agent.greeting_message);
          if (agent.config?.personality) setEmotion(agent.config.personality);
          if (agent.config?.model) setModel(agent.config.model);
          if (agent.config?.system_prompt) setSystemPrompt(agent.config.system_prompt);

          // 1. Restore exact saved voice from DB
          if (agent.voice_model) {
            const found = AVAILABLE_VOICES.find((v) => v.voice_id === agent.voice_model);
            if (found) setSelectedVoice(found);
          } else if (agent.config?.tts_provider?.voice_id) {
            const found = AVAILABLE_VOICES.find(
              (v) => v.voice_id === agent.config?.tts_provider?.voice_id
            );
            if (found) setSelectedVoice(found);
          } else if (agent.config?.tts_provider?.voice_name) {
            const found = AVAILABLE_VOICES.find(
              (v) => v.name.toLowerCase() === agent.config?.tts_provider?.voice_name?.toLowerCase()
            );
            if (found) setSelectedVoice(found);
          }

          // 2. Restore exact saved accent from DB
          if (agent.config?.accent) {
            setSelectedAccentCode(agent.config.accent);
          } else if (agent.config?.stt?.language) {
            setSelectedAccentCode(agent.config.stt.language);
          } else if (agent.primary_language) {
            const lang = agent.primary_language.toLowerCase();
            if (lang.includes('hi')) setSelectedAccentCode('hi-IN');
            else if (lang.includes('pa')) setSelectedAccentCode('pa-IN');
            else if (lang.includes('bn')) setSelectedAccentCode('bn-IN');
            else if (lang.includes('es')) setSelectedAccentCode('es-ES');
            else if (lang.includes('de')) setSelectedAccentCode('de-DE');
            else if (lang.includes('nl')) setSelectedAccentCode('nl-NL');
            else setSelectedAccentCode('en-IN');
          }
        }
      })
      .catch((err) => console.warn('Failed to load agent for studio:', err));
  }, []);

  // Save Agent Configuration into Database Server
  const saveAgentToDb = useCallback(
    async (overrides?: {
      name?: string;
      greeting?: string;
      voice?: VoiceOption;
      accent?: string;
      emotion?: string;
      model?: string;
      systemPrompt?: string;
    }) => {
      try {
        setIsSaving(true);
        setSaveStatus('saving');

        const v = overrides?.voice || selectedVoice;
        const acc = overrides?.accent || selectedAccentCode;
        const langPrefix = acc.slice(0, 2);

        const payload: Partial<AgentItem> = {
          name: overrides?.name ?? agentName,
          greeting_message: overrides?.greeting ?? welcomeMessage,
          primary_language: langPrefix,
          voice_provider: 'cartesia',
          voice_model: v.voice_id,
          config: {
            personality: overrides?.emotion ?? emotion,
            accent: acc,
            model: overrides?.model ?? model,
            system_prompt: overrides?.systemPrompt ?? systemPrompt,
            tts_provider: {
              provider: 'cartesia',
              voice_id: v.voice_id,
              voice_name: v.name,
              accent: v.accent,
              language: langPrefix,
            },
            stt: {
              language: acc,
            },
          },
        };

        await DashboardController.updateAgent(payload);
        setSaveStatus('saved');
        if (onSave) onSave(payload);
        setTimeout(() => setSaveStatus('idle'), 2500);
      } catch (err) {
        console.error('Failed to save agent to DB server:', err);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } finally {
        setIsSaving(false);
      }
    },
    [agentName, welcomeMessage, selectedVoice, selectedAccentCode, emotion, model, systemPrompt, onSave]
  );

  // Timer for active call
  useEffect(() => {
    if (isLiveActive) {
      timerRef.current = setInterval(() => setCallSeconds((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLiveActive]);

  // Auto-scroll transcript to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, interimTranscript, isThinking]);

  // Stop any active speech or mic listening
  const stopVoiceLoop = useCallback(() => {
    bargeDetectorRef.current?.close();
    bargeDetectorRef.current = null;
    recorderRef.current?.discard(); // a hang-up takes the recorder first (toggleLiveCall); this covers unmount
    recorderRef.current = null;
    if (recognitionRestartTimerRef.current) {
      clearTimeout(recognitionRestartTimerRef.current);
      recognitionRestartTimerRef.current = null;
    }
    if (speechSafetyWatchdogRef.current) {
      clearTimeout(speechSafetyWatchdogRef.current);
      speechSafetyWatchdogRef.current = null;
    }
    if (echoCooldownTimerRef.current) {
      clearTimeout(echoCooldownTimerRef.current);
      echoCooldownTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    currentUtteranceRef.current = null;
    setIsAISpeaking(false);
    isAISpeakingRef.current = false;
    echoLockRef.current = false;
    isProcessingTurnRef.current = false;
    setIsUserSpeaking(false);
    setInterimTranscript('');
  }, []);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopVoiceLoop();
    };
  }, [stopVoiceLoop]);

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Complete speech playback and trigger callback cleanly
  // `immediate`: another sentence of the same reply follows, so skip the echo cooldown and hand over right away.
  const finishSpeech = useCallback((onEnded?: () => void, immediate = false) => {
    if (speechSafetyWatchdogRef.current) {
      clearTimeout(speechSafetyWatchdogRef.current);
      speechSafetyWatchdogRef.current = null;
    }
    currentUtteranceRef.current = null;
    aiSpeechEndedAtRef.current = Date.now();
    if (immediate && onEnded) {
      echoLockRef.current = true;
      onEnded(); // the next sentence's speakText() re-marks the AI as speaking straight away
      return;
    }
    bargeDetectorRef.current?.disarm();
    setIsAISpeaking(false);
    isAISpeakingRef.current = false;

    // Echo cancellation buffer: keep mic muted and locked for 850ms while acoustic waves clear the room & audio buffers flush
    if (echoCooldownTimerRef.current) {
      clearTimeout(echoCooldownTimerRef.current);
    }
    echoLockRef.current = true;
    echoCooldownTimerRef.current = setTimeout(() => {
      echoLockRef.current = false;
      if (onEnded) {
        onEnded();
      }
    }, 850);
  }, []);

  // Barge-in: the caller talks over the AI (or presses Interrupt). The AI stops at once, its unspoken sentences are
  // dropped, and whatever the caller is saying becomes the next turn.
  const bargeIn = useCallback(() => {
    activeTurnRef.current?.cancel();
    activeTurnRef.current = null;
    bargeDetectorRef.current?.disarm();
    speakTokenRef.current++;
    if (audioRef.current) audioRef.current.pause();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    if (speechSafetyWatchdogRef.current) {
      clearTimeout(speechSafetyWatchdogRef.current);
      speechSafetyWatchdogRef.current = null;
    }
    if (echoCooldownTimerRef.current) clearTimeout(echoCooldownTimerRef.current);
    currentUtteranceRef.current = null;
    aiSpeechEndedAtRef.current = Date.now();
    setIsAISpeaking(false);
    isAISpeakingRef.current = false;
    echoLockRef.current = false;
    isProcessingTurnRef.current = false;
    setIsThinking(false);
  }, []);

  // Browser Microphone Listening with automatic continuous restart
  // `duringAI`: listen while the AI is talking, only to notice the caller interrupting it.
  const startListening = useCallback((duringAI = false) => {
    if (typeof window === 'undefined') return;
    if (isMutedRef.current) return;
    // Never listen while the AI talks: speech recognition would transcribe the AI itself (BargeInDetector watches instead).
    if (duringAI || isAISpeakingRef.current || echoLockRef.current || isProcessingTurnRef.current) return;
    if (!isLiveActiveRef.current) return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      console.warn('SpeechRecognition not supported in browser.');
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
        setIsUserSpeaking(true);
        setInterimTranscript('');
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
        if (interim) setInterimTranscript(interim);

        if (final.trim()) {
          setInterimTranscript('');
          handleUserTurnRef.current(final.trim());
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('SpeechRecognition error:', event.error);
        }
      };

      recognition.onend = () => {
        setIsUserSpeaking(false);
        // Automatic restart loop (the browser ends a session after a pause). While the AI speaks we keep listening
        // for interruptions; otherwise never during echo cooldown, processing, or mute.
        const canListen = () =>
          isLiveActiveRef.current &&
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
      setIsUserSpeaking(false);
    }
  }, [bargeIn]);

  // Robust Audio Output: Cartesia API with automatic Native Web Speech Synthesis fallback
  const speakText = useCallback(
    (text: string, onEnded?: () => void, moreComing?: () => boolean, voice?: { emotion?: string; ttsText?: string }) => {
      // 1. Mark AI speaking, engage echo lock and register the text in recent utterances
      if (!isAISpeakingRef.current) aiSpeechStartedAtRef.current = Date.now();
      setIsAISpeaking(true);
      isAISpeakingRef.current = true;
      echoLockRef.current = true;
      recentAITextsRef.current = [text.toLowerCase().trim(), ...recentAITextsRef.current.slice(0, 4)];
      const token = ++speakTokenRef.current;

      // Keep the microphone open while the AI talks (no restart between sentences), so the caller can interrupt by voice.
      // While the AI talks the caller is watched by a loudness detector on an echo-cancelled mic, not by speech recognition.
      bargeDetectorRef.current?.arm(() => {
        bargeIn();
        startListening();
      });

      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      // Safety watchdog: auto-finish if audio or speech synthesis gets stuck
      const estimatedDurationMs = Math.max(3000, (text.length / 10) * 1000 + 2000);
      if (speechSafetyWatchdogRef.current) {
        clearTimeout(speechSafetyWatchdogRef.current);
      }
      speechSafetyWatchdogRef.current = setTimeout(() => {
        if (isAISpeakingRef.current) {
          console.warn('[VOICE] Watchdog auto-finished speech');
          finishSpeech(onEnded);
        }
      }, estimatedDurationMs);

      let fallbackFired = false;

      const triggerSpeechSynthesisFallback = () => {
        if (fallbackFired) return;
        fallbackFired = true;

        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = selectedAccentRef.current;
          utterance.rate = 1.0;
          utterance.pitch = 1.0;

          const availableVoices = window.speechSynthesis.getVoices();
          const langPrefix = selectedAccentRef.current.slice(0, 2).toLowerCase();
          const matched = availableVoices.find((v) => v.lang.toLowerCase().includes(langPrefix));
          if (matched) utterance.voice = matched;

          utterance.onend = () => {
            if (token === speakTokenRef.current) finishSpeech(onEnded, moreComing?.() ?? false);
          };
          utterance.onerror = () => {
            if (token === speakTokenRef.current) finishSpeech(onEnded, moreComing?.() ?? false);
          };

          currentUtteranceRef.current = utterance;
          window.speechSynthesis.speak(utterance);
        } else {
          finishSpeech(onEnded);
        }
      };

      // 1. Try Cartesia preview endpoint first
      const voiceId = selectedVoice.voice_id;
      // No `language` here: the server detects it per sentence, which is also what it pre-generates the audio with.
      // `voice`: how this sentence should sound (the emotion engine's emotion, and a real laugh as a [laughter] prefix).
      const previewUrl = `${API_ENDPOINTS.VOICE.PREVIEW}?voice_id=${encodeURIComponent(voiceId)}&text=${encodeURIComponent((voice?.ttsText ?? text).slice(0, 250))}${voice?.emotion ? `&emotion=${encodeURIComponent(voice.emotion)}` : ''}`;
      const startAudio = (src: string, revoke?: () => void) => {
        if (token !== speakTokenRef.current) { revoke?.(); return; } // a newer sentence / hang-up took over while this loaded
        const audio = new Audio(src);
        audioRef.current = audio;
        if (revoke) recorderRef.current?.tapAiAudio(audio); // the AI's voice must pass through the recorder to be captured
        audio.onended = () => {
          revoke?.();
          if (token === speakTokenRef.current) finishSpeech(onEnded, moreComing?.() ?? false);
        };
        audio.onerror = () => {
          revoke?.();
          if (token === speakTokenRef.current) triggerSpeechSynthesisFallback();
        };
        audio.play().catch(() => {
          revoke?.();
          if (token === speakTokenRef.current) triggerSpeechSynthesisFallback();
        });
      };

      if (recorderRef.current?.active) {
        // Fetch as a blob: an element playing a cross-origin URL cannot be captured by the recorder.
        fetch(previewUrl)
          .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.blob(); })
          .then((blob) => {
            const url = URL.createObjectURL(blob);
            startAudio(url, () => URL.revokeObjectURL(url));
          })
          .catch(() => { if (token === speakTokenRef.current) triggerSpeechSynthesisFallback(); });
      } else {
        startAudio(previewUrl);
      }
    },
    [selectedVoice.voice_id, finishSpeech, startListening]
  );

  // Dispatch turn to backend and speak response
  const handleUserTurn = useCallback(
    async (userText: string) => {
      const text = userText.trim();
      if (!text) return;
      if (isAISpeakingRef.current || echoLockRef.current || isProcessingTurnRef.current) return;

      // Echo suppression: only for speech that arrives right after the AI stopped (see utils/voice_echo.ts).
      if (!text.replace(/[.,!?\s]/g, '')) return;
      if (isEchoOfAI(text, recentAITextsRef.current, Date.now() - aiSpeechEndedAtRef.current < 1800)) {
        console.warn('[ECHO SUPPRESSION] Discarded echo of the AI:', text);
        setInterimTranscript('');
        return;
      }

      // Lock turn processing immediately and stop mic
      isProcessingTurnRef.current = true;
      const myTurn = ++turnIdRef.current;
      setIsUserSpeaking(false);
      setInterimTranscript('');

      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages((prev) => [...prev, { speaker: 'User', text, time: timeStr }]);
      setIsThinking(true);

      try {
        const langPrefix = selectedAccentRef.current.slice(0, 2);
        const queue: { text: string; emotion?: string; ttsText?: string }[] = [];
        let speaking = false;
        let streamEnded = false;
        let heardAny = false;
        let cancelled = false; // the caller interrupted: stop speaking and stop showing the rest of this reply
        const turn = { cancel: () => { cancelled = true; queue.length = 0; speaking = false; } };
        activeTurnRef.current = turn;
        const resume = () => {
          if (isLiveActiveRef.current && !isMutedRef.current) startListening();
        };
        // Each sentence is spoken as soon as the server has it, so the AI starts talking while the model is still writing.
        const pump = () => {
          if (speaking) return;
          const next = queue.shift();
          if (next === undefined) return;
          speaking = true;
          speakText(
            next.text,
            () => {
              speaking = false;
              if (queue.length > 0) pump();
              else if (streamEnded) resume();
            },
            () => queue.length > 0 || !streamEnded,
            { emotion: next.emotion, ttsText: next.ttsText }
          );
        };

        const res = await DashboardController.simulateVoiceStream(
          {
            user_transcript: text,
            call_id: callIdRef.current,
            caller_number: '', // a browser call has no caller ID; the agent asks for the number instead of inventing one
            language: langPrefix,
            accent: selectedAccentRef.current,
            voice_id: selectedVoice.voice_id,
          },
          (sentence, meta) => {
            if (cancelled) return;
            const at = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const continuing = heardAny;
            heardAny = true;
            setIsThinking(false);
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (continuing && last && last.speaker === 'AI') return [...prev.slice(0, -1), { ...last, text: `${last.text} ${sentence}` }];
              return [...prev, { speaker: 'AI', text: sentence, time: at }];
            });
            queue.push({ text: sentence, ...meta });
            pump();
          }
        );
        streamEnded = true;
        if (activeTurnRef.current === turn) activeTurnRef.current = null;
        if (cancelled) return; // the caller took over; nothing more to say or resume
        if (!res) throw new Error('The stream ended without a result');
        // The caller asked to switch language ("talk in Hindi"): listen for that language from now on.
        if (res.stt_language) selectedAccentRef.current = res.stt_language;
        if (res.bot_response) {
          // the server's full reply is the source of truth for the transcript
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            return last && last.speaker === 'AI' ? [...prev.slice(0, -1), { ...last, text: res.bot_response }] : prev;
          });
        }
        // Everything already finished playing before the stream closed: resume through the normal echo cooldown.
        if (!speaking && queue.length === 0 && heardAny) finishSpeech(resume);
        else pump();
      } catch (err) {
        console.error('Turn simulation error:', err);
        const fallbackText = 'I am here to assist with your appointments and queries. How can I help you?';
        setMessages((prev) => [...prev, { speaker: 'AI', text: fallbackText, time: timeStr }]);
        speakText(fallbackText, () => {
          if (isLiveActiveRef.current && !isMutedRef.current) {
            startListening();
          }
        });
      } finally {
        if (turnIdRef.current === myTurn) { // an interrupted turn must not unlock a newer one
          isProcessingTurnRef.current = false;
          setIsThinking(false);
        }
      }
    },
    [selectedVoice.voice_id, speakText, startListening, finishSpeech]
  );

  useEffect(() => {
    handleUserTurnRef.current = handleUserTurn;
  }, [handleUserTurn]);

  // Toggle Live Call Session
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

  const toggleLiveCall = async () => {
    if (isLiveActive) {
      const recorder = recorderRef.current;
      recorderRef.current = null;
      void finalizeCallOnServer(callIdRef.current, recorder);
      stopVoiceLoop();
      setIsLiveActive(false);
      isLiveActiveRef.current = false;
    } else {
      setIsLiveActive(true);
      isLiveActiveRef.current = true;
      callIdRef.current = 'studio_' + Math.random().toString(36).slice(2, 8);
      // Interruption detector (its own echo-cancelled mic stream; the call still works without it)
      const detector = new BargeInDetector();
      const detectorReady = detector.open();
      // Record the call (caller mic + AI voice) so it can be played back in /calls. The call works without it.
      let recorder: CallRecorder | null = null;
      if (CallRecorder.supported()) {
        recorder = new CallRecorder();
        if (!(await recorder.start())) recorder = null;
      }
      recorderRef.current = recorder;
      if ((await detectorReady) && isLiveActiveRef.current) bargeDetectorRef.current = detector;
      else detector.close();
      setMessages([]);
      setInterimTranscript('');
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages([{ speaker: 'AI', text: welcomeMessage, time: timeStr }]);

      // Speak welcome greeting, then open mic
      speakText(welcomeMessage, () => {
        if (isLiveActiveRef.current && !isMutedRef.current) {
          startListening();
        }
      });
    }
  };

  // Barge-in: user interrupts AI
  const interruptAI = () => {
    bargeIn();
    startListening();
  };

  // Send manual text chat
  const handleSendChat = () => {
    const text = chatDraft.trim();
    if (!text) return;
    setChatDraft('');
    if (!isLiveActive) {
      setIsLiveActive(true);
      isLiveActiveRef.current = true;
    }
    handleUserTurn(text);
  };

  const activeVoice = selectedVoice || AVAILABLE_VOICES[0];
  const activeAccent = ACCENT_GROUPS.flatMap((g) => g.accents).find((a) => a.code === selectedAccentCode) || ACCENT_GROUPS[0].accents[0];

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/50 min-h-screen text-slate-800">
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
      {/* Top Header */}
      <header className="h-14 px-6 border-b border-slate-200 bg-white flex items-center justify-between shadow-xs sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={() => {
                saveAgentToDb();
                onBack();
              }}
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span>All Settings</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Agent:</span>
            {isEditingName ? (
              <input
                type="text"
                value={agentName}
                autoFocus
                onBlur={() => {
                  setIsEditingName(false);
                  saveAgentToDb({ name: agentName });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingName(false);
                    saveAgentToDb({ name: agentName });
                  }
                }}
                onChange={(e) => setAgentName(e.target.value)}
                className="text-sm font-bold text-slate-900 border border-blue-400 rounded px-2 py-0.5 outline-none bg-blue-50/50"
              />
            ) : (
              <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => setIsEditingName(true)}>
                <span className="text-sm font-bold text-slate-900">{agentName}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400 group-hover:text-slate-700">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Right actions: DB Sync and Save */}
        <div className="flex items-center gap-3">
          {saveStatus === 'saved' ? (
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Saved to DB
            </span>
          ) : saveStatus === 'saving' ? (
            <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
              Saving to DB...
            </span>
          ) : saveStatus === 'error' ? (
            <span className="text-[11px] text-red-500 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              Save failed
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              DB Synced
            </span>
          )}

          <button
            onClick={() => saveAgentToDb()}
            disabled={isSaving}
            className="px-4 py-1.5 bg-[#0066FF] hover:bg-[#0052cc] text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-70"
          >
            {isSaving ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving to DB...</span>
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Saved to DB!</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </header>

      {/* Main Studio Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Left & Center Workbench Config (7 Cols) */}
        <div className="lg:col-span-7 p-6 border-r border-slate-200 overflow-y-auto space-y-5 bg-white">
          {/* Quick Studio Bar (Voice, Accent, Model, Emotion) */}
          <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-slate-100">
            {/* Model Selector */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-700">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
              {llmModels.length === 0 ? (
                <span className="text-slate-500 font-medium">{llmMessage}</span>
              ) : (
                <select
                  // A saved value that is no longer offered (e.g. an old free-text label) is shown as the chain default,
                  // which is what the server actually uses for it; nothing is overwritten until the user picks a model.
                  value={llmModels.some((m) => m.value === model) ? model : llmDefault}
                  onChange={(e) => {
                    setModel(e.target.value);
                    saveAgentToDb({ model: e.target.value });
                  }}
                  title={llmMessage || 'Models are listed live from Groq and Gemini. #n = position in the fallback chain.'}
                  className="bg-transparent outline-none font-bold cursor-pointer max-w-[260px]"
                >
                  {(['groq', 'gemini'] as const).map((provider) => {
                    const group = llmModels.filter((m) => m.provider === provider);
                    if (group.length === 0) return null;
                    return (
                      <optgroup key={provider} label={provider === 'groq' ? 'Groq' : 'Google Gemini'}>
                        {group.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                            {m.context_window ? ` · ${Math.round(m.context_window / 1000)}K` : ''}
                            {m.chain_position ? ` · #${m.chain_position}` : ''}
                            {m.tool_calling === 'no' ? ' · no tool calling' : ''}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              )}
            </div>

            {/* Voice Selector button with active voice pill */}
            <button
              onClick={() => setIsVoiceModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-300 text-xs font-bold text-slate-800 transition-colors shadow-2xs cursor-pointer"
            >
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                {activeVoice.name[0]}
              </span>
              <span>Voice: {activeVoice.name}</span>
              <span className="text-[10px] text-blue-600 font-medium">({activeVoice.accent})</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400 ml-0.5">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            {/* Accent Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsAccentMenuOpen(!isAccentMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 text-xs font-bold text-slate-800 transition-colors shadow-2xs cursor-pointer"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
                <span>Accent: {activeAccent.label}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {isAccentMenuOpen && (
                <div className="absolute left-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 text-xs divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150">
                  {ACCENT_GROUPS.map((group) => (
                    <div key={group.region} className="py-1.5 first:pt-0 last:pb-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                        {group.region}
                      </div>
                      <div className="space-y-0.5">
                        {group.accents.map((acc) => (
                          <button
                            key={acc.code}
                            onClick={() => {
                              setSelectedAccentCode(acc.code);
                              setIsAccentMenuOpen(false);
                              saveAgentToDb({ accent: acc.code });
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                              selectedAccentCode === acc.code
                                ? 'bg-blue-50 text-[#0066FF] font-bold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>{acc.label}</span>
                            {selectedAccentCode === acc.code && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Persona / Tone Selector */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-700">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                <line x1="9" y1="9" x2="9.01" y2="9"></line>
                <line x1="15" y1="9" x2="15.01" y2="9"></line>
              </svg>
              <select
                value={emotion}
                onChange={(e) => {
                  setEmotion(e.target.value);
                  saveAgentToDb({ emotion: e.target.value });
                }}
                className="bg-transparent outline-none font-bold cursor-pointer"
              >
                <option value="Empathetic & Calm">Empathetic & Calm</option>
                <option value="Warm & Friendly">Warm & Friendly</option>
                <option value="Crisp & Professional">Crisp & Professional</option>
                <option value="Energetic & Fast">Energetic & Fast</option>
              </select>
            </div>
          </div>

          {/* Section: Agent Personality & System Prompt */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Agent Knowledge & System Prompt
                </h3>
                <p className="text-[11px] text-slate-500">
                  Governs how the conversational engine reasons, identifies medical intents, and structures replies.
                </p>
              </div>
              <span className="text-[10px] bg-blue-50 text-[#0066FF] font-bold px-2 py-0.5 rounded-full border border-blue-100">
                Saved in Database
              </span>
            </div>

            <textarea
              rows={4}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              onBlur={() => saveAgentToDb({ systemPrompt })}
              className="w-full text-xs font-mono p-3 border border-slate-200 rounded-xl outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-blue-100 leading-relaxed bg-slate-50/30"
              placeholder="Enter system prompt instructions for your AI agent..."
            />
          </div>

          {/* Section: Welcome Greeting Message */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Initial Welcome Greeting
              </label>
              <button
                type="button"
                onClick={() => speakText(welcomeMessage)}
                className="text-[11px] text-[#0066FF] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                Listen Greeting
              </button>
            </div>
            <textarea
              rows={2}
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              onBlur={() => saveAgentToDb({ greeting: welcomeMessage })}
              className="w-full text-xs p-3 border border-slate-200 rounded-xl outline-none focus:border-[#0066FF] leading-relaxed"
              placeholder="First greeting uttered when caller connects..."
            />
          </div>

          {/* Section: Active Clinical Capabilities */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Active Capabilities & Function Tools
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-slate-800">Appointment Booking</div>
                  <div className="text-[11px] text-slate-500">Auto-checks slot availability, schedules doctor visits.</div>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-slate-800">Clinic FAQs & Policies</div>
                  <div className="text-[11px] text-slate-500">Answers pricing, operating hours, and location questions.</div>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-slate-800">Emergency & Triage Transfer</div>
                  <div className="text-[11px] text-slate-500">Deterministic escalation to human doctors for critical cases.</div>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-slate-800">Multilingual Telephony</div>
                  <div className="text-[11px] text-slate-500">Fluid voice support across Indian and International accents.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Live Testing Panel (5 Cols) */}
        <div className="lg:col-span-5 p-6 bg-slate-50/70 flex flex-col justify-between overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Interactive Voice Sandbox</h3>
                <span className="text-[10px] font-bold text-[#0066FF] bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full">
                  Real-time
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Test real-time Cartesia voice synthesis &amp; intent execution.</p>
            </div>
            {isLiveActive ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-[#0066FF] rounded-full text-[11px] font-mono font-bold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#0066FF] animate-ping"></span>
                <span>{formatDuration(callSeconds)}</span>
              </div>
            ) : (
              <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold">
                Standby
              </span>
            )}
          </div>

          {/* THE 3D LANDING PAGE ORB CARD */}
          <div className="bg-[#050816] border border-slate-800/80 rounded-2xl p-5 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden mb-3.5">
            {/* Top ambient radial glow */}
            <div
              className={`absolute inset-0 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
                isUserSpeaking
                  ? 'bg-emerald-500/25 scale-125'
                  : isAISpeaking
                  ? 'bg-[#0066FF]/30 scale-125'
                  : 'bg-indigo-600/20 scale-100'
              }`}
            />

            {/* 3D WebGL Orb Canvas (Tap to Start / End Live Call) */}
            <div
              onClick={toggleLiveCall}
              title={isLiveActive ? "Click to End Call" : "Click to Start Voice Call"}
              className="relative w-full h-56 flex items-center justify-center cursor-pointer group z-10"
            >
              <HeroOrb
                isAISpeaking={isAISpeaking}
                isUserSpeaking={isUserSpeaking}
                isLiveActive={isLiveActive}
                animate={true}
                distance={4.8}
              />
            </div>

            {/* STATUS & PERSONA SUMMARY */}
            <div className="text-center mt-2 w-full z-10">
              <div className="text-xs font-bold flex items-center justify-center gap-1.5 min-h-[22px]">
                {isAISpeaking ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                    <span className="text-cyan-300 font-bold">{agentName} is speaking...</span>
                  </>
                ) : isUserSpeaking ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="text-emerald-400 font-bold">Listening to your voice...</span>
                  </>
                ) : isThinking ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                    <span className="text-indigo-300 font-bold">Processing intent &amp; reasoning...</span>
                  </>
                ) : isLiveActive ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    <span className="text-white/80 font-semibold">Call Connected &bull; Speak anytime</span>
                  </>
                ) : (
                  <span className="text-white/90 font-bold">Tap Orb to Start Live Call</span>
                )}
              </div>

              {/* Sub-caption or Persona chip */}
              <div className="flex items-center justify-center gap-2 mt-1.5">
                {isLiveActive ? (
                  <div className="flex items-center gap-1.5 bg-slate-900/90 border border-white/10 px-3 py-0.5 rounded-full text-[11px] text-white/80 font-medium shadow-2xs">
                    <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-800 shrink-0">
                      <img src={activeVoice.avatarUrl} alt={activeVoice.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="font-semibold text-white">{activeVoice.name}</span>
                    <span className="text-white/30">&bull;</span>
                    <span className="text-white/70">{activeVoice.accent}</span>
                    <span className="text-white/30">&bull;</span>
                    <span className="text-cyan-400 font-semibold">{activeAccent.label}</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-white/50">
                    Direct browser audio &bull; No phone call needed
                  </span>
                )}
              </div>
            </div>

            {/* IN-CALL CONTROLS DOCK */}
            {isLiveActive && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10 w-full justify-center z-10">
                {isAISpeaking && (
                  <button
                    onClick={interruptAI}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16"></rect>
                      <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                    Interrupt
                  </button>
                )}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`px-3.5 py-1.5 text-[11px] font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                    isMuted
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-slate-900 text-white/90 border-white/15 hover:bg-slate-800'
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
                  onClick={toggleLiveCall}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-xl shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  End Call
                </button>
              </div>
            )}
          </div>

          {/* REALTIME READ-ALONG TRANSCRIPT BOX */}
          <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col min-h-[240px]">
            <div className="flex items-center justify-between mb-2.5 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Live Conversation Stream
                </span>
                {messages.length > 0 && (
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {messages.length} {messages.length === 1 ? 'turn' : 'turns'}
                  </span>
                )}
              </div>
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="text-[10px] text-slate-400 hover:text-red-600 font-semibold cursor-pointer transition-colors flex items-center gap-1"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  Clear
                </button>
              )}
            </div>

            <div ref={chatScrollRef} className="flex-1 space-y-3 overflow-y-auto max-h-60 pr-1">
              {messages.length === 0 && !interimTranscript && (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 py-10 text-center flex-col gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center justify-center text-blue-500">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </div>
                  <div className="font-semibold text-slate-600">Start speaking or tap the orb above</div>
                  <span className="text-[11px] text-slate-400 max-w-xs">
                    Your voice turns and the AI receptionist's spoken responses will appear here in real-time.
                  </span>
                </div>
              )}

              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2.5 ${m.speaker === 'User' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* AI Avatar */}
                  {m.speaker === 'AI' && (
                    <div className="w-7 h-7 rounded-xl overflow-hidden shrink-0 border border-blue-200 bg-blue-100 mt-1 shadow-2xs">
                      <img src={activeVoice.avatarUrl} alt={activeVoice.name} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                      m.speaker === 'AI'
                        ? 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-xs'
                        : 'bg-[#0066FF] text-white rounded-tr-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className={`font-bold ${m.speaker === 'AI' ? 'text-[#0066FF]' : 'text-blue-100'}`}>
                        {m.speaker === 'AI' ? `AI Receptionist (${agentName})` : 'You (Caller)'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] ${m.speaker === 'AI' ? 'text-slate-400' : 'text-blue-200'}`}>
                          {m.time}
                        </span>
                        {m.speaker === 'AI' && (
                          <button
                            type="button"
                            onClick={() => speakText(m.text)}
                            title="Replay speech"
                            className="p-1 hover:bg-slate-200/70 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    <div>{m.text}</div>
                  </div>
                </div>
              ))}

              {interimTranscript && (
                <div className="flex justify-end">
                  <div className="p-2.5 rounded-2xl rounded-tr-xs text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 italic flex items-center gap-2 max-w-[85%]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
                    <span>"{interimTranscript}..."</span>
                  </div>
                </div>
              )}

              {isThinking && (
                <div className="flex justify-start items-center gap-2 text-xs text-[#0066FF] bg-blue-50/60 border border-blue-100 px-3 py-2 rounded-2xl w-fit italic">
                  <div className="w-3.5 h-3.5 border-2 border-[#0066FF] border-t-transparent rounded-full animate-spin"></div>
                  <span>AI Receptionist is reasoning &amp; synthesizing...</span>
                </div>
              )}
            </div>

            {/* Bottom Chat Input (Type anytime) */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={chatDraft}
                  onChange={(e) => setChatDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendChat();
                  }}
                  placeholder="Type a query or speak into microphone..."
                  className="w-full text-xs pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#0066FF] focus:bg-white transition-all"
                />
              </div>
              <button
                onClick={handleSendChat}
                disabled={!chatDraft.trim()}
                className="px-4 py-2.5 bg-[#0066FF] hover:bg-[#0052cc] text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <span>Send</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CHOOSE A VOICE MODAL (Reusable Agni-style modal with verified Cartesia voice IDs) */}
      <ChooseVoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        selectedVoice={activeVoice}
        selectedVoiceId={activeVoice.voice_id}
        onSelectVoice={(v) => {
          setSelectedVoice(v);
          saveAgentToDb({ voice: v });
        }}
        vertical={StorageService.getBusiness()?.vertical}
      />
    </div>
  );
}
