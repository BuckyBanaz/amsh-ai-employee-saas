"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useTransform } from "motion/react";
import { BrandIcon } from "./BrandIcon";

// A patient's WhatsApp chat with the clinic, answered by AMSh. Styled after
// WhatsApp's light theme; plays when scrolled into view and loops.
type Msg =
  | { from: "patient" | "clinic"; text: string; time: string }
  | { from: "clinic"; kind: "slots"; text: string; time: string; options: string[] }
  | { from: "clinic"; kind: "confirm"; time: string };

const SCRIPT: Msg[] = [
  { from: "patient", text: "Hi, is Dr. Mehta available this week? Knee pain 🙏", time: "9:41 PM" },
  { from: "clinic", text: "Hi Riya! 👋 I'm AMSh, Sunrise Clinic's assistant. Dr. Mehta (Orthopaedics) has these slots:", time: "9:41 PM" },
  { from: "clinic", kind: "slots", text: "Choose a time", time: "9:41 PM", options: ["Thu · 10:30 AM", "Fri · 4:15 PM", "Sat · 11:00 AM"] },
  { from: "patient", text: "Thu · 10:30 AM", time: "9:42 PM" },
  { from: "clinic", kind: "confirm", time: "9:42 PM" },
  { from: "patient", text: "Perfect, thank you!", time: "9:42 PM" },
];

function Ticks() {
  return (
    <svg viewBox="0 0 16 11" className="h-[11px] w-4 text-[#53bdeb]" aria-label="Read">
      <path fill="currentColor" d="M11.1.7 5.3 7.9 3 5.6l-.9.9 3.3 3.3 6.6-8.2L11.1.7Zm3.9 0L9.2 7.9l-.7-.7-.9.9 1.7 1.7L15.9 1.6 15 .7Z" />
    </svg>
  );
}

function Bubble({ m }: { m: Msg }) {
  const out = m.from === "patient";
  const base = `relative max-w-[82%] rounded-lg px-2.5 pb-1.5 pt-1.5 text-[13px] leading-snug text-[#111b21] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] ${
    out ? "self-end rounded-tr-none bg-[#d9fdd3]" : "self-start rounded-tl-none bg-white"
  }`;
  const tail = (
    <svg viewBox="0 0 8 13" className={`absolute top-0 h-[13px] w-2 ${out ? "-right-2 text-[#d9fdd3]" : "-left-2 -scale-x-100 text-white"}`} aria-hidden="true">
      <path fill="currentColor" d="M5.2 1H0v11.2L6.8 3.3C7.9 2 7 1 5.2 1Z" />
    </svg>
  );
  const meta = (
    <span className="float-right ml-2 mt-1.5 flex translate-y-0.5 items-center gap-1 text-[10.5px] text-[#667781]">
      {m.time}
      {out && <Ticks />}
    </span>
  );

  if ("kind" in m && m.kind === "slots") {
    return (
      <div className="flex w-[82%] flex-col gap-[3px] self-start">
        <div className={`${base} !max-w-full`}>
          {tail}
          <p className="font-medium">{m.text}</p>
          {meta}
        </div>
        {m.options.map((o) => (
          <div key={o} className="rounded-lg bg-white py-2 text-center text-[13px] font-medium text-[#008069] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
            {o}
          </div>
        ))}
      </div>
    );
  }
  if ("kind" in m && m.kind === "confirm") {
    return (
      <div className={`${base} w-[82%]`}>
        {tail}
        <div className="-mx-1 mb-1.5 overflow-hidden rounded-md bg-[#f0f2f5]">
          <div className="bg-gradient-to-r from-[#008069] to-[#25D366] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white">Appointment confirmed ✅</div>
          <div className="space-y-0.5 px-3 py-2 text-[12.5px]">
            <p><span className="text-[#667781]">Doctor</span> · Dr. Mehta</p>
            <p><span className="text-[#667781]">When</span> · Thu, 10:30 AM</p>
            <p><span className="text-[#667781]">Where</span> · Sunrise Clinic, Andheri</p>
          </div>
        </div>
        <p>You&apos;re booked! I&apos;ll send a reminder the evening before. Reply here any time to reschedule.</p>
        {meta}
      </div>
    );
  }
  return (
    <div className={base}>
      {tail}
      {"text" in m && m.text}
      {meta}
    </div>
  );
}

// `compact`: shorter chat and a gentle idle float instead of scroll-linked
// tilt — for fixed panels such as the auth screens.
export default function WhatsAppPhone({ compact = false }: { compact?: boolean }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-120px" });
  const [shown, setShown] = useState(1);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const rotateY = useTransform(scrollYProgress, [0, 0.5, 1], [22, 8, -6]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [12, 3, -6]);

  useEffect(() => {
    if (reduce || !inView) return;
    let i = 1;
    const id = setInterval(() => {
      i = i >= SCRIPT.length + 2 ? 1 : i + 1; // hold on the full chat, then replay
      setShown(Math.min(i, SCRIPT.length));
    }, 1500);
    return () => clearInterval(id);
  }, [inView, reduce]);

  useEffect(() => {
    const el = scroller.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [shown, reduce]);

  const visible = reduce ? SCRIPT : SCRIPT.slice(0, shown);
  const next = SCRIPT[shown];
  const typing = !reduce && inView && shown < SCRIPT.length && next?.from === "clinic";

  return (
    <div ref={ref} className={`relative mx-auto w-full ${compact ? "max-w-[300px]" : "max-w-[330px]"}`} style={{ perspective: 1400 }}>
      <div aria-hidden="true" className="absolute -inset-12 rounded-full bg-[radial-gradient(circle,rgba(37,211,102,0.25),transparent_65%)] blur-2xl" />
      <motion.div
        style={reduce ? undefined : compact ? { rotateY: -10, rotateX: 4, transformStyle: "preserve-3d" } : { rotateY, rotateX, transformStyle: "preserve-3d" }}
        animate={compact && !reduce ? { y: [0, -8, 0] } : undefined}
        transition={compact ? { duration: 6, repeat: Infinity, ease: "easeInOut" } : undefined}
        className="relative rounded-[2.8rem] bg-[#1a1a1a] p-[10px] shadow-[40px_60px_80px_-30px_rgba(15,23,42,0.55),inset_0_0_0_2px_#3a3a3a]"
      >
        <div className="relative overflow-hidden rounded-[2.2rem] bg-[#efeae2]">
          {/* status bar + dynamic island */}
          <div className="flex items-center justify-between bg-[#008069] px-6 pb-1 pt-2.5 text-[11px] font-semibold text-white">
            <span>9:42</span>
            <span className="h-[22px] w-[84px] rounded-full bg-black" />
            <span className="flex items-center gap-1">
              <svg viewBox="0 0 18 12" className="h-2.5 w-3.5" aria-hidden="true"><path fill="currentColor" d="M1 9h2v3H1zM5 6h2v6H5zM9 3h2v9H9zM13 0h2v12h-2z" /></svg>
              <span className="inline-block h-2.5 w-5 rounded-[3px] border border-white/80 p-[1px]"><span className="block h-full w-3/4 rounded-[1px] bg-white" /></span>
            </span>
          </div>
          {/* chat header */}
          <div className="flex items-center gap-2.5 bg-[#008069] px-3 pb-2.5 pt-1.5 text-white">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path fill="currentColor" d="M12 4 4 12l8 8 1.4-1.4L7.8 13H20v-2H7.8l5.6-5.6z" /></svg>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 text-sm font-bold">S</span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="flex items-center gap-1 truncate text-[14.5px] font-semibold">
                Sunrise Clinic
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" aria-label="Verified business"><path fill="#25D366" d="m12 1 2.7 2.1 3.4-.3.9 3.3 3 1.7-1.2 3.2 1.2 3.2-3 1.7-.9 3.3-3.4-.3L12 23l-2.7-2.1-3.4.3-.9-3.3-3-1.7L3.2 13 2 9.8l3-1.7.9-3.3 3.4.3z" /><path fill="#fff" d="m10.5 15.6-3.2-3.2 1.4-1.4 1.8 1.8 4.8-4.8 1.4 1.4z" /></svg>
              </p>
              <p className="text-[11.5px] text-white/80">{typing ? "typing…" : "online"}</p>
            </div>
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path fill="currentColor" d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4Z" /></svg>
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1Z" /></svg>
          </div>

          {/* messages on the doodle wallpaper */}
          <div
            ref={scroller}
            aria-live="polite"
            className={`scrollbar-hide flex ${compact ? "h-[340px]" : "h-[430px]"} flex-col gap-1.5 overflow-y-auto px-4 py-3`}
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(0,0,0,0.035) 2px, transparent 2.5px), radial-gradient(circle at 70% 60%, rgba(0,0,0,0.03) 3px, transparent 3.5px)",
              backgroundSize: "38px 38px, 54px 54px",
            }}
          >
            <p className="mx-auto mb-1 rounded-md bg-white/90 px-2.5 py-1 text-[11px] font-medium text-[#54656f] shadow-sm">Today</p>
            <p className="mx-auto mb-2 max-w-[92%] rounded-md bg-[#ffeecd] px-2.5 py-1.5 text-center text-[10.5px] leading-snug text-[#54656f]">
              This business uses AMSh to reply to your messages.
            </p>
            <AnimatePresence initial={false}>
              {visible.map((m, i) => (
                <motion.div
                  key={i}
                  layout="position"
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className={`flex flex-col ${m.from === "patient" ? "items-end" : "items-start"} ${i > 0 && visible[i - 1].from !== m.from ? "mt-1.5" : ""}`}
                >
                  <Bubble m={m} />
                </motion.div>
              ))}
            </AnimatePresence>
            {typing && (
              <div className="flex gap-1 self-start rounded-lg rounded-tl-none bg-white px-3 py-2.5 shadow-sm" aria-hidden="true">
                {[0, 1, 2].map((d) => (
                  <motion.span key={d} className="h-1.5 w-1.5 rounded-full bg-[#8696a0]" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: d * 0.15 }} />
                ))}
              </div>
            )}
          </div>

          {/* composer */}
          <div className="flex items-center gap-1.5 bg-[#f0f2f5] px-2 pb-5 pt-2">
            <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-3 py-2 text-[13px] text-[#8696a0]">
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm-3.5-9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm7 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM12 17.5a5.5 5.5 0 0 0 5-3.5H7a5.5 5.5 0 0 0 5 3.5Z" /></svg>
              <span className="flex-1">Message</span>
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 -rotate-45" aria-hidden="true"><path fill="currentColor" d="M16.5 6v11.5a4 4 0 0 1-8 0V5a2.5 2.5 0 0 1 5 0v10.5a1 1 0 0 1-2 0V6H10v9.5a2.5 2.5 0 0 0 5 0V5a4 4 0 0 0-8 0v12.5a5.5 5.5 0 0 0 11 0V6h-1.5Z" /></svg>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#00a884] text-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path fill="currentColor" d="M12 15a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v7a3 3 0 0 0 3 3Zm5.3-3a5.3 5.3 0 0 1-10.6 0H5a7 7 0 0 0 6 6.9V22h2v-3.1a7 7 0 0 0 6-6.9h-1.7Z" /></svg>
            </span>
          </div>
        </div>
      </motion.div>

      {/* floating chips in front of the phone */}
      <motion.div
        initial={reduce ? false : { opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className={`absolute -left-20 top-16 hidden items-center ${compact ? "" : "sm:flex"} gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur`}
      >
        <BrandIcon name="whatsapp" className="h-7 w-7" />
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Replied at 9:41 PM</p>
          <p className="text-sm font-semibold text-slate-900">Clinic closed. Patient booked.</p>
        </div>
      </motion.div>
      <motion.div
        initial={reduce ? false : { opacity: 0, x: 30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className={`absolute -right-16 -bottom-2 hidden items-center ${compact ? "" : "sm:flex"} gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur`}
      >
        <BrandIcon name="gcal" className="h-7 w-7" />
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Added to schedule</p>
          <p className="text-sm font-semibold text-slate-900">Dr. Mehta · Thu 10:30</p>
        </div>
      </motion.div>
    </div>
  );
}
