import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to protect API routes and pages with authentication
 * Runs on the Edge Runtime before requests reach API routes or pages
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow auth routes (login/verify/logout) to be accessed without authentication
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Check authentication cookie
  const authCookie = request.cookies.get('dashboard_auth');
  const isAuthenticated = authCookie?.value === 'authenticated';

  // Protect API routes (except auth routes)
  if (pathname.startsWith('/api/')) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // For page routes, we let them through but they'll handle auth client-side
  // This allows the PasscodePrompt component to be shown
  return NextResponse.next();
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

