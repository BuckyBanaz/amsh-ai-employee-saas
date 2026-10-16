"use client";

import React from "react";

/**
 * Official AMSh 3D fluid gradient emblem mark.
 * Backed by /landing/amsh_logo.png.
 */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <img
      src="/landing/amsh_logo.png"
      alt="AMSh Logo"
      className={`${className} object-contain shrink-0`}
    />
  );
}

/**
 * Unified Global AMSh Logo Component.
 * Used across Navigation, Footer, Modals, and Documentation.
 */
export function Logo({
  className = "",
  dark = false,
  size = "md",
  showText = true,
}: {
  className?: string;
  dark?: boolean;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}) {
  const markSize =
    size === "sm"
      ? "h-6.5 w-6.5 sm:h-7 sm:w-7"
      : size === "lg"
      ? "h-10 w-10 sm:h-11 sm:w-11"
      : "h-8 w-8 sm:h-8.5 sm:w-8.5";

  const textSize =
    size === "sm"
      ? "text-[16px] sm:text-[17px]"
      : size === "lg"
      ? "text-[22px] sm:text-[24px]"
      : "text-[19px] sm:text-[20px]";

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={markSize} />
      {showText && (
        <span
          className={`font-sora ${textSize} font-extrabold tracking-tight whitespace-nowrap ${
            dark ? "text-white" : "text-slate-950"
          }`}
        >
          AMSh
        </span>
      )}
    </span>
  );
}

export default Logo;
