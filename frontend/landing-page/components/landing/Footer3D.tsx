"use client";

import React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Logo } from "./Logo";

const DISPLAY = "font-sora";
const FOCUS_DARK =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

export default function Footer3D() {
  const currentYear = new Date().getFullYear();

  const usefulLinks = [
    { label: "AI Calling Agent", href: "#demo" },
    { label: "WhatsApp CRM & Triage", href: "#whatsapp" },
    { label: "Multilingual Voice Engine", href: "#demo" },
    { label: "2-Way Calendar Booking", href: "#features" },
    { label: "Emergency Escalation Gate", href: "#features" },
    { label: "Call Recordings & Logs", href: "#product" },
    { label: "WhatsApp Cloud API", href: "#integrations" },
  ];

  const industries = [
    { label: "Dental Clinics", href: "#features" },
    { label: "Dermatology & Aesthetics", href: "#features" },
    { label: "Multi-Specialty Hospitals", href: "#features" },
    { label: "Physiotherapy & Rehab", href: "#features" },
    { label: "Eye Care & Ophthalmology", href: "#features" },
    { label: "Women's & Pediatrics", href: "#features" },
    { label: "Diagnostic Centers", href: "#features" },
  ];

  const resources = [
    { label: "Developer Docs & APIs", href: "/docs" },
    { label: "REST Endpoints Table", href: "/docs#endpoints" },
    { label: "Webhook Integration", href: "/docs#webhooks" },
    { label: "Twilio Stream Gateway", href: "/docs#telephony" },
    { label: "Clinician Case Studies", href: "#testimonials" },
    { label: "Pricing & Plans", href: "#pricing" },
    { label: "Frequently Asked Questions", href: "#faq" },
  ];

  return (
    <footer className="relative overflow-hidden bg-[#030612] pt-20 pb-12 border-t border-white/10 text-slate-400">
      
      {/* 3D Perspective Glow & Horizon Lighting */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 -top-24 h-[400px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-b from-indigo-600/20 via-cyan-500/10 to-transparent blur-[120px]" />
        
        {/* 3D Angled Grid Floor at Top Horizon */}
        <div
          className="absolute inset-x-0 -top-20 h-44 opacity-25"
          style={{
            backgroundImage:
              "linear-gradient(rgba(34, 211, 238, 0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.25) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            transform: "perspective(500px) rotateX(65deg)",
            transformOrigin: "top center",
            maskImage: "linear-gradient(to bottom, transparent, #000 30%, transparent 95%)",
          }}
        />

        {/* 3D Watermark Branding in Background */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 select-none pointer-events-none opacity-[0.03]">
          <span className={`${DISPLAY} text-[16rem] sm:text-[22rem] font-black tracking-tighter text-white block leading-none`}>
            AMSh
          </span>
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        
        {/* Main 5-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-16">
          
          {/* ========================================================= */}
          {/* COLUMN 1: BRAND, TAGLINE, SOCIALS & 3D PARTNER BADGES */}
          {/* ========================================================= */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-6">
            <div>
              <Link href="/" className={`inline-block ${FOCUS_DARK}`} aria-label="AMSh home">
                <Logo />
              </Link>
              <p className="mt-4 text-sm leading-relaxed text-slate-300 max-w-sm">
                Your clinic&apos;s 24/7 AI employee answering patient phone calls, WhatsApp triage &amp; Google Calendar appointments — alongside your team.
              </p>
            </div>

            {/* Follow Us 3D Embossed Social Buttons */}
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Follow Us
              </span>
              <div className="flex items-center gap-2.5">
                {[
                  {
                    name: "YouTube",
                    href: "https://youtube.com",
                    icon: (
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                    ),
                  },
                  {
                    name: "X",
                    href: "https://x.com",
                    icon: (
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    ),
                  },
                  {
                    name: "Instagram",
                    href: "https://instagram.com",
                    icon: (
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    ),
                  },
                  {
                    name: "LinkedIn",
                    href: "https://linkedin.com",
                    icon: (
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                      </svg>
                    ),
                  },
                ].map((s) => (
                  <motion.a
                    key={s.name}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.name}
                    whileHover={{ y: -3, scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-slate-900/90 text-slate-300 shadow-[0_8px_16px_-4px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.15)] transition-colors hover:border-cyan-400/40 hover:text-cyan-300 hover:shadow-cyan-500/20"
                  >
                    {s.icon}
                  </motion.a>
                ))}
              </div>
            </div>

            {/* 3D Meta & Infrastructure Partner Badges */}
            <div className="pt-2 flex flex-col gap-2.5">
              {/* Meta Business Partner Badge */}
              <div className="flex items-center gap-3 p-3 rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.04] to-transparent shadow-[0_10px_20px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] w-fit backdrop-blur-md">
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="#0081FB">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                <div className="flex flex-col">
                  <span className={`${DISPLAY} text-xs font-bold text-white tracking-wide flex items-center gap-1`}>
                    Meta <span className="font-normal text-slate-300">Business Partner</span>
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    Official WhatsApp Cloud API
                  </span>
                </div>
              </div>

              {/* Twilio & Google Partner Chip */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl border border-white/5 bg-white/[0.02] w-fit">
                <div className="flex items-center -space-x-1.5">
                  <div className="h-5 w-5 rounded-full bg-slate-900 border border-white/15 flex items-center justify-center p-0.5">
                    <svg viewBox="0 0 24 24" className="h-full w-full" fill="#F22F46">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.14a7.86 7.86 0 1 1 0 15.72 7.86 7.86 0 0 1 0-15.72zm-2.95 3.14a1.81 1.81 0 1 0 0 3.62 1.81 1.81 0 0 0 0-3.62zm5.9 0a1.81 1.81 0 1 0 0 3.62 1.81 1.81 0 0 0 0-3.62zm-5.9 5.9a1.81 1.81 0 1 0 0 3.62 1.81 1.81 0 0 0 0-3.62zm5.9 0a1.81 1.81 0 1 0 0 3.62 1.81 1.81 0 0 0 0-3.62z" />
                    </svg>
                  </div>
                  <div className="h-5 w-5 rounded-full bg-slate-900 border border-white/15 flex items-center justify-center p-0.5">
                    <svg viewBox="0 0 24 24" className="h-full w-full">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                </div>
                <span className="text-[11px] text-slate-300 font-medium">
                  Twilio SIP &bull; Google Cloud Tier
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* COLUMN 2: USEFUL LINKS */}
          {/* ========================================================= */}
          <div className="lg:col-span-2">
            <h3 className={`${DISPLAY} text-sm font-semibold text-white tracking-wide`}>
              Useful Links
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {usefulLinks.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className={`text-slate-400 hover:text-white transition-colors duration-150 rounded ${FOCUS_DARK}`}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* ========================================================= */}
          {/* COLUMN 3: CLINIC PRACTICES / VERTICALS */}
          {/* ========================================================= */}
          <div className="lg:col-span-2">
            <h3 className={`${DISPLAY} text-sm font-semibold text-white tracking-wide`}>
              Practices
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {industries.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className={`text-slate-400 hover:text-white transition-colors duration-150 rounded ${FOCUS_DARK}`}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* ========================================================= */}
          {/* COLUMN 4: DEVELOPERS & RESOURCES */}
          {/* ========================================================= */}
          <div className="lg:col-span-2">
            <h3 className={`${DISPLAY} text-sm font-semibold text-white tracking-wide`}>
              Resources &amp; Docs
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {resources.map((l) => (
                <li key={l.label}>
                  {l.href.startsWith("/") ? (
                    <Link
                      href={l.href}
                      className={`text-slate-400 hover:text-cyan-300 transition-colors duration-150 rounded ${FOCUS_DARK}`}
                    >
                      {l.label}
                    </Link>
                  ) : (
                    <a
                      href={l.href}
                      className={`text-slate-400 hover:text-cyan-300 transition-colors duration-150 rounded ${FOCUS_DARK}`}
                    >
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* ========================================================= */}
          {/* COLUMN 5: CONTACT US */}
          {/* ========================================================= */}
          <div className="lg:col-span-2">
            <h3 className={`${DISPLAY} text-sm font-semibold text-white tracking-wide`}>
              Contact Us
            </h3>
            
            <ul className="mt-4 space-y-3.5 text-sm">
              <li>
                <a
                  href="tel:+18005550100"
                  className="flex items-center gap-2.5 text-slate-300 hover:text-white transition-colors group"
                >
                  <svg className="h-4 w-4 text-cyan-400 group-hover:text-cyan-300 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>+1 (800) 555-0100</span>
                </a>
              </li>

              <li>
                <a
                  href="mailto:help@amsh.ai"
                  className="flex items-center gap-2.5 text-slate-300 hover:text-white transition-colors group"
                >
                  <svg className="h-4 w-4 text-cyan-400 group-hover:text-cyan-300 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>help@amsh.ai</span>
                </a>
              </li>

              <li>
                <a
                  href="https://wa.me/919876543210"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 text-slate-300 hover:text-emerald-400 transition-colors group"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#25D366] shrink-0" aria-hidden="true">
                    <path d="M19.05 4.91A9.816 9.816 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01zm-7.01 15.24c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.264 8.264 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.183 8.183 0 0 1 2.41 5.83c.02 4.54-3.68 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.98-.15.17-.29.19-.54.07-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.17-.25.25-.41.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.66.3-.23.25-.86.84-.86 2.06s.88 2.39 1 2.56c.12.17 1.73 2.64 4.19 3.7.59.25 1.05.4 1.41.51.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.17-.48-.29z" />
                  </svg>
                  <span>Chat on WhatsApp</span>
                </a>
              </li>
            </ul>

            {/* Subtle Uptime Status */}
            <div className="mt-8 pt-4 border-t border-white/10 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Systems 99.99% Operational
              </span>
            </div>
          </div>

        </div>

        {/* ========================================================= */}
        {/* BOTTOM BAR: COPYRIGHT & LEGAL LINKS */}
        {/* ========================================================= */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p className="text-center sm:text-left">
            &copy; Copyright {currentYear} AMSh Cloudtech Pvt Ltd. All Rights Reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-slate-300 transition-colors">Terms &amp; Conditions</a>
            <a href="#hipaa" className="hover:text-slate-300 transition-colors">HIPAA &amp; Security</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
