"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BrandIcon } from "./BrandIcon";
import { Icon } from "./icons";
import { LogoMark } from "./Logo";
import { SpotlightCard, Stagger, StaggerItem } from "./Motion";

const CARD = "rounded-3xl border border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all";

function CardText({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div>
      <p className="font-mono-ui text-xs font-bold uppercase tracking-[0.14em] text-blue-600">{eyebrow}</p>
      <h3 className="font-sora mt-2 text-xl font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}

// --- Voice -----------------------------------------------------------------
const VOICE_LINES = [
  { who: "Patient", text: "Is Dr. Sharma free tomorrow afternoon?" },
  { who: "AMSh", text: "Yes — 2:00 PM or 4:00 PM. Which works better for you?" },
  { who: "Patient", text: "2:00 PM. Can I book for teeth whitening?" },
  { who: "AMSh", text: "Done! I've confirmed Dr. Sharma for teeth whitening at 2:00 PM." },
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
    <div className="relative mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-900 shadow-2xs">
      <div className="flex items-center gap-3">
        <span className="relative grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-[#2563EB] border border-blue-200/80">
          <span className="absolute inset-0 animate-ping rounded-full bg-blue-400/20 motion-reduce:hidden" />
          <Icon name="phone" className="h-4 w-4" />
        </span>
        <div className="flex-1 leading-tight">
          <p className="font-sora text-sm font-semibold text-slate-900">Live call · Sunrise Dental</p>
          <p className="font-mono-ui text-xs text-slate-500">00:48 · handled by AMSh</p>
        </div>
        <div className="flex h-8 items-center gap-[3px]" aria-hidden="true">
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className={`w-[3px] origin-center rounded-full bg-blue-500 animate-voice-${(i % 3) + 1} motion-reduce:animate-none`}
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
              className={`max-w-[88%] rounded-xl px-3 py-2 text-[13px] leading-snug shadow-2xs ${
                l.who === "AMSh"
                  ? "self-start bg-white border border-slate-200 text-slate-800"
                  : "self-end bg-[#2563EB] text-white"
              }`}
            >
              <span className="font-mono-ui mr-1.5 text-[10px] font-bold uppercase tracking-wider opacity-70">
                {l.who}
              </span>
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
  { text: "Hello", lang: "English" },
  { text: "नमस्ते", lang: "Hindi" },
  { text: "Hola", lang: "Spanish" },
  { text: "Bonjour", lang: "French" },
  { text: "مرحبا", lang: "Arabic" },
  { text: "Hallo", lang: "German" },
  { text: "Olá", lang: "Portuguese" },
  { text: "你好", lang: "Mandarin" },
  { text: "Ciao", lang: "Italian" },
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
    <div className="relative mt-6 flex flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50/40 via-slate-50 to-white px-4 py-10 text-slate-900 border border-slate-200">
      <div className="relative h-20 w-full text-center" aria-live="polite">
        <AnimatePresence mode="popLayout">
          <motion.p
            key={g.text}
            initial={reduce ? false : { opacity: 0, y: 24, rotateX: -60, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -24, rotateX: 60, filter: "blur(6px)" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="font-sora absolute inset-x-0 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl"
            lang={g.lang === "Hindi" ? "hi" : g.lang === "Arabic" ? "ar" : g.lang === "Mandarin" ? "zh" : undefined}
          >
            {g.text}
          </motion.p>
        </AnimatePresence>
      </div>
      <p className="font-mono-ui relative mt-1 text-xs font-bold uppercase tracking-wider text-blue-600">{g.lang}</p>
      <ul className="relative mt-6 flex flex-wrap justify-center gap-1.5 font-mono-ui">
        {GREETINGS.map((x, k) => (
          <li
            key={x.lang}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors duration-300 border ${
              k === i
                ? "bg-[#2563EB] text-white border-[#2563EB] shadow-xs"
                : "bg-white text-slate-700 border-slate-200 shadow-2xs"
            }`}
          >
            {x.lang}
          </li>
        ))}
        <li className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 border border-slate-200">
          + 20 more
        </li>
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
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 shadow-2xs"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white">
            <Icon name="check" className="h-3.5 w-3.5" />
          </span>
          <span className="flex-1 text-sm font-medium text-slate-800">{it.k}</span>
          <span className="font-mono-ui text-xs text-slate-500 font-semibold">{it.v}</span>
        </motion.li>
      ))}
    </ul>
  );
}

// --- Handoff -----------------------------------------------------------------
function HandoffVisual() {
  const reduce = useReducedMotion();
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-2xs">
      <div className="flex items-center justify-between">
        <LogoMark className="h-10 w-10" />
        <div className="relative mx-3 h-px flex-1 bg-gradient-to-r from-blue-300 to-emerald-300">
          {!reduce && (
            <motion.span
              aria-hidden="true"
              className="absolute -top-[3px] h-[7px] w-[7px] rounded-full bg-[#2563EB] shadow-[0_0_8px_rgba(37,99,235,0.8)]"
              animate={{ left: ["0%", "100%"] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 border border-emerald-200">
          DR
        </span>
      </div>
      <div className="mt-4 rounded-xl bg-white p-3 text-[13px] leading-snug text-slate-700 border border-slate-200 shadow-2xs">
        <p className="font-mono-ui text-[10.5px] font-bold uppercase tracking-wider text-emerald-700">
          Transferred to Dr. Sharma · with summary
        </p>
        <p className="mt-1 text-xs text-slate-600">
          Patient reports severe molar pain since yesterday. Finalized the 2:00 PM slot for teeth whitening &amp; checkup.
        </p>
      </div>
    </div>
  );
}

// --- Dashboard ---------------------------------------------------------------
function DashboardVisual() {
  const bars = [38, 52, 44, 70, 58, 84, 76];
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const rows = [
    { brand: "whatsapp" as const, who: "Riya S.", what: "Booked · Tomorrow 2 PM", tone: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
    { icon: "phone" as const, who: "+91 987•• ••210", what: "Consultation fees", tone: "bg-slate-100 text-slate-700 border border-slate-200" },
    { icon: "phone" as const, who: "Dr. Sharma patient", what: "Rescheduled", tone: "bg-blue-50 text-blue-700 border border-blue-200" },
  ];
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_1.1fr]">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-2xs">
        <p className="font-mono-ui text-xs font-bold text-slate-600">CONVERSATIONS THIS WEEK</p>
        <div className="mt-4 flex h-28 items-end gap-2">
          {bars.map((h, i) => (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <motion.div
                className="w-full rounded-md bg-[#2563EB]"
                initial={{ height: 0 }}
                whileInView={{ height: `${h}%` }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
              <span className="font-mono-ui text-[10px] text-slate-400">{days[i]}</span>
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
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-2xs"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600">
              {"brand" in r && r.brand ? <BrandIcon name={r.brand} className="h-4 w-4" /> : <Icon name={r.icon!} className="h-4 w-4" />}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{r.who}</span>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-mono-ui font-semibold ${r.tone}`}>{r.what}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

// --- Always on + privacy strip ------------------------------------------
function GuaranteeStrip() {
  const points = ["HIPAA & DPDP Act compliant", "Access limited to clinic staff", "Full recording & transcript retention"];
  return (
    <div className="grid gap-5 md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:divide-x md:divide-slate-200">
      <div className="flex items-center gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-[#2563EB] border border-blue-200/80 shadow-2xs">
          <Icon name="clock" className="h-6 w-6" />
        </span>
        <div>
          <h3 className="font-sora whitespace-nowrap text-lg font-semibold text-slate-950">Never off shift</h3>
          <p className="text-xs text-slate-600">24/7/365 — nights, Sundays and holidays.</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 md:pl-6 xl:flex-row xl:items-center">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 shadow-2xs">
            <Icon name="shield" className="h-6 w-6" />
          </span>
          <div>
            <h3 className="font-sora whitespace-nowrap text-lg font-semibold text-slate-950">Private by design</h3>
            <p className="text-xs text-slate-600">Patient conversations stay isolated to your clinic.</p>
          </div>
        </div>
        <ul className="flex flex-wrap gap-2 xl:ml-auto xl:justify-end font-mono-ui">
          {points.map((p) => (
            <li key={p} className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
              <Icon name="check" className="h-3.5 w-3.5" /> {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function FeatureBento() {
  return (
    <Stagger as="div" className="mt-10 grid auto-rows-auto gap-4 md:grid-cols-3">
      <StaggerItem as="div" className="md:col-span-2">
        <SpotlightCard className={`${CARD} p-6`}>
          <CardText eyebrow="VOICE AI" title="Sounds like your best receptionist" body="Natural, warm conversations. Callers can interrupt, switch from Hindi to English mid-sentence, or change their mind naturally." />
          <VoiceVisual />
        </SpotlightCard>
      </StaggerItem>

      <StaggerItem as="div" className="md:row-span-2">
        <SpotlightCard className={`${CARD} flex flex-col p-6`}>
          <CardText eyebrow="MULTILINGUAL" title="Speaks your patients' language" body="Hindi, Hinglish, Indian English, Spanish, Arabic and 20+ languages — AMSh adapts in real time." />
          <LanguageVisual />
        </SpotlightCard>
      </StaggerItem>

      <StaggerItem as="div">
        <SpotlightCard className={`${CARD} p-6`}>
          <CardText eyebrow="KNOWLEDGE" title="Knows your clinic" body="Answers accurately from your own doctors, service fees, treatments and FAQs." />
          <KnowledgeVisual />
        </SpotlightCard>
      </StaggerItem>

      <StaggerItem as="div">
        <SpotlightCard className={`${CARD} p-6`}>
          <CardText eyebrow="HANDOFF" title="Hands over when it matters" body="Urgent or medical emergency? Your staff takes over immediately with a summary." />
          <HandoffVisual />
        </SpotlightCard>
      </StaggerItem>

      <StaggerItem as="div" className="md:col-span-3">
        <SpotlightCard className={`${CARD} p-6`}>
          <CardText eyebrow="VISIBILITY" title="Every conversation, one dashboard" body="Calls, WhatsApp chats and bookings in one place — with recordings, Hindi transcripts, and patient logs." />
          <DashboardVisual />
        </SpotlightCard>
      </StaggerItem>

      <StaggerItem as="div" className="md:col-span-3">
        <SpotlightCard className={`${CARD} p-6`}>
          <GuaranteeStrip />
        </SpotlightCard>
      </StaggerItem>
    </Stagger>
  );
}
