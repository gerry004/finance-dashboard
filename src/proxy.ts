import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Protect API routes and pages with authentication.
 * Runs on the Edge Runtime before requests reach API routes or pages.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow auth routes (login/verify/logout) to be accessed without authentication.
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get('dashboard_auth');
  const isAuthenticated = authCookie?.value === 'authenticated';

  if (pathname.startsWith('/api/')) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
