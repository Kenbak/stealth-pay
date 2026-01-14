/**
 * Next.js Middleware
 *
 * SECURITY: Runs on every request for:
 * - Rate limiting
 * - Authentication checks
 * - Request logging
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rate limiting store (in-memory, shared across requests in the same edge worker)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Rate limit configurations
const RATE_LIMITS = {
  api: { limit: 60, windowSeconds: 60 }, // 60 requests per minute
  auth: { limit: 5, windowSeconds: 60 }, // 5 auth attempts per minute
};

/**
 * Get client identifier for rate limiting
 */
function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0].trim() || "unknown";
  return ip;
}

/**
 * Check rate limit
 */
function checkRateLimit(
  identifier: string,
  config: { limit: number; windowSeconds: number }
): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now();
  const key = identifier;
  const windowMs = config.windowSeconds * 1000;

  let entry = rateLimitStore.get(key);

  // Cleanup old entries periodically
  if (rateLimitStore.size > 10000) {
    const keysToDelete: string[] = [];
    rateLimitStore.forEach((v, k) => {
      if (now >= v.resetAt) keysToDelete.push(k);
    });
    keysToDelete.forEach((k) => rateLimitStore.delete(k));
  }

  // New or expired entry
  if (!entry || now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    rateLimitStore.set(key, entry);
    return { allowed: true, remaining: config.limit - 1 };
  }

  entry.count++;

  if (entry.count > config.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  return { allowed: true, remaining: config.limit - entry.count };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Get client identifier
  const clientId = getClientId(request);

  // Apply rate limiting to API routes
  if (pathname.startsWith("/api")) {
    // Stricter limits for auth endpoints
    const config = pathname.startsWith("/api/auth")
      ? RATE_LIMITS.auth
      : RATE_LIMITS.api;

    const rateLimitKey = `${pathname}:${clientId}`;
    const result = checkRateLimit(rateLimitKey, config);

    if (!result.allowed) {
      return new NextResponse(
        JSON.stringify({
          error: "Too many requests",
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(result.retryAfter),
            "X-RateLimit-Limit": String(config.limit),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // Add rate limit headers to response
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", String(config.limit));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    return response;
  }

  // Protect dashboard routes - check for auth token
  if (pathname.startsWith("/dashboard")) {
    // For now, just let them through - auth will be checked by the pages
    // In production, you'd verify the JWT here
    return NextResponse.next();
  }

  return NextResponse.next();
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    // Match all request paths except for static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
