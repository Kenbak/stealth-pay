/**
 * Simple in-memory rate limiter
 * For production, use Redis-based solution like @upstash/ratelimit
 *
 * Security recommendation: Rate limit all endpoints to prevent:
 * - Brute force attacks
 * - DDoS
 * - Resource exhaustion
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every minute
setInterval(() => {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  });
}, 60 * 1000);

export interface RateLimitConfig {
  /** Number of requests allowed in the window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = `ratelimit:${identifier}`;

  let entry = store.get(key);

  // Create new entry or reset if window expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    };
  }

  // Increment count
  entry.count++;
  store.set(key, entry);

  const remaining = Math.max(0, config.limit - entry.count);
  const success = entry.count <= config.limit;

  return {
    success,
    remaining,
    resetAt: entry.resetAt,
  };
}

/**
 * Rate limit presets for different endpoint types
 */
export const RATE_LIMITS = {
  // Auth endpoints - stricter
  auth: { limit: 10, windowMs: 60 * 1000 }, // 10 per minute

  // Read endpoints - more lenient
  read: { limit: 100, windowMs: 60 * 1000 }, // 100 per minute

  // Write endpoints - moderate
  write: { limit: 30, windowMs: 60 * 1000 }, // 30 per minute

  // Sensitive operations - very strict
  sensitive: { limit: 5, windowMs: 60 * 1000 }, // 5 per minute

  // Payroll execution - very strict
  payroll: { limit: 3, windowMs: 60 * 1000 }, // 3 per minute
} as const;

/**
 * Get identifier from request (IP + wallet if available)
 */
export function getRateLimitIdentifier(
  ip: string,
  wallet?: string | null
): string {
  return wallet ? `${ip}:${wallet}` : ip;
}

/**
 * Helper to get IP from various headers
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0] ||
    "unknown"
  );
}
