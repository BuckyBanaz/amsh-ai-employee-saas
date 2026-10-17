import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/landing/Nav";
import Footer3D from "@/components/landing/Footer3D";
import JsonLd from "@/components/landing/JsonLd";
import { pageMetadata } from "@/lib/site";
import { breadcrumbSchema } from "@/lib/schema";

export const metadata: Metadata = pageMetadata({
  path: "/terms",
  title: "Terms of Service | AMSh — AI Receptionist for Clinics",
  description:
    "AMSh Terms of Service. User agreement, acceptable use policy for AI voice & WhatsApp messaging, medical disclaimers, billing terms, and clinic responsibilities.",
  ogTitle: "Terms of Service | AMSh — AI Receptionist",
  ogDescription:
    "Review our terms of service, WhatsApp Cloud API acceptable use policy, emergency disclaimers, and service commitments.",
});

export default function TermsOfServicePage() {
  const lastUpdated = "October 17, 2026";

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-cyan-100 selection:text-cyan-950">
      <Nav />
      <JsonLd data={breadcrumbSchema("/terms")} />

      {/* Hero Header */}
      <section className="relative overflow-hidden pt-28 pb-14 sm:pt-36 sm:pb-18 border-b border-slate-100 bg-gradient-to-b from-slate-50/70 via-white to-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1.5 font-mono-ui text-xs font-semibold text-blue-800 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span>getamsh.com &bull; USER AGREEMENT</span>
          </div>

          <h1 className="font-sora text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-950">
            Terms of Service
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
            These Terms of Service govern your access to and use of AMSh AI virtual front-desk software, telephony bridges, and WhatsApp automated communication services.
          </p>

          <div className="inline-flex items-center gap-2 text-xs font-mono-ui text-slate-500 pt-2">
            <span>Effective Date: October 2026</span>
            <span>&bull;</span>
            <span>Last Updated: {lastUpdated}</span>
          </div>
        </div>
      </section>

      {/* Main Content Body */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16">
        <article className="prose prose-slate max-w-none prose-headings:font-sora prose-headings:text-slate-950 prose-a:text-blue-600 hover:prose-a:text-blue-800 space-y-10 text-[15px] leading-relaxed text-slate-700">
          
          {/* Critical Healthcare Disclaimer Box */}
          <div className="not-prose rounded-2xl border border-amber-200 bg-amber-50/70 p-6 sm:p-7 shadow-xs">
            <h2 className="font-sora text-base font-bold text-amber-950 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Important Medical &amp; Emergency Disclaimer
            </h2>
            <p className="text-sm text-amber-900 leading-relaxed mt-2">
              <strong>AMSh is an administrative virtual receptionist and call management tool, NOT a certified physician, medical diagnostic device, or emergency dispatch service.</strong>
            </p>
            <p className="text-sm text-amber-900/90 leading-relaxed mt-2">
              The AI receptionist does not render medical diagnoses, write prescriptions, or provide emergency triage. If a caller is experiencing a severe or life-threatening medical emergency (such as acute chest pain, severe bleeding, or trauma), they must immediately hang up and dial their national emergency service (<strong>112</strong> / <strong>108</strong> in India, <strong>911</strong> in the United States, <strong>999</strong> in the United Kingdom) or proceed to the nearest emergency room.
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold border-b border-slate-100 pb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using the website at <Link href="/">getamsh.com</Link>, signing up for an AMSh account, subscribing to an AI Employee tier, integrating our telephony endpoints, or enabling WhatsApp automated messaging, you (&ldquo;Customer&rdquo;, &ldquo;Clinic&rdquo;, &ldquo;User&rdquo;, or &ldquo;you&rdquo;) agree to be legally bound by these Terms of Service (&ldquo;Terms&rdquo;) and our <Link href="/privacy">Privacy Policy</Link>.
            </p>
            <p>
              If you are entering into these Terms on behalf of a healthcare clinic, dental office, hospital, or corporate entity, you represent and warrant that you possess the full legal authority to bind such entity to these Terms. If you do not agree with any part of these Terms, you must immediately cease all access and use of the platform.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold border-b border-slate-100 pb-3">
              2. Description of the AMSh Service
            </h2>
            <p>
              AMSh, developed and operated by <strong>TechyCodex</strong>, provides an AI-powered conversational platform designed specifically for medical and professional practices. Key capabilities include:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Autonomous Voice Call Reception:</strong> Inbound call answering, natural conversational dialogue, intent detection, and after-hours call routing.</li>
              <li><strong>Interactive Appointment Scheduling:</strong> Multi-calendar synchronization (e.g., Google Calendar, EHR/PMS tools), real-time availability checking, booking confirmation, and rescheduling.</li>
              <li><strong>WhatsApp Conversational Triage:</strong> Automated messaging through the Meta WhatsApp Cloud API for appointment confirmations, clinic FAQs, and reminder broadcasts.</li>
              <li><strong>Deterministic Guardrails &amp; Staff Transfer:</strong> Automated rules that detect out-of-scope requests or emergency keywords and immediately transfer the call to human clinic staff.</li>
            </ul>
          </section>

          {/* Section 3 - CRITICAL FOR META WHATSAPP COMPLIANCE */}
          <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-6 sm:p-7">
            <div className="flex items-center gap-2">
              <span className="text-blue-600 font-bold text-xs uppercase tracking-wider font-mono-ui">WhatsApp &amp; Meta Policy Obligations</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-950 mt-1">
              3. WhatsApp Business &amp; Messaging Acceptable Use
            </h2>
            <p>
              When utilizing AMSh WhatsApp capabilities powered by the <strong>Meta WhatsApp Cloud API</strong>, Customer agrees to strict adherence to the <em>Meta WhatsApp Business Messaging Policy</em> and <em>WhatsApp Commerce Policy</em>:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-800">
              <li>
                <strong>Verifiable Opt-In Required:</strong> Customer warrants that it has collected explicit affirmative opt-in consent from each recipient prior to initiating outbound WhatsApp notifications or appointment reminders.
              </li>
              <li>
                <strong>Immediate Opt-Out Honoring:</strong> Customer agrees that any patient or recipient who replies with &ldquo;STOP&rdquo;, &ldquo;UNSUBSCRIBE&rdquo;, or &ldquo;CANCEL&rdquo; must be honored immediately. AMSh automatically suppresses future automated messaging to opted-out numbers.
              </li>
              <li>
                <strong>No Spam, Promotional Blasts, or Deceptive Messaging:</strong> Customer will not use AMSh to send unsolicited mass spam, speculative marketing broadcasts, predatory financial solicitations, or deceptive content.
              </li>
              <li>
                <strong>Authentic Business Identity:</strong> Customer must accurately display its verified healthcare business name, physical location, and contact information on its WhatsApp profile.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold border-b border-slate-100 pb-3">
              4. Clinic Responsibilities &amp; Staff Supervisions
            </h2>
            <p>As a subscriber clinic using AMSh as your virtual employee, you acknowledge and agree that:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Accuracy of Ingested Information:</strong> You are solely responsible for ensuring that your clinic hours, practitioner availability, pricing, accepted insurance networks, and address ingested into AMSh are current and accurate.</li>
              <li><strong>Account Security:</strong> You are responsible for safeguarding all administrative credentials, API keys, and staff access tokens. Promptly notify us of any suspected security compromise.</li>
              <li><strong>Call Recording Disclosures:</strong> If you enable call recording in the AMSh dashboard, you are responsible for ensuring compliance with all local two-party or one-party call recording consent statutes. AMSh includes default automated voice announcements informing callers of recordings.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold border-b border-slate-100 pb-3">
              5. 14-Day Pilot Program, Billing &amp; Subscriptions
            </h2>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900">A. 14-Day Guided Clinic Pilot</h3>
              <p>
                Qualified clinics participating in the 14-Day Guided Pilot receive dedicated onboarding and temporary access to test call handling and booking workflows. Pilot terms and pricing parameters are agreed upon in writing prior to service activation.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-lg font-semibold text-slate-900">B. Subscription Tiers &amp; Voice Quotas</h3>
              <p>
                Following trial periods, AMSh is billed on a recurring monthly or annual subscription basis. Subscriptions include allocated voice minutes and messaging units. Additional usage beyond allotted plan limits is billed at published per-minute rates.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-lg font-semibold text-slate-900">C. Cancellation &amp; Refunds</h3>
              <p>
                You may cancel your subscription at any time through the clinic admin settings. Service will continue through the conclusion of your current paid billing period. Due to telecommunication carrier and GPU inference costs incurred in real time, past subscription fees are non-refundable.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold border-b border-slate-100 pb-3">
              6. Intellectual Property &amp; Customer Data Ownership
            </h2>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900">A. AMSh Proprietary Rights</h3>
              <p>
                TechyCodex retains all right, title, and interest in and to the AMSh software, speech pipelines, conversation state machines, user interfaces, documentation, logos, and proprietary AI models. Nothing in these Terms grants Customer any license to copy, decompile, reverse-engineer, or create derivative works.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-lg font-semibold text-slate-900">B. Customer Data Ownership</h3>
              <p>
                Customer retains full, exclusive ownership of all patient records, customer lists, call audio recordings, and appointment data processed by AMSh. AMSh acts strictly as a data processor to provide the services described herein.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold border-b border-slate-100 pb-3">
              7. Service Availability &amp; Telephony Carrier Dependencies
            </h2>
            <p>
              While AMSh targets 99.9% uptime, you acknowledge that voice and messaging delivery inherently depend upon third-party telecommunication networks (including Twilio, Plivo, Exotel, local telephone carriers) and the Meta WhatsApp Cloud API. AMSh shall not be liable for delayed calls, audio packet jitter, or carrier network outages beyond our reasonable control.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold border-b border-slate-100 pb-3">
              8. Limitation of Liability
            </h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL TECHYCODEX, AMSH, OR ITS OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES (INCLUDING LOSS OF PROFITS, LOSS OF GOODWILL, LOSS OF DATA, OR CLINICAL SCHEDULING DELAYS) ARISING OUT OF OR IN CONNECTION WITH THE USE OF OR INABILITY TO USE THE SERVICE.
            </p>
            <p>
              OUR TOTAL CUMULATIVE LIABILITY UNDER THESE TERMS SHALL NOT EXCEED THE TOTAL FEES ACTUALLY PAID BY CUSTOMER TO AMSH DURING THE THREE (3) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold border-b border-slate-100 pb-3">
              9. Indemnification
            </h2>
            <p>
              Customer agrees to defend, indemnify, and hold harmless TechyCodex and AMSh from and against any third-party claims, liabilities, damages, and expenses (including reasonable legal fees) arising from: (a) Customer&rsquo;s breach of these Terms; (b) failure to obtain requisite patient consent for call recording or WhatsApp messaging; or (c) professional clinical disputes between Customer and its patients.
            </p>
          </section>

          {/* Section 10 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold border-b border-slate-100 pb-3">
              10. Governing Law &amp; Dispute Resolution
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India, without regard to conflict of law principles. Any dispute, controversy, or claim arising out of or relating to these Terms shall be resolved by binding arbitration in accordance with the Arbitration and Conciliation Act, 1996, with the seat of arbitration in New Delhi / Haryana, India.
            </p>
          </section>

          {/* Section 11 - Contact */}
          <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-6 sm:p-7">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-950">
              11. Contact Information
            </h2>
            <p className="text-sm">
              If you have any questions or require clarification regarding these Terms of Service, please reach out to our legal and support team:
            </p>
            <div className="text-sm space-y-1.5 pt-1 text-slate-800">
              <p><strong>Operating Company:</strong> TechyCodex / AMSh</p>
              <p><strong>Website:</strong> <a href="https://getamsh.com" className="text-blue-600 underline">getamsh.com</a></p>
              <p><strong>Legal &amp; Support Email:</strong> <a href="mailto:info@techycodex.com" className="text-blue-600 underline">info@techycodex.com</a></p>
              <p><strong>Direct Telephone:</strong> <a href="tel:+918901414107" className="text-blue-600 underline">+91 8901414107</a></p>
              <p><strong>Headquarters:</strong> TechyCodex, Haryana, India</p>
            </div>
          </section>

        </article>
      </main>

      <Footer3D />
    </div>
  );
}
