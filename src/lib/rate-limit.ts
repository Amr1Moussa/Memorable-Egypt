/**
 * Rate-limit scaffolding.
 *
 * Doc 08 specifies:
 *   - Public endpoints:            100 req/min
 *   - Authenticated endpoints:     300 req/min
 *   - AI endpoints:                 20 req/hour/user
 *
 * Phase 1 ships an in-memory token-bucket skeleton with the documented
 * limit presets. This is fine for a single Vercel serverless instance
 * and for local development. When we outgrow it (multi-instance, real
 * traffic), the same interface swaps to Upstash Redis with no call-site
 * changes (doc 05 — Scalability Strategy lists Redis as a future add).
 *
 * Source: doc 08 (Rate Limiting), doc 05 (Scalability Strategy).
 */

export const RATE_LIMITS = {
  public: { requests: 100, windowMs: 60_000 },
  authenticated: { requests: 300, windowMs: 60_000 },
  ai: { requests: 20, windowMs: 60 * 60_000 },
} as const;

export type RateLimitTier = keyof typeof RATE_LIMITS;

interface Bucket {
  tokens: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check a key against a tier. Callers in route handlers pass a stable key
 * (e.g. `ip:<addr>` for public, `user:<id>` for authenticated).
 */
export function rateLimit(key: string, tier: RateLimitTier): RateLimitResult {
  const limit = RATE_LIMITS[tier];
  const now = Date.now();
  const existing = buckets.get(key);

  // Reset bucket if the window has elapsed or it doesn't exist yet.
  if (!existing || existing.resetAt <= now) {
    const bucket: Bucket = {
      tokens: limit.requests - 1,
      resetAt: now + limit.windowMs,
    };
    buckets.set(key, bucket);
    return { allowed: true, remaining: bucket.tokens, resetAt: bucket.resetAt };
  }

  if (existing.tokens <= 0) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.tokens -= 1;
  return {
    allowed: true,
    remaining: existing.tokens,
    resetAt: existing.resetAt,
  };
}
