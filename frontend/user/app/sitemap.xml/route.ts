import { getSeoFile } from '../../lib/seo';

export async function GET() {
  const body = await getSeoFile('sitemap.xml');
  if (!body) return new Response('Service unavailable', { status: 503, headers: { 'Retry-After': '300' } });
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
