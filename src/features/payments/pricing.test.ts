import { describe, it, expect } from "vitest";
import { formatReference, isValidTier } from "./pricing";

/**
 * Pricing engine unit tests (doc 26 — Pricing Tests).
 *
 * `computePrice` requires the settings service (async DB); we test the pure
 * helpers here. The full computePrice is exercised in integration tests.
 *
 * Source: doc 26 (Testing — Pricing), doc 15 (Payments).
 */
describe("formatReference", () => {
  it("formats a reference correctly (doc 15 — ME-2026-000001)", () => {
    expect(formatReference(2026, 1)).toBe("ME-2026-000001");
    expect(formatReference(2026, 124)).toBe("ME-2026-000124");
    expect(formatReference(2027, 999999)).toBe("ME-2027-999999");
  });

  it("zero-pads the sequence to 6 digits", () => {
    expect(formatReference(2026, 42)).toBe("ME-2026-000042");
  });
});

describe("isValidTier", () => {
  it("accepts tiers 1–4", () => {
    expect(isValidTier(1)).toBe(true);
    expect(isValidTier(2)).toBe(true);
    expect(isValidTier(3)).toBe(true);
    expect(isValidTier(4)).toBe(true);
  });

  it("rejects out-of-range tiers", () => {
    expect(isValidTier(0)).toBe(false);
    expect(isValidTier(5)).toBe(false);
    expect(isValidTier(-1)).toBe(false);
  });

  it("rejects non-integers", () => {
    expect(isValidTier(1.5)).toBe(false);
    expect(isValidTier(NaN)).toBe(false);
  });
});
