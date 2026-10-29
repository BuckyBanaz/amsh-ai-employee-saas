import type { Metadata } from "next";
import JsonLd from "@/components/landing/JsonLd";
import { pageMetadata } from "@/lib/site";
import { landingPageSchemas } from "@/lib/schema";
import Link from "next/link";
import Nav from "@/components/landing/Nav";
import Footer3D from "@/components/landing/Footer3D";

export const metadata: Metadata = pageMetadata({
  path: "/ai-receptionist-for-education",
  title: "AI Receptionist for Schools & Universities | AMSh Education",
  description:
    "Autonomous 24/7 AI front-desk employee for universities, private schools, colleges, and EdTech institutes. Answers prospective student enquiries, provides tuition & fee info, and books campus visit tours into your CRM.",
  ogTitle: "AI Receptionist for Schools & Universities | AMSh Education",
  ogDescription:
    "Capture every prospective student enquiry 24/7. AMSh handles admissions phone calls, provides curriculum FAQ, and books campus tours into your CRM.",
});

const EDUCATION_FEATURES = [
  {
    title: "24/7 Admissions Lead Capture",
    badge: "Instant Qualification",
    desc: "Prospective students research schools late at night and across time zones. AMSh answers program questions, qualifies student intent, and captures verified contact details.",
    metric: "3.4x",
    metricLabel: "Faster Inquiry Response",
  },
  {
    title: "Campus Tour & Visit Scheduling",
    badge: "Calendar Sync",
    desc: "Coordinates parent open days, student ambassador campus walks, and counselor 1-on-1 calls. Dispatches calendar invites and visitor parking permits via SMS & WhatsApp.",
    metric: "88%",
    metricLabel: "Tour Attendance Rate",
  },
  {
    title: "Tuition, Deadlines & FAQ Assistance",
    badge: "RAG Knowledge Base",
    desc: "Answers complex tuition structures, scholarship eligibility criteria, entry requirements, and term start dates directly from your verified institution handbook.",
    metric: "0 min",
    metricLabel: "Student Hold Time",
  },
  {
    title: "Direct Admissions CRM Integration",
    badge: "HubSpot & Salesforce",
    desc: "Pushes captured student leads, interested degree majors, and qualification notes straight into your admissions CRM pipeline without manual data entry.",
    metric: "100%",
    metricLabel: "CRM Data Synchronization",
  },
];

const INSTITUTION_TYPES = [
  { name: "Universities & Colleges", icon: "🏛️", desc: "Undergrad & graduate admissions, international student visas, campus tours" },
  { name: "K-12 Private & International Schools", icon: "🎒", desc: "Parent inquiries, entrance assessments, open house registrations" },
  { name: "Coaching & Test Prep Academies", icon: "📝", desc: "SAT/GRE batches, trial class bookings, fee schedule inquiries" },
  { name: "Vocational & Trade Institutes", icon: "🔧", desc: "Apprenticeship intake, certification courses, career consultation calls" },
  { name: "EdTech & Online Learning Platforms", icon: "💻", desc: "Course syllabus FAQs, demo webinars, enterprise training inquiries" },
  { name: "Language & Flight Academies", icon: "✈️", desc: "Immigration requirements, flight hour bookings, student dorm inquiries" },
];

const METRICS = [
  { value: "68%", label: "Prospective students choose the institution that responds to their enquiry first" },
  { value: "$3,600", label: "Average monthly cost of full-time human admissions intake staff" },
  { value: "$49", label: "AMSh autonomous AI receptionist monthly cost" },
  { value: "99.99%", label: "Telephony availability during high-volume peak application weeks" },
];

export default function EducationLandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-violet-100 selection:text-violet-900">
      <Nav />
      <JsonLd data={landingPageSchemas("/ai-receptionist-for-education", String(metadata.description))} />

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-24 border-b border-slate-100 bg-gradient-to-b from-violet-50/40 via-white to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50/80 px-4 py-1.5 font-mono-ui text-xs font-semibold text-violet-800 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
              <span>24/7 AUTONOMOUS ADMISSIONS DESK FOR ACADEMIC INSTITUTIONS</span>
            </div>

            <h1 className="font-sora text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.12] tracking-tight text-slate-950">
              Capture every student lead and fill every campus tour.
            </h1>

            <p className="max-w-2xl mx-auto text-base sm:text-lg leading-relaxed text-slate-600">
              Never let an admissions enquiry slip away. AMSh answers applicant phone calls 24/7, answers questions on tuition and program requirements, books campus visits, and syncs directly with your admissions CRM.
            </p>

            {/* CTA Group */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              <a
                href="/pilot"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0a0a0a] hover:bg-violet-600 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white transition-all shadow-md hover:shadow-lg cursor-pointer"
              >
                <span>Join Education Pilot Cohort</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>

              <Link
                href="/#calculator"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-800 transition-all shadow-xs"
              >
                <span>Calculate Campus Savings</span>
              </Link>
            </div>

            <p className="font-mono-ui text-xs text-slate-400">
              Syncs with Salesforce, HubSpot, Slate &bull; 24/7 global parent coverage &bull; FERPA &amp; GDPR compliant
            </p>

          </div>
        </div>
      </section>

      {/* 2. INDUSTRY BENCHMARKS & PROBLEM SECTION */}
      <section className="py-16 bg-slate-950 text-white border-b border-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {METRICS.map((m) => (
              <div key={m.label} className="border-l border-white/15 pl-6 font-mono-ui">
                <div className="font-sora text-3xl sm:text-4xl font-bold text-violet-400 tracking-tight">
                  {m.value}
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {m.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. CORE EDUCATION CAPABILITIES */}
      <section className="py-24 bg-slate-50/50 border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="font-mono-ui text-xs uppercase tracking-[0.16em] text-violet-700 font-bold">
              BUILT FOR HIGH-STAKES ACADEMIC ADMISSIONS
            </span>
            <h2 className="font-sora text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 mt-3">
              Deliver immediate answers to prospective students &amp; parents.
            </h2>
            <p className="mt-3 text-slate-600 text-base leading-relaxed">
              Designed specifically for higher ed, private academies, and EdTech where fast, knowledgeable response times directly translate into enrollment numbers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {EDUCATION_FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs hover:border-violet-300 transition-all hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold font-mono-ui bg-violet-50 text-violet-800 border border-violet-200">
                      {f.badge}
                    </span>
                    <span className="text-2xl font-bold text-slate-950 font-mono-ui">
                      {f.metric}
                    </span>
                  </div>
                  <h3 className="font-sora text-xl font-bold text-slate-950 mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-mono-ui text-slate-400">
                  Benchmarked: <strong className="text-slate-700">{f.metricLabel}</strong>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 4. INSTITUTION TYPES SUPPORTED */}
      <section className="py-24 bg-white border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="font-mono-ui text-xs uppercase tracking-[0.16em] text-violet-700 font-bold">
              MULTI-PROGRAM COMPATIBILITY
            </span>
            <h2 className="font-sora text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 mt-3">
              Pre-trained on academic &amp; admissions terminology.
            </h2>
            <p className="mt-3 text-slate-600 text-base leading-relaxed">
              AMSh handles curriculum credit prerequisites, financial aid requirements, international student visa guidelines, and test score cutoffs effortlessly.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {INSTITUTION_TYPES.map((s) => (
              <div
                key={s.name}
                className="p-6 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-violet-300 transition-all hover:shadow-sm"
              >
                <div className="text-3xl mb-3">{s.icon}</div>
                <h4 className="font-sora text-base font-bold text-slate-900 mb-1.5">
                  {s.name}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center">
            <a
              href="/pilot"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider px-7 py-3.5 transition-colors shadow-md cursor-pointer"
            >
              <span>Deploy AMSh to Your Institution in 10 Minutes</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      <Footer3D />
    </div>
  );
}
