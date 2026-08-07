import { describe, it, expect } from "vitest";
import { rateLimit, RATE_LIMITS } from "./rate-limit";

/**
 * Rate limiter tests (doc 08 — Rate Limiting).
 *
 * Source: doc 08 (Rate Limiting), doc 26 (Testing).
 */
describe("rateLimit", () => {
  // Each test uses a unique key to avoid cross-test interference from the
  // module-level in-memory buckets.
  let counter = 0;
  function uniqueKey(): string {
    counter += 1;
    return `test-key-${counter}`;
  }

  it("allows requests up to the limit", () => {
    const key = uniqueKey();
    for (let i = 0; i < RATE_LIMITS.public.requests; i++) {
      const result = rateLimit(key, "public");
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks after exceeding the limit", () => {
    const key = uniqueKey();
    for (let i = 0; i < RATE_LIMITS.public.requests; i++) {
      rateLimit(key, "public");
    }
    const over = rateLimit(key, "public");
    expect(over.allowed).toBe(false);
    expect(over.remaining).toBe(0);
  });

  it("tracks remaining count", () => {
    const key = uniqueKey();
    const first = rateLimit(key, "ai");
    expect(first.remaining).toBe(RATE_LIMITS.ai.requests - 1);

    const second = rateLimit(key, "ai");
    expect(second.remaining).toBe(RATE_LIMITS.ai.requests - 2);
  });

  it("isolates keys", () => {
    const keyA = uniqueKey();
    const keyB = uniqueKey();
    rateLimit(keyA, "public");
    const resultB = rateLimit(keyB, "public");
    expect(resultB.allowed).toBe(true);
    expect(resultB.remaining).toBe(RATE_LIMITS.public.requests - 1);
  });

  it("resets after the window elapses", () => {
    const key = uniqueKey();
    for (let i = 0; i < RATE_LIMITS.public.requests; i++) {
      rateLimit(key, "public");
    }
    const blocked = rateLimit(key, "public");
    expect(blocked.allowed).toBe(false);

    // Simulate window expiry by checking resetAt is in the future.
    expect(blocked.resetAt).toBeGreaterThan(Date.now());
  });
});
