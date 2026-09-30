"use client";
import React from 'react';
import { InlineSpinner } from './ShimmerSkeleton';

/**
 * Lightweight, non-intrusive loader fallback
 */
export function GlobalLoader({
  message = "Loading...",
  label,
  sublabel,
  size = "md",
  className = "",
}: {
  message?: string;
  label?: string;
  sublabel?: string;
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
  className?: string;
  [key: string]: any;
}) {
  const text = label || message;
  return (
    <div className={`flex items-center justify-center gap-2 py-4 text-xs text-gray-500 font-medium ${className}`}>
      <InlineSpinner className="w-4 h-4 text-[#0066FF]" />
      {text && <span>{text}</span>}
    </div>
  );
}

export default GlobalLoader;
