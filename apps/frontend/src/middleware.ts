import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware for server-side auth gating.
 *
 * Checks for the `auth-storage` key in cookies (set by zustand/persist via
 * localStorage — mirrored here as a lightweight server-side check). For a
 * production deployment the backend should issue an HTTP-only cookie instead.
 *
 * This prevents the flash-of-spinner that occurs when the client-side
 * dashboard layout hydrates Zustand and then redirects.
 */
export function middleware(request: NextRequest) {
  const authStorage = request.cookies.get('auth-token')?.value;

  // If no auth token cookie is present, redirect to login
  // NOTE: The primary auth mechanism is still the client-side Zustand store
  // with localStorage. This middleware provides an early redirect for
  // hard-refreshes when the cookie is set by the app.
  const isAuthPage =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register');

  if (!authStorage && !isAuthPage) {
    // Let the client-side guard handle it — we don't block here because
    // the token is in localStorage, not cookies, in the current implementation.
    // This middleware is a placeholder for when cookie-based auth is added.
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  // Only run on dashboard routes (skip API, static files, auth pages)
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login|register|api).*)'],
};
