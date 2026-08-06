import { getPublicNumber } from "@/features/settings/service";
import type { PinType } from "@/types/domain";

/**
 * Pricing engine — server-authoritative (Phase 5 #1, #7).
 *
 * Price = Location Tier × Pin Type, ALWAYS read from the Settings system.
 * The client NEVER computes or sends a price; it only displays the value
 * returned by this engine. The payment record freezes the computed amount at
 * creation time so a later admin price change never rewrites history (doc 15).
 *
 * Pure functions where possible; the settings read is the only async boundary.
 *
 * Source: doc 15 (Payments), doc 02 (Business Model), Phase 5 requirements #1, #7.
 */

export interface PriceBreakdown {
  tier: number;
  pinType: PinType;
  amount: number; // integer EGP
  currency: "EGP";
  /** Whether this would be free under the Genesis campaign (caller decides). */
  genesisEligible: boolean;
}

/**
 * Compute the price for a tier × pin type from the live settings table.
 * Falls back to documented defaults if a setting is missing.
 */
export async function computePrice(
  tier: number,
  pinType: PinType,
  genesisEligible = false,
): Promise<PriceBreakdown> {
  const key = `${pinType}_tier${tier}` as const;
  // Documented defaults (docs 02, 15) — used only if the setting is absent.
  const fallback =
    pinType === "legacy"
      ? ([80, 130, 200, 400][tier - 1] ?? 80)
      : ([30, 50, 90, 180][tier - 1] ?? 30);

  const amount = await getPublicNumber("pricing", key, fallback);

  return {
    tier,
    pinType,
    amount: genesisEligible ? 0 : amount,
    currency: "EGP",
    genesisEligible,
  };
}

/**
 * Pure helper: format the reference (doc 15 — ME-2026-000001).
 * The sequence is sourced from the Genesis counter or a separate payments
 * sequence; here we generate the human-readable form from a numeric seed.
 */
export function formatReference(year: number, sequence: number): string {
  const padded = String(sequence).padStart(6, "0");
  return `ME-${year}-${padded}`;
}

/** Validate a tier is in range (1–4). */
export function isValidTier(tier: number): boolean {
  return Number.isInteger(tier) && tier >= 1 && tier <= 4;
}
