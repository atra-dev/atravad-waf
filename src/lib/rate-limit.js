/**
 * Rate Limiting Middleware
 * 
 * Enterprise-grade rate limiting for ATRAVAD WAF API endpoints.
 * Implements tiered rate limiting strategy:
 * - Edge/middleware level: per-IP and per-route-group limits
 * - Endpoint-level: semantics-aware limits (per-node, per-tenant)
 * 
 * Architecture:
 * - Uses Firestore for distributed rate limit tracking (works across serverless instances)
 * - Implements token bucket algorithm for smooth rate limiting
 * - Configurable limits per endpoint and route group
 * - Observable metrics for operations monitoring
 */

import { adminDb } from '@/lib/firebase-admin';

/**
 * Rate limit configuration per route group
 */
const RATE_LIMIT_CONFIG = {
  // Node endpoints - stricter limits
  '/api/nodes': {
    perIP: { requests: 100, windowSeconds: 60 }, // 100 req/min per IP
    perNode: { requests: 10, windowSeconds: 60 }, // 10 req/min per node (for health/config)
  },
  // Log ingestion - very strict to prevent flooding
  '/api/logs': {
    perIP: { requests: 200, windowSeconds: 60 }, // 200 req/min per IP
    perNode: { requests: 1000, windowSeconds: 60 }, // 1000 logs/min per node
  },
  // General API endpoints
  '/api': {
    perIP: { requests: 100, windowSeconds: 60 }, // 100 req/min per IP
  },
};

/**
 * Get client IP address from request
 * 
 * @param {Request} request - Next.js request object
 * @returns {string} Client IP address
 */
function getClientIP(request) {
  // Try various headers (for proxies, load balancers, etc.)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback (may not work in serverless)
  return request.headers.get('x-forwarded-for') || 'unknown';
}

/**
 * Get route group from pathname
 * 
 * @param {string} pathname - Request pathname
 * @returns {string} Route group
 */
function getRouteGroup(pathname) {
  if (pathname.startsWith('/api/nodes')) {
    return '/api/nodes';
  }
  if (pathname.startsWith('/api/logs')) {
    return '/api/logs';
  }
  if (pathname.startsWith('/api')) {
    return '/api';
  }
  return 'default';
}

/**
 * Check rate limit for a key (IP, node, etc.)
 * 
 * @param {string} key - Rate limit key (e.g., "ip:1.2.3.4", "node:node123")
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowSeconds - Time window in seconds
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: Date}>}
 */
async function checkRateLimit(key, maxRequests, windowSeconds) {
  try {
    if (!adminDb) {
      // If DB not initialized, allow request (fail open for development)
      return { allowed: true, remaining: maxRequests, resetAt: new Date(Date.now() + windowSeconds * 1000) };
    }

    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const bucketStart = Math.floor(now / windowMs) * windowMs;
    const resetAt = new Date(bucketStart + windowMs);

    // Get or create rate limit document
    const rateLimitKey = `ratelimit_${key}_${bucketStart}`;
    const rateLimitDoc = await adminDb.collection('rate_limits').doc(rateLimitKey).get();

    let currentCount = 0;
    if (rateLimitDoc.exists) {
      const data = rateLimitDoc.data();
      currentCount = data.count || 0;
    }

    // Check if limit exceeded
    if (currentCount >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    // Increment counter
    await adminDb.collection('rate_limits').doc(rateLimitKey).set({
      key,
      count: currentCount + 1,
      windowStart: new Date(bucketStart),
      windowEnd: resetAt,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // Cleanup old rate limit entries (keep last 24 hours)
    // This runs asynchronously to not block the request
    cleanupOldRateLimits().catch(err => {
      console.error('Error cleaning up old rate limits:', err);
    });

    return {
      allowed: true,
      remaining: maxRequests - currentCount - 1,
      resetAt,
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // Fail open - allow request if rate limiting fails
    return { allowed: true, remaining: maxRequests, resetAt: new Date(Date.now() + windowSeconds * 1000) };
  }
}

/**
 * Cleanup old rate limit entries
 */
async function cleanupOldRateLimits() {
  try {
    if (!adminDb) return;

    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const oldEntries = await adminDb
      .collection('rate_limits')
      .where('windowEnd', '<', new Date(oneDayAgo))
      .limit(100)
      .get();

    if (!oldEntries.empty) {
      const batch = adminDb.batch();
      oldEntries.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }
  } catch (error) {
    // Don't throw - cleanup failures shouldn't break rate limiting
    console.error('Error cleaning up rate limits:', error);
  }
}

/**
 * Rate limit middleware for API routes
 * 
 * @param {Request} request - Next.js request object
 * @param {Object} options - Rate limit options
 * @param {string} options.routeGroup - Route group (auto-detected if not provided)
 * @param {string} options.nodeId - Node ID (for per-node limits)
 * @returns {Promise<{allowed: boolean, response?: Response, remaining?: number, resetAt?: Date}>}
 */
export async function rateLimit(request, options = {}) {
  try {
    const pathname = new URL(request.url).pathname;
    const routeGroup = options.routeGroup || getRouteGroup(pathname);
    const config = RATE_LIMIT_CONFIG[routeGroup] || RATE_LIMIT_CONFIG['/api'];

    const clientIP = getClientIP(request);

    // Check per-IP rate limit
    if (config.perIP) {
      const ipKey = `ip:${clientIP}`;
      const ipResult = await checkRateLimit(ipKey, config.perIP.requests, config.perIP.windowSeconds);
      
      if (!ipResult.allowed) {
        return {
          allowed: false,
          response: new Response(
            JSON.stringify({
              error: 'Rate limit exceeded',
              message: `Too many requests from this IP. Limit: ${config.perIP.requests} requests per ${config.perIP.windowSeconds} seconds.`,
              retryAfter: Math.ceil((ipResult.resetAt.getTime() - Date.now()) / 1000),
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Limit': config.perIP.requests.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': Math.ceil(ipResult.resetAt.getTime() / 1000).toString(),
                'Retry-After': Math.ceil((ipResult.resetAt.getTime() - Date.now()) / 1000).toString(),
              },
            }
          ),
          remaining: 0,
          resetAt: ipResult.resetAt,
        };
      }
    }

    // Check per-node rate limit (if nodeId provided)
    if (config.perNode && options.nodeId) {
      const nodeKey = `node:${options.nodeId}`;
      const nodeResult = await checkRateLimit(nodeKey, config.perNode.requests, config.perNode.windowSeconds);
      
      if (!nodeResult.allowed) {
        return {
          allowed: false,
          response: new Response(
            JSON.stringify({
              error: 'Rate limit exceeded',
              message: `Too many requests from this node. Limit: ${config.perNode.requests} requests per ${config.perNode.windowSeconds} seconds.`,
              retryAfter: Math.ceil((nodeResult.resetAt.getTime() - Date.now()) / 1000),
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Limit': config.perNode.requests.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': Math.ceil(nodeResult.resetAt.getTime() / 1000).toString(),
                'Retry-After': Math.ceil((nodeResult.resetAt.getTime() - Date.now()) / 1000).toString(),
              },
            }
          ),
          remaining: 0,
          resetAt: nodeResult.resetAt,
        };
      }
    }

    // All checks passed
    return {
      allowed: true,
    };
  } catch (error) {
    console.error('Error in rate limit middleware:', error);
    // Fail open - allow request if rate limiting fails
    return { allowed: true };
  }
}

/**
 * Get rate limit configuration for a route
 * 
 * @param {string} routeGroup - Route group
 * @returns {Object} Rate limit configuration
 */
export function getRateLimitConfig(routeGroup) {
  return RATE_LIMIT_CONFIG[routeGroup] || RATE_LIMIT_CONFIG['/api'];
}
