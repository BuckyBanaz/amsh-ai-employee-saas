import type { Metadata } from "next";
import Link from "next/link";
import { Sora } from "next/font/google";
import "./landing.css";
import Nav from "@/components/landing/Nav";
import Hero from "@/components/landing/Hero";
import ChatDemo from "@/components/landing/ChatDemo";
import WhatsAppPhone from "@/components/landing/WhatsAppPhone";
import DemoOrb from "@/components/landing/DemoOrb";
import { BrandIcon } from "@/components/landing/BrandIcon";
import { Magnetic, Reveal, SpotlightCard, Stagger, StaggerItem } from "@/components/landing/Motion";
import FeatureBento from "@/components/landing/FeatureBento";
import ProductTour from "@/components/landing/ProductTour";
import PartnersMarquee from "@/components/landing/PartnersMarquee";
import Testimonials from "@/components/landing/Testimonials";
import Footer3D from "@/components/landing/Footer3D";
import { Icon, type IconName } from "@/components/landing/icons";
import { Logo } from "@/components/landing/Logo";
import SeoScripts from "@/components/landing/SeoScripts";
import { getSeo } from "@/lib/seo";

// Positioning: AMSh is the clinic's 24/7 AI employee that works alongside the
// team — outcome first (no missed enquiries, booked appointments), tech later.
// Design (ui-ux-pro-max): glass + 3D depth, trust indigo/cyan, Sora display.
const sora = Sora({ subsets: ["latin"], variable: "--font-display", display: "swap" });

const FALLBACK_TITLE = "AMSh — Your Clinic's 24/7 AI Employee";
const FALLBACK_DESCRIPTION =
  "AMSh answers calls, handles WhatsApp conversations, books appointments and follows up with patients — even when your team is busy or your clinic is closed.";

// Title, description, social image, canonical and noindex come from the admin portal's SEO page (cached 5 minutes);
// the text above is only used when the API cannot be reached.
export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeo();
  const page = seo?.pages["/landing"];
  if (!seo || !page) return { title: FALLBACK_TITLE, description: FALLBACK_DESCRIPTION };
  return {
    title: page.full_title || FALLBACK_TITLE,
    description: page.description || FALLBACK_DESCRIPTION,
    alternates: page.canonical ? { canonical: page.canonical } : undefined,
    robots: page.noindex ? { index: false, follow: false } : undefined,
    openGraph: { title: page.full_title, description: page.description, siteName: seo.site_name, locale: seo.locale, type: "website", url: page.canonical || undefined, images: page.og_image ? [page.og_image] : undefined },
    twitter: { card: page.og_image ? "summary_large_image" : "summary", title: page.full_title, description: page.description, site: seo.twitter_handle || undefined, images: page.og_image ? [page.og_image] : undefined },
    verification: { google: seo.verification.google || undefined, other: seo.verification.bing ? { "msvalidate.01": seo.verification.bing } : undefined },
  };
}

const DISPLAY = "font-[family-name:var(--font-display)]";
const FOCUS_DARK = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";
const FOCUS_LIGHT = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2";

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------
const AUDIENCES = [
  "Dental clinics", "Aesthetic clinics", "Medical clinics", "Multi-location groups", "Dermatology",
  "Physiotherapy", "Eye care", "Pediatrics", "Orthopedics", "Diagnostic centers",
];

const OUTCOMES: { icon: IconName; title: string; body: string }[] = [
  { icon: "phone", title: "No more missed calls", body: "Every call is answered on the first ring — even when three lines ring at once." },
  { icon: "message", title: "No unanswered WhatsApps", body: "Patients get a reply in seconds, not the next morning." },
  { icon: "calendar", title: "More booked appointments", body: "Enquiries turn into confirmed bookings, day and night." },
];

const WHATSAPP_POINTS: { icon: IconName; title: string; body: string }[] = [
  { icon: "sparkles", title: "Answers patient questions", body: "Timings, fees, doctors, services and directions — from your clinic's own information." },
  { icon: "calendar", title: "Books straight into the schedule", body: "Shares real free slots and confirms the booking in the chat." },
  { icon: "repeat", title: "Follows up for you", body: "Reminders before visits and recalls after, so fewer patients no-show." },
  { icon: "transfer", title: "Hands over when it matters", body: "Your staff can take over any conversation, with the full context." },
];

const DAY: { time: string; icon: IconName; title: string; body: string }[] = [
  { time: "7:40 AM", icon: "phone", title: "Before you open", body: "A patient calls to ask if the clinic has parking. Answered." },
  { time: "11:15 AM", icon: "calendar", title: "Rush hour", body: "Three calls at once. All answered, two bookings made." },
  { time: "4:30 PM", icon: "repeat", title: "Reschedule", body: "A patient moves tomorrow's visit. The slot is freed for someone else." },
  { time: "10:05 PM", icon: "moon", title: "After hours", body: "A WhatsApp enquiry becomes a booked appointment for tomorrow." },
];

const STEPS = [
  { title: "Tell AMSh about your clinic", body: "Doctors, services, hours and FAQs — a guided setup, no technical skills needed." },
  { title: "Connect your phone & WhatsApp", body: "Keep your existing clinic number by forwarding it, or get a new one." },
  { title: "AMSh starts its first shift", body: "It handles calls and chats from day one. Your team watches everything from the dashboard." },
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
    desc: "For busy clinics with high call and WhatsApp volume.",
    features: ["2,000 voice minutes / mo", "5 concurrent patient calls", "AI number or call forwarding", "Any-language AI", "Call recording & transcripts", "WhatsApp reminders"],
    featured: true,
  },
  {
    name: "Multi-Location / Hospital",
    price: 399,
    desc: "For clinic groups and multi-doctor centers.",
    features: ["6,000 voice minutes / mo", "15 concurrent patient calls", "Multiple lines & forwarding trunks", "Custom EHR / EMR webhooks", "24/7 dedicated account manager"],
    featured: false,
  },
];

const FAQS = [
  { q: "Does AMSh replace my front-desk staff?", a: "No. AMSh works alongside your team as an extra digital employee. It takes the repetitive calls and messages so your staff can focus on patients in the clinic — and anyone on your team can step into a conversation at any time." },
  { q: "Which languages does AMSh speak?", a: "AMSh talks with patients in the language they use — English, Spanish, French, Arabic, Hindi and many more — and can switch mid-conversation if the patient does." },
  { q: "Will patients know they're talking to AI?", a: "AMSh introduces itself as your clinic's assistant. It speaks naturally, and patients can ask for a person at any time — the conversation is handed to your staff with a summary." },
  { q: "Can I keep my existing clinic phone number?", a: "Yes. Forward your current number to AMSh (all the time, after hours, or only when busy), or use a new dedicated number." },
  { q: "What about medical emergencies?", a: "AMSh is not a triage tool. When a caller describes an emergency it immediately advises them to contact emergency services and can transfer to your on-call staff." },
  { q: "How is patient data protected?", a: "Conversations are encrypted in transit and at rest, access is limited to your team, and you control how long recordings are kept." },
  { q: "How long does it take to get started?", a: "The guided onboarding walks you through your clinic details, hours, staff, services and phone setup — most clinics finish it in one sitting." },
];

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------
function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
        dark ? "border-white/15 bg-white/5 text-cyan-200" : "border-indigo-100 bg-indigo-50 text-indigo-700"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dark ? "bg-cyan-300" : "bg-indigo-600"}`} />
      {children}
    </span>
  );
}

function SectionHeader({ eyebrow, title, body, dark = false }: { eyebrow: string; title: string; body?: string; dark?: boolean }) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <Eyebrow dark={dark}>{eyebrow}</Eyebrow>
      <h2 className={`${DISPLAY} mt-5 text-balance text-3xl font-semibold tracking-tight sm:text-5xl ${dark ? "text-white" : "text-slate-950"}`}>{title}</h2>
      {body && <p className={`mt-5 text-pretty text-lg leading-relaxed ${dark ? "text-slate-300" : "text-slate-600"}`}>{body}</p>}
    </Reveal>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------
function Outcomes() {
  return (
    <section className="relative bg-[#050816] pb-24 pt-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Stagger className="grid gap-4 md:grid-cols-3">
          {OUTCOMES.map((o) => (
            <StaggerItem key={o.title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-cyan-400/25 to-indigo-500/25 text-cyan-200 ring-1 ring-white/10">
                <Icon name={o.icon} className="h-5 w-5" />
              </span>
              <h2 className={`${DISPLAY} mt-5 text-xl font-semibold text-white`}>{o.title}</h2>
              <p className="mt-2 leading-relaxed text-slate-300">{o.body}</p>
            </StaggerItem>
          ))}
        </Stagger>

        <p className="mt-16 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Built for clinics that are always busy</p>
        <div className="lp-marquee mt-6 overflow-hidden w-full max-w-full" style={{ contain: "paint" }}>
          <ul className="lp-marquee-track flex w-max gap-3">
            {[...AUDIENCES, ...AUDIENCES].map((p, i) => (
              <li
                key={`${p}-${i}`}
                aria-hidden={i >= AUDIENCES.length}
                className="flex items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-slate-300"
              >
                <Icon name="stethoscope" className="h-4 w-4 text-cyan-300/80" /> {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function SeeIt() {
  return (
    <section id="see-it" className="relative scroll-mt-20 overflow-hidden bg-[#050816] py-16 sm:py-20">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[140px]" />
      </div>
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader
          dark
          eyebrow="See AMSh in action"
          title="Talk to your new front-desk employee."
          body="Ask what a patient would ask — in any language. Book an appointment, ask about after-hours, or ask whether it replaces your team."
        />
        <Reveal className="mt-8" delay={0.1}>
          <ChatDemo />
        </Reveal>
      </div>
    </section>
  );
}

function WhatsAppSection() {
  return (
    <section id="whatsapp" className="relative scroll-mt-24 overflow-hidden bg-[#F6F8FC] py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-2">
        <div className="order-2 lg:order-1">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">
              <BrandIcon name="whatsapp" className="h-4 w-4" /> On WhatsApp
            </span>
            <h2 className={`${DISPLAY} mt-5 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl`}>
              Where your patients already are.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              Patients message at 10 PM. AMSh replies at 10 PM — and books them in before they message the clinic down the road.
            </p>
          </Reveal>
          <Stagger className="mt-10 grid gap-4 sm:grid-cols-2">
            {WHATSAPP_POINTS.map((c) => (
              <StaggerItem key={c.title} className="rounded-2xl border border-slate-200/70 bg-white p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Icon name={c.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold text-slate-950">{c.title}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{c.body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
        <div className="order-1 lg:order-2">
          <WhatsAppPhone />
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="scroll-mt-24 bg-[#F6F8FC] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader
          eyebrow="What AMSh does"
          title="Everything a great front desk does. In every language."
          body="Calls, WhatsApp, bookings and follow-ups — handled, logged and ready for your team to review."
        />
        <FeatureBento />
      </div>
    </section>
  );
}

function Tour() {
  return (
    <section id="product" className="scroll-mt-24 overflow-hidden bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader
          eyebrow="The AMSh console"
          title="See everything AMSh does for your clinic."
          body="Appointments, calls, conversations and analytics — in one simple console your whole team can use."
        />
        <div className="mt-8">
          <ProductTour />
        </div>
      </div>
    </section>
  );
}

function DayWithAmsh() {
  return (
    <section className="relative overflow-hidden bg-[#050816] py-16 sm:py-20">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/20 blur-[140px]" />
      </div>
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader dark eyebrow="A day at your clinic" title="One shift that never ends." body="While your team looks after the waiting room, AMSh looks after everyone else." />
        <Stagger className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {DAY.map((c) => (
            <StaggerItem key={c.title}>
              <SpotlightCard dark className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
                <span className={`${DISPLAY} block text-2xl font-semibold text-white/35`}>{c.time}</span>
                <span className="mt-4 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-cyan-400/25 to-indigo-500/25 text-cyan-200 ring-1 ring-white/10">
                  <Icon name={c.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-white">{c.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-300">{c.body}</p>
              </SpotlightCard>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-[#F6F8FC] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader eyebrow="How it works" title="Your AI employee starts in three steps." body="No hardware, no IT team. If you can fill in a form, you can set up AMSh." />
        <Stagger as="div" className="relative mt-16 grid gap-10 lg:grid-cols-3 lg:gap-6">
          <div aria-hidden="true" className="absolute left-[16%] right-[16%] top-10 hidden h-px bg-gradient-to-r from-cyan-300 via-indigo-400 to-violet-400 lg:block" />
          {STEPS.map((s, i) => (
            <StaggerItem as="div" key={s.title} className="relative text-center">
              <div className="mx-auto grid h-20 w-20 place-items-center" style={{ perspective: 600 }}>
                <div className="relative grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_20px_40px_-12px_rgba(79,70,229,0.6),inset_0_1px_0_rgba(255,255,255,0.35)] [transform:rotateX(18deg)_rotateY(-18deg)]">
                  <span className={`${DISPLAY} text-3xl font-semibold`}>{i + 1}</span>
                </div>
              </div>
              <h3 className={`${DISPLAY} mt-7 text-xl font-semibold text-slate-950`}>{s.title}</h3>
              <p className="mx-auto mt-3 max-w-xs leading-relaxed text-slate-600">{s.body}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader eyebrow="Pricing" title="A full-time employee for less than a part-time salary." body="Every plan starts with a 14-day free trial. Pay annually and get 2 months free." />
        <Stagger className="mt-16 grid items-stretch gap-6 lg:grid-cols-3">
          {PLANS.map((p) => (
            <StaggerItem key={p.name}>
              <SpotlightCard
                dark={p.featured}
                className={`flex flex-col overflow-visible rounded-3xl p-8 ${
                  p.featured
                    ? "lp-border-glow bg-[#070b1f] text-white shadow-[0_40px_80px_-30px_rgba(79,70,229,0.6)]"
                    : "border border-slate-200 bg-slate-50/60 text-slate-950"
                }`}
              >
                {p.featured && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                    Most popular
                  </span>
                )}
                <h3 className={`${DISPLAY} text-xl font-semibold`}>{p.name}</h3>
                <p className={`mt-2 text-[15px] ${p.featured ? "text-slate-300" : "text-slate-600"}`}>{p.desc}</p>
                <p className="mt-6 flex items-baseline gap-1">
                  <span className={`${DISPLAY} text-5xl font-semibold tracking-tight`}>${p.price}</span>
                  <span className={p.featured ? "text-slate-300" : "text-slate-600"}>/ month</span>
                </p>
                <ul className="mt-8 flex-1 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-[15px]">
                      <Icon name="check" className={`mt-0.5 h-5 w-5 shrink-0 ${p.featured ? "text-cyan-300" : "text-indigo-600"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-200 ${
                    p.featured
                      ? `bg-white text-slate-950 hover:bg-cyan-50 ${FOCUS_DARK}`
                      : `border border-slate-300 bg-white text-slate-950 hover:border-indigo-500 hover:text-indigo-700 ${FOCUS_LIGHT}`
                  }`}
                >
                  Start free trial
                </Link>
              </SpotlightCard>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 bg-[#F6F8FC] py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeader eyebrow="FAQ" title="Questions clinics ask us." />
        <Stagger as="div" className="mt-12 space-y-3">
          {FAQS.map((f) => (
            <StaggerItem as="div" key={f.q}>
              <details className="lp-faq group rounded-2xl border border-slate-200 bg-white px-6 open:shadow-[0_20px_40px_-24px_rgba(15,23,42,0.25)]">
                <summary className={`flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 rounded-xl py-4 text-left font-semibold text-slate-950 ${FOCUS_LIGHT}`}>
                  {f.q}
                  <Icon name="chevron" className="lp-faq-chevron h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200" />
                </summary>
                <p className="pb-5 leading-relaxed text-slate-600">{f.a}</p>
              </details>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

function BookDemo() {
  return (
    <section id="book-demo" className="scroll-mt-24 bg-[#F6F8FC] px-4 pb-24 sm:px-6">
      <Reveal className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-[#050816] px-6 pb-20 pt-12 text-center sm:px-16">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/4 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/30 blur-[100px]" />
            <div className="lp-grid-floor opacity-60" />
          </div>
          <div className="relative">
            <DemoOrb className="mx-auto -mt-8 mb-2 h-56 w-56 sm:h-64 sm:w-64" />
            <h2 className={`${DISPLAY} mx-auto max-w-3xl text-balance text-3xl font-semibold tracking-tight text-white sm:text-5xl`}>
              Never miss a patient enquiry <span className="lp-gradient-text">again.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-slate-300">
              See how AMSh would handle your clinic&apos;s calls and WhatsApp messages. A 20-minute walkthrough, tailored to your clinic.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Magnetic>
                <Link href="/register" className={`inline-flex min-h-13 items-center gap-2 rounded-2xl bg-white px-7 py-3.5 font-semibold text-slate-950 shadow-[0_0_40px_-5px_rgba(103,232,249,0.7)] ${FOCUS_DARK}`}>
                  Book a Demo <Icon name="arrow" className="h-4 w-4" />
                </Link>
              </Magnetic>
              <a href="#see-it" className={`inline-flex min-h-13 items-center rounded-2xl border border-white/15 px-6 py-3.5 font-semibold text-white hover:bg-white/10 ${FOCUS_DARK}`}>
                See AMSh in Action
              </a>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export default async function LandingPage() {
  const seo = await getSeo(); // structured data and analytics tags from the admin SEO settings
  return (
    <div className={`${sora.variable} min-h-screen bg-[#050816] w-full max-w-full overflow-x-hidden`}>
      <SeoScripts seo={seo} />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg">
        Skip to content
      </a>
      <Nav />
      <main id="main" className="w-full max-w-full overflow-x-hidden">
        <Hero />
        <Outcomes />
        <SeeIt />
        <WhatsAppSection />
        <Features />
        <Testimonials />
        <Tour />
        <DayWithAmsh />
        <HowItWorks />
        <Pricing />
        <PartnersMarquee />
        <Faq />
        <BookDemo />
      </main>
      <Footer3D />
    </div>
  );
}
