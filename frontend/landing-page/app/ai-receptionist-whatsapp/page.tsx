import type { Metadata } from "next";
import JsonLd from "@/components/landing/JsonLd";
import { pageMetadata } from "@/lib/site";
import { landingPageSchemas } from "@/lib/schema";
import Link from "next/link";
import Nav from "@/components/landing/Nav";
import Footer3D from "@/components/landing/Footer3D";

export const metadata: Metadata = pageMetadata({
  path: "/ai-receptionist-whatsapp",
  title: "AI Receptionist for WhatsApp | AMSh Healthcare CRM",
  description:
    "Automate patient inquiries, appointment scheduling, and post-op follow-ups on WhatsApp. Official Meta Cloud API integration with 2-way EHR and Google Calendar sync.",
  ogTitle: "AI Receptionist for WhatsApp | AMSh Healthcare CRM",
  ogDescription:
    "Transform your clinic WhatsApp into an autonomous 24/7 front-desk employee. Books appointments, sends intake forms, and answers FAQs instantly.",
});

const WHATSAPP_FEATURES = [
  {
    title: "Instant 24/7 Appointment Booking",
    desc: "Patients message your clinic on WhatsApp at 11:00 PM. AMSh instantly replies in natural language, queries doctor calendars, and sends interactive booking confirmation buttons in under 5 seconds.",
    badge: "Meta Cloud API",
    stat: "<5 sec",
    statLabel: "Average First Response Time",
  },
  {
    title: "Automated Pre-Op & Post-Procedure Follow-ups",
    desc: "Automatically delivers fasting instructions before morning surgeries, digital intake forms, and day-1 post-op wellness check-ins: 'How is the swelling today? Reply 1 for good, 2 if you need a nurse callback.'",
    badge: "Clinical Care Pathways",
    stat: "91%",
    statLabel: "Patient Response Rate on WhatsApp",
  },
  {
    title: "Multi-Language Front-Desk Conversations",
    desc: "Fluently converses in English, Spanish, Arabic, Hindi, and 30+ regional languages. Guarantees non-native speaking patients receive clear medical guidance and booking support.",
    badge: "30+ Languages Supported",
    stat: "100%",
    statLabel: "Localization Accuracy",
  },
  {
    title: "Zero-Setup Meta Verified Green Badge Ready",
    desc: "Runs directly on your clinic's official WhatsApp Business number via official Meta Cloud APIs. Completely eliminates risks of number bans associated with unofficial scrapers.",
    badge: "Enterprise Meta Verified",
    stat: "100%",
    statLabel: "Official API Compliant",
  },
];

const USE_CASES = [
  {
    title: "Dentistry & Orthodontics",
    icon: "🦷",
    text: "Hygiene recall reminders, aligner check-in photos, emergency toothache photo triage.",
  },
  {
    title: "Dermatology & Aesthetics",
    icon: "✨",
    text: "Pre-treatment chemical peel prep, laser aftercare tips, consultation deposit collection.",
  },
  {
    title: "General Practice & Family Clinics",
    icon: "🩺",
    text: "Lab test result notifications, flu shot booking, routine medication refill triage.",
  },
  {
    title: "Pediatrics & Child Care",
    icon: "👶",
    text: "Vaccination milestone schedules, fever management advice, urgent pediatrician consults.",
  },
];

export default function AiReceptionistWhatsappPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      <Nav />
      <JsonLd data={landingPageSchemas("/ai-receptionist-whatsapp", String(metadata.description))} />

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28 border-b border-slate-100 bg-gradient-to-b from-emerald-50/40 via-white to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Headline */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3.5 py-1.5 font-mono-ui text-xs font-semibold text-emerald-800 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>OFFICIAL META WHATSAPP CLOUD API FOR CLINICS</span>
              </div>

              <h1 className="font-sora text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.15] tracking-tight text-slate-950">
                Turn your clinic WhatsApp into a 24/7 AI Receptionist.
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 leading-relaxed font-normal max-w-2xl">
                Patients prefer texting on WhatsApp over waiting on hold. AMSh automates patient intake, answers clinic FAQs, sends pre-op reminders, and books doctor appointments directly into your calendar.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <a
                  href="/pilot"
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-700 hover:shadow-emerald-500/35 active:scale-[0.98]"
                >
                  Start WhatsApp Clinic Pilot
                  <span className="ml-2 font-bold">&rarr;</span>
                </a>
                <a
                  href="#chat-demo"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-base font-medium text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  See Interactive WhatsApp Demo
                </a>
              </div>

              {/* Metrics */}
              <div className="pt-4 grid grid-cols-3 gap-4 border-t border-slate-100 max-w-lg">
                <div>
                  <div className="font-sora text-2xl font-bold text-slate-900">&lt;5 sec</div>
                  <div className="text-xs text-slate-500 font-medium">WhatsApp Reply Speed</div>
                </div>
                <div>
                  <div className="font-sora text-2xl font-bold text-emerald-600">91%</div>
                  <div className="text-xs text-slate-500 font-medium">Patient Open Rate</div>
                </div>
                <div>
                  <div className="font-sora text-2xl font-bold text-slate-900">30+</div>
                  <div className="text-xs text-slate-500 font-medium">Languages Supported</div>
                </div>
              </div>
            </div>

            {/* Right: Simulated WhatsApp Chat Card */}
            <div className="lg:col-span-5" id="chat-demo">
              <div className="rounded-2xl border border-slate-200 bg-[#efeae2] p-4 shadow-xl relative overflow-hidden">
                {/* Simulated WhatsApp Header */}
                <div className="bg-[#005c4b] text-white px-4 py-3 rounded-xl flex items-center justify-between mb-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs text-white">
                      AM
                    </div>
                    <div>
                      <div className="text-sm font-semibold flex items-center gap-1.5">
                        Smiles Dental Clinic
                        <span className="text-[10px] bg-emerald-400 text-slate-900 px-1 rounded font-bold">
                          &check;
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-200">Online &bull; 24/7 AI Receptionist</div>
                    </div>
                  </div>
                </div>

                {/* Chat Bubbles */}
                <div className="space-y-3 text-xs sm:text-sm font-sans pb-2">
                  {/* Patient */}
                  <div className="flex justify-end">
                    <div className="bg-[#d9fdd3] text-slate-900 p-3 rounded-xl rounded-tr-none max-w-[85%] shadow-xs">
                      Hi, do you have any appointments available for tooth whitening this Friday?
                      <div className="text-[10px] text-slate-400 text-right mt-1">10:42 PM</div>
                    </div>
                  </div>

                  {/* AI Assistant */}
                  <div className="flex justify-start">
                    <div className="bg-white text-slate-900 p-3 rounded-xl rounded-tl-none max-w-[85%] shadow-xs space-y-2">
                      <p>
                        Hello! 👋 Yes, Dr. Patel has openings for In-Office Laser Whitening this Friday, Oct 16th:
                      </p>
                      <div className="space-y-1.5 pt-1">
                        <button className="w-full text-left bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-medium px-2.5 py-1.5 rounded-lg text-xs">
                          Option 1: 11:30 AM (Chair 1)
                        </button>
                        <button className="w-full text-left bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-medium px-2.5 py-1.5 rounded-lg text-xs">
                          Option 2: 3:15 PM (Chair 1)
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-400 text-right mt-1">10:42 PM &bull; Instant</div>
                    </div>
                  </div>

                  {/* Patient */}
                  <div className="flex justify-end">
                    <div className="bg-[#d9fdd3] text-slate-900 p-3 rounded-xl rounded-tr-none max-w-[85%] shadow-xs">
                      Option 1 at 11:30 AM works great for me!
                      <div className="text-[10px] text-slate-400 text-right mt-1">10:43 PM</div>
                    </div>
                  </div>

                  {/* AI Confirmation */}
                  <div className="flex justify-start">
                    <div className="bg-white text-slate-900 p-3 rounded-xl rounded-tl-none max-w-[85%] shadow-xs border-l-4 border-emerald-500">
                      <p className="font-semibold text-emerald-900">
                        &check; Appointment Confirmed!
                      </p>
                      <p className="text-slate-600 text-xs mt-1">
                        Friday, Oct 16th at 11:30 AM with Dr. Patel. We have added this to your calendar and sent your pre-visit intake form below.
                      </p>
                      <div className="text-[10px] text-slate-400 text-right mt-1">10:43 PM</div>
                    </div>
                  </div>
                </div>

                <div className="text-center text-[11px] text-slate-500 mt-2">
                  Official WhatsApp Business Cloud API &bull; 2-Way Calendar Sync
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 2. CAPABILITIES GRID */}
      <section className="py-20 sm:py-28 bg-slate-50/60 border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <h2 className="font-mono-ui text-xs font-bold uppercase tracking-wider text-emerald-700">
              Omnichannel Messaging Architecture
            </h2>
            <p className="font-sora text-3xl font-bold text-slate-950">
              Why clinics run their front-desk on WhatsApp with AMSh.
            </p>
            <p className="text-slate-600 text-base">
              Over 90% of patients prefer WhatsApp over checking emails or returning voicemails.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {WHATSAPP_FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs hover:shadow-xl hover:border-emerald-300 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    {f.badge}
                  </span>
                  <span className="font-sora text-xl font-bold text-emerald-600">
                    {f.stat}
                  </span>
                </div>
                <h3 className="font-sora text-xl font-bold text-slate-950 mb-3">
                  {f.title}
                </h3>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  {f.desc}
                </p>
                <div className="mt-4 text-xs text-slate-400 font-medium">
                  {f.statLabel}
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 3. CLINIC SPECIALTY CARDS */}
      <section className="py-20 bg-white border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <h2 className="font-sora text-3xl font-bold text-slate-950">
              Tailored for Every Medical Practice.
            </h2>
            <p className="text-slate-600 text-base">
              Pre-configured conversational templates designed for specific healthcare specialties.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {USE_CASES.map((uc) => (
              <div
                key={uc.title}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 hover:bg-white hover:border-emerald-300 hover:shadow-md transition-all"
              >
                <div className="text-3xl mb-3">{uc.icon}</div>
                <h3 className="font-sora text-base font-bold text-slate-900 mb-2">{uc.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{uc.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. CALL TO ACTION STRIP */}
      <section className="py-16 sm:py-20 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/40 via-teal-900/30 to-indigo-950/40" />
        <div className="relative mx-auto max-w-4xl px-4 text-center space-y-6">
          <h2 className="font-sora text-3xl sm:text-4xl font-bold tracking-tight">
            Connect your clinic WhatsApp in 15 minutes.
          </h2>
          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto">
            Give your patients instant answers and automated booking on the app they already use every day.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <a
              href="/pilot"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-7 py-4 text-base font-semibold text-white shadow-xl shadow-emerald-500/30 hover:bg-emerald-500 transition-all active:scale-[0.98]"
            >
              Start 14-Day Free Pilot
              <span className="ml-2 font-bold">&rarr;</span>
            </a>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-6 py-4 text-base font-medium text-white hover:bg-white/10 transition-colors"
            >
              Back to Overview
            </Link>
          </div>
        </div>
      </section>

      <Footer3D />
    </div>
  );
}
