"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
          
          {/* 1. Left: Brand Wordmark */}
          <Link href="/" className="flex items-center gap-2 group shrink-0" aria-label="AMSh Home">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs group-hover:bg-[#323dfe] transition-colors shrink-0">
              A
            </div>
            <span className="font-sora font-extrabold text-[19px] sm:text-[20px] tracking-tight text-slate-950 whitespace-nowrap">
              AMSh<span className="text-blue-600">.ai</span>
            </span>
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

          {/* 3. Right: Action Controls (Theme button removed) */}
          <div className="flex items-center gap-2 sm:gap-3 font-mono-ui shrink-0">
            {/* LOGIN */}
            <a
              href="http://localhost:3000/login"
              className="hidden sm:inline-flex text-[11.5px] uppercase tracking-[0.12em] font-semibold text-slate-600 hover:text-slate-950 px-2.5 py-1.5 transition-colors whitespace-nowrap"
            >
              Login
            </a>

            {/* CONTACT SALES */}
            <a
              href="#contact"
              className="hidden 2xl:inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-2xs whitespace-nowrap"
            >
              Contact Sales
            </a>

            {/* SIGN UP FOR FREE */}
            <a
              href="http://localhost:3000/login"
              className="inline-flex items-center justify-center rounded-md bg-[#0a0a0a] hover:bg-[#323dfe] text-white px-3.5 sm:px-4 py-2 text-[11px] sm:text-[11.5px] font-bold uppercase tracking-[0.14em] transition-all shadow-xs cursor-pointer whitespace-nowrap"
            >
              Sign Up For Free
            </a>

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
          <div className="pt-3 flex flex-col gap-2.5">
            <a
              href="http://localhost:3000/login"
              className="w-full text-center py-2.5 text-slate-700 bg-slate-50 border border-slate-200 rounded-md uppercase tracking-wider font-semibold text-[11px]"
            >
              Login
            </a>
            <a
              href="http://localhost:3000/login"
              className="w-full text-center py-2.5 text-white bg-[#0a0a0a] rounded-md font-bold uppercase tracking-wider text-[11px]"
            >
              Sign Up For Free
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
