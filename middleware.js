import { NextResponse } from "next/server";

/**
 * Enhanced Middleware with Session Protection
 * Validates token presence and redirects unauthorized users
 * Full token validation happens in API routes and client-side
 */
export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/login"];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Check for auth token in cookies
  const token = request.cookies.get("authToken")?.value;

  // If trying to access protected route without token, redirect to login
  if (!isPublicRoute && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If trying to access login page with token, allow it (client-side will validate)
  // Client-side validation will redirect if token is invalid

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
