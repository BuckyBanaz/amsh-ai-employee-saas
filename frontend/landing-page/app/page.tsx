import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/landing/Nav";
import Hero from "@/components/landing/Hero";
import VirtualEmployeeCard from "@/components/landing/VirtualEmployeeCard";
import RoiCalculator from "@/components/landing/RoiCalculator";
import GlobalPresence from "@/components/landing/GlobalPresence";
import GlobalPricing from "@/components/landing/GlobalPricing";
import DeveloperSection from "@/components/landing/DeveloperSection";
import WhatsAppPhone from "@/components/landing/WhatsAppPhone";
import FeatureBento from "@/components/landing/FeatureBento";
import ProductTour from "@/components/landing/ProductTour";
import PartnersMarquee from "@/components/landing/PartnersMarquee";
import Testimonials from "@/components/landing/Testimonials";
import Footer3D from "@/components/landing/Footer3D";
import { Icon, type IconName } from "@/components/landing/icons";
import { BrandIcon } from "@/components/landing/BrandIcon";
import SeoScripts from "@/components/landing/SeoScripts";
import { getSeo } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeo();
  const title = "AMSh — Hire Your 24/7 Autonomous AI Clinic Receptionist";
  const desc =
    "Deploy autonomous AI employees that answer patient calls, schedule appointments, and triage WhatsApp chats for healthcare practices worldwide.";
  return {
    title,
    description: desc,
    openGraph: { title, description: desc },
  };
}

const AUDIENCES = [
  "Dental Clinics",
  "Aesthetic & Skin Clinics",
  "Primary Care Medical",
  "Multi-Location Groups",
  "Dermatology",
  "Physiotherapy & Rehab",
  "Ophthalmology & Eye Care",
  "Pediatrics",
  "Orthopedics",
  "Diagnostic Centers",
];

const OUTCOMES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "phone",
    title: "Zero Missed Calls",
    body: "Every call is picked up on the first ring — even during peak morning hours when 5 lines ring simultaneously.",
  },
  {
    icon: "message",
    title: "Instant WhatsApp Triage",
    body: "Patients message day or night. AMSh answers in seconds, checks real-time doctor slots, and confirms bookings.",
  },
  {
    icon: "calendar",
    title: "Direct Calendar Booking",
    body: "Enquiries are guided to confirmed appointments on your calendar with automated reminders that prevent no-shows.",
  },
];

const WHATSAPP_POINTS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "sparkles",
    title: "Answers clinic FAQs",
    body: "Consultation fees, doctor timings, treatments, directions, and parking — answered from your clinic knowledge base.",
  },
  {
    icon: "calendar",
    title: "Real-time calendar booking",
    body: "Syncs directly with Google Calendar & clinic EMR to propose available slots and book immediately.",
  },
  {
    icon: "repeat",
    title: "Automated follow-ups",
    body: "Sends appointment confirmations and WhatsApp reminders 2 hours before the visit, reducing no-shows by 40%.",
  },
  {
    icon: "transfer",
    title: "Seamless staff handoff",
    body: "If a patient needs human attention or emergency care, AMSh immediately alerts staff with the full conversation summary.",
  },
];

const DAY = [
  {
    time: "7:40 AM",
    icon: "phone" as IconName,
    title: "Before doors open",
    body: "A patient calls asking about parking and root canal costs. Answered instantly in Hindi or English.",
  },
  {
    time: "11:15 AM",
    icon: "calendar" as IconName,
    title: "Clinic rush hour",
    body: "Four patient lines ring simultaneously. All answered in parallel; two new appointments booked.",
  },
  {
    time: "4:30 PM",
    icon: "repeat" as IconName,
    title: "Patient reschedule",
    body: "A patient calls to push Friday's checkup to Monday. Calendar slot freed up immediately for someone else.",
  },
  {
    time: "10:05 PM",
    icon: "moon" as IconName,
    title: "Late night WhatsApp",
    body: "A patient enquiries about teeth whitening at midnight. Converted to a confirmed booking for tomorrow.",
  },
];

const STEPS = [
  {
    title: "1. Hire & Configure",
    body: "Choose your virtual employee persona (Priya, Sarah, Emma), input your doctors, fees, and working hours in 5 minutes.",
  },
  {
    title: "2. Connect Phone Line",
    body: "Forward your existing clinic number or get a dedicated local AI phone number with official WhatsApp integration.",
  },
  {
    title: "3. Autonomous 24/7 Shift",
    body: "Your AI employee starts handling calls and chats immediately. Front-desk staff monitor live calls and transcripts from the console.",
  },
];

const FAQS = [
  {
    q: "Does AMSh replace our human front-desk team?",
    a: "No. AMSh is an autonomous virtual employee designed to assist your team. It handles high-volume repetitive queries, after-hours calls, and booking flows so your front-desk staff can focus entirely on welcoming in-clinic patients.",
  },
  {
    q: "Which languages and accents does our AI Employee speak?",
    a: "AMSh speaks Hindi, Hinglish, Indian English, US Neutral English, British English, Spanish, Arabic, French, and 20+ other languages, automatically adapting to the caller's language mid-call.",
  },
  {
    q: "Can we use AMSh outside India (e.g. US, UK, Canada, UAE)?",
    a: "Yes! AMSh is deployed globally with local phone numbers available across North America, Europe, Australia, GCC/Middle East, and Asia. All infrastructure is HIPAA, GDPR, and DPDP compliant.",
  },
  {
    q: "Can we keep our existing clinic phone number?",
    a: "Yes! You can enable simple call forwarding from your existing Airtel, Jio, AT&T, Verizon, Vodafone, or landline number directly to your AMSh virtual receptionist.",
  },
  {
    q: "How does appointment confirmation work?",
    a: "When a slot is finalized, AMSh locks it in your calendar (Google Calendar / EMR) and immediately sends a WhatsApp confirmation message to the patient with the date, time, and clinic directions.",
  },
  {
    q: "What happens during a medical emergency?",
    a: "AMSh has strict deterministic clinical safety guardrails. If a caller reports chest pain, severe trauma, or acute distress, it immediately advises emergency services (112 / 911) and hot-transfers the call to your on-call emergency doctor.",
  },
];

export default async function LandingPage() {
  const seo = await getSeo();

  return (
    <div className="min-h-screen bg-white text-slate-900 w-full max-w-full overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">
      <SeoScripts seo={seo} />
      
      {/* 1. Plivo Style Navigation Bar */}
      <Nav />

      <main className="w-full max-w-full">
        {/* 2. Hero Section with Live AI Receptionist Simulator */}
        <Hero />

        {/* 3. Three Outcome Pillars */}
        <section className="py-20 bg-slate-50/60 border-b border-slate-200/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="font-mono-ui text-xs uppercase tracking-[0.16em] text-blue-600 font-bold">
                BUILT FOR CLINICS &amp; HEALTHCARE PRACTICES
              </span>
              <h2 className="font-sora text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 mt-3">
                Stop losing patients to missed calls.
              </h2>
              <p className="mt-3 text-slate-600 text-base leading-relaxed">
                67% of patients who reach a busy phone line never call back. AMSh ensures every patient receives an immediate human-grade answer.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {OUTCOMES.map((o) => (
                <div
                  key={o.title}
                  className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs hover:border-slate-300 transition-all hover:shadow-md"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center mb-5 border border-blue-100/80">
                    <Icon name={o.icon} className="h-5 w-5" />
                  </div>
                  <h3 className="font-sora text-lg font-semibold text-slate-900 mb-2">
                    {o.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{o.body}</p>
                </div>
              ))}
            </div>

            {/* Specialties Strip */}
            <div className="mt-14 pt-10 border-t border-slate-200/80">
              <p className="text-center font-mono-ui text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 mb-6">
                Specialized for all clinical disciplines
              </p>
              <div className="flex flex-wrap justify-center gap-2.5 max-w-4xl mx-auto">
                {AUDIENCES.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-700 shadow-2xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 4. NEW: Virtual Employee Showcase (Priya, Sarah, Emma, Fatima) */}
        <section id="employees" className="py-24 bg-white border-b border-slate-200/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="font-mono-ui text-xs uppercase tracking-[0.16em] text-blue-600 font-bold">
                AUTONOMOUS DIGITAL WORKFORCE
              </span>
              <h2 className="font-sora text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-950 mt-3">
                Hire your clinic&apos;s first AI Virtual Employee.
              </h2>
              <p className="mt-3 text-slate-600 text-base leading-relaxed">
                Choose a pre-trained virtual front-desk persona tailored to your region and specialty. They work 24/7/365, never take sick leaves, and cost a fraction of human payroll.
              </p>
            </div>

            <VirtualEmployeeCard />
          </div>
        </section>

        {/* 5. NEW: Interactive ROI & Cost Comparison Calculator */}
        <section id="calculator" className="py-24 bg-slate-50/60 border-b border-slate-200/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <RoiCalculator />
          </div>
        </section>

        {/* 6. NEW: Global Telephony & 21st.dev 3D Canvas Globe */}
        <GlobalPresence />

        {/* 7. WhatsApp Integration Section */}
        <section id="whatsapp" className="py-24 bg-slate-50/50 border-b border-slate-200/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:items-center">
              <div className="lg:col-span-6 space-y-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-mono-ui font-semibold text-emerald-800">
                  <BrandIcon name="whatsapp" className="h-4 w-4" /> Official WhatsApp Cloud API
                </span>

                <h2 className="font-sora text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-slate-950 leading-[1.12]">
                  Where your patients already chat.
                </h2>

                <p className="text-slate-600 text-base leading-relaxed">
                  When patients message your clinic at 10 PM, AMSh responds in seconds, shares doctor availability, and sends calendar invites before they look anywhere else.
                </p>

                <div className="grid gap-4 sm:grid-cols-2 pt-4">
                  {WHATSAPP_POINTS.map((pt) => (
                    <div
                      key={pt.title}
                      className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center">
                          <Icon name={pt.icon} className="h-3.5 w-3.5" />
                        </span>
                        <h4 className="font-sora text-sm font-semibold text-slate-900">
                          {pt.title}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{pt.body}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-6 flex justify-center">
                <WhatsAppPhone />
              </div>
            </div>
          </div>
        </section>

        {/* 8. Feature Bento Section */}
        <section id="features" className="py-24 bg-white border-b border-slate-200/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="font-mono-ui text-xs uppercase tracking-[0.16em] text-blue-600 font-bold">
                CLINICAL CAPABILITIES
              </span>
              <h2 className="font-sora text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 mt-3">
                Everything a world-class front desk does.
              </h2>
              <p className="mt-3 text-slate-600 text-base leading-relaxed">
                Calls, WhatsApp chats, calendar bookings, automated triage, and emergency handoffs — all logged into your dashboard.
              </p>
            </div>

            <FeatureBento />
          </div>
        </section>

        {/* 9. Product Tour Section */}
        <section id="product" className="py-24 bg-slate-50/60 border-b border-slate-200/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="font-mono-ui text-xs uppercase tracking-[0.16em] text-blue-600 font-bold">
                THE RECEPTIONIST CONSOLE
              </span>
              <h2 className="font-sora text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 mt-3">
                Complete front-desk visibility.
              </h2>
              <p className="mt-3 text-slate-600 text-base leading-relaxed">
                Appointments, live call audio recordings, full transcripts, and patient histories in one clean console.
              </p>
            </div>

            <ProductTour />
          </div>
        </section>

        {/* 10. Day at your Clinic (24/7 Shift Timeline) */}
        <section className="py-24 bg-white border-b border-slate-200/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="font-mono-ui text-xs uppercase tracking-[0.16em] text-blue-600 font-bold">
                24/7 CLINIC SHIFT
              </span>
              <h2 className="font-sora text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 mt-3">
                One shift that never ends.
              </h2>
              <p className="mt-3 text-slate-600 text-base leading-relaxed">
                While your staff tends to in-clinic patient care, AMSh manages your phones and digital channels.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {DAY.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 shadow-2xs hover:border-slate-300 transition-all hover:shadow-xs space-y-3"
                >
                  <span className="font-mono-ui text-xs font-bold text-blue-600 block">
                    {item.time}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                    <Icon name={item.icon} className="h-5 w-5" />
                  </div>
                  <h4 className="font-sora text-base font-semibold text-slate-900">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 11. How it Works (3 Steps) */}
        <section id="how-it-works" className="py-24 bg-slate-50/60 border-b border-slate-200/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="font-mono-ui text-xs uppercase tracking-[0.16em] text-blue-600 font-bold">
                FAST ONBOARDING
              </span>
              <h2 className="font-sora text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 mt-3">
                Live in 3 simple steps.
              </h2>
              <p className="mt-3 text-slate-600 text-base leading-relaxed">
                No complex hardware or telecoms setup required. Works seamlessly with your existing clinic setup.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {STEPS.map((s, idx) => (
                <div
                  key={s.title}
                  className="p-7 rounded-2xl border border-slate-200 bg-white space-y-3 text-center shadow-2xs"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-sora font-bold text-lg mx-auto shadow-xs">
                    {idx + 1}
                  </div>
                  <h4 className="font-sora text-lg font-semibold text-slate-900 pt-2">
                    {s.title}
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 12. Developer Documentation & Telephony APIs */}
        <DeveloperSection />

        {/* 13. NEW: Global Multi-Currency Pricing Plans */}
        <GlobalPricing />

        {/* 13. Partners & Case Studies */}
        <PartnersMarquee />
        <Testimonials />

        {/* 14. Frequently Asked Questions */}
        <section id="faq" className="py-24 bg-slate-50/60 border-b border-slate-200/80">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <span className="font-mono-ui text-xs uppercase tracking-[0.16em] text-blue-600 font-bold">
                FREQUENTLY ASKED QUESTIONS
              </span>
              <h2 className="font-sora text-3xl font-semibold tracking-tight text-slate-950 mt-3">
                Everything you need to know.
              </h2>
            </div>

            <div className="space-y-4">
              {FAQS.map((faq) => (
                <details
                  key={faq.q}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs open:shadow-xs transition-all"
                >
                  <summary className="flex cursor-pointer items-center justify-between font-sora text-base font-semibold text-slate-900 list-none">
                    {faq.q}
                    <Icon
                      name="chevron"
                      className="h-4 w-4 text-slate-400 group-open:rotate-180 transition-transform"
                    />
                  </summary>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed pt-2 border-t border-slate-100">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 15. Final Call-To-Action Banner */}
        <section className="py-24 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-50/60 via-slate-50 to-white p-10 sm:p-16 text-center shadow-xs">
              <span className="font-mono-ui text-xs uppercase tracking-[0.16em] text-blue-600 font-bold">
                HIRE YOUR VIRTUAL EMPLOYEE TODAY
              </span>
              <h2 className="font-sora text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-slate-950 mt-4 max-w-2xl mx-auto leading-tight">
                Never miss another patient call or WhatsApp.
              </h2>
              <p className="mt-4 text-slate-600 text-base max-w-xl mx-auto leading-relaxed">
                Deploy your 24/7 AI Receptionist in 5 minutes. Includes ₹1,000 / $10 in free voice credits on sign up.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-4 font-mono-ui">
                <a
                  href="http://localhost:3000/login"
                  className="rounded-md bg-[#0a0a0a] hover:bg-[#323dfe] text-white px-7 py-3.5 text-xs uppercase tracking-wider font-semibold transition-all shadow-xs"
                >
                  Start For Free →
                </a>
                <a
                  href="#contact"
                  className="rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 px-6 py-3.5 text-xs uppercase tracking-wider font-semibold transition-all shadow-2xs"
                >
                  Contact Sales
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 16. Restored Original 3D Perspective Footer */}
      <Footer3D />
    </div>
  );
}
