"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

const HeroOrb = dynamic(() => import("./HeroOrb"), {
  ssr: false,
  loading: () => (
    <div aria-hidden="true" className="absolute inset-0 grid place-items-center">
      <div className="h-1/2 w-1/2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#67e8f9,#4f46e5_55%,#1e1b4b)] opacity-80" />
    </div>
  ),
});

// Real-time 3D AMSh orb; follows the pointer and only renders while on screen.
export default function DemoOrb({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "200px" });
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

  return (
    <div ref={wrap} className={`relative ${className ?? ""}`}>
      {inView && <HeroOrb pointer={pointer} animate={!reduce} />}
    </div>
  );
}
