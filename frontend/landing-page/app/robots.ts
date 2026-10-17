import { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// AI search / answer-engine crawlers, allowed by name so AMSh can be cited in ChatGPT, Claude, Perplexity, Gemini
// and Apple answers (GEO). "*" already allows them; naming them makes the intent explicit and survives a stricter "*" later.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "DuckAssistBot",
];

export default function robots(): MetadataRoute.Robots {
  const disallow = ["/api/"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      { userAgent: "Googlebot", allow: "/", disallow },
      { userAgent: AI_CRAWLERS, allow: "/", disallow },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: "getamsh.com",
  };
}
