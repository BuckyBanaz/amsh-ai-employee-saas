import { SITE, absoluteUrl, routeFor } from "./site";

/** schema.org builders for JSON-LD. Search engines and AI answer engines read these to understand who AMSh is,
 *  what each page offers and which questions it answers. Keep every value true to the visible page text. */

type Json = Record<string, unknown>;

const ORG_ID = `${SITE.url}/#organization`;
const WEBSITE_ID = `${SITE.url}/#website`;

export function organizationSchema(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE.name,
    url: SITE.url,
    logo: absoluteUrl(SITE.logo),
    description: SITE.description,
    email: SITE.email,
    parentOrganization: { "@type": "Organization", name: SITE.publisher.name, url: SITE.publisher.url },
    contactPoint: [{ "@type": "ContactPoint", contactType: "sales", email: SITE.email, availableLanguage: ["English", "Hindi"] }],
  };
}

export function websiteSchema(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    publisher: { "@id": ORG_ID },
    inLanguage: "en",
  };
}

/** The product itself (home page). */
export function softwareSchema(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${SITE.name} AI Receptionist`,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "AI receptionist / virtual front desk for healthcare",
    operatingSystem: "Web",
    url: SITE.url,
    description: SITE.description,
    publisher: { "@id": ORG_ID },
    audience: { "@type": "BusinessAudience", audienceType: "Medical clinics, dental practices and hospitals" },
  };
}

/** A landing page that describes one AMSh service (e.g. "AI Receptionist for Dentists"). */
export function serviceSchema(path: string, description: string): Json {
  const route = routeFor(path);
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: route?.name ?? SITE.name,
    serviceType: route?.name ?? "AI receptionist",
    description,
    url: absoluteUrl(path),
    provider: { "@id": ORG_ID },
    areaServed: "Worldwide",
    audience: { "@type": "BusinessAudience", audienceType: "Medical clinics and dental practices" },
  };
}

export function breadcrumbSchema(path: string): Json {
  const items: { name: string; url: string }[] = [{ name: "Home", url: SITE.url }];
  if (path !== "/") items.push({ name: routeFor(path)?.name ?? path, url: absoluteUrl(path) });
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
  };
}

/** Must mirror the FAQ text that is visible on the same page (Google ignores or penalises hidden Q&A). */
export function faqSchema(faqs: { q: string; a: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

/** The standard set for a service landing page: Service + Breadcrumb (+ FAQ when the page shows one). */
export function landingPageSchemas(path: string, description: string, faqs?: { q: string; a: string }[]): Json[] {
  const out = [serviceSchema(path, description), breadcrumbSchema(path)];
  if (faqs?.length) out.push(faqSchema(faqs));
  return out;
}
