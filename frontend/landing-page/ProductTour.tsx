"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { Icon, type IconName } from "./icons";

// Product tour: real screenshots of the AMSh clinic console
// (public/landing/product, captured from a demo US dental clinic: Brooklyn Heights Family Dental).
// The browser frame starts tilted back in 3D and lays flat as it scrolls in.

type Tab = { id: string; label: string; icon: IconName; title: string; body: string; src: string; alt: string };

const TABS: Tab[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "grid",
    title: "Your whole front desk, at a glance",
    body: "Today's appointments and every call AMSh handled — updated live as patients call and message.",
    src: "/landing/product/dashboard-v2.webp",
    alt: "AMSh dashboard showing today's appointments and recent AI-handled calls",
  },
  {
    id: "appointments",
    label: "Appointments",
    icon: "calendar",
    title: "Bookings land straight in the schedule",
    body: "Every appointment AMSh books shows up with the patient, doctor, service and status — ready to confirm or reschedule.",
    src: "/landing/product/appointments-v2.webp",
    alt: "AMSh appointments list with patients, doctors, schedule and status",
  },
  {
    id: "calls",
    label: "Call logs",
    icon: "phone",
    title: "Every call, recorded and summarised",
    body: "Listen back, read the full transcript in the language the patient spoke, and see exactly what was booked.",
    src: "/landing/product/calls-v2.webp",
    alt: "AMSh call log for a Brooklyn dental clinic with an AI summary and full call transcript",
  },
  {
    id: "conversations",
    label: "Conversations",
    icon: "message",
    title: "All patient conversations in one inbox",
    body: "Filter by resolved, transferred or unresolved and jump into any conversation with full context.",
    src: "/landing/product/conversations-v2.webp",
    alt: "AMSh conversations inbox with a booking conversation open",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: "chart",
    title: "Know when patients call — and what they want",
    body: "Busiest hours, call outcomes and bookings over time, so you can staff smarter.",
    src: "/landing/product/analytics-v2.webp",
    alt: "AMSh analytics with call volume heatmap and call outcomes",
  },
  {
    id: "doctors",
    label: "Doctors",
    icon: "users",
    title: "Doctors, schedules and services",
    body: "AMSh books against each doctor's real availability and the services they offer.",
    src: "/landing/product/doctors-v2.webp",
    alt: "AMSh doctors and staff directory",
  },
];

const ROTATE_MS = 6500;

export default function ProductTour() {
  const reduce = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const inView = useInView(wrap, { margin: "-20% 0px" });
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const tab = TABS[active];

  // Scroll-linked 3D: frame tilts back and scales down, then settles flat.
  const { scrollYProgress } = useScroll({ target: wrap, offset: ["start end", "center center"] });
  const rotateX = useSpring(useTransform(scrollYProgress, (p) => (reduce ? 0 : 24 * (1 - p))), { stiffness: 90, damping: 24 });
  const scale = useSpring(useTransform(scrollYProgress, (p) => (reduce ? 1 : 0.9 + 0.1 * p)), { stiffness: 90, damping: 24 });

  // Auto-advance while visible; hovering or picking a tab pauses it.
  useEffect(() => {
    if (!inView || paused || reduce) return;
    const id = setTimeout(() => setActive((a) => (a + 1) % TABS.length), ROTATE_MS);
    return () => clearTimeout(id);
  }, [active, inView, paused, reduce]);

  return (
    <div ref={wrap} onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}>
      {/* tabs */}
      <div role="tablist" aria-label="Product screens" className="scrollbar-hide mx-auto flex max-w-full gap-2 overflow-x-auto pb-2 sm:justify-center">
        {TABS.map((t, i) => {
          const on = i === active;
          return (
            <button
              key={t.id}
              role="tab"
              id={`tour-tab-${t.id}`}
              aria-selected={on}
              aria-controls="tour-panel"
              onClick={() => {
                setActive(i);
                setPaused(true);
              }}
              className={`relative flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 overflow-hidden rounded-full border px-3 text-[13px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${
                on ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              <Icon name={t.icon} className="h-3.5 w-3.5" />
              {t.label}
              {on && !paused && !reduce && inView && (
                <motion.span
                  key={`bar-${active}`}
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-gradient-to-r from-cyan-400 to-indigo-400"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: ROTATE_MS / 1000, ease: "linear" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* caption */}
      <div className="mx-auto mt-5 min-h-[4.25rem] max-w-2xl text-center" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab.id}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-slate-950 sm:text-xl">{tab.title}</h3>
            <p className="mt-1.5 text-pretty text-sm leading-relaxed text-slate-600 sm:text-[15px]">{tab.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 3D browser frame */}
      <div className="relative mx-auto mt-5 max-w-4xl" style={{ perspective: 1600 }}>
        <div aria-hidden="true" className="absolute -inset-x-10 -bottom-10 top-10 rounded-[3rem] bg-gradient-to-br from-cyan-300/40 via-indigo-400/40 to-violet-400/40 blur-3xl" />
        <motion.div
          id="tour-panel"
          role="tabpanel"
          aria-labelledby={`tour-tab-${tab.id}`}
          style={{ rotateX, scale, transformOrigin: "50% 0%" }}
          className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_50px_100px_-30px_rgba(15,23,42,0.45),0_0_0_1px_rgba(15,23,42,0.04)] sm:rounded-3xl"
        >
          <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50/90 px-4 py-3">
            <span className="flex gap-1.5" aria-hidden="true">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            </span>
            <span className="mx-auto flex min-w-0 max-w-md flex-1 items-center justify-center gap-2 truncate rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">
              <Icon name="shield" className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              AMSh console · {tab.label}
            </span>
            <span className="hidden w-[52px] sm:block" />
          </div>
          <div className="relative aspect-[1600/1150] bg-[#f8fafc]">
            <AnimatePresence initial={false}>
              <motion.div
                key={tab.id}
                className="absolute inset-0"
                initial={reduce ? false : { opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <Image src={tab.src} alt={tab.alt} fill sizes="(max-width: 900px) 100vw, 896px" className="object-contain object-top" />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
        <p className="mt-3 text-center text-xs text-slate-500">Screens from the AMSh console with a demo clinic&apos;s data.</p>
      </div>
    </div>
  );
}
