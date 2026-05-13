import { NextResponse } from "next/server";

const SAFE_API_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const DEFAULT_CORS_ALLOWED_HEADERS = [
  "Authorization",
  "Content-Type",
  "X-Requested-With",
  "X-Log-Api-Key",
  "X-Tenant-Name",
];
const DEFAULT_CORS_ALLOWED_METHODS = [
  "GET",
  "HEAD",
  "OPTIONS",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
];

function createApiErrorResponse(message, status) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "Cross-Origin-Resource-Policy": "same-origin",
        "Referrer-Policy": "same-origin",
        "Vary": "Origin",
        "X-Content-Type-Options": "nosniff",
      },
    }
  );
}

function getAllowedCorsOrigins() {
  const rawValue = process.env.CORS_ALLOWED_ORIGINS || "";
  if (!rawValue.trim()) return new Set();

  const allowedOrigins = new Set();

  for (const candidate of rawValue.split(",")) {
    const value = candidate.trim();
    if (!value) continue;

    try {
      allowedOrigins.add(new URL(value).origin);
    } catch {
      // Ignore malformed values so one bad entry does not disable the list.
    }
  }

  return allowedOrigins;
}

function isSameOriginRequest(value, expectedOrigin) {
  if (!value || !expectedOrigin) return true;

  try {
    return new URL(value).origin === expectedOrigin;
  } catch {
    return false;
  }
}

function isPublicApiRequest(pathname, method) {
  return pathname === "/api/logs" && method === "POST";
}

function createCorsHeaders(origin) {
  return {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": DEFAULT_CORS_ALLOWED_HEADERS.join(", "),
    "Access-Control-Allow-Methods": DEFAULT_CORS_ALLOWED_METHODS.join(", "),
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Max-Age": "600",
    "Cache-Control": "no-store",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Referrer-Policy": "same-origin",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  };
}

/**
 * Enhanced Middleware with Session Protection
 * Validates token presence and redirects unauthorized users
 * Full token validation happens in API routes and client-side
 */
export function middleware(request) {
  const { pathname, origin } = request.nextUrl;
  const method = request.method.toUpperCase();
  const isHomePage = pathname === "/";
  const isApiRoute = pathname.startsWith("/api/");
  const allowedCorsOrigins = getAllowedCorsOrigins();

  if (isApiRoute) {
    const isPublicApi = isPublicApiRequest(pathname, method);
    const originHeader = request.headers.get("origin");
    const refererHeader = request.headers.get("referer");
    const fetchSite = (request.headers.get("sec-fetch-site") || "").toLowerCase();
    const isSameOrigin = isSameOriginRequest(originHeader, origin);
    const isAllowedCrossOrigin =
      Boolean(originHeader) && allowedCorsOrigins.has(originHeader);

    if (method === "OPTIONS") {
      if (!originHeader) {
        return new NextResponse(null, { status: 204 });
      }

      if (!isSameOrigin && !isAllowedCrossOrigin) {
        return createApiErrorResponse("Origin is not allowed", 403);
      }

      return new NextResponse(null, {
        status: 204,
        headers: createCorsHeaders(originHeader),
      });
    }

    if (fetchSite === "cross-site" && !isAllowedCrossOrigin) {
      return createApiErrorResponse("Cross-origin API requests are not allowed", 403);
    }

    if (originHeader && !isSameOrigin && !isAllowedCrossOrigin) {
      return createApiErrorResponse("Origin is not allowed", 403);
    }

    if (
      !isPublicApi &&
      !SAFE_API_METHODS.has(method) &&
      !originHeader &&
      refererHeader &&
      !isSameOriginRequest(refererHeader, origin)
    ) {
      return createApiErrorResponse("Referer is not allowed", 403);
    }

    if (!isPublicApi) {
      const token = request.cookies.get("authToken")?.value;
      if (!token) {
        return createApiErrorResponse("Unauthorized", 401);
      }
    }

    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
    response.headers.set("Referrer-Policy", "same-origin");
    response.headers.set("Vary", "Origin");
    response.headers.set("X-Content-Type-Options", "nosniff");
    if (isAllowedCrossOrigin) {
      const corsHeaders = createCorsHeaders(originHeader);
      for (const [headerName, headerValue] of Object.entries(corsHeaders)) {
        response.headers.set(headerName, headerValue);
      }
    }
    return response;
  }

  // Public routes that don't require authentication
  const isLoginRoute = pathname === "/login" || pathname.startsWith("/login/");
  const isFirebaseHelperRoute =
    pathname.startsWith("/__/auth") || pathname.startsWith("/__/firebase");
  const isPublicRoute = isHomePage || isLoginRoute || isFirebaseHelperRoute;
  const shouldAttachCsp = isHomePage || isLoginRoute || isFirebaseHelperRoute;

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
  if (shouldAttachCsp) {
    const nonce = btoa(crypto.randomUUID());
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);

    const authScriptSources =
      "https://apis.google.com https://accounts.google.com https://www.gstatic.com";
    const authConnectSources =
      "https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://firebaseinstallations.googleapis.com https://www.googleapis.com https://*.googleapis.com https://*.gstatic.com https://www.gstatic.com https://*.firebaseio.com https://accounts.google.com https://apis.google.com https://*.firebaseapp.com https://*.web.app";
    const authFrameSources =
      "'self' https://accounts.google.com https://apis.google.com https://*.firebaseapp.com https://*.web.app";
    const authChildSources =
      "'self' blob: https://accounts.google.com https://apis.google.com https://*.firebaseapp.com https://*.web.app";

    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self' https://accounts.google.com",
      "frame-ancestors 'none'",
      "object-src 'none'",
      `script-src 'self' 'nonce-${nonce}' ${authScriptSources} 'unsafe-eval'`,
      `script-src-elem 'self' 'nonce-${nonce}' ${authScriptSources}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://flagcdn.com https://www.gravatar.com",
      "font-src 'self' data:",
      `connect-src 'self' https://cdn.jsdelivr.net ${authConnectSources}`,
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      `frame-src ${authFrameSources}`,
      "media-src 'self'",
      `child-src ${authChildSources}`,
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
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0, private"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.set("Surrogate-Control", "no-store");
    response.headers.set("CDN-Cache-Control", "no-store");

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
