import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Safe cookie extraction
  let accessToken: string | undefined = undefined;
  let onboardingCompleted = false;
  let lastPendingStep = '/onboarding/business';

  try {
    accessToken = request.cookies.get('access_token')?.value;
    onboardingCompleted = request.cookies.get('amsh_onboarding_completed')?.value === 'true';

    const rawStepCookie = request.cookies.get('amsh_onboarding_step')?.value;
    if (rawStepCookie) {
      const decoded = decodeURIComponent(rawStepCookie);
      if (decoded && decoded.startsWith('/onboarding')) {
        lastPendingStep = decoded;
      }
    }
  } catch (err) {
    console.error('Middleware cookie parse error:', err);
  }

  // Public auth pages & landing pages
  // These must open without a session: someone who forgot their password, or a teammate opening an invite link, has none.
  const PUBLIC_AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/accept-invite', '/verify-email'];
  const isAuthPage = PUBLIC_AUTH_PATHS.some((path) => pathname.startsWith(path));
  // robots.txt and sitemap.xml are for crawlers: no session. /legal/* and /docs are public.
  const isLandingPage = pathname === '/' || pathname.startsWith('/landing') || pathname.startsWith('/docs') || pathname.startsWith('/legal') || pathname === '/robots.txt' || pathname === '/sitemap.xml';

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && typeof payload.exp === 'number') {
      return payload.exp * 1000 <= Date.now() + 5000;
    }
    return false;
  } catch {
    return false;
  }
}

  const hasExpiredToken = accessToken ? isTokenExpired(accessToken) : false;
  const validToken = accessToken && !hasExpiredToken ? accessToken : undefined;

  // 1. Unauthenticated or expired users trying to access protected routes (dashboard or onboarding)
  if (!validToken) {
    if (!isAuthPage && !isLandingPage) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      if (hasExpiredToken) {
        loginUrl.searchParams.set('expired', '1');
      }
      const response = NextResponse.redirect(loginUrl);
      if (hasExpiredToken) {
        response.cookies.delete('access_token');
      }
      return response;
    }
    return NextResponse.next();
  }

  // 2. Public auth pages (/login, /register) are always accessible
  if (isAuthPage) {
    return NextResponse.next();
  }

  // 3. Authenticated user accessing /dashboard before completing onboarding
  if (pathname.startsWith('/dashboard') && !onboardingCompleted) {
    return NextResponse.redirect(new URL(lastPendingStep, request.url));
  }

  // 4. Authenticated user accessing /onboarding after completing onboarding
  if (pathname.startsWith('/onboarding') && onboardingCompleted) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static assets (.svg, .png, .jpg, etc)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
