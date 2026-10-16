"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants,
} from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

// Fade + rise into view once. Reduced motion → content is simply visible.
export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const staggerChild: Variants = {
  hidden: { opacity: 0, y: 24, rotateX: -12 },
  show: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.6, ease: EASE } },
};

export function Stagger({ children, className, as = "ul" }: { children: React.ReactNode; className?: string; as?: "ul" | "div" }) {
  const reduce = useReducedMotion();
  const Comp = as === "ul" ? motion.ul : motion.div;
  return (
    <Comp
      className={className}
      style={{ perspective: 1200 }}
      variants={staggerParent}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
    >
      {children}
    </Comp>
  );
}

export function StaggerItem({ children, className, as = "li" }: { children: React.ReactNode; className?: string; as?: "li" | "div" }) {
  const Comp = as === "li" ? motion.li : motion.div;
  return (
    <Comp className={className} variants={staggerChild}>
      {children}
    </Comp>
  );
}

// Pointer-driven 3D tilt with a moving specular glare. Children placed in
// elements with `[transform:translateZ(..)]` pop out of the card surface.
export function TiltCard({
  children,
  className,
  max = 10,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 220, damping: 22, mass: 0.6 };
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const glareX = useTransform(px, (v) => `${v * 100}%`);
  const glareY = useTransform(py, (v) => `${v * 100}%`);
  const glare = useTransform(
    [glareX, glareY],
    ([x, y]) => `radial-gradient(420px circle at ${x} ${y}, rgba(255,255,255,0.35), transparent 45%)`,
  );

  function onMove(e: React.PointerEvent) {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  }
  function onLeave() {
    px.set(0.5);
    py.set(0.5);
  }

  return (
    <div style={{ perspective: 1000 }} className="h-full">
      <motion.div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        className={`group relative h-full ${className ?? ""}`}
      >
        {children}
        <motion.div
          aria-hidden="true"
          style={{ background: glare }}
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 mix-blend-overlay transition-opacity duration-300 group-hover:opacity-100"
        />
      </motion.div>
    </div>
  );
}

// Button/link wrapper that leans toward the cursor.
export function Magnetic({ children, strength = 0.25 }: { children: React.ReactNode; strength?: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const x = useSpring(0, { stiffness: 250, damping: 15 });
  const y = useSpring(0, { stiffness: 250, damping: 15 });

  function onMove(e: React.PointerEvent) {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * strength);
    y.set((e.clientY - r.top - r.height / 2) * strength);
  }
  function onLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.span ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} style={{ x, y }} className="inline-flex">
      {children}
    </motion.span>
  );
}

// Headline that assembles word by word with a slight 3D flip.
export function SplitWords({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  return (
    <span className={className} style={{ perspective: 800 }}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((w, i) => (
          <motion.span
            key={`${w}-${i}`}
            className="inline-block whitespace-pre"
            style={{ transformOrigin: "50% 100%" }}
            initial={reduce ? false : { opacity: 0, y: "0.6em", rotateX: -70 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.8, delay: delay + i * 0.06, ease: EASE }}
          >
            {w + (i < words.length - 1 ? " " : "")}
          </motion.span>
        ))}
      </span>
    </span>
  );
}

// Card whose border and surface light up under the cursor (SaaS "spotlight").
export function SpotlightCard({
  children,
  className,
  dark = false,
}: {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  function onMove(e: React.PointerEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--sx", `${e.clientX - r.left}px`);
    el.style.setProperty("--sy", `${e.clientY - r.top}px`);
  }
  const glow = dark ? "rgba(103,232,249,0.14)" : "rgba(99,102,241,0.10)";
  const edge = dark ? "rgba(103,232,249,0.55)" : "rgba(99,102,241,0.45)";
  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      className={`group relative isolate h-full transition-[transform,box-shadow] duration-300 hover:-translate-y-1 ${className ?? ""}`}
    >
      {/* surface glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(420px circle at var(--sx, 50%) var(--sy, 50%), ${glow}, transparent 60%)` }}
      />
      {/* border glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          padding: 1,
          background: `radial-gradient(260px circle at var(--sx, 50%) var(--sy, 50%), ${edge}, transparent 60%)`,
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      {children}
    </div>
  );
}
