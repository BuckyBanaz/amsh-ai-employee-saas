"use client";
import React from 'react';

interface GlobalLoaderProps {
  label?: string;
  sublabel?: string;
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
  className?: string;
}

export function GlobalLoader({
  label = "Loading AI Receptionist",
  sublabel = "Synchronizing voice models & settings...",
  size = 'md',
  className = '',
}: GlobalLoaderProps) {
  if (size === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-2xl p-7 max-w-[300px] w-full flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
          <LoaderCardContent label={label} sublabel={sublabel} />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 w-full min-h-[calc(100vh-160px)] flex items-center justify-center p-4 my-auto ${className}`}>
      <div className="bg-white border border-gray-100/90 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.08)] p-7 max-w-[310px] w-full flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
        <LoaderCardContent label={label} sublabel={sublabel} />
      </div>
    </div>
  );
}

function LoaderCardContent({ label, sublabel }: { label?: string; sublabel?: string }) {
  return (
    <>
      {/* Glowing Ambient Badge with Equalizer */}
      <div className="relative mb-3.5 flex items-center justify-center">
        {/* Soft Ambient Glow Halo */}
        <div className="absolute w-14 h-14 rounded-full bg-blue-400/20 blur-lg animate-pulse" />
        
        <div className="relative w-12 h-12 rounded-xl bg-gradient-to-b from-blue-50 to-white border border-blue-100/80 shadow-xs flex items-center justify-center gap-1 px-2.5">
          <span className="w-1 h-5 rounded-full bg-gradient-to-t from-[#0066FF] to-[#60A5FA] animate-voice-1" />
          <span className="w-1 h-7 rounded-full bg-gradient-to-t from-[#0066FF] to-[#38BDF8] animate-voice-2" />
          <span className="w-1 h-8 rounded-full bg-gradient-to-t from-[#2563EB] to-[#60A5FA] animate-voice-3" />
          <span className="w-1 h-7 rounded-full bg-gradient-to-t from-[#0066FF] to-[#38BDF8] animate-voice-4" />
          <span className="w-1 h-5 rounded-full bg-gradient-to-t from-[#0066FF] to-[#60A5FA] animate-voice-5" />
        </div>
      </div>

      {/* Title */}
      {label && (
        <div className="flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
          <h3 className="text-xs font-bold text-gray-900 tracking-tight">
            {label}
          </h3>
        </div>
      )}

      {/* Sublabel */}
      {sublabel && (
        <p className="mt-1 text-[11px] text-gray-500 leading-tight">
          {sublabel}
        </p>
      )}

      {/* Smooth Shimmer Progression Track */}
      <div className="mt-3.5 w-24 h-1 bg-gray-100 rounded-full overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0066FF] to-transparent w-full animate-shimmer-slide" />
      </div>
    </>
  );
}

export default GlobalLoader;
