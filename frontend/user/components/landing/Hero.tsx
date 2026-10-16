"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { motion, useAnimationFrame, useReducedMotion } from "motion/react";
import { BrandIcon, type BrandName } from "./BrandIcon";
import { Icon, type IconName } from "./icons";
import { Magnetic, Reveal, SplitWords } from "./Motion";

// Hero: promise on the left, AMSh (real-time 3D orb) on the right with its
// channels orbiting it. Chips pass behind the orb on the far side of the
// orbit and in front of it on the near side.

const HeroOrb = dynamic(() => import("./HeroOrb"), {
  ssr: false,
  loading: () => (
    <div aria-hidden="true" className="absolute inset-0 grid place-items-center">
      <div className="h-[38%] w-[38%] rounded-full bg-[radial-gradient(circle_at_35%_30%,#67e8f9,#2f7bff_55%,#1e1b4b)] opacity-80" />
    </div>
  ),
});

const DISPLAY = "font-[family-name:var(--font-display)]";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

type Channel = { label: string; sub: string; brand?: BrandName; icon?: IconName; tint: string };
const CHANNELS: Channel[] = [
  { label: "Calls", sub: "Answered on first ring", icon: "phone", tint: "#22c55e" },
  { label: "WhatsApp", sub: "Replies instantly", brand: "whatsapp", tint: "#25D366" },
  { label: "Appointments", sub: "Booked & rescheduled", brand: "gcal", tint: "#4285F4" },
  { label: "SMS", sub: "Reminders sent", icon: "sms", tint: "#38bdf8" },
  { label: "Email", sub: "Confirmations", brand: "gmail", tint: "#EA4335" },
];

function Orbit() {
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  const pointer = useRef({ x: 0, y: 0 });
  const angle = useRef(0);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(el);
    const onMove = (e: PointerEvent) => {
      pointer.current = { x: (e.clientX / window.innerWidth) * 2 - 1, y: (e.clientY / window.innerHeight) * 2 - 1 };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  useAnimationFrame((_, delta) => {
    const el = box.current;
    if (!el || !inView) return;
    if (!reduce) angle.current += delta * 0.00022;
    const w = el.clientWidth;
    const narrow = window.innerWidth < 640;
    const rx = w * (narrow ? 0.29 : 0.44);
    const ry = w * (narrow ? 0.2 : 0.17);
    const tilt = pointer.current.y * 0.06; // orbit leans slightly with the cursor
    const n = CHANNELS.length;
    refs.current.forEach((li, i) => {
      if (!li) return;
      const a = angle.current + (i / n) * Math.PI * 2;
      const x = Math.cos(a) * rx;
      const y = Math.sin(a) * ry + x * tilt;
      const depth = (Math.sin(a) + 1) / 2; // 0 = far side (behind orb), 1 = near side
      li.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, 0) scale(${0.74 + depth * 0.3})`;
      li.style.zIndex = depth > 0.5 ? String(30 + Math.round(depth * 10)) : "5";
      li.style.opacity = String(0.45 + depth * 0.55);
      li.style.filter = depth < 0.4 ? `blur(${(0.4 - depth) * 3}px)` : "none";
    });
  });

  return (
    <div ref={box} className="relative mx-auto aspect-square w-full max-w-[580px]">
      {/* glow bed */}
      <div aria-hidden="true" className="absolute inset-[14%] rounded-full bg-[radial-gradient(circle,rgba(47,123,255,0.5),rgba(34,211,238,0.14)_55%,transparent_72%)] blur-3xl" />
      {/* orbit path */}
      <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[34%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-cyan-200/20" />
      {/* the AI */}
      <div className="absolute inset-0 z-10">
        <HeroOrb pointer={pointer} animate={!reduce && inView} distance={6.3} />
      </div>
      <span className="absolute left-1/2 top-[86%] z-20 -translate-x-1/2 whitespace-nowrap rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200 backdrop-blur">
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 align-middle" />
        AMSh · On shift
      </span>
      <ul aria-label="Channels AMSh handles" className="absolute left-1/2 top-1/2 h-0 w-0">
        {CHANNELS.map((c, i) => (
          <li
            key={c.label}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="absolute left-0 top-0 flex items-center gap-2.5 whitespace-nowrap rounded-2xl border border-white/15 bg-slate-900/75 py-1.5 pl-1.5 pr-3.5 text-white shadow-[0_18px_40px_-12px_rgba(0,0,0,0.75)] backdrop-blur-xl will-change-transform sm:py-2 sm:pl-2 sm:pr-4"
          >
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-white sm:h-10 sm:w-10" style={{ boxShadow: `0 0 22px -4px ${c.tint}` }}>
              {c.brand ? (
                <BrandIcon name={c.brand} className="h-5 w-5 sm:h-6 sm:w-6" />
              ) : (
                <span style={{ color: c.tint }}>
                  <Icon name={c.icon!} className="h-5 w-5 sm:h-6 sm:w-6" />
                </span>
              )}
            </span>
            <span>
              <span className="block text-[13px] font-semibold leading-tight sm:text-sm">{c.label}</span>
              <span className="hidden text-xs text-white/60 sm:block">{c.sub}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#050816] pb-16 pt-32 sm:pt-36 lg:pb-24">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-0 h-[520px] w-[520px] rounded-full bg-indigo-600/30 blur-[120px]" />
        <div className="absolute -right-40 top-40 h-[480px] w-[480px] rounded-full bg-cyan-500/20 blur-[120px]" />
        <div className="lp-grid-floor" />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.05fr]">
        <div className="text-center lg:text-left">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> For dental, aesthetic & medical clinics
            </span>
          </Reveal>
          <h1 className={`${DISPLAY} mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-[4rem]`}>
            <SplitWords text="Meet your clinic's" delay={0.1} />{" "}
            <SplitWords text="24/7 AI employee." delay={0.3} className="lp-gradient-text" />
          </h1>
          <Reveal delay={0.55}>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-slate-300 lg:mx-0">
              AMSh answers calls, handles WhatsApp conversations, books appointments and follows up with patients — even when your team is busy or your clinic is closed.
            </p>
          </Reveal>
          <Reveal delay={0.7}>
            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Magnetic>
                <a
                  href="#see-it"
                  className={`lp-border-glow group inline-flex min-h-13 items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-base font-semibold text-slate-950 shadow-[0_0_40px_-5px_rgba(47,123,255,0.7)] ${FOCUS}`}
                >
                  See AMSh in Action
                  <Icon name="arrow" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </a>
              </Magnetic>
              <a
                href="#book-demo"
                className={`inline-flex min-h-13 items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-base font-semibold text-white backdrop-blur transition-colors duration-200 hover:bg-white/10 ${FOCUS}`}
              >
                Book a Demo
              </a>
            </div>
          </Reveal>
          <Reveal delay={0.85}>
            <ul className="mt-9 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-400 lg:justify-start">
              {["Works 24/7", "Keeps your clinic number", "Alongside your team"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Icon name="check" className="h-4 w-4 text-cyan-300" /> {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <Orbit />
        </motion.div>
      </div>
    </section>
  );
}
