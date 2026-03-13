import { NextResponse } from 'next/server';

/**
 * Enhanced Middleware with Session Protection
 * Validates token presence and redirects unauthorized users
 * Full token validation happens in API routes and client-side
 */
export function middleware(request) {
  const { pathname } = request.nextUrl;
  const requestHost = (request.headers.get('host') || '').toLowerCase();

  // Optional origin bypass protection (disabled by default).
  // Enable with ORIGIN_BYPASS_PROTECTION_ENABLED=true and set ORIGIN_BYPASS_SECRET.
  const bypassProtectionEnabled = process.env.ORIGIN_BYPASS_PROTECTION_ENABLED === 'true';
  const bypassSecret = process.env.ORIGIN_BYPASS_SECRET || '';
  const bypassAllowedHosts = (process.env.ORIGIN_BYPASS_ALLOWED_HOSTS || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  const bypassHeader = request.headers.get('x-atravad-edge') || '';
  const bypassProtectedPath = !pathname.startsWith('/_next') && pathname !== '/favicon.ico';

  if (bypassProtectionEnabled && bypassSecret && bypassProtectedPath) {
    const isAllowedDirectHost = bypassAllowedHosts.includes(requestHost);
    if (!isAllowedDirectHost && bypassHeader !== bypassSecret) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login'];
  const isPublicRoute = publicRoutes.includes(pathname);
  
  // Check for auth token in cookies
  const token = request.cookies.get('authToken')?.value;
  
  // If trying to access protected route without token, redirect to login
  if (!isPublicRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // If trying to access login page with token, allow it (client-side will validate)
  // Client-side validation will redirect if token is invalid
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
