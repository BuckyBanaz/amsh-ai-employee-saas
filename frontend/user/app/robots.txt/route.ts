import { getSeoFile } from '../../lib/seo';

export async function GET() {
  const body = await getSeoFile('robots.txt');
  // A 503 tells crawlers to come back later instead of treating a broken file as "allow everything".
  if (!body) return new Response('Service unavailable', { status: 503, headers: { 'Retry-After': '300' } });
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
