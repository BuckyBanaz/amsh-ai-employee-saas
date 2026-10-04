"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";
import { Icon } from "./icons";
import { Logo } from "./Logo";

const LINKS = [
  { href: "#see-it", label: "Live Demo" },
  { href: "#features", label: "What it does" },
  { href: "#testimonials", label: "Testimonials" },
  { href: "#pricing", label: "Pricing" },
  { href: "#integrations", label: "Partners" },
  { href: "/docs", label: "Docs" },
];

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] sm:px-6">
      <motion.nav
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        aria-label="Main"
        className={`relative mx-auto flex max-w-6xl items-center justify-between overflow-hidden rounded-2xl border px-4 py-2.5 transition-colors duration-300 ${
          scrolled || open
            ? "border-white/10 bg-slate-950/75 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] backdrop-blur-xl"
            : "border-transparent bg-transparent"
        }`}
      >
        <Link href="/landing" className={`flex items-center gap-2 rounded-lg ${FOCUS}`} aria-label="AMSh home">
          <Logo />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              {l.href.startsWith("/") ? (
                <Link
                  href={l.href}
                  className={`rounded-lg px-3 py-2 text-[15px] font-medium text-white/70 transition-colors duration-200 hover:text-white ${FOCUS}`}
                >
                  {l.label}
                </Link>
              ) : (
                <a
                  href={l.href}
                  className={`rounded-lg px-3 py-2 text-[15px] font-medium text-white/70 transition-colors duration-200 hover:text-white ${FOCUS}`}
                >
                  {l.label}
                </a>
              )}
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/login" className={`rounded-lg px-3 py-2 text-[15px] font-semibold text-white/80 hover:text-white ${FOCUS}`}>
            Log in
          </Link>
          <a
            href="#book-demo"
            className={`inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 text-[15px] font-semibold text-slate-950 transition-transform duration-200 hover:scale-[1.03] ${FOCUS}`}
          >
            Book a Demo <Icon name="arrow" className="h-4 w-4" />
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className={`grid h-11 w-11 place-items-center rounded-xl text-white lg:hidden ${FOCUS}`}
        >
          <Icon name={open ? "close" : "menu"} className="h-6 w-6" />
        </button>

        <motion.span
          aria-hidden="true"
          style={{ scaleX: progress }}
          className={`absolute inset-x-0 bottom-0 h-[2px] origin-left bg-gradient-to-r from-cyan-400 via-indigo-400 to-violet-400 ${scrolled ? "opacity-100" : "opacity-0"}`}
        />
      </motion.nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
            transition={{ duration: 0.25 }}
            className="mx-auto mt-2 max-w-6xl rounded-2xl border border-white/10 bg-slate-950/95 p-3 backdrop-blur-xl lg:hidden"
          >
            <ul>
              {LINKS.map((l) => (
                <li key={l.href}>
                  {l.href.startsWith("/") ? (
                    <Link
                      onClick={() => setOpen(false)}
                      href={l.href}
                      className={`block rounded-xl px-3 py-3 font-medium text-white/85 hover:bg-white/5 ${FOCUS}`}
                    >
                      {l.label}
                    </Link>
                  ) : (
                    <a
                      onClick={() => setOpen(false)}
                      href={l.href}
                      className={`block rounded-xl px-3 py-3 font-medium text-white/85 hover:bg-white/5 ${FOCUS}`}
                    >
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link href="/login" className={`inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 font-semibold text-white ${FOCUS}`}>
                Log in
              </Link>
              <a href="#book-demo" onClick={() => setOpen(false)} className={`inline-flex min-h-12 items-center justify-center rounded-xl bg-white font-semibold text-slate-950 ${FOCUS}`}>
                Book a Demo
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
