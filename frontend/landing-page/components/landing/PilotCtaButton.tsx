"use client";

import React from "react";

interface PilotCtaButtonProps {
  children?: React.ReactNode;
  className?: string;
}

export default function PilotCtaButton({
  children = "Apply for 14-Day Pilot →",
  className = "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-7 py-3.5 text-xs uppercase tracking-wider font-bold transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] cursor-pointer",
}: PilotCtaButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("open-pilot-modal"));
        }
      }}
      className={className}
    >
      {children}
    </button>
  );
}
