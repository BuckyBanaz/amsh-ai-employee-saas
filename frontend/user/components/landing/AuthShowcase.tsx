"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BrandIcon, type BrandName } from "./BrandIcon";
import { Icon, type IconName } from "./icons";
import { Logo } from "./Logo";
import WhatsAppPhone from "./WhatsAppPhone";

// Left panel of the auth screens: brand, promise, a live product moment
// (WhatsApp booking + activity feed) and three outcomes.

type Event = { id: number; brand?: BrandName; icon?: IconName; tint: string; title: string; meta: string };

const EVENTS: Omit<Event, "id">[] = [
  { icon: "phone", tint: "#22c55e", title: "Call answered", meta: "Asked about root canal fees" },
  { brand: "whatsapp", tint: "#25D366", title: "Booked on WhatsApp", meta: "Riya S. · Thu 10:30 · Dr. Mehta" },
  { icon: "sms", tint: "#38bdf8", title: "Reminder sent", meta: "Arjun K. · tomorrow 5:00 PM" },
  { brand: "gcal", tint: "#4285F4", title: "Rescheduled", meta: "Pooja S. · moved to Fri 4:15" },
  { icon: "transfer", tint: "#f59e0b", title: "Handed to staff", meta: "Urgent tooth pain · summary sent" },
  { icon: "phone", tint: "#22c55e", title: "After-hours call", meta: "11:42 PM · booked for 9:30 AM" },
];

function ActivityFeed() {
  const reduce = useReducedMotion();
  const [items, setItems] = useState<Event[]>(() => EVENTS.slice(0, 4).map((e, i) => ({ ...e, id: 3 - i })).reverse());
  useEffect(() => {
    if (reduce) return;
    let next = 4;
    const id = setInterval(() => {
      const e = EVENTS[next % EVENTS.length];
      const eid = next;
      next += 1;
      setItems((cur) => [{ ...e, id: eid }, ...cur].slice(0, 4));
    }, 2600);
    return () => clearInterval(id);
  }, [reduce]);

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-xs font-semibold text-white">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70 motion-reduce:hidden" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Live · Sunrise Dental
        </p>
        <span className="text-[11px] text-white/40">Today</span>
      </div>
      <ul className="mt-3 space-y-2" aria-live="off">
        <AnimatePresence initial={false}>
          {items.map((e, i) => (
            <motion.li
              key={e.id}
              layout
              initial={{ opacity: 0, y: -14, scale: 0.97 }}
              animate={{ opacity: 1 - i * 0.16, y: 0, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white">
                {e.brand ? (
                  <BrandIcon name={e.brand} className="h-[18px] w-[18px]" />
                ) : (
                  <span style={{ color: e.tint }}>
                    <Icon name={e.icon!} className="h-[18px] w-[18px]" />
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-[13px] font-semibold text-white">{e.title}</span>
                <span className="block truncate text-[11.5px] text-white/50">{e.meta}</span>
              </span>
              <span className="shrink-0 text-[10.5px] text-white/35">{i === 0 ? "now" : `${i * 3}m`}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-3">
        <div>
          <p className="text-[11px] text-white/45">Missed enquiries</p>
          <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">0</p>
        </div>
        <div>
          <p className="text-[11px] text-white/45">Open 24/7</p>
          <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-emerald-300">On shift</p>
        </div>
      </div>
    </div>
  );
}

const POINTS: { icon: IconName; text: string }[] = [
  { icon: "phone", text: "Answers every call and WhatsApp, 24/7" },
  { icon: "calendar", text: "Books straight into your schedule" },
  { icon: "users", text: "Works alongside your front desk" },
];

export default function AuthShowcase() {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#050816] px-10 py-9 text-white xl:px-14">
      {/* atmosphere */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-[460px] w-[460px] rounded-full bg-[#2F7BFF]/25 blur-[120px]" />
        <div className="absolute -bottom-40 right-[-10%] h-[420px] w-[420px] rounded-full bg-cyan-400/15 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_55%_45%,black_20%,transparent_70%)]" />
      </div>

      {/* top bar */}
      <div className="relative flex items-center justify-between">
        <Link href="/landing" aria-label="AMSh home" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
          <Logo />
        </Link>
        <Link href="/landing" className="flex items-center gap-1.5 rounded-lg text-sm font-medium text-white/60 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
          Back to website <Icon name="arrow" className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* promise */}
      <div className="relative mt-10 max-w-lg [@media(max-height:860px)]:mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">AMSh for clinics</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-[2.15rem] font-semibold leading-[1.1] tracking-tight xl:text-[2.5rem]">
          Your clinic&apos;s{" "}
          <span className="bg-gradient-to-r from-[#7FB2FF] via-[#A5B4FC] to-[#67E8F9] bg-clip-text text-transparent">24/7 AI employee.</span>
        </h1>
      </div>

      {/* live product moment */}
      <div className="relative my-auto flex items-center justify-center gap-6 py-6 [@media(max-height:1000px)]:[zoom:0.84] [@media(max-height:860px)]:[zoom:0.72] [@media(max-height:740px)]:[zoom:0.62]">
        <div className="w-[280px] shrink-0">
          <WhatsAppPhone compact />
        </div>
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="hidden w-[300px] xl:block"
        >
          <ActivityFeed />
        </motion.div>
      </div>

      {/* outcomes */}
      <div className="relative [@media(max-height:780px)]:hidden">
        <ul className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
          {POINTS.map((p) => (
            <li key={p.text} className="flex flex-col gap-2 text-[13px] leading-snug text-white/70">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.06] text-[#7FB2FF] ring-1 ring-white/10">
                <Icon name={p.icon} className="h-[18px] w-[18px]" />
              </span>
              {p.text}
            </li>
          ))}
        </ul>
        <p className="mt-6 flex items-center gap-2 text-xs text-white/40">
          <Icon name="shield" className="h-4 w-4 text-emerald-400/80" />
          Encrypted conversations · Your patient data stays yours
        </p>
      </div>
    </div>
  );
}
