"use client";
import React from 'react';

interface GlobalLoaderProps {
  label?: string;
  message?: string;
  sublabel?: string;
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
  className?: string;
}

export function GlobalLoader({
  label,
  message,
  sublabel = "Synchronizing voice models & live engine...",
  size = 'md',
  className = '',
}: GlobalLoaderProps) {
  // Support either label or message prop for seamless compatibility
  const displayLabel = label || message || "Loading AI Receptionist";

  if (size === 'fullscreen') {
    return (
      <div 
        role="status" 
        aria-live="polite" 
        aria-label={displayLabel}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 backdrop-blur-md p-4 animate-in fade-in duration-200"
      >
        <span className="sr-only">{displayLabel}</span>
        <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-2xl shadow-[0_24px_60px_-15px_rgba(0,102,255,0.22)] p-7 max-w-[320px] w-full flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
          <LoaderCardContent label={displayLabel} sublabel={sublabel} />
        </div>
      </div>
    );
  }

  const containerHeight =
    size === 'sm'
      ? 'min-h-[140px] py-3'
      : size === 'lg'
      ? 'min-h-[460px] py-12'
      : 'min-h-[300px] py-6';

  return (
    <div 
      role="status" 
      aria-live="polite" 
      aria-label={displayLabel}
      className={`flex-1 w-full flex items-center justify-center p-4 my-auto ${containerHeight} ${className}`}
    >
      <span className="sr-only">{displayLabel}</span>
      <div className={`bg-white/95 backdrop-blur-xl border border-slate-200/70 rounded-2xl shadow-[0_16px_40px_-12px_rgba(0,102,255,0.12)] w-full flex flex-col items-center text-center transition-all duration-300 ${
        size === 'sm' ? 'p-5 max-w-[280px]' : 'p-6 sm:p-7 max-w-[320px]'
      }`}>
        <LoaderCardContent label={displayLabel} sublabel={sublabel} compact={size === 'sm'} />
      </div>
    </div>
  );
}

function LoaderCardContent({
  label,
  sublabel,
  compact = false,
}: {
  label: string;
  sublabel?: string;
  compact?: boolean;
}) {
  return (
    <>
      {/* 21st.dev Multi-Ring AI Sonic Capsule */}
      <div className="relative mb-3 flex items-center justify-center">
        {/* Radar Pulse Wave (Sonar Echo) */}
        <div 
          aria-hidden="true"
          className="absolute w-16 h-16 rounded-full border border-blue-400/40 bg-blue-500/10 animate-radar-wave pointer-events-none" 
        />

        {/* Ambient Breathing Glow Halo */}
        <div 
          aria-hidden="true" 
          className="absolute w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600/20 via-indigo-500/15 to-cyan-400/20 blur-xl animate-ambient-breathe pointer-events-none" 
        />

        {/* Outer Orbital Ring with Satellite Node */}
        <div 
          aria-hidden="true"
          className="absolute w-[62px] h-[62px] rounded-full border border-blue-400/30 border-dashed animate-orbit-slow pointer-events-none flex items-start justify-center"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF] shadow-[0_0_8px_#0066FF] -mt-1" />
        </div>

        {/* Inner Counter-Rotating Gradient Ring */}
        <div 
          aria-hidden="true"
          className="absolute w-[52px] h-[52px] rounded-full border border-cyan-400/40 border-t-transparent border-l-transparent animate-orbit-reverse pointer-events-none"
        />

        {/* Core Frosted Equalizer Capsule */}
        <div className="relative w-12 h-12 rounded-xl bg-gradient-to-b from-blue-50/90 to-white border border-blue-100/90 shadow-xs flex items-center justify-center gap-[3px] px-2.5 z-10">
          <span className="w-1 h-3 rounded-full bg-gradient-to-t from-[#0066FF] to-[#60A5FA] animate-voice-1" />
          <span className="w-1 h-5 rounded-full bg-gradient-to-t from-[#0066FF] to-[#38BDF8] animate-voice-2" />
          <span className="w-1 h-6.5 rounded-full bg-gradient-to-t from-[#2563EB] to-[#60A5FA] animate-voice-3" />
          <span className="w-1 h-8 rounded-full bg-gradient-to-t from-[#0066FF] to-[#06B6D4] animate-voice-4" />
          <span className="w-1 h-6.5 rounded-full bg-gradient-to-t from-[#2563EB] to-[#60A5FA] animate-voice-5" />
          <span className="w-1 h-5 rounded-full bg-gradient-to-t from-[#0066FF] to-[#38BDF8] animate-voice-6" />
          <span className="w-1 h-3 rounded-full bg-gradient-to-t from-[#0066FF] to-[#60A5FA] animate-voice-7" />
        </div>
      </div>

      {/* Live AI Pulse Indicator Badge */}
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mb-2 rounded-full bg-blue-50/90 border border-blue-100 text-[10px] font-semibold text-blue-700 tracking-wide uppercase shadow-2xs">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
        </span>
        <span>AI Receptionist</span>
      </div>

      {/* Title */}
      <h3 className="text-xs font-bold text-gray-900 tracking-tight leading-snug">
        {label}
      </h3>

      {/* Subtitle / Status details */}
      {sublabel && !compact && (
        <p className="mt-1 text-[11px] text-gray-500 font-normal leading-relaxed max-w-[240px]">
          {sublabel}
        </p>
      )}

      {/* Precision Shimmer Progress Track */}
      <div 
        aria-hidden="true" 
        className="mt-3.5 w-24 h-1 bg-slate-100 rounded-full overflow-hidden relative shadow-inner"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0066FF] to-transparent w-full animate-shimmer-slide" />
      </div>
    </>
  );
}

export default GlobalLoader;
