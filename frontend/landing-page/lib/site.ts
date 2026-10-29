import type { Metadata } from "next";

/** One source of truth for the marketing site's identity and public pages.
 *  sitemap.xml, llms.txt, breadcrumbs and every page's canonical / Open Graph tags are built from here,
 *  so a new page only needs an entry in ROUTES. */
export const SITE = {
  name: "AMSh",
  url: "https://getamsh.com",
  tagline: "Autonomous 24/7 AI Employee for Clinics, Salons, Education & Spas",
  description:
    "AMSh is an autonomous AI front-desk employee platform for healthcare clinics, hair salons, educational institutions, and luxury spas. Answers calls & WhatsApp 24/7, books appointments, captures student leads, and eliminates missed revenue.",
  logo: "/landing/amsh_logo.png",
  locale: "en_US",
  email: "info@techycodex.com",
  publisher: { name: "TechyCodex", url: "https://techycodex.com" },
} as const;

export interface SiteRoute {
  path: string;
  /** Short name for breadcrumbs, llms.txt and the sitemap. */
  name: string;
  /** One-line summary for llms.txt (what an answer engine should know this page is about). */
  summary: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly";
}

export const ROUTES: SiteRoute[] = [
  { path: "/", name: "Home", summary: "Overview of AMSh, the autonomous 24/7 AI employee platform for clinics, salons, education, and spas.", priority: 1.0, changeFrequency: "weekly" },
  { path: "/ai-receptionist-for-clinics", name: "AI Receptionist for Clinics", summary: "AI front-desk employee for medical clinics: answers patient calls, books doctor appointments, handles follow-ups.", priority: 0.9, changeFrequency: "weekly" },
  { path: "/ai-receptionist-for-dentists", name: "AI Receptionist for Dentists", summary: "AI dental receptionist: answers every patient call, triages dental emergencies and books chair appointments.", priority: 0.9, changeFrequency: "weekly" },
  { path: "/ai-receptionist-for-salons", name: "AI Receptionist for Salons", summary: "24/7 AI front-desk receptionist for hair salons, barbershops and beauty studios: books stylist slots and collects deposit links via WhatsApp.", priority: 0.9, changeFrequency: "weekly" },
  { path: "/ai-receptionist-for-education", name: "AI Receptionist for Education", summary: "AI admissions assistant and front-desk employee for universities, schools, and coaching academies: captures student leads and schedules campus visits.", priority: 0.9, changeFrequency: "weekly" },
  { path: "/ai-receptionist-for-wellness", name: "AI Receptionist for Spas & Wellness", summary: "24/7 AI concierge for day spas, wellness centres, and recovery lounges: coordinates treatment rooms, therapists and packages.", priority: 0.9, changeFrequency: "weekly" },
  { path: "/ai-appointment-booking", name: "AI Appointment Booking", summary: "AI scheduling assistant that books, confirms and reschedules patient appointments on phone and WhatsApp.", priority: 0.9, changeFrequency: "weekly" },
  { path: "/ai-phone-answering-service", name: "AI Phone Answering Service", summary: "24/7 AI phone answering for healthcare practices that answers on the first ring and books appointments.", priority: 0.8, changeFrequency: "weekly" },
  { path: "/ai-answering-service-medical", name: "AI Answering Service for Medical Offices", summary: "AI medical answering service that replaces call centers with 24/7 patient intake and scheduling.", priority: 0.8, changeFrequency: "weekly" },
  { path: "/dental-answering-service", name: "Dental Answering Service", summary: "24/7 AI dental answering service with emergency triage and direct appointment booking.", priority: 0.8, changeFrequency: "weekly" },
  { path: "/ai-receptionist-whatsapp", name: "AI Receptionist for WhatsApp", summary: "AI receptionist on WhatsApp that answers patient questions, sends reminders and books appointments.", priority: 0.8, changeFrequency: "weekly" },
  { path: "/pilot", name: "Clinic Pilot Program", summary: "Apply for the 14-day guided AMSh pilot for medical and dental clinics.", priority: 0.9, changeFrequency: "weekly" },
  { path: "/docs", name: "Developer Docs", summary: "Developer documentation for AMSh voice and telephony APIs.", priority: 0.6, changeFrequency: "monthly" },
  { path: "/privacy", name: "Privacy Policy", summary: "Privacy Policy for AMSh AI Receptionist and WhatsApp Cloud API services.", priority: 0.5, changeFrequency: "monthly" },
  { path: "/terms", name: "Terms of Service", summary: "Terms of Service and acceptable use policy for AMSh AI Receptionist.", priority: 0.5, changeFrequency: "monthly" },
];

export function absoluteUrl(path: string): string {
  return path === "/" ? SITE.url : `${SITE.url}${path}`;
}

export function routeFor(path: string): SiteRoute | undefined {
  return ROUTES.find((r) => r.path === path);
}

/** The generated social preview (app/opengraph-image.tsx). Verified on a dev build: the file-based image only reaches
 *  the home route, not child pages that set their own openGraph, so every page references it explicitly. */
const OG_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: `${SITE.name} - ${SITE.tagline}` };

/** Full metadata for one page. Next merges metadata shallowly, so every page must set its own canonical and openGraph
 *  (otherwise it inherits the home page's canonical and is treated as a duplicate of it). */
export function pageMetadata(opts: {
  path: string;
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  keywords?: string[];
  noindex?: boolean;
}): Metadata {
  const url = absoluteUrl(opts.path);
  const ogTitle = opts.ogTitle ?? opts.title;
  const ogDescription = opts.ogDescription ?? opts.description;
  return {
    title: opts.title,
    description: opts.description,
    keywords: opts.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url,
      siteName: SITE.name,
      locale: SITE.locale,
      type: "website",
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title: ogTitle, description: ogDescription, images: [OG_IMAGE.url] },
    ...(opts.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
