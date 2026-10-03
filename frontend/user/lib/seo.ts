import { BASE_URL } from '../utils/api_endpoints';

export interface SeoPageData {
  path: string;
  title: string;
  full_title: string;
  description: string;
  og_image: string;
  canonical: string;
  noindex: boolean;
}

export interface SeoPublic {
  site_name: string;
  site_url: string;
  locale: string;
  twitter_handle: string;
  verification: { google: string; bing: string };
  analytics: { ga4_id: string; gtm_id: string };
  json_ld: Record<string, unknown> | null;
  pages: Record<string, SeoPageData>;
}

/** The marketing site's SEO settings from the API (edited in the admin portal). Cached for 5 minutes; null when the API is down,
 *  in which case callers fall back to the text written in code. */
export async function getSeo(): Promise<SeoPublic | null> {
  try {
    const res = await fetch(`${BASE_URL}/seo/public`, { next: { revalidate: 300 } });
    return res.ok ? ((await res.json()) as SeoPublic) : null;
  } catch {
    return null;
  }
}

/** robots.txt / sitemap.xml text from the API, passed through as is. */
export async function getSeoFile(name: 'robots.txt' | 'sitemap.xml'): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/seo/${name}`, { next: { revalidate: 300 } });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}
