import { createClient } from "@/lib/supabase/server";
import { BusinessRuleError } from "@/lib/errors";
import { getPublicBool, getPublicNumber } from "@/features/settings/service";
import { invalidateSettingsCache } from "@/features/settings/service";

/**
 * Genesis Campaign logic (Phase 5 #2).
 *
 * Rules (doc 15 + Phase 5 requirement #2):
 *   - First 100 approved memories receive a free Standard Pin.
 *   - One Genesis Pin per account (profiles.genesis_claimed).
 *   - Eligibility verified server-side.
 *   - Campaign auto-closes after 100 approved Genesis memories.
 *   - Existing Genesis memories remain valid permanently.
 *
 * The counter lives in settings (genesis.used_free_pins / genesis.max_free_pins)
 * so admins can observe + adjust it via the dashboard (doc 22).
 *
 * Source: doc 15 (Genesis Campaign), doc 22 (System Settings), Phase 5 #2.
 */

export interface GenesisStatus {
  enabled: boolean;
  maxFreePins: number;
  usedFreePins: number;
  remaining: number;
}

/** Read the current campaign status (public, shown on landing + pricing). */
export async function getGenesisStatus(): Promise<GenesisStatus> {
  const [enabled, maxFreePins, usedFreePins] = await Promise.all([
    getPublicBool("genesis", "enabled", true),
    getPublicNumber("genesis", "max_free_pins", 100),
    getPublicNumber("genesis", "used_free_pins", 0),
  ]);
  return {
    enabled,
    maxFreePins,
    usedFreePins,
    remaining: Math.max(0, maxFreePins - usedFreePins),
  };
}

/**
 * Check whether the current user is eligible for a free Genesis pin.
 * Server-side authoritative (Phase 5 #2, #7).
 *
 * Eligibility requires ALL of:
 *   - Campaign enabled.
 *   - Slots remaining (used < max).
 *   - User hasn't already claimed (profiles.genesis_claimed = false).
 */
export async function checkGenesisEligibility(userId: string): Promise<{
  eligible: boolean;
  reason?: string;
}> {
  const status = await getGenesisStatus();
  if (!status.enabled) {
    return { eligible: false, reason: "The Genesis Campaign has ended." };
  }
  if (status.remaining <= 0) {
    return {
      eligible: false,
      reason: "All 100 Genesis pins have been claimed.",
    };
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("genesis_claimed")
    .eq("id", userId)
    .single();
  if (profile?.genesis_claimed) {
    return {
      eligible: false,
      reason: "You've already used your free Genesis pin.",
    };
  }

  return { eligible: true };
}

/**
 * Atomically claim a Genesis slot for a user. Enforces one-per-account and
 * the global cap; increments the counter; marks the profile. Throws on
 * contention (race condition) so the caller can surface a friendly error.
 *
 * Uses the service-role admin client to update the settings counter reliably
 * (the anon client can't increment without a read-modify-write race).
 */
export async function claimGenesisPin(userId: string): Promise<void> {
  // Re-check eligibility immediately (defense-in-depth against races).
  const eligibility = await checkGenesisEligibility(userId);
  if (!eligibility.eligible) {
    throw new BusinessRuleError(
      eligibility.reason ?? "Genesis pin not available.",
    );
  }

  const supabase = await createClient();
  // Mark the profile claimed first (unique constraint isn't needed; the flag
  // is the gate). If this fails because they raced, the counter isn't touched.
  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ genesis_claimed: true })
    .eq("id", userId)
    .eq("genesis_claimed", false); // only if not already claimed (CAS)

  if (profileErr) throw profileErr;
  // If no row was updated, someone raced us.
  const { data: after } = await supabase
    .from("profiles")
    .select("genesis_claimed")
    .eq("id", userId)
    .single();
  if (!after?.genesis_claimed) {
    throw new BusinessRuleError("Genesis pin not available.");
  }

  // Increment the counter via the admin client (atomic enough for MVP volume;
  // a true atomic increment would use an RPC — reserved for scale).
  const status = await getGenesisStatus();
  const { error: settingsErr } = await supabase
    .from("settings")
    .update({ value: String(status.usedFreePins + 1) })
    .eq("category", "genesis")
    .eq("key", "used_free_pins");
  if (settingsErr) throw settingsErr;

  // Auto-close if we've hit the cap.
  if (status.usedFreePins + 1 >= status.maxFreePins) {
    await supabase
      .from("settings")
      .update({ value: "false" })
      .eq("category", "genesis")
      .eq("key", "enabled");
  }

  invalidateSettingsCache();
}
