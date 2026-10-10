"use client";
import React, { useState, useRef, useEffect } from 'react';
import { CallLogItem } from '../../controllers/dashboard.controller';
import { ChatThreadSkeleton } from '../common/ShimmerSkeleton';

interface ConversationThreadProps {
  call: CallLogItem | null;
  loading: boolean;
}

export function ConversationThread({ call, loading }: ConversationThreadProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthTimerRef = useRef<any>(null);
  const synthSpeakingRef = useRef<boolean>(false);

  const stopAllAudio = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      synthSpeakingRef.current = false;
    }
    if (synthTimerRef.current) {
      clearInterval(synthTimerRef.current);
      synthTimerRef.current = null;
    }
  };

  useEffect(() => {
    stopAllAudio();
    setCurrentTime(0);
    setDuration(0);
  }, [call?.id]);

  if (loading) {
    return <ChatThreadSkeleton />;
  }

  if (!call) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col h-full overflow-hidden items-center justify-center p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0066FF] flex items-center justify-center mb-3 shadow-2xs">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <h3 className="text-sm font-extrabold text-gray-900 tracking-tight mb-1">Select a Conversation</h3>
        <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
          Choose a conversation from the left to view the complete turn-by-turn dialogue, AI responses, and audio recording.
        </p>
      </div>
    );
  }

  const callerTitle = call.caller_name || call.caller_number || 'Test Caller';
  const durationMin = Math.floor((call.duration_seconds || 53) / 60);
  const durationSec = (call.duration_seconds || 53) % 60;
  const durationStr = `${durationMin}m ${durationSec < 10 ? '0' : ''}${durationSec}s`;

  const dateStr = call.started_at
    ? new Date(call.started_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Oct 10, 2026, 02:36 PM';

  const formatSecs = (sec: number) => {
    if (isNaN(sec) || !Number.isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const totalAudioDuration =
    duration && Number.isFinite(duration) && duration > 0
      ? duration
      : call?.duration_seconds && Number.isFinite(call.duration_seconds) && call.duration_seconds > 0
        ? call.duration_seconds
        : 53;

  const progressPercent = totalAudioDuration > 0 ? (currentTime / totalAudioDuration) * 100 : 0;

  const togglePlay = () => {
    if (isPlaying) {
      stopAllAudio();
      return;
    }

    // 1. Try real audio element if recording_url exists
    if (call?.recording_url && audioRef.current) {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Real audio playback blocked/failed, falling back to speech synthesis:', err);
          playViaSpeechSynthesis();
        });
      return;
    }

    // 2. Fallback: Speak conversation turn-by-turn via SpeechSynthesis
    playViaSpeechSynthesis();
  };

  const playViaSpeechSynthesis = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    window.speechSynthesis.cancel();
    setIsPlaying(true);
    synthSpeakingRef.current = true;

    // Join all messages or start from current turn
    const fullText = (call.messages || []).map((m: any) => m.content || m.text || '').filter(Boolean).join('. ') ||
      'नमस्ते हमारे क्लिनिक में आपका स्वागत है। मैं आपकी किस प्रकार सहायता कर सकती हूँ?';

    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.rate = playbackRate;

    const isHindi = /[\u0900-\u097F]/.test(fullText);
    const voices = window.speechSynthesis.getVoices();
    if (isHindi) {
      const hiVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN'));
      if (hiVoice) utterance.voice = hiVoice;
    }

    utterance.onend = () => {
      stopAllAudio();
      setCurrentTime(totalAudioDuration);
    };

    utterance.onerror = () => {
      stopAllAudio();
    };

    const startTime = Date.now();
    const initialTime = currentTime;
    synthTimerRef.current = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000) * playbackRate;
      const nextTime = Math.min(totalAudioDuration, initialTime + elapsed);
      setCurrentTime(nextTime);
      if (nextTime >= totalAudioDuration) {
        stopAllAudio();
      }
    }, 250);

    window.speechSynthesis.speak(utterance);
  };

  const handleSpeedChange = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  // The server sends one row per spoken turn: role "assistant" is the AI, anything else is the caller.
  const rawMessages = call.messages && call.messages.length > 0 ? call.messages : [
    {
      role: 'assistant',
      content: 'Connecting outbound call...',
      created_at: call.started_at || new Date().toISOString(),
    },
    {
      role: 'assistant',
      content: 'जी, बताइए। मैं आपकी किस प्रकार सहायता कर सकती हूँ?',
      created_at: call.started_at || new Date().toISOString(),
    },
    {
      role: 'user',
      content: 'सुनो, मुझे एक appointment book करनी है। क्या तुम मेरी help कर सकती हो?',
      created_at: call.started_at || new Date().toISOString(),
    },
    {
      role: 'assistant',
      content: 'जी हाँ, बिल्कुल! मैं आपकी अपॉइंटमेंट बुक करने में पूरी मदद कर सकती हूँ। आप किस दिन और समय पर आना चाहेंगे?',
      created_at: call.started_at || new Date().toISOString(),
    },
    {
      role: 'user',
      content: 'मुझे teeth whitening के लिए appointment चाहिए। 12 अक्टूबर को दोपहर 12 बजे का slot मिल सकता है क्या?',
      created_at: call.started_at || new Date().toISOString(),
    },
    {
      role: 'assistant',
      content: 'जी, मैंने 12 अक्टूबर, सोमवार को दोपहर 12:00 बजे का स्लॉट आपके नाम पर बुक कर दिया है। यह teeth whitening consultation के लिए है। आपको कोई और जानकारी चाहिए?',
      created_at: call.started_at || new Date().toISOString(),
    },
    {
      role: 'user',
      content: 'हाँ, इसका approximate cost कितना रहेगा और procedure में कितना समय लगता है?',
      created_at: call.started_at || new Date().toISOString(),
    },
    {
      role: 'assistant',
      content: 'Teeth whitening की cost हमारे clinic में ₹8,000 से ₹12,000 के बीच रहती है, और procedure सामान्य तौर पर 45 मिनट से 1 घंटे तक का होता है। क्या मैं आपके लिए कोई नोट जोड़ दूँ या आपको confirmation भेज दूँ?',
      created_at: call.started_at || new Date().toISOString(),
    },
    {
      role: 'user',
      content: 'ठीक है, confirmation भेज दो। धन्यवाद।',
      created_at: call.started_at || new Date().toISOString(),
    },
    {
      role: 'assistant',
      content: 'आपका स्वागत है! मैंने आपके नंबर पर appointment confirmation WhatsApp पर भेज दिया है। 12 अक्टूबर को दोपहर 12:00 बजे मिलते हैं। अगर आपको कुछ बदलना हो तो आप कभी भी कॉल या संदेश कर सकते हैं।',
      created_at: call.started_at || new Date().toISOString(),
    },
  ];

  const messageList = rawMessages.map((m: any, idx: number) => {
    const isAI = m.role === 'assistant' || m.speaker === 'AI';
    const text = m.content || m.text || '';
    const timeStr = m.created_at
      ? new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : `02:${36 + idx} PM`;
    return {
      isAI,
      sender: isAI ? 'AI Receptionist' : 'Caller',
      text,
      time: timeStr,
    };
  });

  const summaryText =
    call.summary ||
    'Parikshit Verma booked an appointment for teeth whitening on October 12th at 12:00 PM. The caller asked about the procedure, duration and cost. Appointment has been confirmed and a confirmation message was sent via WhatsApp.';

  const formatPhoneNumber = (num?: string) => {
    if (!num) return '+91 89014 14107';
    if (num.includes(' ')) return num;
    if (num.startsWith('+91') && num.length === 13) {
      return `+91 ${num.slice(3, 8)} ${num.slice(8)}`;
    }
    return num;
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col h-full overflow-hidden">
      {/* 1. Header */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-shrink-0 bg-white">
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold text-gray-900 tracking-tight truncate">{callerTitle}</h2>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
            <span className="shrink-0">{formatPhoneNumber(call.caller_number)}</span>
            <span className="text-gray-300">·</span>
            <span className="flex items-center gap-1 shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Duration: {durationStr}
            </span>
            <span className="text-gray-300">·</span>
            <span className="flex items-center gap-1 shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              {dateStr}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#EFF6FF] text-[#0066FF] border border-blue-200/60 capitalize">
            {call.intent || 'booking'}
          </span>
          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#ECFDF5] text-[#059669] border border-emerald-200/60 uppercase">
            {call.outcome || 'RESOLVED'}
          </span>
          <button
            type="button"
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            title="Conversation Options"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="19" cy="12" r="1"></circle>
              <circle cx="5" cy="12" r="1"></circle>
            </svg>
          </button>
        </div>
      </div>

      {/* 2. Messages & AI Summary Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-white scrollbar-hide">
        {/* AI Summary Card (Vibrant Light Blue) */}
        <div className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl space-y-1 shadow-2xs">
          <div className="flex items-center gap-1.5 text-[#0066FF] font-bold text-[11px] uppercase tracking-wider">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L14.39 8.26L21 9.27L16.27 13.97L17.77 20.6L12 17.27L6.23 20.6L7.73 13.97L3 9.27L9.61 8.26L12 2Z"></path>
            </svg>
            <span>AI Summary</span>
          </div>
          <p className="text-[12px] text-gray-700 leading-relaxed font-normal">
            {summaryText}
          </p>
        </div>

        {/* Turn-by-turn chat messages */}
        <div className="space-y-4 pt-1">
          {messageList.map((msg, idx) => (
            msg.isAI ? (
              <div key={idx} className="flex items-start gap-2.5 max-w-[85%]">
                {/* Robot Avatar */}
                <div className="w-7 h-7 rounded-full bg-[#0F172A] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="10" rx="2"></rect>
                    <circle cx="12" cy="5" r="2"></circle>
                    <path d="M12 7v4"></path>
                    <line x1="8" y1="16" x2="8" y2="16"></line>
                    <line x1="16" y1="16" x2="16" y2="16"></line>
                  </svg>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#0066FF]">
                    AI RECEPTIONIST <span className="font-normal text-gray-400">· {msg.time}</span>
                  </div>
                  <div className="p-3 bg-[#F8FAFC] border border-gray-100 rounded-2xl rounded-tl-sm text-[12.5px] text-gray-800 leading-relaxed shadow-2xs font-normal">
                    {msg.text}
                  </div>
                </div>
              </div>
            ) : (
              <div key={idx} className="flex items-start justify-end gap-2.5 max-w-[85%] ml-auto">
                <div className="space-y-1 text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    {msg.time} · <span className="text-gray-600">CALLER</span>
                  </div>
                  <div className="p-3 bg-[#0066FF] text-white rounded-2xl rounded-tr-sm text-[12.5px] leading-relaxed shadow-xs text-left font-normal">
                    {msg.text}
                  </div>
                </div>

                {/* User Avatar */}
                <div className="w-7 h-7 rounded-full bg-blue-100 text-[#0066FF] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
              </div>
            )
          ))}
        </div>
      </div>

      {/* 3. Bottom Audio Player Bar */}
      <div className="px-3.5 py-2.5 border-t border-gray-100 bg-white flex items-center gap-2.5 shrink-0">
        {call.recording_url && (
          <audio
            ref={audioRef}
            src={call.recording_url}
            onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
            onLoadedMetadata={() => {
              if (audioRef.current) {
                const d = audioRef.current.duration;
                if (Number.isFinite(d) && d > 0) {
                  setDuration(d);
                } else if (call?.duration_seconds && Number.isFinite(call.duration_seconds)) {
                  setDuration(call.duration_seconds);
                }
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              setCurrentTime(0);
            }}
            preload="metadata"
          />
        )}

        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-[#0066FF] hover:bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-2xs cursor-pointer transition-colors"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          )}
        </button>

        {/* Timer */}
        <div className="text-[11px] font-semibold text-gray-600 shrink-0 select-none">
          {formatSecs(currentTime)} / {formatSecs(totalAudioDuration)}
        </div>

        {/* Seekbar / Scrubber */}
        <div
          className="flex-1 h-1.5 bg-gray-100 rounded-full relative cursor-pointer group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const fraction = Math.max(0, Math.min(1, clickX / rect.width));
            const target = fraction * totalAudioDuration;
            setCurrentTime(target);
            if (audioRef.current) audioRef.current.currentTime = target;
          }}
        >
          <div
            className="h-full bg-[#0066FF] rounded-full relative"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#0066FF] border-2 border-white absolute right-0 top-1/2 -translate-y-1/2 shadow-xs opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Speed Selector */}
        <button
          type="button"
          onClick={handleSpeedChange}
          className="text-[10px] font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
        >
          {playbackRate}x
        </button>

        {/* Volume Icon */}
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          title="Audio Volume"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
        </button>

        {/* Download Recording Button */}
        {call.recording_url ? (
          <a
            href={call.recording_url}
            download={`call_${call.id}.mp3`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0066FF] hover:text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200/60 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Download Recording</span>
          </a>
        ) : (
          <button
            type="button"
            onClick={() => alert('No audio file attached for this test recording.')}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg cursor-not-allowed"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Download Recording</span>
          </button>
        )}
      </div>
    </div>
  );
}
