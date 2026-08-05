import { createClient } from "@/lib/supabase/server";
import {
  ForbiddenError,
  UnauthorizedError,
} from "@/lib/errors";
import type { Database } from "@/lib/supabase/types";

/**
 * Authorization guards for route handlers and Server Components.
 *
 * Each guard resolves the current Supabase user + profile or throws an
 * `AppError` subclass (already mapped to the right HTTP status by
 * `lib/response.ts`). Defense-in-depth alongside RLS (docs 12, 21).
 *
 * Source: docs 12 (Authentication), 21 (Security), 05 (System Architecture).
 */

export interface AuthenticatedUser {
  /** Supabase auth.users id. */
  id: string;
  /** Email from auth.users (the Supabase source of truth, ADR #1). */
  email: string | null;
  /** The profiles row — application metadata only. */
  profile: Database["public"]["Tables"]["profiles"]["Row"];
}

/**
 * Resolve the current user or throw UnauthorizedError.
 * Use for any route that requires a signed-in user.
 */
export async function requireUser(): Promise<AuthenticatedUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new UnauthorizedError();
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    // Session exists but profile row missing — treat as unauthorized. The
    // signup trigger normally creates the profile; if it's absent, the
    // account is in a bad state.
    throw new UnauthorizedError("Your account is not fully set up.");
  }

  return { id: user.id, email: user.email ?? null, profile };
}

/**
 * Require an admin user or throw ForbiddenError (403, doc 12).
 */
export async function requireAdmin(): Promise<AuthenticatedUser> {
  const authed = await requireUser();
  if (authed.profile.role !== "admin") {
    throw new ForbiddenError();
  }
  return authed;
}

/**
 * Require the owner of a resource. Pass the resource's `user_id` (or other
 * owner field). Admins always pass.
 */
export async function requireOwnerOrAdmin(ownerId: string): Promise<AuthenticatedUser> {
  const authed = await requireUser();
  if (authed.profile.role === "admin" || authed.id === ownerId) {
    return authed;
  }
  throw new ForbiddenError();
}
