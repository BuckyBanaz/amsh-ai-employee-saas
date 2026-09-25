"use client";
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { STRINGS } from '../../utils/strings/en';
import { CallLogItem } from '../../controllers/dashboard.controller';

interface CallDetailPanelProps {
  call: CallLogItem | null;
  loading?: boolean;
}

export function CallDetailPanel({ call, loading = false }: CallDetailPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.pause();
    }
  }, [call?.id]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((err) => {
        console.warn('Audio playback error:', err);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || call?.duration_seconds || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
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

  const formatSecs = (sec: number) => {
    if (isNaN(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="w-full bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center p-12 h-full min-h-[460px]">
        <div className="w-8 h-8 border-3 border-[#0066FF]/20 border-t-[#0066FF] rounded-full animate-spin mb-3"></div>
        <p className="text-xs text-gray-500 font-medium">Loading call details & transcript...</p>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="w-full bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center p-8 h-full min-h-[460px] text-center">
        <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0066FF] flex items-center justify-center mb-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
        </div>
        <h3 className="text-sm font-bold text-gray-900 mb-1">Select a Call</h3>
        <p className="text-xs text-gray-500 max-w-[220px]">
          Click on any call log from the table to listen to the audio recording and inspect full conversation turns.
        </p>
      </div>
    );
  }

  const initials = (call.caller_name?.slice(0, 2) || call.caller_number?.slice(0, 2) || 'CL').toUpperCase();
  const effectiveAudioUrl = call.recording_url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

  return (
    <div className="w-full bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col h-full overflow-hidden">
      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        {/* Header Title */}
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {STRINGS.DASHBOARD_PANELS.CALL_DETAIL.TITLE}
          </h3>
          <span className="text-[10px] font-semibold text-gray-400">
            ID: {call.id.slice(0, 8)}
          </span>
        </div>

        {/* Profile Card */}
        <div className="flex items-center justify-between gap-3 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E0E7FF] text-[#0066FF] flex items-center justify-center text-xs font-bold shadow-2xs shrink-0">
              {initials}
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 leading-tight">
                {call.caller_name || 'Caller'}
              </h2>
              <p className="text-xs text-gray-500 font-medium">{call.caller_number}</p>
            </div>
          </div>

          <div className="text-right">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              call.outcome?.toLowerCase() === 'booked' || call.outcome?.toLowerCase() === 'resolved'
                ? 'bg-[#E6FBF3] text-[#10B981]'
                : call.outcome?.toLowerCase() === 'transferred'
                ? 'bg-amber-50 text-amber-600'
                : 'bg-blue-50 text-[#0066FF]'
            }`}>
              {call.outcome || 'Completed'}
            </span>
            <p className="text-[10px] text-gray-400 mt-1">
              {call.duration_seconds ? `${call.duration_seconds}s` : 'Recent'} · {call.latency_ms ? `${call.latency_ms}ms` : '<200ms'}
            </p>
          </div>
        </div>

        {/* Audio Recording Player */}
        <div className="bg-gradient-to-br from-blue-50/60 to-indigo-50/40 border border-[#0066FF]/20 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0066FF] animate-pulse"></span>
              <span className="text-xs font-bold text-gray-900">Audio Recording</span>
            </div>
            <button
              onClick={handleSpeedChange}
              title="Change playback speed"
              className="text-[10px] font-bold text-[#0066FF] bg-white border border-[#0066FF]/20 px-2 py-0.5 rounded hover:bg-blue-50 transition-colors"
            >
              {playbackRate}x
            </button>
          </div>

          <audio
            ref={audioRef}
            src={effectiveAudioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            preload="metadata"
          />

          {/* Player Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-[#0066FF] hover:bg-[#0052cc] text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer shrink-0"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16"></rect>
                  <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              )}
            </button>

            <div className="flex-1 space-y-1">
              <input
                type="range"
                min="0"
                max={duration || call.duration_seconds || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-blue-200/60 rounded-lg appearance-none cursor-pointer accent-[#0066FF]"
              />
              <div className="flex justify-between text-[10px] font-semibold text-gray-500">
                <span>{formatSecs(currentTime)}</span>
                <span>{formatSecs(duration || call.duration_seconds)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Call Summary */}
        <div>
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
            {STRINGS.DASHBOARD_PANELS.CALL_DETAIL.SUMMARY}
          </h4>
          <div className="bg-gray-50 rounded-lg p-2.5 text-xs text-gray-800 leading-relaxed border border-gray-100 font-medium">
            {call.summary || 'AI receptionist answered caller inquiry, verified clinic availability, and completed call.'}
          </div>
        </div>

        <div className="w-full h-px bg-gray-100"></div>

        {/* Conversation Transcript Turns */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {STRINGS.DASHBOARD_PANELS.CALL_DETAIL.TRANSCRIPT}
            </h4>
            <span className="text-[10px] font-medium text-gray-400">
              {call.messages?.length || 0} turns
            </span>
          </div>

          <div className="space-y-3">
            {call.messages && call.messages.length > 0 ? (
              call.messages.map((msg, i) => {
                const isAI = msg.role === 'assistant' || (msg as any).speaker === 'AI';
                return (
                  <div
                    key={msg.id || i}
                    className={`flex flex-col ${isAI ? 'items-start max-w-[90%]' : 'items-end self-end max-w-[90%] ml-auto'}`}
                  >
                    <span className={`text-[9px] font-bold mb-0.5 ${isAI ? 'text-[#0066FF] ml-1' : 'text-gray-500 mr-1'}`}>
                      {isAI ? 'Aura AI' : (call.caller_name || 'Caller')}
                    </span>
                    <div className={`rounded-xl px-3 py-2 text-xs text-gray-800 shadow-2xs leading-relaxed ${
                      isAI
                        ? 'bg-[#F0F7FF] rounded-tl-xs border border-blue-50/60'
                        : 'bg-white border border-gray-200 rounded-tr-xs'
                    }`}>
                      {msg.content || (msg as any).text}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg text-center text-xs text-gray-400 italic">
                Transcript messages are recorded in real-time during live calls.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-gray-100 space-y-2 bg-gray-50/50">
        <a
          href={`tel:${call.caller_number}`}
          className="w-full flex items-center justify-center gap-1.5 py-2 bg-[#0066FF] text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors cursor-pointer"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
          Call Back ({call.caller_number})
        </a>

        {call.outcome?.toLowerCase() === 'booked' && (
          <Link
            href="/appointments"
            className="w-full flex items-center justify-center gap-1.5 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-xs font-semibold shadow-2xs hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            View Booked Appointment
          </Link>
        )}
      </div>
    </div>
  );
}
