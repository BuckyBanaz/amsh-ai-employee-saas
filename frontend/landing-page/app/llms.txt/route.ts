import { ROUTES, SITE, absoluteUrl } from "@/lib/site";

// /llms.txt (llmstxt.org): a plain-markdown map of the site for AI answer engines, so they can describe and cite AMSh
// accurately (GEO). Built from the same ROUTES list as the sitemap, so it never drifts from the real pages.
export const dynamic = "force-static";

export function GET() {
  const pages = ROUTES.map((r) => `- [${r.name}](${absoluteUrl(r.path)}): ${r.summary}`).join("\n");
  const body = `# ${SITE.name}

> ${SITE.description}

${SITE.name} (${SITE.url}) is built by ${SITE.publisher.name} (${SITE.publisher.url}) for medical clinics, dental practices and hospitals.

## Key facts
- What it is: an AI receptionist / virtual front-desk employee for healthcare practices.
- Channels: phone calls and WhatsApp.
- Main jobs: answer every patient call 24/7, book and reschedule appointments, answer clinic FAQs, send confirmations and reminders, and hand urgent or emergency calls to clinic staff.
- Languages: Hindi, Hinglish and English, among others.
- Contact: ${SITE.email}
- Try it: apply for the 14-day clinic pilot at ${absoluteUrl("/pilot")}

## Pages
${pages}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
