"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BrandIcon } from "./BrandIcon";
import { Icon } from "./icons";
import { LogoMark } from "./Logo";
import { SpotlightCard, Stagger, StaggerItem } from "./Motion";

// "What AMSh does" bento. Each card carries a small live UI instead of a
// lone icon, so the benefit is shown rather than described.

const DISPLAY = "font-[family-name:var(--font-display)]";
const CARD = "rounded-3xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_20px_50px_-30px_rgba(15,23,42,0.25)]";

function CardText({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">{eyebrow}</p>
      <h3 className={`${DISPLAY} mt-2 text-xl font-semibold text-slate-950`}>{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}

// --- Voice -----------------------------------------------------------------
const VOICE_LINES = [
  { who: "Patient", text: "Kal subah Dr. Sharma free hain kya?" },
  { who: "AMSh", text: "Haan ji — 10:30 ya 11:15, kaunsa time theek rahega?" },
  { who: "Patient", text: "10:30. Actually wait — can I bring my mother too?" },
  { who: "AMSh", text: "Of course. I've booked two slots, 10:30 and 10:45." },
];

function VoiceVisual() {
  const reduce = useReducedMotion();
  const [n, setN] = useState(1);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setN((v) => (v >= VOICE_LINES.length + 1 ? 1 : v + 1)), 1800);
    return () => clearInterval(id);
  }, [reduce]);
  const shown = reduce ? VOICE_LINES : VOICE_LINES.slice(0, Math.min(n, VOICE_LINES.length));
  return (
    <div className="relative mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white">
      <div className="flex items-center gap-3">
        <span className="relative grid h-9 w-9 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/20 motion-reduce:hidden" />
          <Icon name="phone" className="h-4 w-4" />
        </span>
        <div className="flex-1 leading-tight">
          <p className="text-sm font-semibold">Live call · Sunrise Dental</p>
          <p className="text-xs text-white/50">00:48 · handled by AMSh</p>
        </div>
        <div className="flex h-8 items-center gap-[3px]" aria-hidden="true">
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className={`w-[3px] origin-center rounded-full bg-gradient-to-t from-cyan-400 to-indigo-400 animate-voice-${(i % 3) + 1} motion-reduce:animate-none`}
              style={{ height: `${30 + ((i * 37) % 70)}%` }}
            />
          ))}
        </div>
      </div>
      <div className="mt-4 flex min-h-[152px] flex-col justify-end gap-2" aria-live="polite">
        <AnimatePresence initial={false}>
          {shown.map((l, i) => (
            <motion.div
              key={`${i}-${l.text}`}
              layout="position"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`max-w-[88%] rounded-xl px-3 py-2 text-[13px] leading-snug ${l.who === "AMSh" ? "self-start bg-white/10" : "self-end bg-indigo-500"}`}
            >
              <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-60">{l.who}</span>
              {l.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- Languages ---------------------------------------------------------------
const GREETINGS = [
  { text: "नमस्ते", lang: "Hindi" },
  { text: "Hello", lang: "English" },
  { text: "Haan ji, bataiye", lang: "Hinglish" },
  { text: "வணக்கம்", lang: "Tamil" },
  { text: "নমস্কার", lang: "Bengali" },
  { text: "नमस्कार", lang: "Marathi" },
  { text: "Hola", lang: "Spanish" },
  { text: "مرحبا", lang: "Arabic" },
  { text: "Bonjour", lang: "French" },
  { text: "Hallo", lang: "Dutch" },
];

function LanguageVisual() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setI((v) => (v + 1) % GREETINGS.length), 1600);
    return () => clearInterval(id);
  }, [reduce]);
  const g = GREETINGS[i];
  return (
    <div className="relative mt-6 flex flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl bg-[#0B1026] px-4 py-10 text-white ring-1 ring-white/5">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(47,123,255,0.35),transparent_60%)]" />
      <div className="relative h-20 w-full text-center" aria-live="polite">
        <AnimatePresence mode="popLayout">
          <motion.p
            key={g.text}
            initial={reduce ? false : { opacity: 0, y: 24, rotateX: -60, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -24, rotateX: 60, filter: "blur(6px)" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 text-4xl font-semibold tracking-tight sm:text-5xl"
            lang={g.lang === "Hindi" || g.lang === "Marathi" ? "hi" : undefined}
          >
            {g.text}
          </motion.p>
        </AnimatePresence>
      </div>
      <p className="relative mt-1 text-sm font-medium text-white/75">{g.lang}</p>
      <ul className="relative mt-6 flex flex-wrap justify-center gap-1.5">
        {GREETINGS.map((x, k) => (
          <li
            key={x.lang}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors duration-300 ${k === i ? "bg-white text-slate-900" : "bg-white/[0.08] text-white/70"}`}
          >
            {x.lang}
          </li>
        ))}
        <li className="rounded-full bg-white/[0.08] px-2.5 py-1 text-[11px] font-semibold text-white/70">+ more</li>
      </ul>
    </div>
  );
}

// --- Knowledge ---------------------------------------------------------------
function KnowledgeVisual() {
  const items = [
    { k: "Doctors & timings", v: "4 doctors" },
    { k: "Services & fees", v: "18 services" },
    { k: "Clinic FAQs", v: "32 answers" },
    { k: "Website & policies", v: "Synced" },
  ];
  return (
    <ul className="mt-6 space-y-2">
      {items.map((it, i) => (
        <motion.li
          key={it.k}
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 + i * 0.1 }}
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white">
            <Icon name="check" className="h-3.5 w-3.5" />
          </span>
          <span className="flex-1 text-sm font-medium text-slate-800">{it.k}</span>
          <span className="text-xs text-slate-500">{it.v}</span>
        </motion.li>
      ))}
    </ul>
  );
}

// --- Handoff -----------------------------------------------------------------
function HandoffVisual() {
  const reduce = useReducedMotion();
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <LogoMark className="h-11 w-11" />
        <div className="relative mx-3 h-px flex-1 bg-gradient-to-r from-indigo-300 to-emerald-300">
          {!reduce && (
            <motion.span
              aria-hidden="true"
              className="absolute -top-[3px] h-[7px] w-[7px] rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.9)]"
              animate={{ left: ["0%", "100%"] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">PR</span>
      </div>
      <div className="mt-4 rounded-xl bg-white p-3 text-[13px] leading-snug text-slate-700 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Transferred to Priya · with summary</p>
        <p className="mt-1">Patient reports severe tooth pain since last night. Wants the earliest slot today.</p>
      </div>
    </div>
  );
}

// --- Dashboard ---------------------------------------------------------------
function DashboardVisual() {
  const bars = [38, 52, 44, 70, 58, 84, 76];
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const rows = [
    { brand: "whatsapp" as const, who: "Riya S.", what: "Booked · Thu 10:30", tone: "bg-emerald-50 text-emerald-700" },
    { icon: "phone" as const, who: "+91 98••• ••210", what: "Asked about fees", tone: "bg-slate-100 text-slate-600" },
    { icon: "phone" as const, who: "Arjun K.", what: "Rescheduled", tone: "bg-indigo-50 text-indigo-700" },
  ];
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_1.1fr]">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold text-slate-500">Conversations this week</p>
        <div className="mt-4 flex h-28 items-end gap-2">
          {bars.map((h, i) => (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <motion.div
                className="w-full rounded-md bg-gradient-to-t from-indigo-500 to-cyan-400"
                initial={{ height: 0 }}
                whileInView={{ height: `${h}%` }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
              <span className="text-[10px] text-slate-400">{days[i]}</span>
            </div>
          ))}
        </div>
      </div>
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <motion.li
            key={r.who}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600">
              {"brand" in r && r.brand ? <BrandIcon name={r.brand} className="h-4 w-4" /> : <Icon name={r.icon!} className="h-4 w-4" />}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{r.who}</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.tone}`}>{r.what}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

// --- Always on ---------------------------------------------------------------
function ClockVisual() {
  const reduce = useReducedMotion();
  return (
    <div className="mt-6 grid place-items-center">
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="clockg" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#f59e0b" />
              <stop offset="0.5" stopColor="#6366f1" />
              <stop offset="1" stopColor="#0ea5e9" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="44" fill="none" stroke="#e2e8f0" strokeWidth="6" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="url(#clockg)" strokeWidth="6" strokeLinecap="round" strokeDasharray="276.5" strokeDashoffset="0" />
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i / 24) * Math.PI * 2;
            const r = (v: number) => Math.round(v * 100) / 100; // identical on server and client
            return <line key={i} x1={r(50 + Math.sin(a) * 34)} y1={r(50 - Math.cos(a) * 34)} x2={r(50 + Math.sin(a) * 37)} y2={r(50 - Math.cos(a) * 37)} stroke="#cbd5e1" strokeWidth="1" />;
          })}
        </svg>
        <motion.div
          aria-hidden="true"
          className="absolute inset-0"
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        >
          <span className="absolute left-1/2 top-[3%] h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
        </motion.div>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className={`${DISPLAY} text-3xl font-semibold text-slate-950`}>24/7</p>
            <p className="text-[11px] font-medium text-slate-500">365 days</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Privacy -----------------------------------------------------------------
function PrivacyRow() {
  const points = ["Encrypted in transit & at rest", "Access limited to your team", "You control recording retention"];
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-center">
      <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl ring-8 ring-emerald-50">
        <span className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg">
          <Icon name="shield" className="h-8 w-8" />
        </span>
      </div>
      <div className="flex-1">
        <h3 className={`${DISPLAY} text-xl font-semibold text-slate-950`}>Private by design</h3>
        <p className="mt-1 text-[15px] text-slate-600">Patient conversations stay yours.</p>
      </div>
      <ul className="flex flex-wrap gap-2">
        {points.map((p) => (
          <li key={p} className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800">
            <Icon name="check" className="h-4 w-4" /> {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function FeatureBento() {
  return (
    <Stagger as="div" className="mt-16 grid auto-rows-auto gap-5 md:grid-cols-3">
      <StaggerItem as="div" className="md:col-span-2">
        <SpotlightCard className={`${CARD} p-7`}>
          <CardText eyebrow="Voice" title="Sounds like your best receptionist" body="Natural, warm conversations. Patients can interrupt, switch language mid-sentence or change their mind — just like with a person." />
          <VoiceVisual />
        </SpotlightCard>
      </StaggerItem>

      <StaggerItem as="div" className="md:row-span-2">
        <SpotlightCard className={`${CARD} flex flex-col p-7`}>
          <CardText eyebrow="Any language" title="Speaks your patients' language" body="Hindi, English, Hinglish, regional and international languages — AMSh replies in whatever language the patient uses." />
          <LanguageVisual />
        </SpotlightCard>
      </StaggerItem>

      <StaggerItem as="div">
        <SpotlightCard className={`${CARD} p-7`}>
          <CardText eyebrow="Knowledge" title="Knows your clinic" body="Answers from your own doctors, services, fees and FAQs." />
          <KnowledgeVisual />
        </SpotlightCard>
      </StaggerItem>

      <StaggerItem as="div">
        <SpotlightCard className={`${CARD} p-7`}>
          <CardText eyebrow="Teamwork" title="Hands over when it matters" body="Urgent or complex? Your staff take over with a summary." />
          <HandoffVisual />
        </SpotlightCard>
      </StaggerItem>

      <StaggerItem as="div" className="md:col-span-2">
        <SpotlightCard className={`${CARD} p-7`}>
          <CardText eyebrow="Visibility" title="Every conversation, one dashboard" body="Calls, WhatsApp chats and bookings in one place — with transcripts and summaries your team can review any time." />
          <DashboardVisual />
        </SpotlightCard>
      </StaggerItem>

      <StaggerItem as="div">
        <SpotlightCard className={`${CARD} p-7`}>
          <CardText eyebrow="Always on" title="Never off shift" body="Nights, weekends and holidays." />
          <ClockVisual />
        </SpotlightCard>
      </StaggerItem>

      <StaggerItem as="div" className="md:col-span-3">
        <SpotlightCard className={`${CARD} p-7`}>
          <PrivacyRow />
        </SpotlightCard>
      </StaggerItem>
    </Stagger>
  );
}
