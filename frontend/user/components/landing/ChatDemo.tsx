"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Icon } from "./icons";

// "Talk to AMSh" — an on-page preview that plays AMSh answering a visitor as
// if they were a clinic owner. Replies come from a local script (keyword
// match, several languages), not the live AI — the badge says so.
// TODO: point `reply()` at a public demo endpoint once the backend has one.

type Turn = { id: number; from: "user" | "ai"; text: string };

const SUGGESTIONS = [
  "What can you do for my clinic?",
  "Book an appointment for tomorrow",
  "Kya aap Hindi mein baat karte ho?",
  "Which languages do you speak?",
  "What happens after hours?",
  "Will you replace my receptionist?",
];

const ANSWERS: { keys: string[]; text: string }[] = [
  {
    keys: ["language", "languages", "speak", "tamil", "bengali", "marathi", "spanish", "arabic", "french"],
    text: "I speak whatever language your patient speaks — Hindi, English and Hinglish, regional languages like Tamil, Bengali and Marathi, and international ones like Spanish, Arabic or French. I'll even switch mid-call if the patient does.",
  },
  {
    keys: ["hindi", "hinglish", "kya", "aap", "baat", "bhasha"],
    text: "Haan bilkul! Main Hindi, English, Hinglish — aur jo bhi language aapke patient bolte hain — sab mein baat kar sakti hoon. Aapke clinic ke liye appointment book karna ho ya timing batani ho, sab ho jayega.",
  },
  {
    keys: ["book", "appointment", "slot", "tomorrow", "kal", "schedule"],
    text: "Sure! Here's how I'd handle it for a patient: I check each doctor's live schedule, offer the nearest free slots, book the one they pick and send a WhatsApp confirmation straight away. Reschedules and cancellations work the same way — no staff needed.",
  },
  {
    keys: ["hour", "night", "closed", "weekend", "sunday", "late", "24"],
    text: "I never close. At 11 PM or on a Sunday, I answer the call or WhatsApp, answer questions about timings, fees and services, and book the appointment — so your team starts the morning with a full schedule instead of a list of missed calls.",
  },
  {
    keys: ["replace", "staff", "receptionist", "team", "job", "fire"],
    text: "No — I work alongside your team. I take the repetitive calls and messages so your front desk can focus on patients in the clinic. Anything urgent or complex is handed to a staff member with a summary, so the patient never repeats themselves.",
  },
  {
    keys: ["whatsapp", "message", "chat", "sms", "email"],
    text: "On WhatsApp I reply instantly — answering questions, sharing available slots and confirming bookings. I can also send reminders and follow-ups by WhatsApp or SMS, so fewer patients forget their appointments.",
  },
  {
    keys: ["price", "cost", "pricing", "plan", "fee", "charge"],
    text: "Plans start at $99/month and every plan comes with a 14-day free trial. Want me to walk you through which plan fits your call volume? Just hit “Book a Demo” below.",
  },
  {
    keys: ["emergency", "urgent", "pain", "bleeding"],
    text: "I'm not a triage tool. If a patient describes an emergency, I tell them to contact emergency services right away and can transfer the call to your on-call staff.",
  },
  {
    keys: ["setup", "start", "onboard", "install", "number", "phone"],
    text: "Setup is guided: add your doctors, services and hours, connect your phone number (or forward your existing one) and WhatsApp — and I'm live. No hardware, no IT team.",
  },
  {
    keys: ["what", "do", "help", "clinic", "can"],
    text: "Think of me as your clinic's 24/7 front-desk employee. I answer calls, reply on WhatsApp, book, reschedule and cancel appointments, answer patient questions and follow up — even when your team is busy or the clinic is closed.",
  },
];

const FALLBACK =
  "Good question! In a live setup I'd answer that from your clinic's own information — doctors, services, fees and FAQs. Try asking me about bookings, after-hours calls, WhatsApp or Hindi.";

function reply(q: string) {
  const s = q.toLowerCase();
  const hit = ANSWERS.map((a) => ({ a, score: a.keys.filter((k) => s.includes(k)).length }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)[0];
  return hit?.a.text ?? FALLBACK;
}

export default function ChatDemo() {
  const reduce = useReducedMotion();
  const [turns, setTurns] = useState<Turn[]>([
    { id: 0, from: "ai", text: "Hi, I'm AMSh. Ask me anything the way a patient — or a clinic owner — would." },
  ]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState<{ id: number; shown: number } | null>(null);
  const idRef = useRef(1);
  const list = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const el = list.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [turns, streaming, busy, reduce]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setDraft("");
    setBusy(true);
    const userId = idRef.current++;
    const aiId = idRef.current++;
    const answer = reply(q);
    setTurns((t) => [...t, { id: userId, from: "user", text: q }]);

    timers.current.push(
      setTimeout(() => {
        setTurns((t) => [...t, { id: aiId, from: "ai", text: answer }]);
        const words = answer.split(" ").length;
        if (reduce) {
          setBusy(false);
          return;
        }
        // Stream the answer word by word.
        for (let w = 1; w <= words; w++) {
          timers.current.push(
            setTimeout(() => {
              setStreaming(w < words ? { id: aiId, shown: w } : null);
              if (w === words) setBusy(false);
            }, w * 35),
          );
        }
        setStreaming({ id: aiId, shown: 0 });
      }, reduce ? 0 : 700),
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div aria-hidden="true" className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-cyan-400/30 via-indigo-500/30 to-violet-500/30 blur-2xl" />
      <div className="lp-border-glow relative overflow-hidden rounded-[2rem] bg-slate-950/90 shadow-[0_40px_100px_-30px_rgba(79,70,229,0.6)] backdrop-blur-xl">
        {/* header */}
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <span className="relative grid h-11 w-11 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#67e8f9,#4f46e5_60%,#1e1b4b)] shadow-[0_0_30px_rgba(99,102,241,0.7)]">
            <motion.span
              aria-hidden="true"
              className="absolute inset-0 rounded-full border border-cyan-300/60"
              animate={busy && !reduce ? { scale: [1, 1.35], opacity: [0.8, 0] } : { scale: 1, opacity: 0 }}
              transition={{ duration: 1.1, repeat: busy ? Infinity : 0 }}
            />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-white">AMSh</p>
            <p className="flex items-center gap-1.5 text-xs text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {busy ? "typing…" : "Online · 24/7"}
            </p>
          </div>
          <span className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/60">Preview demo</span>
        </div>

        {/* messages */}
        <div ref={list} className="scrollbar-hide flex h-[380px] flex-col gap-3 overflow-y-auto px-5 py-5" aria-live="polite" aria-busy={busy}>
          <AnimatePresence initial={false}>
            {turns.map((t) => {
              const text = streaming?.id === t.id ? t.text.split(" ").slice(0, streaming.shown).join(" ") : t.text;
              return (
                <motion.div
                  key={t.id}
                  initial={reduce ? false : { opacity: 0, y: 14, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                    t.from === "user"
                      ? "self-end rounded-br-md bg-gradient-to-br from-indigo-500 to-violet-600 text-white"
                      : "self-start rounded-bl-md border border-white/10 bg-white/[0.06] text-slate-100"
                  }`}
                >
                  {text}
                  {streaming?.id === t.id && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-cyan-300" aria-hidden="true" />}
                </motion.div>
              );
            })}
          </AnimatePresence>
          {busy && !streaming && (
            <div className="flex gap-1.5 self-start rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-4 py-3" aria-hidden="true">
              {[0, 1, 2].map((d) => (
                <motion.span key={d} className="h-2 w-2 rounded-full bg-cyan-300/80" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: d * 0.15 }} />
              ))}
            </div>
          )}
        </div>

        {/* suggestions */}
        <div className="scrollbar-hide flex gap-2 overflow-x-auto px-5 pb-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              disabled={busy}
              className="shrink-0 cursor-pointer rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-sm text-white/85 transition-colors duration-200 hover:border-cyan-300/60 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              {s}
            </button>
          ))}
        </div>

        {/* composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(draft);
          }}
          className="flex items-center gap-2 border-t border-white/10 p-3"
        >
          <label htmlFor="amsh-chat-input" className="sr-only">
            Message AMSh
          </label>
          <input
            id="amsh-chat-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask anything, in any language…"
            autoComplete="off"
            className="min-h-12 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 text-[15px] text-white placeholder:text-white/40 focus:border-cyan-300/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label="Send message"
            className="grid h-12 w-12 cursor-pointer place-items-center rounded-xl bg-white text-slate-950 transition-transform duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <Icon name="arrow" className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
