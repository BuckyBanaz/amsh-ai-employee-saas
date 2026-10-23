import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/landing/Nav";
import Footer3D from "@/components/landing/Footer3D";
import JsonLd from "@/components/landing/JsonLd";
import { pageMetadata } from "@/lib/site";
import { breadcrumbSchema } from "@/lib/schema";

export const metadata: Metadata = pageMetadata({
  path: "/privacy",
  title: "Privacy Policy | AMSh — AI Receptionist for Clinics",
  description:
    "AMSh Privacy Policy. Details on how we collect, process, store, and protect patient voice recordings, transcripts, WhatsApp communications via Meta Cloud API, and data deletion instructions.",
  ogTitle: "Privacy Policy | AMSh — AI Receptionist",
  ogDescription:
    "Learn about our data privacy practices, Meta WhatsApp Cloud API integration, HIPAA & GDPR compliance, and how to request data deletion.",
});

export default function PrivacyPolicyPage() {
  const lastUpdated = "October 17, 2026";

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-cyan-100 selection:text-cyan-950">
      <Nav />
      <JsonLd data={breadcrumbSchema("/privacy")} />

      {/* Hero Header */}
      <section className="relative overflow-hidden pt-28 pb-14 sm:pt-36 sm:pb-18 border-b border-slate-100 bg-gradient-to-b from-slate-50/70 via-white to-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50/80 px-3.5 py-1.5 font-mono-ui text-xs font-semibold text-cyan-800 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-cyan-600" />
            <span>getamsh.com &bull; LEGAL &amp; COMPLIANCE</span>
          </div>

          <h1 className="font-sora text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-950">
            Privacy Policy
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
            How AMSh (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) collects, uses, protects, and handles your personal information across voice telephony, WhatsApp communications, and clinic appointment systems.
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
          
          {/* Quick Summary Box */}
          <div className="not-prose rounded-2xl border border-blue-100 bg-blue-50/60 p-6 sm:p-7 shadow-xs">
            <h2 className="font-sora text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Privacy Highlights for Patients &amp; Clinics
            </h2>
            <ul className="text-sm text-slate-700 space-y-2 mt-3 list-disc pl-5">
              <li><strong>Zero Data Selling:</strong> We never sell, monetize, or lease your personal, clinical, or contact data to third parties.</li>
              <li><strong>WhatsApp Cloud API:</strong> We use official Meta WhatsApp Cloud API infrastructure to deliver automated appointment confirmations and customer care. Messages are only sent with valid consent.</li>
              <li><strong>Voice Call Transparency:</strong> Calls handled by the AMSh AI receptionist are clearly announced to callers, with automated PII masking on logs.</li>
              <li><strong>Data Deletion on Demand:</strong> You can request full erasure of your data at any time by contacting <a href="mailto:privacy@techycodex.com" className="text-blue-600 font-medium underline">privacy@techycodex.com</a>.</li>
            </ul>
          </div>

          {/* Section 1 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold border-b border-slate-100 pb-3">
              1. Who We Are &amp; Scope of this Policy
            </h2>
            <p>
              This Privacy Policy applies to the <strong>AMSh AI Receptionist platform</strong>, available at <Link href="/">getamsh.com</Link> and associated subdomains, operated by <strong>TechyCodex</strong> (&ldquo;AMSh&rdquo;, &ldquo;Company&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;).
            </p>
            <p>
              AMSh acts as a technology platform and virtual front-desk receptionist for medical clinics, dental practices, aesthetic centers, and professional service providers. In technical data protection terms:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>For Clinics &amp; Business Owners:</strong> We act as a <em>Data Controller</em> regarding your account registration, billing data, and administrative credentials.
              </li>
              <li>
                <strong>For Patients &amp; Callers:</strong> We act as a <em>Data Processor</em> (or Service Provider / Business Associate) on behalf of the subscriber clinic, which remains the primary Data Controller of patient medical and contact information.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold border-b border-slate-100 pb-3">
              2. Information We Collect
            </h2>
            <p>We collect only the minimum personal information required to book appointments, answer clinic questions, and coordinate patient care:</p>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900">A. Information Provided Directly by Callers &amp; Patients</h3>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Contact Identifiers:</strong> Caller phone number (retrieved from caller ID or spoken during the call), full name, and optional email address.</li>
                <li><strong>Scheduling Details:</strong> Preferred appointment date, preferred time slot, requested treatment or clinical service (e.g., &ldquo;teeth cleaning&rdquo;, &ldquo;routine consultation&rdquo;), and doctor preference.</li>
                <li><strong>Voice Audio &amp; Transcripts:</strong> Audio recordings of inbound/outbound phone calls when recording is activated by the clinic, along with machine-generated real-time text transcripts.</li>
              </ul>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-lg font-semibold text-slate-900">B. WhatsApp Messaging Data</h3>
              <p>
                When a patient or caller communicates with an AMSh-powered clinic via WhatsApp, we collect and process the user&rsquo;s WhatsApp phone number, display profile name, timestamp, and message body text.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-lg font-semibold text-slate-900">C. Clinic Account Information</h3>
              <p>
                For healthcare clinic subscribers: clinic business name, registered address, billing contact, staff user emails, operating hours, service catalogs, and practitioner calendars.
              </p>
            </div>
          </section>

          {/* Section 3 - CRITICAL FOR META TECH PROVIDER VERIFICATION */}
          <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-6 sm:p-7">
            <div className="flex items-center gap-2">
              <span className="text-blue-600 font-bold text-xs uppercase tracking-wider font-mono-ui">Meta Platforms &amp; WhatsApp Policy Compliance</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-950 mt-1">
              3. Meta WhatsApp Cloud API Integration &amp; Data Handling
            </h2>
            <p>
              AMSh integrates with the official <strong>WhatsApp Business Cloud API</strong> operated by <strong>Meta Platforms, Inc.</strong> (&ldquo;Meta&rdquo;) to automate clinic customer care and appointment notifications.
            </p>
            
            <h4 className="font-semibold text-slate-900 pt-1">User Consent &amp; Opt-In</h4>
            <p>
              We adhere strictly to the <em>Meta WhatsApp Business Messaging Policy</em>. AMSh sends WhatsApp messages only when:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm">
              <li>A patient calls the clinic and verbally requests an SMS/WhatsApp booking confirmation or location map.</li>
              <li>A patient directly initiates an inbound conversation on the clinic&rsquo;s official WhatsApp Business number.</li>
              <li>A patient has provided explicit affirmative consent to the clinic to receive appointment status reminders.</li>
            </ul>

            <h4 className="font-semibold text-slate-900 pt-2">How to Opt-Out</h4>
            <p className="text-sm">
              Patients and users can revoke consent and opt out of automated WhatsApp communications at any time by simply replying with the word <strong>&ldquo;STOP&rdquo;</strong>, <strong>&ldquo;UNSUBSCRIBE&rdquo;</strong>, or <strong>&ldquo;CANCEL&rdquo;</strong> in the WhatsApp chat. Upon receiving an opt-out keyword, our system immediately suppresses automated outbound messages to that number.
            </p>

            <h4 className="font-semibold text-slate-900 pt-2">Meta Data Usage Restrictions</h4>
            <p className="text-sm">
              Data obtained through the WhatsApp Business API is processed solely to fulfill the requested conversational service. We do not use message content or patient contact information obtained via WhatsApp for cross-context behavioral advertising, profiling, or sharing with unauthorized third parties.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold border-b border-slate-100 pb-3">
              4. How We Use Collected Information
            </h2>
            <p>We process personal data for legitimate, specific, and transparent purposes:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Answering Inbound Calls &amp; Inquiries:</strong> Providing real-time, 24/7 front-desk voice answering for clinics, eliminating missed calls and answering patient questions about clinic hours and services.</li>
              <li><strong>Booking &amp; Managing Appointments:</strong> Checking practitioner availability, scheduling appointments on clinic calendars, and issuing booking confirmations.</li>
              <li><strong>Emergency Guardrails:</strong> Deterministically detecting severe medical symptoms during calls to immediately instruct callers to dial local emergency services (112, 108, or 911).</li>
              <li><strong>Quality Assurance &amp; Auditing:</strong> Reviewing call transcripts to resolve booking discrepancies and improve speech recognition accuracy.</li>
              <li><strong>Compliance with Legal &amp; Health Regulations:</strong> Ensuring adherence to local healthcare privacy laws and regulatory recordkeeping.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold border-b border-slate-100 pb-3">
              5. Third-Party Service Providers &amp; Sub-Processors
            </h2>
            <p>
              To deliver a low-latency, resilient voice and messaging platform, AMSh collaborates with vetted enterprise infrastructure providers under strict Data Processing Agreements (DPAs):
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100/75 text-slate-900 font-semibold">
                    <th className="p-3 border border-slate-200">Sub-Processor</th>
                    <th className="p-3 border border-slate-200">Purpose</th>
                    <th className="p-3 border border-slate-200">Data Transferred</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-3 border border-slate-200 font-medium">Meta Platforms, Inc.</td>
                    <td className="p-3 border border-slate-200">WhatsApp Cloud API messaging infrastructure</td>
                    <td className="p-3 border border-slate-200">WhatsApp phone number, conversational text messages</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200 font-medium">Twilio / Plivo / Exotel</td>
                    <td className="p-3 border border-slate-200">Telecommunications carrier &amp; WebSocket audio stream</td>
                    <td className="p-3 border border-slate-200">Phone numbers, call audio packets, call metadata</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200 font-medium">Deepgram</td>
                    <td className="p-3 border border-slate-200">Real-time speech-to-text (STT) transcription</td>
                    <td className="p-3 border border-slate-200">Ephemeral voice audio streams (zero-data-retention)</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200 font-medium">Cartesia</td>
                    <td className="p-3 border border-slate-200">Text-to-speech (TTS) voice generation</td>
                    <td className="p-3 border border-slate-200">Synthesized response sentences</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200 font-medium">Groq / Cloud LPU</td>
                    <td className="p-3 border border-slate-200">Fast conversational NLU and response generation</td>
                    <td className="p-3 border border-slate-200">Anonymized dialogue context (zero-training enterprise tier)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold border-b border-slate-100 pb-3">
              6. Data Security &amp; Compliance Standards
            </h2>
            <p>
              We implement industry-standard administrative, physical, and technical safeguards:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Encryption in Transit &amp; at Rest:</strong> All web traffic and WebSocket streams use TLS 1.3 encryption. Persistent data in PostgreSQL and media files are encrypted with AES-256.</li>
              <li><strong>Automatic PII Redaction:</strong> Sensitive identifiers like payment card numbers, bank credentials, and national ID patterns are automatically masked in logging pipelines.</li>
              <li><strong>Tenant Isolation:</strong> Every clinic operates within an isolated database context; clinics cannot view or query patient data belonging to other clinics.</li>
              <li><strong>HIPAA, GDPR &amp; DPDP Alignment:</strong> Architecture built around principle of data minimization, auditability, and sovereign regional hosting.</li>
            </ul>
          </section>

          {/* Section 7 - CRITICAL FOR DATA DELETION URL */}
          <section className="space-y-4 rounded-xl border border-red-100 bg-red-50/30 p-6 sm:p-7">
            <div className="flex items-center gap-2">
              <span className="text-red-700 font-bold text-xs uppercase tracking-wider font-mono-ui">User Rights &amp; Regulatory Compliance</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-950 mt-1">
              7. Your Rights &amp; Data Deletion Instructions
            </h2>
            <p>
              Under applicable privacy regulations (including India&rsquo;s DPDP Act 2023, EU/UK GDPR, California CCPA, and Meta Platform Policies), you have the right to request access to, correction of, or permanent deletion of your personal data.
            </p>

            <h4 className="font-semibold text-slate-900 pt-2">How to Submit a Data Deletion Request</h4>
            <p className="text-sm">
              If you have interacted with an AMSh-powered phone line or WhatsApp assistant and wish to have your phone number, call recordings, transcripts, or personal records permanently purged from our databases, please follow these instructions:
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-800">
              <li>
                Send an email to: <a href="mailto:privacy@techycodex.com" className="font-medium text-blue-600 underline">privacy@techycodex.com</a> (or <a href="mailto:info@techycodex.com" className="font-medium text-blue-600 underline">info@techycodex.com</a>).
              </li>
              <li>
                Use the subject line: <strong>&ldquo;Personal Data Deletion Request - AMSh&rdquo;</strong>.
              </li>
              <li>
                In the body of your message, state your <strong>Phone Number</strong> (in international format, e.g. +1... or +44...) and the <strong>Clinic Name</strong> you contacted.
              </li>
              <li>
                Our Data Protection Officer will verify your request and confirm deletion across active databases and backups within <strong>30 calendar days</strong>.
              </li>
            </ol>
            <p className="text-xs text-slate-500 pt-1">
              Note: Certain transactional and billing records may be retained for statutory tax and accounting periods as mandated by local laws.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold border-b border-slate-100 pb-3">
              8. Data Retention Policies
            </h2>
            <p>
              We retain personal data only for as long as necessary to fulfill the operational purposes described in this policy:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Audio Call Recordings:</strong> Stored for 90 days by default, after which audio binaries are purged, unless the clinic administrator specifies a shorter retention cycle.</li>
              <li><strong>Call Transcripts &amp; Booking History:</strong> Retained for the duration of the clinic&rsquo;s active subscription to provide historical context for returning patients, or until a deletion request is initiated.</li>
              <li><strong>Access Logs:</strong> Server and API security access logs are retained for 180 days for diagnostic and cybersecurity threat prevention.</li>
            </ul>
          </section>

          {/* Section 9 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold border-b border-slate-100 pb-3">
              9. Children&rsquo;s Privacy
            </h2>
            <p>
              AMSh does not knowingly solicit or collect personal information directly from individuals under the age of 18 without verifiable parental or guardian consent. When appointments are scheduled for pediatric patients, communications must be conducted by the child&rsquo;s parent or legal guardian.
            </p>
          </section>

          {/* Section 10 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold border-b border-slate-100 pb-3">
              10. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time to reflect modifications in our technology, regulatory mandates, or partner requirements. When changes are made, the revised date will be displayed at the top of this page. Substantive updates will be communicated to registered clinic administrators via email.
            </p>
          </section>

          {/* Section 11 - Contact */}
          <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-6 sm:p-7">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-950">
              11. Contact Us &amp; Data Protection Officer
            </h2>
            <p className="text-sm">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our compliance with Meta WhatsApp policies and healthcare regulations, please contact us:
            </p>
            <div className="text-sm space-y-1.5 pt-1 text-slate-800">
              <p><strong>Operating Entity:</strong> TechyCodex (techycodex.com) / AMSh (getamsh.com)</p>
              <p><strong>Privacy Email:</strong> <a href="mailto:privacy@techycodex.com" className="text-blue-600 underline">privacy@techycodex.com</a></p>
              <p><strong>General Support Email:</strong> <a href="mailto:info@techycodex.com" className="text-blue-600 underline">info@techycodex.com</a></p>
              <p><strong>Direct Telephone:</strong> <a href="tel:+918901414107" className="text-blue-600 underline">+91 8901414107</a></p>
              <p><strong>Official Address:</strong> TechyCodex, Haryana, India</p>
            </div>
          </section>

        </article>
      </main>

      <Footer3D />
    </div>
  );
}
