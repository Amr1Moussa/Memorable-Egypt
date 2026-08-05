import { createClient } from "@/lib/supabase/server";
import { ConflictError, ValidationError } from "@/lib/errors";
import { RESERVED_USERNAMES, normalizeUsername } from "./constants";
import type { CompleteProfileInput } from "@/features/auth/schemas";

/**
 * Profile services (server-only).
 *
 * Profiles hold application metadata only (Phase 2.2 requirement #1):
 * username, display name, bio, avatar, role, genesis flags. Identity
 * (email, password, OAuth) lives in Supabase Auth.
 *
 * Username uniqueness is case-insensitive and enforced by a functional
 * unique index (migration 0008). Reserved names are rejected here.
 *
 * Source: doc 12 (Authentication — Username Rules), 06 (Profile).
 */

export interface UsernameCheckResult {
  available: boolean;
  reason?: string;
}

/**
 * Check username availability + format/reserved-name rules.
 * Used for live validation during profile completion.
 */
export async function checkUsername(
  username: string,
  currentUserId?: string,
): Promise<UsernameCheckResult> {
  // Normalize FIRST (Phase 2.3 requirement #2): trim + lowercase.
  const normalized = normalizeUsername(username);

  if (normalized.length < 3 || normalized.length > 30) {
    return { available: false, reason: "Username must be 3–30 characters." };
  }
  if (!/^[a-z0-9_]+$/.test(normalized)) {
    return {
      available: false,
      reason: "Only lowercase letters, numbers, and underscores are allowed.",
    };
  }
  if (RESERVED_USERNAMES.has(normalized)) {
    return { available: false, reason: "That username is reserved." };
  }

  // Availability check against the DB. We store normalized (lowercase)
  // usernames, so an exact match is sufficient (migration 0011 trigger
  // enforces this on write).
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id")
    .eq("username", normalized);

  // Allow the current user to "re-check" their own username.
  if (currentUserId) {
    query = query.neq("id", currentUserId);
  }

  const { data } = await query.limit(1);
  if (data && data.length > 0) {
    return { available: false, reason: "That username is taken." };
  }

  return { available: true };
}

/**
 * Complete a profile on first login: set username + display name.
 * Validates availability server-side (defense-in-depth on top of the form).
 */
export async function completeProfile(
  userId: string,
  input: CompleteProfileInput,
): Promise<void> {
  const check = await checkUsername(input.username, userId);
  if (!check.available) {
    throw new ValidationError(check.reason ?? "Username is not available.", {
      username: [check.reason ?? "Unavailable"],
    });
  }
  if (!input.displayName.trim()) {
    throw new ValidationError("Display name is required.", {
      displayName: ["Required"],
    });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      // Store the normalized (lowercase, trimmed) form — the DB trigger also
      // enforces this, but normalizing here keeps the input clean.
      username: normalizeUsername(input.username),
      display_name: input.displayName.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    // Unique violation → friendly conflict error.
    if (error.code === "23505") {
      throw new ConflictError("That username is already taken.");
    }
    throw error;
  }
}

/**
 * Whether the profile still needs completion (username not yet set).
 * Drives the "complete your profile" interstitial after first login.
 */
export async function isProfileIncomplete(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .single();
  return !data?.username;
}
