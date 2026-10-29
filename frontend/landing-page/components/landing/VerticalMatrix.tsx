"use client";

import React, { useState } from "react";
import Link from "next/link";

export type VerticalId = "clinic" | "education" | "salon" | "wellness";

interface VerticalConfig {
  id: VerticalId;
  label: string;
  badge: string;
  icon: string;
  tagline: string;
  headline: string;
  description: string;
  pageHref: string;
  color: {
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    accent: string;
    gradient: string;
  };
  stats: {
    value: string;
    label: string;
  }[];
  workflows: {
    title: string;
    desc: string;
    icon: string;
  }[];
  dialogue: {
    speaker: "caller" | "ai";
    name: string;
    text: string;
    actionBadge?: string;
  }[];
  targetBusinesses: string[];
}

const VERTICALS: VerticalConfig[] = [
  {
    id: "clinic",
    label: "Healthcare & Clinics",
    badge: "Medical Grade",
    icon: "🏥",
    tagline: "CLINICAL TRIAGE & CALENDAR SCHEDULING",
    headline: "Never lose another patient to a busy signal or unanswered line.",
    description:
      "AMSh acts as your clinic's primary front-desk employee. It answers on the 1st ring, triages patient symptoms with deterministic emergency gates, locks appointments across physician rotas, and sends WhatsApp pre-visit instructions.",
    pageHref: "/ai-receptionist-for-clinics",
    color: {
      badgeBg: "bg-blue-50",
      badgeText: "text-blue-700",
      badgeBorder: "border-blue-200",
      accent: "text-blue-600",
      gradient: "from-blue-600 to-indigo-600",
    },
    stats: [
      { value: "0 sec", label: "Caller hold time" },
      { value: "40%", label: "Fewer patient no-shows" },
      { value: "100%", label: "EHR & Google Calendar sync" },
    ],
    workflows: [
      {
        icon: "🩺",
        title: "Multi-Doctor Rota Management",
        desc: "Routes patients by symptom, doctor specialty, room availability, and insurance network.",
      },
      {
        icon: "🚨",
        title: "Clinical Emergency Detection",
        desc: "Strict deterministic gatekeepers instantly bridge acute emergencies to 911 or on-call doctors.",
      },
      {
        icon: "💬",
        title: "WhatsApp Intake & Fasting Notes",
        desc: "Sends automated pre-consultation intake forms and appointment reminders directly to patient smartphones.",
      },
    ],
    dialogue: [
      {
        speaker: "caller",
        name: "Jennifer Robinson",
        text: "Hi, do you have any openings for a dental cleaning with Dr. Harris this Thursday afternoon?",
      },
      {
        speaker: "ai",
        name: "AMSh Clinical AI",
        text: "Hello Jennifer! Dr. Harris has two slots open this Thursday: 2:15 PM and 4:30 PM. Which one works best for you?",
        actionBadge: "EHR Rota: Dr. Harris verified · Slots locked",
      },
      {
        speaker: "caller",
        name: "Jennifer Robinson",
        text: "Let's do 4:30 PM please. I have Delta Dental insurance.",
      },
      {
        speaker: "ai",
        name: "AMSh Clinical AI",
        text: "Perfect! You're booked for 4:30 PM this Thursday. We accept Delta Dental. I've sent the intake form and clinic directions to your WhatsApp.",
        actionBadge: "Calendar synced · WhatsApp confirmation dispatched",
      },
    ],
    targetBusinesses: [
      "Dental Practices",
      "Medical & Dermatology Clinics",
      "Physiotherapy & Sports Rehab",
      "Pediatrics & Family Medicine",
    ],
  },
  {
    id: "education",
    label: "Education & Academics",
    badge: "Admissions & Campus",
    icon: "🎓",
    tagline: "STUDENT ENQUIRIES & ADMISSIONS TOUR ROUTING",
    headline: "Capture every student enquiry and book campus tours around the clock.",
    description:
      "Prospective students and parents call at all hours. AMSh answers questions on tuition fees, admission deadlines, program eligibility, and books 1-on-1 advisor sessions or campus visit tours into your CRM instantly.",
    pageHref: "/ai-receptionist-for-education",
    color: {
      badgeBg: "bg-violet-50",
      badgeText: "text-violet-700",
      badgeBorder: "border-violet-200",
      accent: "text-violet-600",
      gradient: "from-violet-600 to-purple-600",
    },
    stats: [
      { value: "3.4x", label: "Faster lead response time" },
      { value: "88%", label: "Admissions tour completion" },
      { value: "24/7", label: "Parent & applicant coverage" },
    ],
    workflows: [
      {
        icon: "📚",
        title: "Curriculum & Fee FAQ",
        desc: "Instant accurate answers about prerequisites, tuition structure, scholarships, and term dates.",
      },
      {
        icon: "🏛️",
        title: "Campus Tour & Visit Booking",
        desc: "Coordinates group campus walks and parent open days with calendar confirmations and parking maps.",
      },
      {
        icon: "🎓",
        title: "Admissions CRM Sync",
        desc: "Pushes prospective student contact details, test scores, and program interests into Salesforce/HubSpot.",
      },
    ],
    dialogue: [
      {
        speaker: "caller",
        name: "David Kim (Applicant)",
        text: "Hello, what is the application deadline for the International Business BSc program for Fall 2026?",
      },
      {
        speaker: "ai",
        name: "AMSh Education AI",
        text: "Hi David! Early applications close November 15th, and regular admissions close February 1st. Would you like to schedule an online counsellor session or join our Saturday campus tour?",
        actionBadge: "Program KB queried: BSc Intl Business · Fall 2026",
      },
      {
        speaker: "caller",
        name: "David Kim (Applicant)",
        text: "I'd love to join the Saturday campus tour with my parents.",
      },
      {
        speaker: "ai",
        name: "AMSh Education AI",
        text: "Excellent! I have reserved 3 spots for this Saturday at 11:00 AM. I just emailed you the visitor parking permit and tour itinerary.",
        actionBadge: "Admissions CRM updated · 3 tour passes confirmed",
      },
    ],
    targetBusinesses: [
      "Universities & Colleges",
      "K-12 Private & International Schools",
      "Coaching & Test Prep Academies",
      "Vocational & EdTech Institutes",
    ],
  },
  {
    id: "salon",
    label: "Salons & Personal Care",
    badge: "Beauty & Grooming",
    icon: "✂️",
    tagline: "STYLIST MATCHING & APPOINTMENT DEPOSITS",
    headline: "Fill every salon chair while your stylists focus on creating art.",
    description:
      "Stylists can't stop mid-haircut to answer the phone. AMSh books clients with their preferred stylist, explains service durations, answers pricing questions, and sends WhatsApp deposit links to eliminate costly no-shows.",
    pageHref: "/ai-receptionist-for-salons",
    color: {
      badgeBg: "bg-amber-50",
      badgeText: "text-amber-800",
      badgeBorder: "border-amber-200",
      accent: "text-amber-600",
      gradient: "from-amber-500 to-rose-500",
    },
    stats: [
      { value: "0", label: "Interrupted haircuts" },
      { value: "52%", label: "Fewer last-minute cancellations" },
      { value: "+30%", label: "After-hours appointment bookings" },
    ],
    workflows: [
      {
        icon: "💇",
        title: "Stylist & Chair Allocation",
        desc: "Pairs clients with their favourite stylist or colour specialist based on exact service durations.",
      },
      {
        icon: "💳",
        title: "Deposit Collection via WhatsApp",
        desc: "Dispatches automated Stripe payment links for high-value services (balayage, keratin) to secure the slot.",
      },
      {
        icon: "💅",
        title: "Add-On & Package Upselling",
        desc: "Politely recommends toner treatments, deep conditioning, or nail upgrades during booking.",
      },
    ],
    dialogue: [
      {
        speaker: "caller",
        name: "Sarah Jenkins",
        text: "Hi! Can I book a full balayage and trim with Chloe this Saturday afternoon?",
      },
      {
        speaker: "ai",
        name: "AMSh Salon AI",
        text: "Hi Sarah! Chloe has an opening at 1:30 PM this Saturday. Balayage and haircut will take approximately 2.5 hours. Shall I reserve that chair for you?",
        actionBadge: "Chair Rota: Stylist Chloe · 150 min block available",
      },
      {
        speaker: "caller",
        name: "Sarah Jenkins",
        text: "Yes, that's perfect. How much is the deposit?",
      },
      {
        speaker: "ai",
        name: "AMSh Salon AI",
        text: "The deposit is $40, which applies toward your total. I just texted you the secure payment link via WhatsApp. Once confirmed, Chloe's station is yours!",
        actionBadge: "Fresha/Square booked · WhatsApp Stripe deposit sent",
      },
    ],
    targetBusinesses: [
      "Hair Salons & Color Studios",
      "Modern Barbershops",
      "Nail & Lash Boutiques",
      "Aesthetic Beauty Studios",
    ],
  },
  {
    id: "wellness",
    label: "Spas & Wellness",
    badge: "Holistic & Relaxation",
    icon: "🌿",
    tagline: "THERAPIST ROTAS & TREATMENT SUITE RESERVATIONS",
    headline: "Maintain tranquil reception desks with whisper-quiet autonomous bookings.",
    description:
      "Ringing phones disrupt spa relaxation. AMSh manages guest inquiries silently and smoothly: reservations for massage suites, hydrotherapy, sauna sessions, couples packages, and therapist preference matching.",
    pageHref: "/ai-receptionist-for-wellness",
    color: {
      badgeBg: "bg-emerald-50",
      badgeText: "text-emerald-800",
      badgeBorder: "border-emerald-200",
      accent: "text-emerald-600",
      gradient: "from-emerald-600 to-teal-600",
    },
    stats: [
      { value: "100%", label: "Quiet front-desk zone" },
      { value: "4.9/5", label: "Guest satisfaction rating" },
      { value: "35%", label: "Higher couples package uptake" },
    ],
    workflows: [
      {
        icon: "💆",
        title: "Therapist & Room Assignment",
        desc: "Coordinates single and couples suites, aromatherapy preferences, and gender-specific therapist requests.",
      },
      {
        icon: "🧖",
        title: "Thermal & Sauna Add-Ons",
        desc: "Books pre-treatment relaxation access, hydrotherapy pools, and private eucalyptus sauna time.",
      },
      {
        icon: "📋",
        title: "Digital Health & Allergy Screening",
        desc: "Sends digital intake links for essential oil allergies, pregnancy alerts, and pressure preferences.",
      },
    ],
    dialogue: [
      {
        speaker: "caller",
        name: "Michael Chang",
        text: "Hello, do you have room for a 90-minute couples deep tissue massage and sauna access this Sunday?",
      },
      {
        speaker: "ai",
        name: "AMSh Wellness AI",
        text: "Warm greetings Michael. We have our Lotus Private Suite available Sunday at 3:00 PM or 5:30 PM, complete with private sauna and aromatherapy. Would 3:00 PM suit you both?",
        actionBadge: "Suite Check: Lotus Suite + 2 Senior Therapists confirmed",
      },
      {
        speaker: "caller",
        name: "Michael Chang",
        text: "3:00 PM sounds wonderful. Please book it.",
      },
      {
        speaker: "ai",
        name: "AMSh Wellness AI",
        text: "You are all set for Sunday at 3:00 PM in the Lotus Suite. I've messaged your reservation summary and our digital health preferences form. We look forward to welcoming you.",
        actionBadge: "Spa Suite locked · WhatsApp intake & calendar sync complete",
      },
    ],
    targetBusinesses: [
      "Day Spas & Luxury Retreats",
      "Ayurvedic & Massage Studios",
      "Sauna, Cold Plunge & Cryo Centers",
      "Holistic Wellness Sanctuaries",
    ],
  },
];

export default function VerticalMatrix() {
  const [activeTab, setActiveTab] = useState<VerticalId>("clinic");
  const active = VERTICALS.find((v) => v.id === activeTab) || VERTICALS[0];

  return (
    <section id="industries" className="py-24 bg-white border-b border-slate-100 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 font-mono-ui text-[11px] font-semibold text-slate-700 uppercase tracking-widest shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            <span>Multi-Vertical Enterprise Architecture</span>
          </div>

          <h2 className="font-sora text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-950 mt-4 leading-[1.18]">
            Trained for your specific industry.{" "}
            <span className="text-blue-600">Configured in minutes.</span>
          </h2>

          <p className="text-base sm:text-lg text-slate-600 mt-4 leading-relaxed">
            One core conversational intelligence, specialized workflows for every appointment-driven business. Explore how AMSh transforms operations across four high-demand sectors.
          </p>

          {/* Interactive Vertical Pill Switcher */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3 p-1.5 rounded-2xl bg-slate-100 border border-slate-200/80 max-w-2xl mx-auto shadow-inner">
            {VERTICALS.map((v) => {
              const isSelected = v.id === activeTab;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setActiveTab(v.id)}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white text-slate-950 shadow-sm border border-slate-200/80 scale-[1.02]"
                      : "text-slate-600 hover:text-slate-950 hover:bg-white/50"
                  }`}
                >
                  <span className="text-base">{v.icon}</span>
                  <span>{v.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Bento Grid Showcase for Active Vertical */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Left Column (5 cols): Overview, Metrics & Action Links */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Main Info Card */}
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-50/50 to-white p-6 sm:p-8 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono-ui font-bold uppercase tracking-wider ${active.color.badgeBg} ${active.color.badgeBorder} ${active.color.badgeText}`}>
                  <span>{active.icon}</span>
                  <span>{active.badge}</span>
                </span>
                <span className="font-mono-ui text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  VERTICAL ID: {active.id}
                </span>
              </div>

              <h3 className="font-sora text-2xl sm:text-3xl font-bold text-slate-950 leading-tight">
                {active.headline}
              </h3>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed mt-3">
                {active.description}
              </p>

              {/* Target Business Tags */}
              <div className="pt-5 border-t border-slate-200/70 mt-5">
                <span className="text-[11px] font-mono-ui uppercase tracking-wider text-slate-400 font-semibold block mb-2">
                  Built specifically for:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {active.targetBusinesses.map((b) => (
                    <span
                      key={b}
                      className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-medium shadow-2xs"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 mt-6 border-t border-slate-200/70 flex flex-wrap items-center gap-3">
                <Link
                  href={active.pageHref}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs"
                >
                  <span>Explore {active.label} Page</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("open-pilot-modal"));
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-2xs"
                >
                  <span>Start 14-Day Pilot</span>
                </button>
              </div>
            </div>

            {/* Metrics Triple Box */}
            <div className="grid grid-cols-3 gap-3">
              {active.stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 text-center shadow-2xs"
                >
                  <div className={`font-sora text-xl sm:text-2xl font-extrabold tracking-tight ${active.color.accent}`}>
                    {s.value}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono-ui mt-1 leading-snug">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Specialized Workflows List */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-3">
              <span className="text-[11px] font-mono-ui uppercase tracking-wider text-slate-400 font-bold block mb-1">
                Automated Workflows ({active.label})
              </span>
              {active.workflows.map((w) => (
                <div key={w.title} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                  <span className="text-xl shrink-0 p-1 bg-slate-100 rounded-lg">{w.icon}</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{w.title}</h4>
                    <p className="text-[11.5px] text-slate-500 mt-0.5 leading-relaxed">{w.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Right Column (7 cols): Interactive Live Call Transcript Simulator */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-slate-900 bg-slate-950 text-white p-5 sm:p-7 shadow-2xl relative overflow-hidden">
              
              {/* Terminal / Live Call Bar */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5 font-mono-ui text-xs">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <span className="font-bold text-slate-200">INBOUND VOICE CALL ACTIVE</span>
                  <span className="text-slate-600 font-light">&bull;</span>
                  <span className="text-slate-400">Carrier Trunk #01</span>
                </div>

                <div className="flex items-center gap-2 font-mono-ui text-[11px] text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-semibold border border-slate-700">
                    &lt; 160ms latency
                  </span>
                </div>
              </div>

              {/* Dialogue Transcript Stream */}
              <div className="space-y-4 py-2 font-sans">
                {active.dialogue.map((turn, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${
                      turn.speaker === "ai" ? "items-start" : "items-end"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] font-mono-ui text-slate-400">
                      <span>{turn.name}</span>
                      {turn.speaker === "ai" && (
                        <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] font-bold">
                          AI AGENT
                        </span>
                      )}
                    </div>

                    <div
                      className={`max-w-[88%] sm:max-w-[82%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-sm ${
                        turn.speaker === "ai"
                          ? "bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-sm"
                          : "bg-blue-600 text-white rounded-tr-sm"
                      }`}
                    >
                      {turn.text}
                    </div>

                    {turn.actionBadge && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-mono-ui text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2.5 py-1 rounded-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Action: {turn.actionBadge}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Bottom State Machine Inspector */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 font-mono-ui text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">STATE:</span>
                  <span className="text-blue-400 font-semibold">BOOKING_CONFIRMED</span>
                  <span className="text-slate-600">&bull;</span>
                  <span className="text-slate-500">ENGINE:</span>
                  <span className="text-slate-300">FastAPI + Groq + Cartesia</span>
                </div>

                <div className="flex items-center gap-2 text-slate-400">
                  <span>Grounding:</span>
                  <span className="text-emerald-400 font-semibold">100% strict</span>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
