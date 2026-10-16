"use client";
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { CallLogItem, DashboardController } from '../../controllers/dashboard.controller';
import { CallDetailSkeleton } from '../common/ShimmerSkeleton';

interface CallDetailPanelProps {
  call: CallLogItem | null;
  loading?: boolean;
}

// 32-bar waveform profile mimicking realistic telephony voice frequencies
const WAVEFORM_BARS = [
  10, 16, 8, 22, 14, 18, 11, 24, 15, 20, 9, 17, 25, 13, 19, 12,
  21, 16, 14, 23, 11, 18, 26, 15, 12, 19, 16, 10, 20, 14, 22, 12,
];

export function CallDetailPanel({ call, loading = false }: CallDetailPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioFailed, setAudioFailed] = useState(false);
  const [takenOver, setTakenOver] = useState(false);
  const [isTakingOver, setIsTakingOver] = useState(false);
  const [takeoverTarget, setTakeoverTarget] = useState<string | null>(null);
  const [takeoverError, setTakeoverError] = useState<string | null>(null);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setAudioFailed(false);
    setTakenOver(false);
    setIsTakingOver(false);
    setTakeoverTarget(null);
    setTakeoverError(null);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.pause();
    }
  }, [call?.id]);

  const handleTakeOver = async () => {
    if (!call?.id) return;
    setIsTakingOver(true);
    setTakeoverError(null);
    try {
      const res = await DashboardController.takeOverCall(call.id, call.business_id);
      setTakenOver(true);
      setTakeoverTarget(res.transferred_to || 'Staff Line');
    } catch (err: any) {
      console.error('[TAKEOVER] Failed:', err);
      setTakeoverError(err?.message || 'Failed to take over call. Please try again.');
    } finally {
      setIsTakingOver(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
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
      const d = audioRef.current.duration;
      setDuration(Number.isFinite(d) && d > 0 ? d : call?.duration_seconds || 0);
    }
  };

  const handleSeekFraction = (fraction: number) => {
    const total = duration || call?.duration_seconds || 0;
    if (!total) return;
    const target = fraction * total;
    setCurrentTime(target);
    if (audioRef.current) {
      audioRef.current.currentTime = target;
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
    if (isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  if (loading) {
    return <CallDetailSkeleton />;
  }

  if (!call) {
    return (
      <div className="w-full bg-white border border-[#E2E8F0] rounded-xl shadow-xs flex flex-col items-center justify-center p-8 min-h-[460px] text-center">
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

  const audioUrl = call.recording_url || null;
  const hasAudio = !!audioUrl && !audioFailed;
  const isLive = call.outcome?.toLowerCase() === 'live';
  const totalDuration = duration || call.duration_seconds || 0;
  const playedFraction = totalDuration > 0 ? Math.min(1, Math.max(0, currentTime / totalDuration)) : 0;

  // Telephony stream label
  const streamProvider =
    call.channel === 'whatsapp'
      ? 'WhatsApp Voice Note'
      : call.is_test
        ? 'AI Studio WebRTC Stream'
        : call.caller_number?.startsWith('+91')
          ? 'Exotel Telephony Stream'
          : 'Twilio Voice Stream';

  return (
    <div className="w-full bg-white border border-[#E2E8F0] rounded-xl shadow-xs flex flex-col max-h-[calc(100vh-5.5rem)] overflow-hidden">
      {/* Scrollable Body */}
      <div className="p-4 flex-1 overflow-y-auto space-y-3.5 scrollbar-hide">
        {/* Header & Status (Admin Style) */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div>
            <h3 className="text-[14px] font-bold text-[#0F172A] tracking-tight">
              {isLive ? 'Active Call Inspection' : 'Call Inspection'}
            </h3>
            <span className="text-[11px] font-semibold text-[#0066FF] flex items-center gap-1.5 mt-0.5">
              Caller: {call.caller_name ? `${call.caller_name} (${call.caller_number})` : call.caller_number}
              {call.is_test && (
                <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                  Test Call
                </span>
              )}
            </span>
          </div>

          <div className="text-right flex items-center gap-1.5">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                LIVE
              </span>
            ) : (
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${call.outcome?.toLowerCase() === 'booked' || call.outcome?.toLowerCase() === 'resolved'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : call.outcome?.toLowerCase() === 'transferred'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-blue-50 text-[#0066FF] border-blue-200'
                  }`}
              >
                {call.outcome || 'RESOLVED'}
              </span>
            )}
          </div>
        </div>

        {/* Live Call Alert & Takeover Banner (Matches Image 1) */}
        {isLive && (
          <div className="p-3 bg-red-50/80 border border-red-200 rounded-xl space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping shrink-0" />
              <p className="text-[12px] font-semibold text-red-800 leading-tight">
                This call is in progress. The clinic&apos;s own dashboard can take it over.
              </p>
            </div>
            {takenOver ? (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 shrink-0">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <div className="text-[11px] font-bold text-emerald-800">
                  <span>Connected! AI silenced — call handed over to staff line: </span>
                  <span className="font-extrabold underline ml-1">{takeoverTarget}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={handleTakeOver}
                  disabled={isTakingOver}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {isTakingOver ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Transferring call to staff line...</span>
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                      </svg>
                      <span>Take Over Call Now</span>
                    </>
                  )}
                </button>
                {takeoverError && (
                  <p className="text-[10px] text-red-600 font-medium text-center">{takeoverError}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* AI Intent & Summary (Admin Card Style - Image 1) */}
        <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0066FF]">
              AI Intent & Summary
            </span>
            {call.sentiment && (
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border capitalize ${call.sentiment === 'positive'
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : call.sentiment === 'negative'
                      ? 'text-red-700 bg-red-50 border-red-200'
                      : 'text-gray-600 bg-white border-gray-200'
                  }`}
              >
                {call.sentiment}
              </span>
            )}
          </div>
          <p className="text-[12px] text-[#0F172A] leading-relaxed font-medium">
            {call.summary ||
              (isLive
                ? 'Caller is speaking with the AI receptionist. A complete call summary will be compiled once the session finishes.'
                : 'Summary is being processed; click refresh in a moment.')}
          </p>
          {call.intent && (
            <div className="pt-1 flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Intent:</span>
              <span className="text-[11px] font-semibold text-gray-700 bg-white border border-[#BFDBFE] rounded px-2 py-0.5 capitalize">
                {call.intent}
              </span>
            </div>
          )}
        </div>

        {/* Audio Waveform Simulator / Real Player (Admin Card Style - Image 1) */}
        <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
          {hasAudio && (
            <audio
              ref={audioRef}
              src={audioUrl!}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              onError={() => {
                setAudioFailed(true);
                setIsPlaying(false);
              }}
              preload="metadata"
            />
          )}

          <div className="flex items-center gap-2.5">
            <button
              onClick={hasAudio ? togglePlay : undefined}
              disabled={!hasAudio}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-xs transition-colors shrink-0 ${hasAudio
                  ? 'bg-[#0066FF] hover:bg-[#0052cc] cursor-pointer'
                  : 'bg-gray-300 cursor-not-allowed opacity-60'
                }`}
              title={isPlaying ? 'Pause' : 'Play Audio Stream'}
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

            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-[10px] text-[#475569] mb-1 font-semibold">
                <span>
                  {formatSecs(currentTime)} / {formatSecs(totalDuration)}
                </span>
                <span className="text-gray-400 font-medium truncate ml-2">
                  {streamProvider}
                </span>
              </div>

              {/* Dynamic Waveform Bars with Seek click */}
              <div
                className="flex items-end gap-[2px] h-6 cursor-pointer select-none"
                onClick={(e) => {
                  if (!hasAudio) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const fraction = Math.max(0, Math.min(1, clickX / rect.width));
                  handleSeekFraction(fraction);
                }}
              >
                {WAVEFORM_BARS.map((h, i) => {
                  const barFraction = i / WAVEFORM_BARS.length;
                  const isPlayed = barFraction <= playedFraction;
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-sm transition-colors duration-150 ${isPlayed ? 'bg-[#0066FF]' : 'bg-[#E2E8F0]'
                        }`}
                      style={{ height: `${h}px` }}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              {hasAudio ? (
                <>
                  <button
                    onClick={handleSpeedChange}
                    title="Change playback speed"
                    className="text-[9px] font-bold text-[#0066FF] bg-white border border-[#0066FF]/20 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors"
                  >
                    {playbackRate}x
                  </button>
                  <a
                    href={audioUrl!}
                    download={`call_${call.id}.mp3`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-semibold text-[#0066FF] hover:underline"
                  >
                    Download
                  </a>
                </>
              ) : (
                <span className="text-[9px] text-gray-400 font-medium">No recording</span>
              )}
            </div>
          </div>
        </div>

        {/* Live Conversation Transcript (Admin Card Style - Image 1) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
              Live Conversation Transcript
            </span>
            <span className="text-[10px] font-semibold text-gray-400">
              {call.messages?.length || 0} turns
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {call.messages && call.messages.length > 0 ? (
              call.messages.map((item, idx) => {
                const isAI =
                  item.role === 'assistant' ||
                  (item as any).speaker === 'AI' ||
                  (item as any).role === 'ai';
                const speakerName = isAI
                  ? 'AMSh Ai (AI Receptionist)'
                  : call.caller_name || 'Caller';
                const textContent = item.content || (item as any).text;

                return (
                  <div
                    key={item.id || idx}
                    className={`p-2.5 rounded-lg text-[12px] leading-relaxed border ${isAI
                        ? 'bg-[#EFF6FF] border-[#BFDBFE]/60 text-[#0F172A]'
                        : 'bg-gray-50 border-[#E2E8F0] text-[#0F172A]'
                      }`}
                  >
                    <span
                      className={`font-bold mb-1 flex items-center gap-1.5 ${isAI ? 'text-[#0066FF]' : 'text-[#475569]'
                        }`}
                    >
                      {speakerName}:
                    </span>
                    <p className="whitespace-pre-wrap">{textContent}</p>
                  </div>
                );
              })
            ) : (
              <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-center text-xs text-gray-400 italic">
                Transcript messages are recorded in real-time during live calls.
              </div>
            )}
          </div>
        </div>

        {/* Technical Diagnostics Metadata (Admin Style) */}
        <div className="pt-2 border-t border-[#E2E8F0] space-y-1 text-[11px] text-[#64748B]">
          <div className="flex justify-between">
            <span>Call ID:</span>
            <span className="font-mono text-gray-800">{call.id.slice(0, 12)}</span>
          </div>
          <div className="flex justify-between">
            <span>Duration & Latency:</span>
            <span className="font-medium text-gray-800">
              {call.duration_seconds || 0}s · {call.latency_ms || 180}ms
            </span>
          </div>
        </div>
      </div>

      {/* Pinned Footer Actions */}
      <div className="p-3 border-t border-[#E2E8F0] bg-gray-50/70 space-y-2 shrink-0">
        <a
          href={`tel:${call.caller_number}`}
          className="w-full flex items-center justify-center gap-1.5 py-2 bg-[#0066FF] hover:bg-[#0052cc] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
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
