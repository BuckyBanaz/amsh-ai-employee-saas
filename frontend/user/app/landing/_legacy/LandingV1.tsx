import type { Metadata } from "next";
import Link from "next/link";
import { Lexend, Source_Sans_3 } from "next/font/google";

// Design system (ui-ux-pro-max): calm cyan + health green, Lexend / Source Sans 3.
// Primary/accent are darkened one step from the generated palette so white
// button text clears WCAG AA (4.5:1).
const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend", display: "swap" });
const sourceSans = Source_Sans_3({ subsets: ["latin"], variable: "--font-source-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Amsh — AI Receptionist for Clinics & Hospitals",
  description:
    "Amsh answers every patient call 24/7, books appointments into your calendar, and sends WhatsApp reminders — so your front desk can focus on patients.",
};

const HEADING = "font-[family-name:var(--font-lexend)]";
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E7490] focus-visible:ring-offset-2";
const BTN_PRIMARY = `inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0E7490] px-6 font-semibold text-white shadow-[0_8px_20px_-8px_rgba(14,116,144,0.6)] transition-colors duration-200 hover:bg-[#155E75] cursor-pointer ${FOCUS}`;
const BTN_SECONDARY = `inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#CFE8EE] bg-white px-6 font-semibold text-[#164E63] transition-colors duration-200 hover:border-[#0E7490] hover:bg-[#F0FDFF] cursor-pointer ${FOCUS}`;

// ---------------------------------------------------------------------------
// Icons (Lucide-style line icons, decorative → aria-hidden)
// ---------------------------------------------------------------------------
type IconName =
  | "phone" | "calendar" | "message" | "clock" | "shield" | "globe" | "transfer"
  | "file" | "check" | "arrow" | "menu" | "stethoscope" | "chevron" | "star" | "mic";

const ICON_PATHS: Record<IconName, React.ReactNode> = {
  phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4" /></>,
  message: <path d="M21 11.5a8.4 8.4 0 0 1-12.2 7.5L3 21l2-5.8A8.5 8.5 0 1 1 21 11.5Z" />,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
  globe: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" /></>,
  transfer: <path d="M17 3l4 4-4 4M21 7H9M7 21l-4-4 4-4M3 17h12" />,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  arrow: <path d="M5 12h14M12 5l7 7-7 7" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  stethoscope: <><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 12 0V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" /><path d="M8 15v1a6 6 0 0 0 12 0v-4" /><circle cx="20" cy="10" r="2" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  star: <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1Z" />,
  mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" /></>,
};

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------
const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const PROBLEMS = [
  { stat: "1 in 3", label: "patient calls go unanswered during clinic hours" },
  { stat: "62%", label: "of callers won't leave a voicemail — they call the next clinic" },
  { stat: "4+ hrs", label: "a day your front desk spends on the phone instead of patients" },
];

const STEPS = [
  {
    title: "Tell Amsh about your clinic",
    body: "Add doctors, services, opening hours and FAQs — or paste your website and let Amsh learn it in minutes.",
  },
  {
    title: "Connect your line & calendar",
    body: "Get a dedicated AI number or forward your existing line. Sync Google or Outlook so bookings land where you already work.",
  },
  {
    title: "Go live — patients get answers 24/7",
    body: "Amsh answers, books, reschedules and hands urgent calls to your staff. You review every transcript from the dashboard.",
  },
];

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: "phone", title: "Answers every call", body: "Natural voice AI picks up instantly, day or night, and handles multiple patients at once." },
  { icon: "calendar", title: "Books appointments", body: "Checks live doctor availability and books, reschedules or cancels directly in your calendar." },
  { icon: "message", title: "WhatsApp reminders", body: "Automatic confirmations and reminders cut no-shows without extra work for your team." },
  { icon: "transfer", title: "Smart human handoff", body: "Urgent or complex calls are transferred to your staff with a summary of the conversation." },
  { icon: "globe", title: "Multi-language", body: "Speaks with patients in their preferred language, so nobody is left on hold for a translator." },
  { icon: "file", title: "Transcripts & insights", body: "Every call is recorded, transcribed and summarised so nothing falls through the cracks." },
];

const TRANSCRIPT = [
  { who: "patient", text: "Hi, I'd like to see Dr. Mehta about my knee this week." },
  { who: "ai", text: "Of course. Dr. Mehta has Thursday at 10:30 or Friday at 4:15. Which works better?" },
  { who: "patient", text: "Thursday, please." },
  { who: "ai", text: "Done — Thursday 10:30 with Dr. Mehta. I've sent a WhatsApp confirmation to this number." },
];

// Placeholder quotes — replace with verified customer testimonials before launch.
const TESTIMONIALS = [
  {
    quote: "Our receptionists used to juggle three lines at once. Now Amsh handles the routine bookings and they finally have time for patients at the desk.",
    name: "Practice Manager",
    org: "Multi-specialty clinic",
  },
  {
    quote: "After-hours calls used to go straight to voicemail. Now they turn into booked appointments by the time we open in the morning.",
    name: "Clinic Owner",
    org: "Dental practice",
  },
  {
    quote: "Setup took an afternoon. The transcripts alone have changed how we train our front-desk team.",
    name: "Operations Lead",
    org: "Physiotherapy center",
  },
];

const PLANS = [
  {
    name: "Starter Practice",
    price: 99,
    desc: "For solo practitioners and small clinics.",
    features: ["500 voice minutes / mo", "2 concurrent patient calls", "Dedicated AI phone number", "Google & Outlook calendar sync", "Human call transfer"],
    featured: false,
  },
  {
    name: "Professional Clinic",
    price: 199,
    desc: "For busy clinics that need more capacity.",
    features: ["2,000 voice minutes / mo", "5 concurrent patient calls", "AI number or call forwarding", "Multi-language AI", "Call recording & transcripts", "WhatsApp reminders"],
    featured: true,
  },
  {
    name: "Multi-Location / Hospital",
    price: 399,
    desc: "For multi-doctor centers and high call volume.",
    features: ["6,000 voice minutes / mo", "15 concurrent patient calls", "Multiple lines & forwarding trunks", "Custom EHR / EMR webhooks", "24/7 dedicated account manager"],
    featured: false,
  },
];

const FAQS = [
  {
    q: "Will patients know they're talking to an AI?",
    a: "Amsh introduces itself as your clinic's virtual assistant. It speaks naturally, and patients can ask for a human at any time — the call is transferred to your staff.",
  },
  {
    q: "Can I keep my existing clinic phone number?",
    a: "Yes. You can forward your current number to Amsh (all the time, after hours, or only when busy), or use a new dedicated AI number.",
  },
  {
    q: "What happens with medical emergencies?",
    a: "Amsh is not a triage tool. When a caller describes an emergency it immediately advises them to contact emergency services and can transfer to your on-call staff.",
  },
  {
    q: "How is patient data protected?",
    a: "Calls and transcripts are encrypted in transit and at rest, access is limited to your team, and you control how long recordings are kept.",
  },
  {
    q: "How long does setup take?",
    a: "Most clinics are live the same day. The guided onboarding walks you through your details, hours, staff, services and phone setup.",
  },
];

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------
function Logo() {
  return (
    <Link href="/landing" className={`flex items-center gap-2 rounded-lg ${FOCUS}`} aria-label="Amsh home">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0E7490] text-white">
        <Icon name="stethoscope" className="h-5 w-5" />
      </span>
      <span className={`${HEADING} text-xl font-semibold tracking-tight text-[#164E63]`}>Amsh</span>
    </Link>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#CFE8EE]/70 bg-white/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="Main">
        <Logo />
        <ul className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className={`rounded text-[15px] font-medium text-[#475569] transition-colors duration-200 hover:text-[#0E7490] ${FOCUS}`}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className={`rounded-lg px-3 py-2 text-[15px] font-semibold text-[#164E63] hover:text-[#0E7490] ${FOCUS}`}>
            Log in
          </Link>
          <Link href="/register" className={`${BTN_PRIMARY} min-h-10 px-4 text-[15px]`}>
            Start free trial
          </Link>
        </div>
        {/* Mobile menu: native <details> keeps it keyboard-accessible without client JS */}
        <details className="group relative md:hidden">
          <summary className={`flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-lg text-[#164E63] hover:bg-[#ECFEFF] [&::-webkit-details-marker]:hidden ${FOCUS}`}>
            <Icon name="menu" className="h-6 w-6" />
            <span className="sr-only">Open menu</span>
          </summary>
          <div className="absolute right-0 top-13 w-64 rounded-2xl border border-[#CFE8EE] bg-white p-3 shadow-xl">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className={`block rounded-lg px-3 py-3 font-medium text-[#164E63] hover:bg-[#ECFEFF] ${FOCUS}`}>
                {l.label}
              </a>
            ))}
            <div className="mt-2 grid gap-2 border-t border-[#CFE8EE] pt-3">
              <Link href="/login" className={BTN_SECONDARY}>Log in</Link>
              <Link href="/register" className={BTN_PRIMARY}>Start free trial</Link>
            </div>
          </div>
        </details>
      </nav>
    </header>
  );
}

function CallCard() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div aria-hidden="true" className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-[#A5F3FC]/60 via-transparent to-[#A7F3D0]/60 blur-2xl" />
      <figure className="rounded-3xl border border-[#CFE8EE] bg-white p-5 shadow-[0_24px_60px_-24px_rgba(22,78,99,0.35)] sm:p-6">
        <div className="flex items-center justify-between border-b border-[#E8F1F6] pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ECFEFF] text-[#0E7490]">
              <Icon name="mic" />
            </span>
            <div>
              <p className={`${HEADING} text-sm font-semibold text-[#164E63]`}>Incoming call</p>
              <p className="text-sm text-[#475569]">Answered by Amsh · 00:42</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF5] px-2.5 py-1 text-xs font-semibold text-[#047857]">
            <span className="h-2 w-2 rounded-full bg-[#10B981] motion-safe:animate-pulse" aria-hidden="true" />
            Live
          </span>
        </div>
        <figcaption className="sr-only">Example conversation between a patient and the Amsh AI receptionist</figcaption>
        <ul className="space-y-3 pt-4">
          {TRANSCRIPT.map((m, i) => (
            <li key={i} className={m.who === "ai" ? "flex justify-start" : "flex justify-end"}>
              <p
                className={
                  m.who === "ai"
                    ? "max-w-[85%] rounded-2xl rounded-bl-md bg-[#ECFEFF] px-4 py-2.5 text-[15px] leading-relaxed text-[#164E63]"
                    : "max-w-[85%] rounded-2xl rounded-br-md bg-[#0E7490] px-4 py-2.5 text-[15px] leading-relaxed text-white"
                }
              >
                <span className="sr-only">{m.who === "ai" ? "Amsh: " : "Patient: "}</span>
                {m.text}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#A7F3D0] bg-[#F0FDF4] p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#047857] text-white">
            <Icon name="calendar" className="h-4 w-4" />
          </span>
          <p className="text-sm text-[#14532D]">
            <strong className="font-semibold">Booked:</strong> Thu 10:30 · Dr. Mehta · Orthopedics
          </p>
        </div>
      </figure>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#ECFEFF] to-white">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 md:pt-20 lg:grid-cols-2 lg:pb-28">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-[#A5F3FC] bg-white px-3 py-1 text-sm font-semibold text-[#0E7490]">
            <Icon name="stethoscope" className="h-4 w-4" />
            Built for clinics, medical centers & hospitals
          </p>
          <h1 className={`${HEADING} mt-6 text-4xl font-semibold leading-[1.1] tracking-tight text-[#164E63] text-balance sm:text-5xl lg:text-[3.5rem]`}>
            Never miss a patient call again.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#475569] sm:text-xl">
            Amsh is the AI receptionist that answers every call 24/7, books appointments straight into your calendar and sends
            WhatsApp reminders — so your front desk can focus on the patients in front of them.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className={`${BTN_PRIMARY} text-base`}>
              Start 14-day free trial
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
            <a href="#how-it-works" className={`${BTN_SECONDARY} text-base`}>
              See how it works
            </a>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[15px] text-[#475569]">
            {["Live the same day", "Keep your clinic number", "No credit card to start"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Icon name="check" className="h-4 w-4 text-[#047857]" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <CallCard />
      </div>
    </section>
  );
}

function SectionHeader({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-[#0E7490]">{eyebrow}</p>
      <h2 className={`${HEADING} mt-3 text-3xl font-semibold tracking-tight text-[#164E63] text-balance sm:text-4xl`}>{title}</h2>
      {body && <p className="mt-4 text-lg leading-relaxed text-[#475569]">{body}</p>}
    </div>
  );
}

function Problem() {
  return (
    <section className="bg-white py-20 sm:py-24" aria-labelledby="problem-title">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#0E7490]">The front-desk problem</p>
          <h2 id="problem-title" className={`${HEADING} mt-3 text-3xl font-semibold tracking-tight text-[#164E63] text-balance sm:text-4xl`}>
            Every unanswered call is a patient who books somewhere else.
          </h2>
        </div>
        <dl className="mt-12 grid gap-4 sm:grid-cols-3">
          {PROBLEMS.map((p) => (
            <div key={p.stat} className="rounded-2xl border border-[#E8F1F6] bg-[#F8FCFD] p-6 text-center">
              <dt className="sr-only">{p.label}</dt>
              <dd>
                <span className={`${HEADING} block text-4xl font-semibold text-[#0E7490]`}>{p.stat}</span>
                <span className="mt-2 block text-[15px] leading-relaxed text-[#475569]">{p.label}</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-center text-sm text-[#64748B]">Industry estimates for outpatient practices.</p>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-[#F4FBFC] py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader eyebrow="How it works" title="Live in an afternoon, not a quarter." body="No IT project, no new hardware. Guided onboarding takes you from sign-up to first answered call." />
        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative rounded-2xl border border-[#E8F1F6] bg-white p-7 shadow-[0_1px_2px_rgba(22,78,99,0.04)]">
              <span className={`${HEADING} flex h-10 w-10 items-center justify-center rounded-full bg-[#0E7490] text-lg font-semibold text-white`} aria-hidden="true">
                {i + 1}
              </span>
              <h3 className={`${HEADING} mt-5 text-xl font-semibold text-[#164E63]`}>{s.title}</h3>
              <p className="mt-3 leading-relaxed text-[#475569]">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="scroll-mt-20 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader eyebrow="Features" title="A receptionist that never takes a break." body="Everything your front desk does on the phone — handled consistently, around the clock." />
        <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="group rounded-2xl border border-[#E8F1F6] bg-white p-7 transition-[border-color,box-shadow] duration-200 hover:border-[#A5F3FC] hover:shadow-[0_16px_40px_-20px_rgba(14,116,144,0.35)]">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ECFEFF] text-[#0E7490]">
                <Icon name={f.icon} className="h-6 w-6" />
              </span>
              <h3 className={`${HEADING} mt-5 text-lg font-semibold text-[#164E63]`}>{f.title}</h3>
              <p className="mt-2 leading-relaxed text-[#475569]">{f.body}</p>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#A7F3D0] bg-[#F0FDF4] p-5 text-center sm:flex-row sm:text-left">
          <Icon name="shield" className="h-6 w-6 shrink-0 text-[#047857]" />
          <p className="text-[15px] text-[#14532D]">
            <strong className="font-semibold">Privacy by design.</strong> Encrypted calls and transcripts, role-based access for your team, and full control over data retention.
          </p>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="bg-[#F4FBFC] py-20 sm:py-24" aria-labelledby="testimonials-title">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#0E7490]">From the front desk</p>
          <h2 id="testimonials-title" className={`${HEADING} mt-3 text-3xl font-semibold tracking-tight text-[#164E63] sm:text-4xl`}>
            Clinics get their time back.
          </h2>
        </div>
        <ul className="mt-14 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <li key={t.name}>
              <figure className="flex h-full flex-col rounded-2xl border border-[#E8F1F6] bg-white p-7">
                <div className="flex gap-0.5 text-[#F59E0B]" role="img" aria-label="Rated 5 out of 5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">{ICON_PATHS.star}</svg>
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-[17px] leading-relaxed text-[#164E63]">“{t.quote}”</blockquote>
                <figcaption className="mt-6 border-t border-[#E8F1F6] pt-4">
                  <p className="font-semibold text-[#164E63]">{t.name}</p>
                  <p className="text-sm text-[#475569]">{t.org}</p>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader eyebrow="Pricing" title="Simple plans that cost less than a part-time receptionist." body="Every plan starts with a 14-day free trial. Pay annually and get 2 months free." />
        <ul className="mt-14 grid gap-6 lg:grid-cols-3">
          {PLANS.map((p) => (
            <li
              key={p.name}
              className={`relative flex flex-col rounded-3xl p-8 ${
                p.featured
                  ? "border-2 border-[#0E7490] bg-white shadow-[0_24px_60px_-24px_rgba(14,116,144,0.45)]"
                  : "border border-[#E8F1F6] bg-[#F8FCFD]"
              }`}
            >
              {p.featured && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#0E7490] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  Most popular
                </span>
              )}
              <h3 className={`${HEADING} text-xl font-semibold text-[#164E63]`}>{p.name}</h3>
              <p className="mt-2 text-[15px] text-[#475569]">{p.desc}</p>
              <p className="mt-6 flex items-baseline gap-1">
                <span className={`${HEADING} text-5xl font-semibold tracking-tight text-[#164E63]`}>${p.price}</span>
                <span className="text-[#475569]">/ month</span>
              </p>
              <ul className="mt-8 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-[15px] text-[#164E63]">
                    <Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-[#047857]" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className={`${p.featured ? BTN_PRIMARY : BTN_SECONDARY} mt-8 w-full`}>
                Start free trial
                <span className="sr-only"> on {p.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 bg-[#F4FBFC] py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeader eyebrow="FAQ" title="Questions clinics ask us." />
        <div className="mt-12 space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-[#E8F1F6] bg-white open:border-[#A5F3FC]">
              <summary className={`flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-6 py-4 text-left [&::-webkit-details-marker]:hidden ${FOCUS}`}>
                <span className={`${HEADING} font-medium text-[#164E63]`}>{f.q}</span>
                <Icon name="chevron" className="h-5 w-5 shrink-0 text-[#0E7490] transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <p className="px-6 pb-5 leading-relaxed text-[#475569]">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-24">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-[#164E63] px-6 py-14 text-center sm:px-12 sm:py-16">
        <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#0891B2]/40 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#059669]/30 blur-3xl" />
        <div className="relative">
          <h2 className={`${HEADING} text-3xl font-semibold tracking-tight text-white text-balance sm:text-4xl`}>
            Give every patient a warm welcome — even at 2 a.m.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-[#CFFAFE]">
            Set up your AI receptionist today and hear it answer your first call in minutes.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-6 text-base font-semibold text-[#164E63] transition-colors duration-200 hover:bg-[#ECFEFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#164E63]"
            >
              Start 14-day free trial
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-white/30 px-6 text-base font-semibold text-white transition-colors duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#164E63]"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#E8F1F6] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 py-10 sm:flex-row sm:px-6">
        <Logo />
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[15px] text-[#475569]">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className={`rounded hover:text-[#0E7490] ${FOCUS}`}>{l.label}</a>
            </li>
          ))}
        </ul>
        <p className="text-sm text-[#64748B]">© {new Date().getFullYear()} Amsh. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className={`${lexend.variable} ${sourceSans.variable} ${sourceSans.className} min-h-screen bg-white text-[#164E63] motion-safe:scroll-smooth`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <Problem />
        <HowItWorks />
        <Features />
        <Testimonials />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
