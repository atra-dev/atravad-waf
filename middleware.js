import { NextResponse } from "next/server";

/**
 * Enhanced Middleware with Session Protection
 * Validates token presence and redirects unauthorized users
 * Full token validation happens in API routes and client-side
 */
export function middleware(request) {
  const { pathname } = request.nextUrl;
  const isDevelopment = process.env.NODE_ENV !== "production";
  const isHomePage = pathname === "/";

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/login"];
  const isFirebaseHelperRoute =
    pathname.startsWith('/__/auth') || pathname.startsWith('/__/firebase');
  const isPublicRoute = publicRoutes.includes(pathname) || isFirebaseHelperRoute;

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
  if (isHomePage) {
    const nonce = btoa(crypto.randomUUID());
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);

    const firebaseAuthDomain =
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "atravad-waf.firebaseapp.com";
    const firebaseAuthOrigin = `https://${firebaseAuthDomain}`;
    const isDevelopment = process.env.NODE_ENV !== "production";

    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self' https://accounts.google.com",
      "frame-ancestors 'none'",
      "object-src 'none'",
      `script-src 'self' 'nonce-${nonce}' https://apis.google.com https://accounts.google.com${
        isDevelopment ? " 'unsafe-eval'" : ""
      }`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://flagcdn.com https://www.gravatar.com",
      "font-src 'self' data:",
      `connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://firebaseinstallations.googleapis.com https://www.googleapis.com https://*.googleapis.com https://*.gstatic.com https://*.firebaseio.com ${firebaseAuthOrigin} https://accounts.google.com https://apis.google.com https://cdn.jsdelivr.net`,
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      `frame-src 'self' ${firebaseAuthOrigin} https://accounts.google.com https://apis.google.com`,
      "media-src 'self'",
      "child-src 'self' blob:",
      "upgrade-insecure-requests",
    ]
      .filter(Boolean)
      .join("; ");

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    response.headers.set("Content-Security-Policy", contentSecurityPolicy);
    response.headers.set("x-nonce", nonce);

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
