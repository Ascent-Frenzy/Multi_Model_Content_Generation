import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Placeholder — auth is handled client-side via Zustand.
  // Remove this file entirely if no server-side middleware is needed.
  return NextResponse.next();
}

export const config = {
  matcher: [], // Empty matcher = middleware never runs
};
