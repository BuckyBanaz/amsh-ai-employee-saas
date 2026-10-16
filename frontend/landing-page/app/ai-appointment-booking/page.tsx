import type { Metadata } from "next";
import JsonLd from "@/components/landing/JsonLd";
import { pageMetadata } from "@/lib/site";
import { landingPageSchemas } from "@/lib/schema";
import Link from "next/link";
import Nav from "@/components/landing/Nav";
import Footer3D from "@/components/landing/Footer3D";

export const metadata: Metadata = pageMetadata({
  path: "/ai-appointment-booking",
  title: "AI Appointment Booking Assistant for Clinics & Doctors | AMSh",
  description:
    "Autonomous 24/7 AI appointment booking assistant for healthcare practices. Real-time 2-way sync with Google Calendar, Outlook, Dentrix, and EHR systems. Books patient visits on phone and WhatsApp without double-booking.",
  ogTitle: "AI Appointment Booking Assistant for Clinics & Doctors | AMSh",
  ogDescription:
    "Eliminate phone tag and empty chairs. AMSh's AI scheduling assistant books, confirms, and reschedules patient appointments 24/7 with 2-way EHR sync.",
});

const BOOKING_CAPABILITIES = [
  {
    step: "01",
    title: "Real-Time 2-Way Calendar Locking",
    desc: "Connects directly to Google Calendar, Microsoft Outlook, Dentrix, Open Dental, or EHR systems via bidirectional API. Reads live doctor availability and instantly locks slots in under 300ms without double-booking.",
    badge: "Instant Availability Sync",
    stat: "100%",
    statLabel: "Double-Booking Prevention",
  },
  {
    step: "02",
    title: "Doctor Rota & Chair Buffer Intelligence",
    desc: "Enforces your practice's exact clinical scheduling rules: distinct durations for new patient intake (45 mins) vs quick follow-ups (15 mins), buffer intervals between procedures, lunch hours, and room constraints.",
    badge: "Custom Clinic Rules",
    stat: "<300ms",
    statLabel: "Slot Validation Speed",
  },
  {
    step: "03",
    title: "Automated Rescheduling & Waitlist Backfill",
    desc: "When a patient calls to reschedule or cancel, AMSh immediately frees the slot in your calendar and can automatically offer the open appointment to waitlisted patients via WhatsApp or SMS.",
    badge: "Autonomous Cancellation Routing",
    stat: "42%",
    statLabel: "Reduction in Empty Chairs",
  },
  {
    step: "04",
    title: "Omnichannel Intake & Reminder Sequences",
    desc: "Sends instant booking confirmation links with Google Maps directions, digital intake questionnaires, pre-op fasting instructions, and automated 24-hour and 2-hour reminders that reduce no-shows.",
    badge: "WhatsApp & SMS Delivery",
    stat: "94.8%",
    statLabel: "Patient Attendance Rate",
  },
];

const COMPATIBLE_SYSTEMS = [
  { name: "Google Calendar", type: "2-Way Direct API", icon: "📅" },
  { name: "Microsoft Outlook 365", type: "Exchange / Graph API", icon: "📆" },
  { name: "Dentrix & Open Dental", type: "PMS Direct Sync", icon: "🦷" },
  { name: "Epic & Cerner (FHIR)", type: "HL7 / FHIR Gateway", icon: "🏥" },
  { name: "Kareo / TocDoc / Athena", type: "EHR Scheduling API", icon: "🩺" },
  { name: "Cliniko & Jane App", type: "Allied Health Webhooks", icon: "✨" },
];

const SCHEDULING_FAQS = [
  {
    q: "How does AMSh prevent double-booking our doctors?",
    a: "AMSh maintains persistent, low-latency 2-way synchronization with your calendar API. Before proposing any slot to a patient over phone or WhatsApp, it performs a real-time lock verification to guarantee no conflicting appointments or personal holds exist.",
  },
  {
    q: "Can AMSh book different appointment durations for different visit types?",
    a: "Yes. In your clinic settings, you configure visit types (e.g., New Patient Consultation: 45 min; Routine Cleaning: 30 min; Suture Removal: 15 min). AMSh determines the visit purpose during conversation and applies the exact duration and required physician buffer.",
  },
  {
    q: "What happens if a patient wants to cancel or move their appointment?",
    a: "The patient simply calls or texts. AMSh authenticates them using their phone number and birth date, looks up their existing booking, releases the time slot immediately in your calendar, and offers convenient alternatives.",
  },
  {
    q: "Does AMSh collect deposit payments or patient insurance before booking?",
    a: "Yes. AMSh can verify insurance carriers (e.g. Delta Dental, Bupa, Blue Cross) during the call and automatically dispatch secure Stripe payment links via SMS/WhatsApp for consultation deposits if required by your practice policy.",
  },
];

export default function AiAppointmentBookingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <Nav />
      <JsonLd data={landingPageSchemas("/ai-appointment-booking", String(metadata.description), SCHEDULING_FAQS)} />

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28 border-b border-slate-100 bg-gradient-to-b from-indigo-50/40 via-white to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3.5 py-1.5 font-mono-ui text-xs font-semibold text-indigo-700 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                <span>AUTONOMOUS 2-WAY CLINICAL CALENDAR BOOKING</span>
              </div>

              <h1 className="font-sora text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.15] tracking-tight text-slate-950">
                The 24/7 AI Appointment Assistant that fills your clinic calendar.
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 leading-relaxed font-normal max-w-2xl">
                Eliminate phone tag, hold music, and empty treatment chairs. AMSh answers patient calls and WhatsApp messages instantly, checks real-time doctor availability, and secures confirmed bookings directly in your calendar.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <a
              href="/pilot"
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 hover:shadow-blue-500/35 active:scale-[0.98]"
                >
                  Join 14-Day Pilot Program
                  <span className="ml-2 font-bold">&rarr;</span>
                </a>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-base font-medium text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  See 2-Way Calendar Sync
                </a>
              </div>

              {/* Trust Metrics Pill */}
              <div className="pt-4 grid grid-cols-3 gap-4 border-t border-slate-100 max-w-lg">
                <div>
                  <div className="font-sora text-2xl font-bold text-slate-900">0 sec</div>
                  <div className="text-xs text-slate-500 font-medium">Wait Time for Callers</div>
                </div>
                <div>
                  <div className="font-sora text-2xl font-bold text-indigo-600">2-Way</div>
                  <div className="text-xs text-slate-500 font-medium">Live EHR &amp; Cal Sync</div>
                </div>
                <div>
                  <div className="font-sora text-2xl font-bold text-emerald-600">-42%</div>
                  <div className="text-xs text-slate-500 font-medium">No-Show Reduction</div>
                </div>
              </div>
            </div>

            {/* Right: Interactive Live Booking Simulation Card */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xl shadow-indigo-500/10 backdrop-blur-sm">
                
                {/* Simulated Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      AI
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">AMSh Booking Engine</div>
                      <div className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live Calendar Sync Active
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 text-[11px] font-mono font-medium text-slate-600">
                    Dr. Miller &bull; Chair 2
                  </span>
                </div>

                {/* Simulated Conversation & Calendar Lock */}
                <div className="py-5 space-y-4 font-sans text-xs sm:text-sm">
                  {/* Caller */}
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      P
                    </span>
                    <div className="rounded-xl bg-slate-100 px-3.5 py-2.5 text-slate-800 max-w-[85%]">
                      &quot;Hi, I need to see Dr. Miller for a consultation this Thursday afternoon.&quot;
                    </div>
                  </div>

                  {/* AI Response with Calendar Check */}
                  <div className="flex items-start gap-2.5 flex-row-reverse">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      A
                    </span>
                    <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-3.5 py-2.5 text-indigo-950 max-w-[85%]">
                      &quot;Checking Dr. Miller&apos;s schedule... He has openings this Thursday, Oct 15th at <strong>2:30 PM</strong> and <strong>4:15 PM</strong>. Which of those works better for you?&quot;
                    </div>
                  </div>

                  {/* Caller Confirmation */}
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      P
                    </span>
                    <div className="rounded-xl bg-slate-100 px-3.5 py-2.5 text-slate-800 max-w-[85%]">
                      &quot;4:15 PM is perfect. Name is Michael Davis.&quot;
                    </div>
                  </div>

                  {/* Calendar Event Generated Card */}
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 space-y-2 mt-2">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                      <span className="flex items-center gap-1.5">
                        <span className="text-emerald-600">&bull;</span>
                        APPOINTMENT CONFIRMED &amp; LOCKED
                      </span>
                      <span className="text-[10px] bg-emerald-200/60 text-emerald-900 px-1.5 py-0.5 rounded">
                        2-Way Sync
                      </span>
                    </div>
                    <div className="text-xs text-slate-700 space-y-0.5 font-medium">
                      <div>Patient: <strong>Michael Davis</strong> (New Patient Consultation)</div>
                      <div>Doctor: <strong>Dr. Miller, MD</strong> &bull; Chair 2 (45 mins)</div>
                      <div>Slot: <strong>Thursday, Oct 15 &bull; 4:15 PM &ndash; 5:00 PM</strong></div>
                    </div>
                    <div className="text-[11px] text-emerald-700 pt-1 border-t border-emerald-200/50 flex items-center justify-between">
                      <span>WhatsApp Confirmation Dispatched</span>
                      <span className="font-mono">Status: Confirmed</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-center text-xs text-slate-400">
                  Instant Google Cal &amp; EHR injection &bull; Zero manual front-desk entry
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 2. CORE CAPABILITIES GRID */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-slate-50/60 border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="font-mono-ui text-xs font-bold uppercase tracking-wider text-indigo-600">
              End-to-End Scheduling Automation
            </h2>
            <p className="font-sora text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
              Engineered for busy practices with complex booking rules.
            </p>
            <p className="text-base sm:text-lg text-slate-600">
              Unlike dumb online form widgets that patients ignore, AMSh converses in natural human voice and WhatsApp to guide patients to confirmed calendar slots.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {BOOKING_CAPABILITIES.map((cap) => (
              <div
                key={cap.step}
                className="group relative rounded-2xl border border-slate-200 bg-white p-8 shadow-xs hover:shadow-xl hover:border-indigo-300 hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                    PHASE {cap.step}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    {cap.badge}
                  </span>
                </div>

                <h3 className="font-sora text-xl font-bold text-slate-950 group-hover:text-indigo-600 transition-colors">
                  {cap.title}
                </h3>
                
                <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                  {cap.desc}
                </p>

                <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">{cap.statLabel}</span>
                  <span className="font-sora text-2xl font-bold text-indigo-600">{cap.stat}</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 3. CALENDAR & EHR COMPATIBILITY */}
      <section className="py-16 sm:py-24 bg-white border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-12 space-y-2">
            <h2 className="font-sora text-2xl sm:text-3xl font-bold text-slate-950">
              Seamlessly integrates with your existing calendar software.
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              No need to switch tools or retrain your team. AMSh connects in under 10 minutes.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {COMPATIBLE_SYSTEMS.map((sys) => (
              <div
                key={sys.name}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-center hover:bg-white hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <div className="text-2xl mb-2">{sys.icon}</div>
                <div className="font-sora text-sm font-bold text-slate-900">{sys.name}</div>
                <div className="text-[11px] text-slate-500 mt-1">{sys.type}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. FREQUENTLY ASKED QUESTIONS */}
      <section className="py-20 bg-slate-50 border-b border-slate-100">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center mb-12 space-y-2">
            <h2 className="font-sora text-2xl sm:text-3xl font-bold text-slate-950">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600 text-sm">
              Everything you need to know about autonomous appointment booking with AMSh.
            </p>
          </div>

          <div className="space-y-4">
            {SCHEDULING_FAQS.map((faq) => (
              <div
                key={faq.q}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
              >
                <h3 className="font-sora text-base sm:text-lg font-bold text-slate-950 mb-2">
                  {faq.q}
                </h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION STRIP */}
      <section className="py-16 sm:py-20 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-purple-900/30" />
        <div className="relative mx-auto max-w-5xl px-4 text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 font-mono-ui text-xs text-indigo-300">
            <span>START FILLING APPOINTMENT CALENDARS IN 48 HOURS</span>
          </div>

          <h2 className="font-sora text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Stop losing patients to hold times and busy signals.
          </h2>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto">
            Experience the 24/7 AI appointment booking assistant in a risk-free 14-day clinic pilot. Set up in under 15 minutes.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <a
              href="/pilot"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-7 py-4 text-base font-semibold text-white shadow-xl shadow-blue-500/30 hover:bg-blue-500 transition-all active:scale-[0.98]"
            >
              Get Started with 14-Day Pilot
              <span className="ml-2 font-bold">&rarr;</span>
            </a>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-6 py-4 text-base font-medium text-white hover:bg-white/10 transition-colors"
            >
              Back to Main Platform
            </Link>
          </div>
        </div>
      </section>

      <Footer3D />
    </div>
  );
}
