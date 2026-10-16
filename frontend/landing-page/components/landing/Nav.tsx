"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";

const NAV_LINKS = [
  { href: "/#demo", label: "Voice AI" },
  { href: "/#employees", label: "Virtual Employee" },
  { href: "/#calculator", label: "ROI Calc" },
  { href: "/#global", label: "Global" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/docs", label: "Developer Docs" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all duration-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav aria-label="Main navigation" className="flex h-[60px] items-center justify-between gap-4">
          
          {/* 1. Left: Unified Global Brand Logo */}
          <Link href="/" className="flex items-center group shrink-0" aria-label="AMSh Home">
            <Logo dark={false} size="md" className="group-hover:opacity-90 transition-opacity" />
          </Link>

          {/* 2. Center: Slash-Separated Links (Never Collides) */}
          <ul className="hidden xl:flex items-center gap-3.5 font-mono-ui text-[12px] text-slate-500 whitespace-nowrap">
            {NAV_LINKS.map((item, idx) => (
              <li key={item.label} className="flex items-center gap-3.5 whitespace-nowrap">
                {idx > 0 && (
                  <span className="text-slate-300 font-light select-none text-[13px]">/</span>
                )}
                <a
                  href={item.href}
                  className="hover:text-slate-950 transition-colors duration-150 py-1 whitespace-nowrap"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          {/* 3. Right: Action Controls (Clean Pilot Program Only) */}
          <div className="flex items-center gap-2 sm:gap-3 font-mono-ui shrink-0">
            {/* PILOT PROGRAM BUTTON (Primary High-Priority Blue Button) */}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("open-pilot-modal"));
                }
              }}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-4.5 py-2 text-[11px] sm:text-[11.5px] font-bold uppercase tracking-[0.14em] transition-all shadow-md shadow-blue-500/25 cursor-pointer whitespace-nowrap active:scale-[0.98]"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-200 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              <span>Pilot Program</span>
            </button>

            {/* Mobile / Tablet Toggle (< xl) */}
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="xl:hidden p-2 text-slate-600 hover:text-slate-900 rounded-md border border-slate-200 shrink-0"
              aria-label="Toggle menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {open ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Menu Dropdown */}
      {open && (
        <div className="xl:hidden border-t border-slate-200 bg-white px-4 py-4 font-mono-ui text-xs space-y-2 shadow-lg">
          {NAV_LINKS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block py-2.5 text-slate-700 hover:text-blue-600 border-b border-slate-100 last:border-0 font-medium"
            >
              {item.label}
            </a>
          ))}
          <div className="pt-3">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("open-pilot-modal"));
                }
              }}
              className="w-full text-center py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-md font-bold uppercase tracking-wider text-[11px] shadow-sm flex items-center justify-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Join Pilot Program
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
