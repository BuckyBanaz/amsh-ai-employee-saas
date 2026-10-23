"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";

interface EmployeePersona {
  id: string;
  audio: string;
  image: string;
  name: string;
  role: string;
  region: string;
  country: string;
  flag: string;
  employeeCode: string;
  languages: string[];
  themeGradient: string;
  accentColor: string;
  glowColor: string;
  bio: string;
  sampleQuote: string;
  quoteLanguage: string;
  skills: { title: string; desc: string; icon: string }[];
  metrics: {
    callsHandled: string;
    bookingRate: string;
    avgLatency: string;
  };
}

const PERSONAS: EmployeePersona[] = [
  {
    id: "sarah",
    audio: "/demo_audio/english.mp3",
    image: "/landing/personas/sarah.jpg",
    name: "Sarah Jenkins",
    role: "Clinical Front-Desk Specialist",
    region: "North America (USA & Canada)",
    country: "United States",
    flag: "🇺🇸",
    employeeCode: "AMSH-USA-01",
    languages: ["US English", "Spanish (Bilingual)"],
    themeGradient: "from-emerald-600 via-teal-600 to-cyan-500",
    accentColor: "#059669",
    glowColor: "rgba(5, 150, 105, 0.25)",
    bio: "Trained on private American dental practices, dermatology, and medical spas. Executes HIPAA-compliant patient intake, insurance verification, and calendar rebooking with flawless empathy.",
    sampleQuote: "“Good morning! Dr. Miller has an opening tomorrow at 10:30 AM for a consultation. Should I go ahead and reserve that for you?”",
    quoteLanguage: "US English",
    skills: [
      { title: "HIPAA Compliant", desc: "In-memory PHI masking & safe logging", icon: "shield" },
      { title: "Insurance Intake", desc: "Pre-authorizations & copay intake", icon: "chat" },
      { title: "EHR Integration", desc: "Epic, Cerner & Kareo calendar sync", icon: "calendar" },
      { title: "Sub-160ms Edge", desc: "Instant barge-in with no audio latency", icon: "phone" },
    ],
    metrics: { callsHandled: "28,400+", bookingRate: "96.1%", avgLatency: "155ms" },
  },
  {
    id: "emma",
    audio: "/demo_audio/english-gb.mp3",
    image: "/landing/personas/emma.jpg",
    name: "Emma Watson",
    role: "Private Practice Receptionist",
    region: "United Kingdom",
    country: "United Kingdom",
    flag: "🇬🇧",
    employeeCode: "AMSH-GBR-02",
    languages: ["British English", "French"],
    themeGradient: "from-purple-600 via-violet-600 to-indigo-500",
    accentColor: "#7C3AED",
    glowColor: "rgba(124, 58, 237, 0.25)",
    bio: "Tailored for Harley Street consultants, private physiotherapy, and NHS-overflow private clinics. Known for polite, polished British cadence and thorough patient reassurance.",
    sampleQuote: "“Good afternoon, Kensington Medical. Dr. Davies is available on Thursday at 3:15 PM. Shall I confirm that appointment for you?”",
    quoteLanguage: "British English",
    skills: [
      { title: "GDPR Sovereign", desc: "EU/UK sovereign data retention", icon: "shield" },
      { title: "Private Triage", desc: "Polite consultant scheduling & intake", icon: "phone" },
      { title: "SMS & WhatsApp", desc: "Automated booking confirmations", icon: "chat" },
      { title: "Deposit Links", desc: "Stripe & SumUp prepayment dispatch", icon: "calendar" },
    ],
    metrics: { callsHandled: "19,800+", bookingRate: "93.8%", avgLatency: "160ms" },
  },
  {
    id: "lotte",
    audio: "/demo_audio/dutch.mp3",
    image: "/landing/personas/lotte.jpg",
    name: "Lotte de Jong",
    role: "Kliniek & Praktijk Assistent",
    region: "Netherlands & Flanders",
    country: "Netherlands",
    flag: "🇳🇱",
    employeeCode: "AMSH-NLD-03",
    languages: ["Dutch (Nederlands)", "English"],
    themeGradient: "from-amber-600 via-orange-500 to-amber-400",
    accentColor: "#EA580C",
    glowColor: "rgba(234, 88, 12, 0.25)",
    bio: "Gespecialiseerd in Nederlandse tandartsen en medische privéklinieken. Beheert patiëntgesprekken in vloeiend Nederlands, plant afspraken in en verzendt direct WhatsApp-bevestigingen.",
    sampleQuote: "“Goedemorgen! Tandartspraktijk De Vries. Dokter Jansen heeft morgen om 14:30 uur een plek vrij voor controle. Zal ik deze voor u inplannen?”",
    quoteLanguage: "Nederlands (Dutch)",
    skills: [
      { title: "AVG / GDPR Proof", desc: "Strikte Europese privacy & dataopslag", icon: "shield" },
      { title: "WhatsApp Planning", desc: "Directe afspraakbevestiging & route", icon: "chat" },
      { title: "Agenda Sync", desc: "Simplex, Exquise & Google Agenda sync", icon: "calendar" },
      { title: "Sub-160ms Respons", desc: "Vloeiende gesprekken zonder vertraging", icon: "phone" },
    ],
    metrics: { callsHandled: "21,600+", bookingRate: "95.4%", avgLatency: "150ms" },
  },
  {
    id: "hannah",
    audio: "/demo_audio/german.mp3",
    image: "/landing/personas/hannah.jpg",
    name: "Hannah Weber",
    role: "Praxismanagerin & Patientenempfang",
    region: "Germany, Austria & Switzerland",
    country: "Germany",
    flag: "🇩🇪",
    employeeCode: "AMSH-DEU-04",
    languages: ["German (Deutsch)", "English"],
    themeGradient: "from-rose-600 via-red-600 to-amber-500",
    accentColor: "#DC2626",
    glowColor: "rgba(220, 38, 38, 0.25)",
    bio: "Entwickelt für Facharztpraxen, Zahnärzte und MVZ im DACH-Raum. Führt diskrete Patientenaufnahme, Terminkoordination und Notfall-Triage nach höchsten deutschen Qualitätsstandards durch.",
    sampleQuote: "“Guten Tag, Praxis Dr. Weber! Wir haben morgen um 11:15 Uhr einen freien Termin für Ihre Untersuchung. Darf ich diesen für Sie reservieren?”",
    quoteLanguage: "Deutsch (German)",
    skills: [
      { title: "DSGVO Konform", desc: "EU-Datensouveränität & BAA Standards", icon: "shield" },
      { title: "Praxis-Triage", desc: "Präzise Terminkoordination & Notfallweiterleitung", icon: "phone" },
      { title: "Kalenderintegration", desc: "Doctolib, Medatixx & Google Kalender", icon: "calendar" },
      { title: "24/7 Erreichbarkeit", desc: "Keine verpassten Patientenanrufe mehr", icon: "chat" },
    ],
    metrics: { callsHandled: "24,100+", bookingRate: "96.8%", avgLatency: "155ms" },
  },
  {
    id: "fatima",
    audio: "/demo_audio/arabic.mp3",
    image: "/landing/personas/fatima.jpg",
    name: "Fatima Al-Mansoor",
    role: "Bilingual Patient Concierge",
    region: "UAE & Middle East (GCC)",
    country: "UAE (Dubai)",
    flag: "🇦🇪",
    employeeCode: "AMSH-UAE-05",
    languages: ["Arabic (Gulf & Modern)", "English"],
    themeGradient: "from-blue-600 via-indigo-600 to-sky-500",
    accentColor: "#2563EB",
    glowColor: "rgba(37, 99, 235, 0.25)",
    bio: "Engineered for luxury multi-specialty polyclinics and aesthetic centers in Dubai, Abu Dhabi, and Riyadh. Seamlessly transitions between Arabic and English based on the caller's language.",
    sampleQuote: "“أهلاً بك في عيادة النخبة. دكتور أحمد متاح غداً الساعة الرابعة عصراً. هل تود تأكيد الموعد؟”",
    quoteLanguage: "Gulf Arabic & English",
    skills: [
      { title: "Native Arabic TTS", desc: "Expressive dialect switching & etiquette", icon: "phone" },
      { title: "WhatsApp Cloud", desc: "Instant Arabic & English confirmations", icon: "chat" },
      { title: "VIP Concierge", desc: "Premium clinic flow with multi-branch sync", icon: "calendar" },
      { title: "24/7 Gatekeeping", desc: "Never drops high-value elective inquiries", icon: "shield" },
    ],
    metrics: { callsHandled: "17,500+", bookingRate: "95.4%", avgLatency: "165ms" },
  },
];

// 16 equalizer waveform bars with dynamic pulsing heights
const WAVEFORM_BARS = [40, 75, 55, 90, 65, 100, 80, 50, 95, 70, 85, 60, 90, 45, 80, 65];

export default function VirtualEmployeeCard() {
  const [selectedId, setSelectedId] = useState("sarah");
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const current = PERSONAS.find((p) => p.id === selectedId) || PERSONAS[0];

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(false);
  };

  const selectPersona = (id: string) => {
    stopAudio();
    setSelectedId(id);
  };

  const toggleAudio = () => {
    if (playing) {
      stopAudio();
      return;
    }
    const audio = new Audio(current.audio);
    audio.onended = () => setPlaying(false);
    audio.onerror = () => setPlaying(false);
    audioRef.current = audio;
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* ========================================================= */}
      {/* 1. INTERACTIVE PERSONA SELECTOR STRIP */}
      {/* ========================================================= */}
      <div className="mb-10 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-mono-ui font-semibold mb-3">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span>GLOBAL AUTONOMOUS CLINICAL AGENTS</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 w-full max-w-4xl p-1.5 sm:p-2 rounded-2xl bg-slate-100/80 border border-slate-200/90 backdrop-blur-md shadow-inner">
          {PERSONAS.map((p) => {
            const isSelected = selectedId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPersona(p.id)}
                className={`relative flex items-center gap-3 p-2.5 sm:p-3 rounded-xl text-left transition-all cursor-pointer ${
                  isSelected
                    ? "bg-white text-slate-900 shadow-md ring-2 ring-blue-500/20 scale-[1.02]"
                    : "bg-transparent text-slate-600 hover:bg-white/60 hover:text-slate-900"
                }`}
              >
                {/* Mini Avatar Thumbnail */}
                <div className="relative shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-white shadow-xs">
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    className="object-cover object-top"
                    sizes="44px"
                  />
                  <span className="absolute bottom-0 right-0 text-[10px] leading-none bg-white/90 rounded-full p-0.5 shadow-2xs">
                    {p.flag}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="font-sora text-xs sm:text-sm font-bold truncate text-slate-950">
                      {p.name.split(" ")[0]}
                    </span>
                    <span className="text-xs shrink-0">{p.flag}</span>
                  </div>
                  <div className="text-[11px] font-mono-ui text-slate-500 truncate">
                    {p.country}
                  </div>
                </div>

                {isSelected && (
                  <motion.div
                    layoutId="activePersonaIndicator"
                    className="absolute inset-0 rounded-xl border-2 border-blue-600 pointer-events-none"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. THE MASTER VIRTUAL EMPLOYEE SHOWCASE DOSSIER */}
      {/* ========================================================= */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-9 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.12)]"
        >
          {/* ========================================================= */}
          {/* LEFT COLUMN: HOLOGRAPHIC DIGITAL SMART BADGE */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50 via-white to-slate-50/80 p-6 sm:p-7 shadow-xs relative overflow-hidden">
            
            {/* Lanyard Clip Slot & Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span className="font-mono-ui text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  SMART BADGE &bull; {current.employeeCode}
                </span>
              </div>
              <div className="w-10 h-2.5 rounded-full bg-slate-200 border border-slate-300 shadow-inner" />
            </div>

            {/* High-Fidelity Persona Portrait with Glowing Aura */}
            <div className="text-center">
              <div className="relative inline-block mx-auto mb-4 group">
                
                {/* Animated Pulsing Aura Ring */}
                <div
                  className={`absolute -inset-2.5 rounded-full bg-gradient-to-tr ${current.themeGradient} opacity-25 blur-md transition-all duration-500 ${
                    playing ? "opacity-60 scale-105 animate-pulse" : "group-hover:opacity-40"
                  }`}
                />

                {/* Circular Portrait */}
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white shadow-xl ring-2 ring-slate-200/80 mx-auto">
                  <Image
                    src={current.image}
                    alt={current.name}
                    fill
                    priority
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    sizes="128px"
                  />
                </div>

                {/* Live Status Orb */}
                <div className="absolute bottom-1 right-2 flex items-center justify-center">
                  <span className="relative flex h-5 w-5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500 border-2 border-white shadow-xs" />
                  </span>
                </div>
              </div>

              {/* Persona Identity & Specialty */}
              <div className="flex items-center justify-center gap-2 mb-1">
                <h3 className="font-sora text-xl sm:text-2xl font-bold text-slate-950">
                  {current.name}
                </h3>
                <span className="text-xl" title={current.region}>{current.flag}</span>
              </div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider font-mono-ui">
                {current.role}
              </p>

              {/* Verified Duty Badge */}
              <div className="mt-3.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[11px] font-semibold font-mono-ui shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>ON DUTY &bull; 24/7 CLINICAL READY</span>
              </div>
            </div>

            {/* Technical Specifications Matrix */}
            <div className="mt-6 pt-5 border-t border-slate-200/80 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-mono-ui uppercase text-[10px] font-bold">
                  ASSIGNED CLINIC
                </span>
                <span className="font-semibold text-slate-900">
                  Universal Reception Trunk
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-mono-ui uppercase text-[10px] font-bold">
                  FLUENT LANGUAGES
                </span>
                <span className="font-medium text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                  {current.languages.join(" · ")}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-mono-ui uppercase text-[10px] font-bold">
                  PAYROLL IMPACT
                </span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  1/10th of human salary
                </span>
              </div>
            </div>

            {/* Smart NFC & Security Verification Footer */}
            <div className="mt-6 pt-3.5 border-t border-dashed border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono-ui uppercase">
              <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
                Autonomous Clinical AI
              </span>
              <span className="font-semibold text-slate-400">AMSh CIP-8</span>
            </div>

          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: INTERACTIVE DOSSIER, AUDIO SAMPLE & SKILLS */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            
            {/* Header & Bio */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono-ui text-xs font-bold uppercase tracking-wider text-blue-600">
                  CLINICAL DOSSIER &bull; {current.region}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono-ui font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                  <span>{current.flag}</span>
                  <span>{current.country}</span>
                </span>
              </div>

              <h4 className="font-sora text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
                Trained to handle your clinic&apos;s phone &amp; WhatsApp traffic.
              </h4>
              <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">
                {current.bio}
              </p>
            </div>

            {/* ========================================================= */}
            {/* INTERACTIVE SPOKEN GREETING AUDIO PLAYER WITH WAVEFORM */}
            {/* ========================================================= */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50 border border-blue-200/90 shadow-2xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                    </svg>
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-900 font-sora">
                      Listen to Spoken Voice Sample
                    </div>
                    <div className="text-[10px] font-mono-ui text-slate-500">
                      {current.quoteLanguage} &bull; Latency &lt;180ms
                    </div>
                  </div>
                </div>

                {/* Animated Equalizer Waveform & Play Button */}
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {/* Dynamic Equalizer Bars */}
                  <div className="flex items-center gap-0.5 h-6 px-2 py-1 rounded-md bg-white border border-blue-200/60 shadow-2xs">
                    {WAVEFORM_BARS.map((height, i) => (
                      <motion.div
                        key={i}
                        animate={
                          playing
                            ? {
                                height: [
                                  `${Math.max(15, (height * 0.3))}%`,
                                  `${Math.min(100, (height * 1.2))}%`,
                                  `${Math.max(20, (height * 0.5))}%`,
                                ],
                              }
                            : { height: `${height * 0.35}%` }
                        }
                        transition={
                          playing
                            ? {
                                repeat: Infinity,
                                repeatType: "reverse",
                                duration: 0.35 + (i % 5) * 0.08,
                                ease: "easeInOut",
                              }
                            : { duration: 0.2 }
                        }
                        className={`w-1 rounded-full transition-colors ${
                          playing ? "bg-blue-600" : "bg-slate-300"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Play/Pause CTA Button */}
                  <button
                    type="button"
                    onClick={toggleAudio}
                    aria-label={playing ? `Pause ${current.name}'s sample` : `Play ${current.name}'s sample`}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer active:scale-95"
                  >
                    {playing ? (
                      <>
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <rect x="6" y="5" width="4" height="14" rx="1" />
                          <rect x="14" y="5" width="4" height="14" rx="1" />
                        </svg>
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <polygon points="6 4 20 12 6 20 6 4" />
                        </svg>
                        <span>Play Sample</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Spoken Quote Dialog Box */}
              <div className="p-3.5 rounded-xl bg-white/90 border border-blue-100 shadow-2xs">
                <p className="text-sm font-medium text-slate-800 italic leading-relaxed">
                  {current.sampleQuote}
                </p>
              </div>
            </div>

            {/* ========================================================= */}
            {/* CERTIFIED AUTONOMOUS CLINICAL SKILLS */}
            {/* ========================================================= */}
            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono-ui mb-3">
                Certified Autonomous Skills &amp; Integrations:
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {current.skills.map((skill) => (
                  <div
                    key={skill.title}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 transition-colors"
                  >
                    <div className="p-1 rounded-md bg-blue-100 text-blue-600 mt-0.5 shrink-0">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{skill.title}</div>
                      <div className="text-[11px] text-slate-500 leading-tight">{skill.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ========================================================= */}
            {/* REAL-WORLD CLINICAL PERFORMANCE METRICS */}
            {/* ========================================================= */}
            <div className="grid grid-cols-3 gap-3 pt-5 border-t border-slate-200/90 font-mono-ui">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] uppercase text-slate-400 font-bold">Calls Handled</div>
                <div className="font-sora text-lg sm:text-xl font-bold text-slate-950 mt-0.5">
                  {current.metrics.callsHandled}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">99.98% uptime</div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <div className="text-[10px] uppercase text-emerald-700 font-bold">Booking Rate</div>
                <div className="font-sora text-lg sm:text-xl font-bold text-emerald-700 mt-0.5">
                  {current.metrics.bookingRate}
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">vs 62% human avg</div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                <div className="text-[10px] uppercase text-blue-700 font-bold">Voice Latency</div>
                <div className="font-sora text-lg sm:text-xl font-bold text-blue-700 mt-0.5">
                  {current.metrics.avgLatency}
                </div>
                <div className="text-[10px] text-blue-600 mt-0.5">Sub-human delay</div>
              </div>
            </div>

            {/* Deploy CTA Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-slate-500 font-mono-ui">
                Ready to deploy <strong className="text-slate-800">{current.name}</strong> to your clinic?
              </span>
              <a
                href="#demo"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-slate-950 hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs hover:shadow-md cursor-pointer"
              >
                <span>Test Live Call with {current.name.split(" ")[0]}</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>

          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
