// AMSh brand mark: the console's blue voice-bar tile, refined — a soft
// gradient tile with a live waveform glyph, plus the wordmark.
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="amsh-tile" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2F7BFF" />
          <stop offset="1" stopColor="#0047E0" />
        </linearGradient>
        <linearGradient id="amsh-sheen" x1="20" y1="0" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#amsh-tile)" />
      <rect width="40" height="22" rx="11" fill="url(#amsh-sheen)" />
      <rect x="0.5" y="0.5" width="39" height="39" rx="10.5" fill="none" stroke="#fff" strokeOpacity="0.18" />
      <g stroke="#fff" strokeWidth="3.2" strokeLinecap="round">
        <path d="M11 17.5v5" />
        <path d="M16.5 12v16" />
        <path d="M22 8.5v23" strokeOpacity="0.95" />
        <path d="M27.5 14.5v11" />
      </g>
      <circle cx="31.5" cy="11" r="2.4" fill="#5EEAD4" />
    </svg>
  );
}

export function Logo({ className, dark = true }: { className?: string; dark?: boolean }) {
  return (
    <span className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark />
      <span className={`font-[family-name:var(--font-display)] text-[1.35rem] font-semibold tracking-[-0.02em] ${dark ? "text-white" : "text-slate-950"}`}>
        AMSh
      </span>
    </span>
  );
}
