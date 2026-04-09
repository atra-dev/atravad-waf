import { NextResponse } from "next/server";

const ORIGIN_AUTH_HEADER = "x-atravad-origin-auth";

function createOriginBlockedResponse() {
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>403 Not Found</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #07111b;
        --panel: rgba(10, 22, 35, 0.88);
        --border: rgba(84, 104, 127, 0.35);
        --text: #f2f6fb;
        --muted: #90a4bb;
        --accent: #10b981;
        --accent-soft: rgba(16, 185, 129, 0.12);
        --glow: rgba(16, 185, 129, 0.18);
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        overflow: hidden;
        background:
          radial-gradient(circle at top left, rgba(16, 185, 129, 0.16), transparent 28%),
          radial-gradient(circle at bottom right, rgba(34, 197, 94, 0.14), transparent 26%),
          linear-gradient(160deg, #030711 0%, var(--bg) 52%, #02050a 100%);
        color: var(--text);
        font-family: "Segoe UI", Inter, Helvetica, Arial, sans-serif;
      }

      body::before,
      body::after {
        content: "";
        position: fixed;
        inset: auto;
        width: 28rem;
        height: 28rem;
        border-radius: 999px;
        filter: blur(72px);
        pointer-events: none;
        z-index: 0;
      }

      body::before {
        top: -8rem;
        left: -8rem;
        background: rgba(20, 184, 166, 0.16);
      }

      body::after {
        right: -10rem;
        bottom: -10rem;
        background: rgba(59, 130, 246, 0.1);
      }

      .shell {
        position: relative;
        z-index: 1;
        width: min(92vw, 44rem);
        padding: 2rem;
      }

      .card {
        position: relative;
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: 28px;
        padding: 2rem;
        background: linear-gradient(180deg, rgba(15, 23, 37, 0.95), var(--panel));
        box-shadow:
          0 28px 90px rgba(0, 0, 0, 0.55),
          inset 0 1px 0 rgba(255, 255, 255, 0.05),
          0 0 0 1px rgba(16, 185, 129, 0.05);
      }

      .card::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.04) 32%, transparent 58%),
          radial-gradient(circle at top right, var(--glow), transparent 30%);
        pointer-events: none;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        padding: 0.45rem 0.8rem;
        border-radius: 999px;
        background: var(--accent-soft);
        border: 1px solid rgba(16, 185, 129, 0.22);
        color: #d1fae5;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .dot {
        width: 0.55rem;
        height: 0.55rem;
        border-radius: 999px;
        background: var(--accent);
        box-shadow: 0 0 18px var(--accent);
      }

      h1 {
        margin: 1.3rem 0 0;
        font-size: clamp(2.5rem, 7vw, 4.75rem);
        line-height: 0.95;
        letter-spacing: -0.05em;
      }

      h1 span {
        display: block;
        color: var(--muted);
        font-size: clamp(1rem, 2.1vw, 1.25rem);
        font-weight: 600;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        margin-bottom: 0.9rem;
      }

      p {
        margin: 1.2rem 0 0;
        max-width: 34rem;
        color: var(--muted);
        font-size: 1rem;
        line-height: 1.75;
      }

      .panel {
        margin-top: 1.6rem;
        padding: 1rem 1.15rem;
        border-radius: 18px;
        background: rgba(8, 14, 24, 0.74);
        border: 1px solid rgba(148, 163, 184, 0.14);
      }

      .label {
        color: #dce7f5;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .value {
        margin-top: 0.45rem;
        color: #9fb3c8;
        font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
        font-size: 0.92rem;
        word-break: break-word;
      }

      @media (max-width: 640px) {
        .shell { padding: 1rem; }
        .card { padding: 1.35rem; border-radius: 22px; }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="card">
        <div class="badge"><span class="dot"></span>ATRAVA Defense</div>
        <h1><span>403 Not Found</span>Origin Access Denied</h1>
        <p>
          This deployment endpoint does not serve public traffic directly. Requests must pass
          through the configured protected entrypoint before they are allowed to reach the origin.
        </p>
        <div class="panel">
          <div class="label">Status</div>
          <div class="value">Direct origin access is blocked.</div>
        </div>
      </section>
    </main>
  </body>
</html>`;

  return new NextResponse(html, {
    status: 403,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

/**
 * Enhanced Middleware with Session Protection
 * Validates token presence and redirects unauthorized users
 * Full token validation happens in API routes and client-side
 */
export function middleware(request) {
  const { pathname } = request.nextUrl;
  const host = request.nextUrl.hostname || request.headers.get("host") || "";
  const isDevelopment = process.env.NODE_ENV !== "production";
  const isHomePage = pathname === "/";
  const expectedOriginSecret = process.env.ORIGIN_AUTH_SECRET || "";
  const actualOriginSecret = request.headers.get(ORIGIN_AUTH_HEADER) || "";

  // When the app is accessed via its public Vercel deployment hostname,
  // require the shared secret that only the WAF should send upstream.
  if (host.endsWith(".vercel.app")) {
    if (!expectedOriginSecret) {
      return createOriginBlockedResponse();
    }

    if (actualOriginSecret !== expectedOriginSecret) {
      return createOriginBlockedResponse();
    }
  }

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/login"];
  const isFirebaseHelperRoute =
    pathname.startsWith('/__/auth') || pathname.startsWith('/__/firebase');
  const isPublicRoute = publicRoutes.includes(pathname) || isFirebaseHelperRoute;
  const shouldAttachCsp =
    isHomePage || pathname === "/login" || isFirebaseHelperRoute;

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

    const isAuthRoute = pathname === "/login" || isFirebaseHelperRoute;

    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      `form-action 'self'${isAuthRoute ? " https://accounts.google.com" : ""}`,
      "frame-ancestors 'none'",
      "object-src 'none'",
      `script-src 'self' 'nonce-${nonce}'${
        isAuthRoute ? " https://apis.google.com https://accounts.google.com" : ""
      }${
        isDevelopment ? " 'unsafe-eval'" : ""
      }`,
      `script-src-elem 'self' 'nonce-${nonce}'${
        isAuthRoute ? " https://apis.google.com https://accounts.google.com" : ""
      }`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://flagcdn.com https://www.gravatar.com",
      "font-src 'self' data:",
      `connect-src 'self' https://cdn.jsdelivr.net${
        isAuthRoute
          ? " https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://firebaseinstallations.googleapis.com https://www.googleapis.com https://*.googleapis.com https://*.gstatic.com https://*.firebaseio.com https://accounts.google.com https://apis.google.com"
          : ""
      }`,
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      `frame-src ${isAuthRoute ? "'self' https://accounts.google.com https://apis.google.com https://*.firebaseapp.com" : "'none'"}`,
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
